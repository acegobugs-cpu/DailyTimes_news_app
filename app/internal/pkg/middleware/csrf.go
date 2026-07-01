package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"sync"

	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// CSRFProtection provides CSRF protection middleware
type CSRFProtection struct {
	logger *zap.Logger
	tokens map[string]string
	mu     sync.RWMutex
}

// NewCSRFProtection creates a new CSRF protection middleware
func NewCSRFProtection(logger *zap.Logger) *CSRFProtection {
	return &CSRFProtection{
		logger: logger,
		tokens: make(map[string]string),
	}
}

// GenerateToken generates a new CSRF token
func (c *CSRFProtection) GenerateTokenForClient(clientID string) string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		c.logger.Error("Failed to generate CSRF token", zap.Error(err))
		return ""
	}
	token := hex.EncodeToString(b)
	c.mu.Lock()
	c.tokens[token] = clientID
	c.mu.Unlock()

	return token
}

// clientIDFromRequest extracts a context-specific identifier for the client.
// Prefer an existing session cookie if present, otherwise fall back to remote
// address + user-agent to provide a best-effort binding.
func clientIDFromRequest(r *http.Request) string {
	if r == nil {
		return ""
	}
	if cookie, err := r.Cookie("session_id"); err == nil {
		return cookie.Value
	}
	return r.RemoteAddr + "|" + r.UserAgent()
}

// ValidateToken validates a CSRF token for the given request context
func (c *CSRFProtection) ValidateToken(token string, r *http.Request) bool {
	if token == "" {
		return false
	}
	clientID := clientIDFromRequest(r)

	c.mu.RLock()
	defer c.mu.RUnlock()
	stored, ok := c.tokens[token]
	if !ok {
		return false
	}
	// token is valid only if the clientID that requested it matches
	return stored == clientID
}

// RevokeToken revokes a CSRF token
func (c *CSRFProtection) RevokeToken(token string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.tokens, token)
}

// Middleware returns the CSRF protection middleware
func (c *CSRFProtection) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip CSRF for GET, HEAD, OPTIONS, TRACE
		if r.Method == http.MethodGet || r.Method == http.MethodHead ||
			r.Method == http.MethodOptions || r.Method == http.MethodTrace {
			next.ServeHTTP(w, r)
			return
		}

		// For state-changing methods, validate CSRF token
		token := r.Header.Get("X-CSRF-Token")
		if token == "" {
			// Also check form field
			token = r.FormValue("csrf_token")
		}

		if token == "" || !c.ValidateToken(token, r) {
			c.logger.Warn("CSRF token validation failed",
				zap.String("method", r.Method),
				zap.String("path", r.URL.Path))
			http.Error(w, "Invalid CSRF token", http.StatusForbidden)
			return
		}

		// Revoke token after successful validation (one-time use)
		c.RevokeToken(token)

		next.ServeHTTP(w, r)
	})
}

// SetCSRFTokenHeader sets the CSRF token in response header bound to request
func (c *CSRFProtection) SetCSRFTokenHeader(w http.ResponseWriter, r *http.Request) {
	token := c.GenerateTokenForClient(clientIDFromRequest(r))
	if token != "" {
		w.Header().Set("X-CSRF-Token", token)
	}
}

// GetCSRFTokenHandler returns a handler to get a CSRF token
func (c *CSRFProtection) GetCSRFTokenHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := c.GenerateTokenForClient(clientIDFromRequest(r))
	if token == "" {
		http.Error(w, "Failed to generate CSRF token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"csrf_token":"` + token + `"}`))
}

// ApplyCSRFToRoutes applies CSRF protection to specific routes
func (c *CSRFProtection) ApplyCSRFToRoutes(router chi.Router, protectedPaths []string) {
	for _, path := range protectedPaths {
		router.With(c.Middleware).Route(path, func(r chi.Router) {
			// All routes under this path will be CSRF protected
		})
	}
}

// IsProtectedPath checks if a path should be CSRF protected
func (c *CSRFProtection) IsProtectedPath(path string, protectedPaths []string) bool {
	for _, protected := range protectedPaths {
		if strings.HasPrefix(path, protected) {
			return true
		}
	}
	return false
}
