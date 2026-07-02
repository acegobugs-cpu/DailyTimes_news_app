package services

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"app/internal/domain/entities"
	"app/internal/domain/repositories"
	"app/internal/infra/caching"
	"app/internal/pkg/config"
	"app/internal/pkg/errors"
	"app/internal/pkg/logger"
	"app/internal/pkg/session"
	"app/internal/pkg/token"
	"app/internal/pkg/validator"
)

// AuthService handles authentication business logic
type AuthService struct {
	userRepo       *repositories.UserRepository
	inviteRepo     *repositories.InvitesRepository
	cache          *caching.RedisCache
	config         *config.Config
	validator      *validator.Validator
	tokenManager   *token.TokenManager
	sessionManager *session.SessionManager
}

// NewAuthService creates a new auth service
func NewAuthService(
	userRepo *repositories.UserRepository,
	inviteRepo *repositories.InvitesRepository,
	cache *caching.RedisCache,
	cfg *config.Config,
) *AuthService {
	return &AuthService{
		userRepo:     userRepo,
		inviteRepo:   inviteRepo,
		cache:        cache,
		config:       cfg,
		validator:    validator.NewValidator(cfg),
		tokenManager: token.NewTokenManager(cfg.JWT.Secret, cfg.JWT.AccessDuration, cfg.JWT.Issuer),
		sessionManager: session.NewSessionManager(cache.Client, logger.GetLogger(), session.Config{
			EncryptionKey:   cfg.Security.EncryptionKey,
			RefreshDuration: cfg.JWT.RefreshDuration,
		}),
	}
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
func (s *AuthService) Login(ctx context.Context, emailOrUsername, password, ipAddress, userAgent string) (*entities.User, *token.TokenPair, error) {
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

	// 5. Generate Stateless Access Token
	accessTokenStr, _, err := s.tokenManager.GenerateAccessToken(user)
	if err != nil {
		return nil, nil, err
	}

	// 6. Generate State-tracked Refresh Session
	rawRefreshTokenStr, err := s.sessionManager.CreateSession(ctx, user.ID, ipAddress, userAgent)
	if err != nil {
		return nil, nil, err
	}

	tokenPair := &token.TokenPair{
		AccessToken:  accessTokenStr,
		RefreshToken: rawRefreshTokenStr,
		ExpiresIn:    s.tokenManager.GetAccessDurationSeconds(),
	}

	return user, tokenPair, nil
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

func (s *AuthService) Me(ctx context.Context, userId uuid.UUID) (*entities.User, error) {
	// 1. Fetch the latest user profile state from the database
	user, err := s.userRepo.FindByID(ctx, userId)
	if err != nil {
		return nil, errors.ErrResourceNotFound
	}

	return user, nil
}

func (s *AuthService) RefreshAccessToken(ctx context.Context, refreshTokenString, userAgent, ipAddress string) (*token.TokenPair, error) {
	// 1. Delegate session rotation to the state manager
	newRefreshToken, userID, err := s.sessionManager.Rotate(ctx, refreshTokenString, userAgent, ipAddress)
	if err != nil {
		return nil, err
	}

	// 2. Load the user profile
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		if revokeErr := s.sessionManager.Revoke(ctx, newRefreshToken); revokeErr != nil {
			logger.LogError(ctx, revokeErr, "failed to revoke rotated refresh token for missing user")
		}
		return nil, errors.ErrResourceNotFound
	}

	// 3. Generate only the stateless Access Token string
	accessTokenStr, _, err := s.tokenManager.GenerateAccessToken(user)
	if err != nil {
		return nil, err
	}

	// 4. Combine them cleanly into the response envelope
	return &token.TokenPair{
		AccessToken:  accessTokenStr,
		RefreshToken: newRefreshToken, // Handed down by sessionManager.Rotate!
		ExpiresIn:    s.tokenManager.GetAccessDurationSeconds(),
	}, nil
}

func (s *AuthService) ValidateAccessToken(accessToken string) (*token.Claims, error) {
	return s.tokenManager.ValidateAccessToken(accessToken)
}

// Logout revokes a single refresh token by deleting it from Redis
func (s *AuthService) Logout(ctx context.Context, refreshTokenString string) error {
	// Delegate directly to the decoupled session package layer
	err := s.sessionManager.Revoke(ctx, refreshTokenString)
	if err != nil {
		// Log or map error variants if necessary
		return err
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
