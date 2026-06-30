package repositories

import (
	"app/internal/domain/entities"
	"app/internal/infra/database"
	"app/internal/pkg/errors"
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

func (r *InvitesRepository) List(ctx context.Context) ([]*entities.Invites, error) {
	query := `
		SELECT id, fname, mname, lname, email, phone, status, roleIds, inviter_id
		FROM invites ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		errors.ErrBadRequest.W("", "").Log(ctx, err)
		return nil, fmt.Errorf("failed to list invites: %w", err)
	}
	defer rows.Close()

	var invites []*entities.Invites
	for rows.Next() {
		invite := &entities.Invites{}
		err := rows.Scan(
			&invite.ID,
			&invite.Fname,
			&invite.Mname,
			&invite.Lname,
			&invite.Email,
			&invite.Phone,
			&invite.Status,
			&invite.RoleIDs,
			&invite.InviterID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		invites = append(invites, invite)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate invites: %w", err)
	}

	return invites, nil
}
