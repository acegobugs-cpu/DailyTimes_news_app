package entities

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user entity
type User struct {
	ID           uuid.UUID `json:"id"`
	FirstName    string    `json:"fname"`
	LastName     string    `json:"lname"`
	Username     string    `json:"uname"`
	Email        string    `json:"email"`
	Phone        string    `json:"phone"`
	PasswordHash string    `json:"-"` // Never exposed in JSON
	CreatedAt    time.Time `json:"created_at"`
}

// NewUser creates a new user entity
func NewUser(firstName, lastName, username, email, phone, passwordHash string) *User {
	return &User{
		FirstName:    firstName,
		LastName:     lastName,
		Username:     username,
		Email:        email,
		Phone:        phone,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now(),
	}
}

// TableName returns the database table name
func (u *User) TableName() string {
	return "users"
}
