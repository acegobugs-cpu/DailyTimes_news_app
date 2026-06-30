package entities

import (
	"time"

	"github.com/google/uuid"
)

type Invites struct {
	ID        uuid.UUID  `json:"id"`
	Fname     string     `json:"firstName"`
	Mname     string     `json:"middleName"`
	Lname     string     `json:"lastName"`
	Email     string     `json:"email"`
	Phone     string     `json:"phone"`
	RoleIDs   []string   `json:"roleIds"` // Stored as JSONB or text array in DB
	Status    string     `json:"status"`  // "PENDING", "COMPLETED", "EXPIRED"
	InviterID uuid.UUID  `json:"inviterId"`
	CreatedAt time.Time  `json:"createdAt"`
	ExpiresAt *time.Time `json:"expiresAt"`
	DeletedAt time.Time  `json:"deletedAt"`
}

// NewAuthorizedEmail creates a new authorized email entity
func NewInvites(fname, mname, lname, email, phone string, roleIds []string, status string, inviter uuid.UUID, expyry *time.Time) *Invites {
	return &Invites{
		Fname:     fname,
		Mname:     mname,
		Lname:     lname,
		Email:     email,
		Phone:     phone,
		RoleIDs:   roleIds,
		Status:    status,
		InviterID: inviter,
		ExpiresAt: expyry,
	}
}

// TableName returns the database table name
func (ae *Invites) TableName() string {
	return "invites"
}
