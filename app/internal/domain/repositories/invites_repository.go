package repositories

import (
	"app/internal/domain/entities"
	"app/internal/infra/database"
	"context"
	"fmt"
)

type InvitesRepository struct {
	db *database.Postgres
}

func NewInvitesRepository(db *database.Postgres) *InvitesRepository {
	return &InvitesRepository{db: db}
}

func (r *InvitesRepository) Create(ctx context.Context, invite *entities.Invites) error {
	query := `
		INSERT INTO invites (fname, mname, lname, email, phone, roleIds, status, inviter_id, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at
	`
	err := r.db.QueryRow(ctx, query,
		invite.Fname,
		invite.Mname,
		invite.Lname,
		invite.Email,
		invite.Phone,
		invite.RoleIDs,
		invite.Status,
		invite.InviterID,
		*invite.ExpiresAt,
	).Scan(&invite.ID, &invite.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create invite: %w", err)
	}
	return nil
}
