package entities

import (
	"time"

	"github.com/google/uuid"
)

// RefreshToken represents a refresh token entity
type RefreshToken struct {
	ID           uuid.UUID  `json:"id"`
	UserID       uuid.UUID  `json:"user_id"`
	TokenHash    string     `json:"-"` // Never exposed in JSON
	CreatedAt    time.Time  `json:"created_at"`
	ExpiresAt    time.Time  `json:"expires_at"`
	Revoked      bool       `json:"revoked"`
	ReplacedByID *uuid.UUID `json:"replaced_by_id,omitempty"`
	IPAddress    *string    `json:"ip_address,omitempty"`
	UserAgent    *string    `json:"user_agent,omitempty"`
}

// NewRefreshToken creates a new refresh token entity
func NewRefreshToken(userID uuid.UUID, tokenHash string, expiresAt time.Time) *RefreshToken {
	return &RefreshToken{
		ID:        userID,
		TokenHash: tokenHash,
		CreatedAt: time.Now(),
		ExpiresAt: expiresAt,
		Revoked:   false,
	}
}

// TableName returns the database table name
func (rt *RefreshToken) TableName() string {
	return "refresh_tokens"
}

// IsExpired checks if the token is expired
func (rt *RefreshToken) IsExpired() bool {
	return time.Now().After(rt.ExpiresAt)
}

// IsValid checks if the token is valid (not expired and not revoked)
func (rt *RefreshToken) IsValid() bool {
	return !rt.IsExpired() && !rt.Revoked
}
