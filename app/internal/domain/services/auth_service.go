package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"app/internal/domain/entities"
	"app/internal/domain/repositories"
	"app/internal/infra/caching"
	"app/internal/pkg/errors"
	"app/internal/pkg/logger"
)

// AuthService handles authentication business logic
type AuthService struct {
	userRepo        *repositories.UserRepository
	cache           *caching.RedisCache
	jwtSecret       string
	accessDuration  time.Duration
	refreshDuration time.Duration
	issuer          string
}

// NewAuthService creates a new auth service
func NewAuthService(
	userRepo *repositories.UserRepository,
	cache *caching.RedisCache,
	jwtSecret string,
	accessDuration time.Duration,
	refreshDuration time.Duration,
	issuer string,
) *AuthService {
	return &AuthService{
		userRepo:        userRepo,
		cache:           cache,
		jwtSecret:       jwtSecret,
		accessDuration:  accessDuration,
		refreshDuration: refreshDuration,
		issuer:          issuer,
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
	jwt.RegisteredClaims
}

// Register registers a new user
func (s *AuthService) Signin(ctx context.Context, firstName, lastName, username, email, Phone, password string) (*entities.User, error) {
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

	// Hash password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
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
	user, err := s.userRepo.FindByEmailOrUsername(ctx, emailOrUsername)
	if err != nil {
		return nil, nil, errors.ErrInvalidCredentials.W("email or uname not found", "")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, nil, errors.ErrInvalidCredentials
	}

	// 2. Pass them into the token generator
	tokens, err := s.GenerateTokenPair(ctx, user, ipAddress, userAgent)
	if err != nil {
		return nil, nil, err
	}

	// 3. Correctly return the tokens
	return user, tokens, nil
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

	var currentSession entities.RefreshToken
	if err := json.Unmarshal([]byte(jsonData), &currentSession); err != nil {
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

	// === ATOMIC EXECUTION STEP ===
	// Keys mapped to Lua: KEYS[1] = oldRedisKey, KEYS[2] = newRedisKey
	// Args mapped to Lua: ARGV[1] = string representation, ARGV[2] = TTL integer in seconds
	ttlSeconds := int(s.refreshDuration.Seconds())

	_, err = rotateTokenLua.Run(ctx, s.cache.Client, []string{oldRedisKey, newRedisKey}, string(newJsonData), ttlSeconds).Result()
	if err != nil {
		// If another concurrent request already completed this, Lua will fail or return an error string
		if err.Error() == "OLD_TOKEN_NOT_FOUND" {
			return nil, errors.ErrInvalidToken
		}
		return nil, errors.ErrInternalServer.W("Atomic rotation pipeline execution failed", "").Log(ctx, err, true)
	}
	// =============================

	// Step 4: Safely generate Access JWT now that Redis state guarantees integrity
	accessClaims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.accessDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
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

// GenerateTokenPair generates access and refresh tokens
func (s *AuthService) GenerateTokenPair(ctx context.Context, user *entities.User, ipAddress, userAgent string) (*TokenPair, error) {
	// 1. Generate access token
	accessClaims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.accessDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
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

	// Pass the marshaled data string directly to your cache
	err = s.cache.Client.Set(ctx, redisKey, string(jsonData), s.refreshDuration).Err()
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
