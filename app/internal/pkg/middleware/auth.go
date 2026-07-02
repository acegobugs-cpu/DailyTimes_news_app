package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"app/internal/domain/appContext"
	"app/internal/domain/handlers"
	"app/internal/pkg/errors"
	"app/internal/pkg/logger"
	"app/internal/pkg/token"
)

// AuthContextKey is the context key for storing user information
type AuthContextKey string

const (
	UserIDKey   AuthContextKey = "userID"
	UsernameKey AuthContextKey = "username"
	EmailKey    AuthContextKey = "email"
)

// AuthMiddleware provides authentication middleware
type AuthMiddleware struct {
	handler      *handlers.Handler
	tokenManager *token.TokenManager
	logger       *zap.Logger
}

// NewAuthMiddleware creates a new authentication middleware
func NewAuthMiddleware(tokenManager *token.TokenManager) *AuthMiddleware {
	return &AuthMiddleware{
		handler:      handlers.NewHandler(),
		tokenManager: tokenManager,
		logger:       zap.L(),
	}
}

// Middleware returns the authentication middleware
func (m *AuthMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			logger.Warn("Missing Authorization header")
			m.handler.RespondError(w, errors.ErrUnauthorized.W("Missing authorization header", ""))
			return
		}

		// Check if it's a Bearer token
		if !strings.HasPrefix(authHeader, "Bearer ") {
			logger.Warn("Invalid Authorization header format")
			m.handler.RespondError(w, errors.ErrUnauthorized.W("Invalid authorization header format", ""))
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == "" {
			logger.Warn("Empty token after Bearer prefix")
			m.handler.RespondError(w, errors.ErrUnauthorized.W("Empty token", ""))
			return
		}

		// Validate the token
		claims, err := m.tokenManager.ValidateAccessToken(token)
		if err != nil {
			logger.Warn("Invalid access token", zap.Error(err))
			m.handler.RespondError(w, errors.ErrUnauthorized.W("Invalid or expired token", ""))
			return
		}

		// Add user information using the new clean context helper
		ctx := appContext.WithUser(r.Context(), claims.UserID)

		// Continue with the modified context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OptionalAuthMiddleware returns an optional authentication middleware
// This allows requests to proceed even without authentication, but adds user info if present
func (m *AuthMiddleware) OptionalAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			// No token, continue without user context
			next.ServeHTTP(w, r)
			return
		}

		// Check if it's a Bearer token
		if !strings.HasPrefix(authHeader, "Bearer ") {
			// Invalid format, continue without user context
			next.ServeHTTP(w, r)
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == "" {
			// Empty token, continue without user context
			next.ServeHTTP(w, r)
			return
		}

		// Validate the token
		claims, err := m.tokenManager.ValidateAccessToken(token)
		if err != nil {
			// Invalid token, continue without user context
			m.logger.Debug("Optional auth: invalid token", zap.Error(err))
			next.ServeHTTP(w, r)
			return
		}

		// Add user information to context
		ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)

		// Continue with the modified context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserIDFromContext extracts the user ID from the request context
func GetUserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(UserIDKey).(uuid.UUID)
	return userID, ok
}

// GetUsernameFromContext extracts the username from the request context
func GetUsernameFromContext(ctx context.Context) (string, bool) {
	username, ok := ctx.Value(UsernameKey).(string)
	return username, ok
}

// GetEmailFromContext extracts the email from the request context
func GetEmailFromContext(ctx context.Context) (string, bool) {
	email, ok := ctx.Value(EmailKey).(string)
	return email, ok
}
