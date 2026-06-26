package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"app/internal/domain/entities"
	"app/internal/domain/repositories"
	"app/internal/pkg/errors"
	"app/internal/pkg/logger"
)

// AuthService handles authentication business logic
type AuthService struct {
	userRepo         *repositories.UserRepository
	refreshTokenRepo *repositories.RefreshTokenRepository
	jwtSecret        string
	accessDuration   time.Duration
	refreshDuration  time.Duration
	issuer           string
}

// NewAuthService creates a new auth service
func NewAuthService(
	userRepo *repositories.UserRepository,
	refreshTokenRepo *repositories.RefreshTokenRepository,
	jwtSecret string,
	accessDuration time.Duration,
	refreshDuration time.Duration,
	issuer string,
) *AuthService {
	return &AuthService{
		userRepo:         userRepo,
		refreshTokenRepo: refreshTokenRepo,
		jwtSecret:        jwtSecret,
		accessDuration:   accessDuration,
		refreshDuration:  refreshDuration,
		issuer:           issuer,
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
func (s *AuthService) Register(ctx context.Context, firstName, lastName, username, email, Phone, password string) (*entities.User, error) {
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
		return nil, nil, errors.ErrInvalidCredentials
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
	user, err := s.userRepo.FindByID(ctx, claims.UserID)
	if err != nil {
		return nil, errors.ErrResourceNotFound
	}

	return user, nil
}

// RefreshAccessToken refreshes an access token using a refresh token
func (s *AuthService) RefreshAccessToken(ctx context.Context, refreshTokenString string) (*TokenPair, error) {
	refreshTokenHash := hashToken(refreshTokenString)
	refreshToken, err := s.refreshTokenRepo.FindByTokenHash(ctx, refreshTokenHash)
	if err != nil {
		return nil, errors.ErrInvalidToken
	}

	if !refreshToken.IsValid() {
		return nil, errors.ErrTokenExpired
	}

	// Get user
	user, err := s.userRepo.FindByID(ctx, refreshToken.UserID)
	if err != nil {
		return nil, errors.ErrResourceNotFound
	}

	// Rotate refresh token
	newRefreshTokenString := generateRandomToken()
	newRefreshTokenHash := hashToken(newRefreshTokenString)
	newExpiresAt := time.Now().Add(s.refreshDuration)
	newRefreshToken := entities.NewRefreshToken(user.ID, newRefreshTokenHash, newExpiresAt)
	newRefreshToken.IPAddress = refreshToken.IPAddress
	newRefreshToken.UserAgent = refreshToken.UserAgent

	if err := s.refreshTokenRepo.Rotate(ctx, refreshToken.ID, newRefreshToken); err != nil {
		return nil, errors.ErrInternalServer.W("Failed to rotate refresh token", "")
	}

	// Generate new access token
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
		return nil, errors.ErrInternalServer.W("Failed to sign access token", "")
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: newRefreshTokenString,
		ExpiresIn:    int64(s.accessDuration.Seconds()),
	}, nil
}

// ValidateAccessToken validates an access token and returns claims
func (s *AuthService) ValidateAccessToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
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

// Logout revokes a refresh token
func (s *AuthService) Logout(ctx context.Context, refreshTokenString string) error {
	refreshTokenHash := hashToken(refreshTokenString)
	refreshToken, err := s.refreshTokenRepo.FindByTokenHash(ctx, refreshTokenHash)
	if err != nil {
		return errors.ErrInvalidToken
	}

	if err := s.refreshTokenRepo.Revoke(ctx, refreshToken.ID); err != nil {
		return errors.ErrInternalServer.W("Failed to revoke refresh token", "")
	}

	return nil
}

// LogoutAll revokes all refresh tokens for a user
func (s *AuthService) LogoutAll(ctx context.Context, userID uuid.UUID) error {
	if err := s.refreshTokenRepo.RevokeAllForUser(ctx, userID); err != nil {
		return errors.ErrInternalServer.W("Failed to revoke all refresh tokens", "")
	}
	return nil
}

// GenerateTokenPair generates access and refresh tokens
func (s *AuthService) GenerateTokenPair(ctx context.Context, user *entities.User, ipAddress, userAgent string) (*TokenPair, error) {
	// Generate access token
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
		return nil, errors.ErrInternalServer.W("Failed to sign access token", "")
	}

	// Generate refresh token
	refreshTokenString := generateRandomToken()
	refreshTokenHash := hashToken(refreshTokenString)
	expiresAt := time.Now().Add(s.refreshDuration)

	refreshToken := entities.NewRefreshToken(user.ID, refreshTokenHash, expiresAt)
	refreshToken.IPAddress = &ipAddress
	refreshToken.UserAgent = &userAgent

	if err := s.refreshTokenRepo.Create(ctx, refreshToken); err != nil {
		return nil, errors.ErrInternalServer.W("Failed to create refresh token", "")
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
