package middleware

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"
)

const (
	csrfCookieName = "csrf_session"
	csrfHeaderName = "X-CSRF-Token"
	csrfTokenTTL   = 1 * time.Hour
)

type CSRFProtection struct {
	logger    *zap.Logger
	secretKey []byte
	isProd    bool
}

// NewCSRFProtection creates a stateless, cryptographically secure CSRF middleware.
// The secretKey MUST be 32 bytes and persistent across server restarts (read from config).
func NewCSRFProtection(logger *zap.Logger, secretKey []byte, isProd bool) (*CSRFProtection, error) {
	if len(secretKey) != 32 {
		return nil, fmt.Errorf("CSRF secret key must be exactly 32 bytes")
	}
	return &CSRFProtection{
		logger:    logger,
		secretKey: secretKey,
		isProd:    isProd,
	}, nil
}

// Middleware handles stateless validation of state-changing requests
func (c *CSRFProtection) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. Skip safe HTTP methods
		if r.Method == http.MethodGet || r.Method == http.MethodHead ||
			r.Method == http.MethodOptions || r.Method == http.MethodTrace {
			next.ServeHTTP(w, r)
			return
		}

		// 2. Extract token from Header or Form
		tokenStr := r.Header.Get(csrfHeaderName)
		if tokenStr == "" {
			tokenStr = r.FormValue("csrf_token")
		}

		// 3. Extract the underlying baseline session cookie
		cookie, err := r.Cookie(csrfCookieName)
		if err != nil || cookie.Value == "" {
			c.logger.Warn("CSRF validation failed: missing session cookie", zap.String("path", r.URL.Path))
			http.Error(w, "Missing CSRF session context", http.StatusForbidden)
			return
		}

		// 4. Validate the cryptographic token against the cookie value
		if !c.verifyToken(tokenStr, cookie.Value) {
			c.logger.Warn("CSRF validation failed: invalid or expired token", zap.String("path", r.URL.Path))
			http.Error(w, "Invalid or expired CSRF token", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// GetCSRFTokenHandler issues a secure session cookie alongside its matching token variant
func (c *CSRFProtection) GetCSRFTokenHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. Establish or reuse a robust session tracking identity
	var sessionID string
	if cookie, err := r.Cookie(csrfCookieName); err == nil && cookie.Value != "" {
		sessionID = cookie.Value
	} else {
		b := make([]byte, 16)
		if _, err := rand.Read(b); err != nil {
			c.logger.Error("Failed to generate CSRF session ID", zap.Error(err))
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		sessionID = base64.RawURLEncoding.EncodeToString(b)
	}

	// 2. Issue the hardened tracking Cookie
	http.SetCookie(w, &http.Cookie{
		Name:     csrfCookieName,
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true, // Hide from malicious client scripts
		Secure:   c.isProd,
		SameSite: http.SameSiteLaxMode,
	})

	// 3. Mint an explicitly signed token bound with an exact expiration timestamp
	tokenStr, err := c.generateToken(sessionID)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"csrf_token": tokenStr})
}

// generateToken constructs a signed payload: Base64(expiry_bytes . random_salt . signature)
func (c *CSRFProtection) generateToken(sessionID string) (string, error) {
	expiryBytes := make([]byte, 8)
	binary.BigEndian.PutUint64(expiryBytes, uint64(time.Now().Add(csrfTokenTTL).Unix()))

	salt := make([]byte, 8)
	if _, err := rand.Read(salt); err != nil {
		c.logger.Error("Failed to seed CSRF token salt", zap.Error(err))
		return "", err
	}

	// Sign the composite fields together with the specific session constraint
	mac := hmac.New(sha256.New, c.secretKey)
	mac.Write(expiryBytes)
	mac.Write(salt)
	mac.Write([]byte(sessionID))
	signature := mac.Sum(nil)

	// Assemble structural payload components
	payload := append(expiryBytes, salt...)
	payload = append(payload, signature...)

	return base64.RawURLEncoding.EncodeToString(payload), nil
}

// verifyToken checks if the signed token matches up with structural parameters, time restrictions, and signatures
func (c *CSRFProtection) verifyToken(tokenStr, sessionID string) bool {
	payload, err := base64.RawURLEncoding.DecodeString(tokenStr)
	if err != nil || len(payload) < 48 { // 8 (expiry) + 8 (salt) + 32 (sha256 signature)
		return false
	}

	expiryBytes := payload[:8]
	salt := payload[8:16]
	receivedSignature := payload[16:]

	// 1. Time Verification
	expiryUnix := binary.BigEndian.Uint64(expiryBytes)
	if time.Now().Unix() > int64(expiryUnix) {
		return false // Token expired
	}

	// 2. Recalculate Expected Signature securely
	mac := hmac.New(sha256.New, c.secretKey)
	mac.Write(expiryBytes)
	mac.Write(salt)
	mac.Write([]byte(sessionID))
	expectedSignature := mac.Sum(nil)

	// 3. Constant time compare to mitigate timing side-channel attacks
	return subtle.ConstantTimeCompare(receivedSignature, expectedSignature) == 1
}
