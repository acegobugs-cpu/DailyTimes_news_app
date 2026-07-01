package services

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"app/internal/domain/entities"
	"app/internal/domain/repositories"
	"app/internal/infra/caching"
	"app/internal/pkg/config"
	"app/internal/pkg/crypto"
	"app/internal/pkg/errors"
	"app/internal/pkg/logger"
	"app/internal/pkg/validator"
)

// AuthService handles authentication business logic
type AuthService struct {
	userRepo        *repositories.UserRepository
	inviteRepo      *repositories.InvitesRepository
	cache           *caching.RedisCache
	config          *config.Config
	validator       *validator.Validator
	jwtSecret       string
	accessDuration  time.Duration
	refreshDuration time.Duration
	issuer          string
}

// NewAuthService creates a new auth service
func NewAuthService(
	userRepo *repositories.UserRepository,
	inviteRepo *repositories.InvitesRepository,
	cache *caching.RedisCache,
	cfg *config.Config,
) *AuthService {
	return &AuthService{
		userRepo:        userRepo,
		inviteRepo:      inviteRepo,
		cache:           cache,
		config:          cfg,
		validator:       validator.NewValidator(cfg),
		jwtSecret:       cfg.GetJWTSecret(),
		accessDuration:  cfg.JWT.AccessDuration,
		refreshDuration: cfg.JWT.RefreshDuration,
		issuer:          cfg.JWT.Issuer,
	}
}

// TokenPair represents access and refresh tokens
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

// Claims represents JWT claims
type Claims struct {
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username"`
	Email    string    `json:"email"`
	JTI      string    `json:"jti"` // Unique token ID for blacklisting
	Version  string    `json:"ver"` // Token version
	Audience string    `json:"aud"`
	jwt.RegisteredClaims
}

func (s *AuthService) VerifyInvitation(ctx context.Context, token string) (*entities.Invites, error) {

	redisKey := fmt.Sprintf("registration:token:%s", token)

	// Fetch from Redis
	val, err := s.cache.Client.Get(ctx, redisKey).Result()
	if err == redis.Nil {
		// Token doesn't exist or expired
		return nil, errors.ErrNotFound.W("invalid or expired registration link", "")

	} else if err != nil {
		return nil, errors.ErrInternalServer.W("database error", "")

	}

	inviteUUID, err := uuid.Parse(val)
	if err != nil {
		return nil, errors.ErrInvalidToken

	}

	// 2. Fetch the up-to-date, complete profile data from the Postgres Database
	inviteRecord, err := s.inviteRepo.GetInviteByID(ctx, inviteUUID)
	if err != nil {
		return nil, errors.ErrInternalServer

	}

	return inviteRecord, nil
}

// Register registers a new user
func (s *AuthService) Signin(ctx context.Context, firstName, lastName, username, email, Phone, password string) (*entities.User, error) {
	// Validate input
	if err := s.validator.ValidateName(firstName); err != nil {
		return nil, errors.ErrInvalidInput.W("Invalid first name", err.Error())
	}
	if err := s.validator.ValidateName(lastName); err != nil {
		return nil, errors.ErrInvalidInput.W("Invalid last name", err.Error())
	}
	if err := s.validator.ValidateUsername(username); err != nil {
		return nil, errors.ErrInvalidInput.W("Invalid username", err.Error())
	}
	if err := s.validator.ValidateEmail(email); err != nil {
		return nil, errors.ErrInvalidInput.W("Invalid email", err.Error())
	}
	if err := s.validator.ValidatePhone(Phone); err != nil {
		return nil, errors.ErrInvalidInput.W("Invalid phone number", err.Error())
	}
	if err := s.validator.ValidatePassword(password); err != nil {
		return nil, errors.ErrInvalidInput.W("Invalid password", err.Error())
	}

	// Check if email already exists
	exists, err := s.userRepo.ExistsByEmail(ctx, email)
	if err != nil {
		return nil, errors.ErrInternalServer.W("Failed to check email existence", "")
	}
	if exists {
		return nil, errors.ErrUserExists
	}

	// Check if username already exists
	exists, err = s.userRepo.ExistsByUsername(ctx, username)
	if err != nil {
		return nil, errors.ErrInternalServer.W("Failed to check username existence", "")
	}
	if exists {
		return nil, errors.ErrUserExists
	}

	// Hash password using configured bcrypt cost
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), s.config.Security.BcryptCost)
	if err != nil {
		return nil, errors.ErrInternalServer.W("Failed to hash password", "")
	}

	// Create user
	user := entities.NewUser(firstName, lastName, username, email, Phone, string(passwordHash))
	if err := s.userRepo.Create(ctx, user); err != nil {
		logger.LogError(ctx, err, "")
		return nil, errors.ErrInternalServer.W("Failed to create user", "")
	}

	return user, nil
}

// Login authenticates a user
func (s *AuthService) Login(ctx context.Context, emailOrUsername, password, ipAddress, userAgent string) (*entities.User, *TokenPair, error) {
	// Check account lockout
	attemptsKey := fmt.Sprintf("login:attempts:%s", emailOrUsername)
	lockoutKey := fmt.Sprintf("login:lockout:%s", emailOrUsername)

	// If a lockout key exists, immediately reject
	if exists, _ := s.cache.Client.Exists(ctx, lockoutKey).Result(); exists == 1 {
		return nil, nil, errors.ErrInvalidCredentials.W("Account locked due to too many failed attempts", "")
	}

	// Otherwise, check the attempts counter (if present)
	attempts, err := s.cache.Client.Get(ctx, attemptsKey).Int()
	if err == nil && attempts >= s.config.Auth.MaxLoginAttempts {
		// Ensure lockout key is set atomically-ish when threshold already exceeded
		_ = s.cache.Client.Set(ctx, lockoutKey, "1", s.config.Auth.LockoutDuration).Err()
		s.cache.Client.Del(ctx, attemptsKey)
		return nil, nil, errors.ErrInvalidCredentials.W("Account locked due to too many failed attempts", "")
	}

	user, err := s.userRepo.FindByEmailOrUsername(ctx, emailOrUsername)
	if err != nil {
		// Increment failed attempt counter
		s.incrementFailedAttempt(ctx, attemptsKey)
		return nil, nil, errors.ErrInvalidCredentials.W("email or username not found", "")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		// Increment failed attempt counter
		s.incrementFailedAttempt(ctx, attemptsKey)
		return nil, nil, errors.ErrInvalidCredentials.Log(ctx, err, true)
	}

	// Clear failed attempts and any lockout on successful login
	s.cache.Client.Del(ctx, attemptsKey)
	s.cache.Client.Del(ctx, lockoutKey)

	// Generate tokens
	tokens, err := s.GenerateTokenPair(ctx, user, ipAddress, userAgent)
	if err != nil {
		return nil, nil, err
	}

	return user, tokens, nil
}

// incrementFailedAttempt increments the failed login attempt counter
// and creates a separate lockout key when the threshold is reached.
func (s *AuthService) incrementFailedAttempt(ctx context.Context, key string) {
	attempts, err := s.cache.Client.Incr(ctx, key).Result()
	if err != nil {
		logger.LogError(ctx, err, "failed to increment login attempts")
		return
	}

	// Define a short attempt window separate from the lockout duration.
	// This keeps the counter rolling within a small window (e.g. 5 minutes).
	attemptWindow := 5 * time.Minute

	if attempts == 1 {
		if err := s.cache.Client.Expire(ctx, key, attemptWindow).Err(); err != nil {
			// If EXPIRE fails, remove the key to avoid leaving a persistent counter.
			logger.LogError(ctx, err, "failed to set TTL on attempts key; deleting to avoid non-expiring key")
			_ = s.cache.Client.Del(ctx, key).Err()
			return
		}
	}

	// If threshold reached, set an explicit lockout key with the configured lockout duration
	if attempts >= int64(s.config.Auth.MaxLoginAttempts) {
		lockoutKey := strings.Replace(key, "attempts", "lockout", 1)
		if err := s.cache.Client.Set(ctx, lockoutKey, "1", s.config.Auth.LockoutDuration).Err(); err != nil {
			logger.LogError(ctx, err, "failed to set lockout key")
			return
		}
		// Remove the rolling attempts counter to avoid confusion
		_ = s.cache.Client.Del(ctx, key).Err()
	}
}

func (s *AuthService) Me(ctx context.Context, accessToken string) (*entities.User, error) {
	// 1. Validate the string token and extract claims
	claims, err := s.ValidateAccessToken(accessToken)
	if err != nil {
		// Mapping invalid/expired JWTs cleanly to unauthorized
		return nil, errors.ErrInvalidToken
	}
	// 2. Fetch the latest user profile state from the database
	// userID := uuid.MustParse(claims.UserID)
	user, err := s.userRepo.FindByID(ctx, claims.UserID)
	if err != nil {
		return nil, errors.ErrResourceNotFound
	}

	return user, nil
}

// 1. Define the Lua Script at the package or global level
var rotateTokenLua = redis.NewScript(`
    local old_key = KEYS[1]
    local new_key = KEYS[2]
    local new_payload = ARGV[1]
    local ttl = tonumber(ARGV[2])

    -- Check if old token exists
    local old_exists = redis.call("EXISTS", old_key)
    if old_exists == 0 then
        return {err = "OLD_TOKEN_NOT_FOUND"}
    end

    -- Write the new token with its TTL
    redis.call("SET", new_key, new_payload, "EX", ttl)

    -- Delete the old token immediately
    redis.call("DEL", old_key)

    return "OK"
`)

func (s *AuthService) RefreshAccessToken(ctx context.Context, refreshTokenString string) (*TokenPair, error) {
	oldTokenHash := hashToken(refreshTokenString)
	oldRedisKey := fmt.Sprintf("refresh:token:%s", oldTokenHash)

	// Step 1 & 2: We still need to fetch and read it first to get the UserID
	// before writing the new pattern key.
	jsonData, err := s.cache.Client.Get(ctx, oldRedisKey).Result()
	if err != nil {
		return nil, errors.ErrInvalidToken
	}

	// Decrypt the refresh token data if encryption is enabled
	decryptedData := jsonData
	if s.config.Security.EncryptionKey != "" {
		decryptedData, err = crypto.Decrypt(jsonData)
		if err != nil {
			logger.Error("Failed to decrypt refresh token data", zap.Error(err))
			// If decryption fails, the token might be corrupted or from before encryption
			return nil, errors.ErrInvalidToken
		}
	}

	var currentSession entities.RefreshToken
	if err := json.Unmarshal([]byte(decryptedData), &currentSession); err != nil {
		return nil, errors.ErrInternalServer.W("Failed to read cached token structure", "").Log(ctx, err, true)
	}

	if time.Now().After(currentSession.ExpiresAt) {
		s.cache.Client.Del(ctx, oldRedisKey)
		return nil, errors.ErrTokenExpired
	}

	user, err := s.userRepo.FindByID(ctx, currentSession.UserID)
	if err != nil {
		return nil, errors.ErrResourceNotFound
	}

	// Step 3: Prepare the new token session properties
	newRefreshTokenString := generateRandomToken()
	newRefreshTokenHash := hashToken(newRefreshTokenString)
	newExpiresAt := time.Now().Add(s.refreshDuration)

	newSession := entities.NewRefreshToken(user.ID, newRefreshTokenHash, newExpiresAt)
	newSession.IPAddress = currentSession.IPAddress
	newSession.UserAgent = currentSession.UserAgent

	newRedisKey := fmt.Sprintf("refresh:token:%s:%s", user.ID.String(), newRefreshTokenHash)
	newJsonData, err := json.Marshal(newSession)
	if err != nil {
		return nil, errors.ErrInternalServer.W("Failed to serialize rotated session data", "").Log(ctx, err, true)
	}

	// Encrypt the new refresh token data before storing
	encryptedNewData := string(newJsonData)
	if s.config.Security.EncryptionKey != "" {
		encryptedNewData, err = crypto.Encrypt(string(newJsonData))
		if err != nil {
			return nil, errors.ErrInternalServer.W("Failed to encrypt rotated refresh token data", "").Log(ctx, err, true)
		}
	}

	// === ATOMIC EXECUTION STEP ===
	// Keys mapped to Lua: KEYS[1] = oldRedisKey, KEYS[2] = newRedisKey
	// Args mapped to Lua: ARGV[1] = string representation, ARGV[2] = TTL integer in seconds
	ttlSeconds := int(s.refreshDuration.Seconds())

	_, err = rotateTokenLua.Run(ctx, s.cache.Client, []string{oldRedisKey, newRedisKey}, encryptedNewData, ttlSeconds).Result()
	if err != nil {
		// If another concurrent request already completed this, Lua will fail or return an error string
		if err.Error() == "OLD_TOKEN_NOT_FOUND" {
			return nil, errors.ErrInvalidToken
		}
		return nil, errors.ErrInternalServer.W("Atomic rotation pipeline execution failed", "").Log(ctx, err, true)
	}
	// =============================

	// Step 4: Safely generate Access JWT now that Redis state guarantees integrity
	tokenJTI := uuid.New().String()
	accessClaims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
		JTI:      tokenJTI,
		Version:  "1.0",
		Audience: s.issuer,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.accessDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    s.issuer,
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, errors.ErrInternalServer.W("Failed to sign access token", "").Log(ctx, err, true)
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: newRefreshTokenString,
		ExpiresIn:    int64(s.accessDuration.Seconds()),
	}, nil
}

// ValidateAccessToken validates an access token and returns claims
func (s *AuthService) ValidateAccessToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.ErrInvalidToken
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, errors.ErrInvalidToken
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		// Check if token is blacklisted
		if s.IsTokenBlacklisted(tokenString, claims.JTI) {
			return nil, errors.ErrInvalidToken.W("Token has been revoked", "")
		}
		return claims, nil
	}

	return nil, errors.ErrInvalidToken
}

// Logout revokes a single refresh token by deleting it from Redis
func (s *AuthService) Logout(ctx context.Context, refreshTokenString string) error {
	refreshTokenHash := hashToken(refreshTokenString)

	// 1. Build the redis key structure (assuming you have the user ID or just the hash)
	// If you included the userID in your key layout, you would pass it here.
	// If you are only using the token hash as the key:
	redisKey := fmt.Sprintf("refresh:token:%s", refreshTokenHash)

	// 2. Execute a direct Delete operation on the key string
	deleted, err := s.cache.Client.Del(ctx, redisKey).Result()
	if err != nil {
		return errors.ErrInternalServer.W("Failed to delete refresh token from cache", "").Log(ctx, err, true)
	}

	// If deleted == 0, it means the key didn't exist (already expired or bad token)
	if deleted == 0 {
		return errors.ErrInvalidToken
	}

	return nil
}

// LogoutAll revokes all refresh tokens belonging to a specific user ID
func (s *AuthService) LogoutAll(ctx context.Context, userID uuid.UUID) error {
	// If you updated your key strategy to include the user ID: "refresh:token:userID:*"
	pattern := fmt.Sprintf("refresh:token:%s:*", userID.String())

	var cursor uint64
	var keys []string
	var err error

	// 1. Safe incremental search across Redis using SCAN instead of the dangerous KEYS command
	for {
		var scannedKeys []string
		scannedKeys, cursor, err = s.cache.Client.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return errors.ErrInternalServer.W("Failed to scan active user sessions", "").Log(ctx, err, true)
		}

		keys = append(keys, scannedKeys...)
		if cursor == 0 {
			break // Complete iteration loop finished
		}
	}

	// 2. If active sessions exist for this user, delete them all at once
	if len(keys) > 0 {
		err = s.cache.Client.Del(ctx, keys...).Err()
		if err != nil {
			return errors.ErrInternalServer.W("Failed to clear active user sessions", "").Log(ctx, err, true)
		}
	}

	return nil
}

// BlacklistToken adds an access token to the blacklist
func (s *AuthService) BlacklistToken(ctx context.Context, tokenString string, jti string, expiration time.Duration) error {
	blacklistKey := fmt.Sprintf("blacklist:token:%s", jti)
	err := s.cache.Client.Set(ctx, blacklistKey, tokenString, expiration).Err()
	if err != nil {
		return errors.ErrInternalServer.W("Failed to blacklist token", "").Log(ctx, err, true)
	}
	return nil
}

// IsTokenBlacklisted checks if a token is blacklisted
func (s *AuthService) IsTokenBlacklisted(tokenString, jti string) bool {
	blacklistKey := fmt.Sprintf("blacklist:token:%s", jti)
	_, err := s.cache.Client.Get(context.Background(), blacklistKey).Result()
	return err == nil
}

// RevokeUserTokens revokes all access tokens for a user by blacklisting their current tokens
// Note: This requires tracking issued tokens or using a different strategy
func (s *AuthService) RevokeUserTokens(ctx context.Context, userID uuid.UUID) error {
	// This would require maintaining a list of active token JTIs per user
	// For now, we can use a user-specific blacklist key
	blacklistKey := fmt.Sprintf("blacklist:user:%s", userID.String())
	err := s.cache.Client.Set(ctx, blacklistKey, "revoked", s.accessDuration).Err()
	if err != nil {
		return errors.ErrInternalServer.W("Failed to revoke user tokens", "").Log(ctx, err, true)
	}
	return nil
}

// GenerateTokenPair generates access and refresh tokens
func (s *AuthService) GenerateTokenPair(ctx context.Context, user *entities.User, ipAddress, userAgent string) (*TokenPair, error) {
	// 1. Generate access token with enhanced claims
	tokenJTI := uuid.New().String()
	accessClaims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
		JTI:      tokenJTI,
		Version:  "1.0",
		Audience: s.issuer,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.accessDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    s.issuer,
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(s.jwtSecret))
	if err != nil {
		// Log the actual underlying 'err' for system diagnostics via your updated logger
		return nil, errors.ErrInternalServer.W("Failed to sign access token", "").Log(ctx, err, true)
	}

	// 2. Generate refresh token
	refreshTokenString := generateRandomToken()
	refreshTokenHash := hashToken(refreshTokenString)
	expiresAt := time.Now().Add(s.refreshDuration)

	refreshToken := entities.NewRefreshToken(user.ID, refreshTokenHash, expiresAt)
	refreshToken.IPAddress = &ipAddress
	refreshToken.UserAgent = &userAgent

	// FIX 1: Use the hash string as the key instead of formatting the raw object
	redisKey := fmt.Sprintf("refresh:token:%s:%s", user.ID.String(), refreshTokenHash)

	// FIX 2: Marshal struct to JSON string before hitting Redis engine
	jsonData, err := json.Marshal(refreshToken)
	if err != nil {
		return nil, errors.ErrInternalServer.W("failed to serialize session data", "")
	}

	// Encrypt the refresh token data before storing in Redis
	encryptedData := string(jsonData)
	if s.config.Security.EncryptionKey != "" {
		encryptedData, err = crypto.Encrypt(string(jsonData))
		if err != nil {
			logger.Error("Failed to encrypt refresh token data", zap.Error(err))
			// Fall back to unencrypted if encryption fails
			encryptedData = string(jsonData)
		}
	}

	// Pass the encrypted data string directly to your cache
	err = s.cache.Client.Set(ctx, redisKey, encryptedData, s.refreshDuration).Err()
	if err != nil {
		// Fixed context typo error message to say "refresh session" instead of "registration session"
		return nil, errors.ErrInternalServer.W("failed to save refresh session", "")
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresIn:    int64(s.accessDuration.Seconds()),
	}, nil
}

func generateRandomToken() string {
	b := make([]byte, 32) // 32 bytes = 256 bits of entropy
	_, err := rand.Read(b)
	if err != nil {
		// Fallback or panic, but crypto/rand rarely fails unless system entropy is dead
		panic("crypto/rand failed: " + err.Error())
	}
	return hex.EncodeToString(b)
}

func hashToken(token string) string {
	h := sha256.New()
	h.Write([]byte(token))
	return hex.EncodeToString(h.Sum(nil))
}

// encryptData encrypts data using AES-256-GCM
func encryptData(key []byte, plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}

// decryptData decrypts data using AES-256-GCM
func decryptData(key []byte, ciphertext []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
}
