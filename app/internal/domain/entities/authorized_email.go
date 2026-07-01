package entities

import (
	"time"

	"github.com/google/uuid"
)

// AuthorizedEmail represents an authorized email entity
type AuthorizedEmail struct {
	ID        uuid.UUID  `json:"id"`
	Slug      string     `json:"slug"`
	Email     string     `json:"email"`
	Used      bool       `json:"used"`
	CreatedAt time.Time  `json:"created_at"`
	InviterID *uuid.UUID `json:"inviter_id,omitempty"`
}

// NewAuthorizedEmail creates a new authorized email entity
func NewAuthorizedEmail(email string) *AuthorizedEmail {
	return &AuthorizedEmail{
		ID:        uuid.New(),
		Slug:      uuid.New().String(),
		Email:     email,
		Used:      false,
		CreatedAt: time.Now(),
	}
}

// TableName returns the database table name
func (ae *AuthorizedEmail) TableName() string {
	return "authorized_emails"
}
