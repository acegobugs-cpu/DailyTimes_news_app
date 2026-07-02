package appContext

import (
	"context"

	"github.com/google/uuid"
)

// Define an unexported custom type to completely prevent key collisions
type contextKey string

const (
	UserIDKey   contextKey = "user_id"
	UsernameKey contextKey = "username"
	EmailKey    contextKey = "email"
)

// GetUserID extracts the typed UUID directly from the context safely
func GetUserID(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(UserIDKey).(uuid.UUID)
	return userID, ok
}

// WithUser decorates a context with unified security credential primitives
func WithUser(ctx context.Context, userID uuid.UUID) context.Context {
	return context.WithValue(ctx, UserIDKey, userID)
}
