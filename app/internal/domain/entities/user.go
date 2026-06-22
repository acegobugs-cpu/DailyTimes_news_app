package entities

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user entity
type User struct {
	ID          int64     `json:"id"`
	UID         string    `json:"uid"`
	FirstName   string    `json:"fname"`
	MiddleName  *string   `json:"mname,omitempty"`
	LastName    string    `json:"lname"`
	Username    string    `json:"uname"`
	Email       string    `json:"email"`
	PasswordHash string   `json:"-"` // Never exposed in JSON
	IsSuperuser bool      `json:"is_superuser"`
	CreatedAt   time.Time `json:"created_at"`
}

// NewUser creates a new user entity
func NewUser(firstName, lastName, username, email, passwordHash string) *User {
	return &User{
		UID:         uuid.New().String(),
		FirstName:   firstName,
		LastName:    lastName,
		Username:    username,
		Email:       email,
		PasswordHash: passwordHash,
		IsSuperuser: false,
		CreatedAt:   time.Now(),
	}
}

// TableName returns the database table name
func (u *User) TableName() string {
	return "users"
}
