package repositories

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"app/internal/domain/entities"
	"app/internal/infra/database"
	"app/internal/pkg/errors"
)

// AuthorizedEmailRepository implements AuthorizedEmailRepository interface
type AuthorizedEmailRepository struct {
	db *database.Postgres
}

// NewAuthorizedEmailRepository creates a new authorized email repository
func NewAuthorizedEmailRepository(db *database.Postgres) *AuthorizedEmailRepository {
	return &AuthorizedEmailRepository{db: db}
}

func (r *AuthorizedEmailRepository) Create(ctx context.Context, email *entities.AuthorizedEmail) error {
	query := `
		INSERT INTO authorized_emails (slug, email, used, created_at, inviter_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`
	err := r.db.QueryRow(ctx, query,
		email.Slug,
		email.Email,
		email.Used,
		email.CreatedAt,
		email.InviterID,
	).Scan(&email.ID)

	if err != nil {
		return fmt.Errorf("failed to create authorized email: %w", err)
	}
	return nil
}

func (r *AuthorizedEmailRepository) FindByID(ctx context.Context, id int64) (*entities.AuthorizedEmail, error) {
	query := `SELECT id, slug, email, used, created_at, inviter_id FROM authorized_emails WHERE id = $1`
	email := &entities.AuthorizedEmail{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&email.ID,
		&email.Slug,
		&email.Email,
		&email.Used,
		&email.CreatedAt,
		&email.InviterID,
	)

	if err == pgx.ErrNoRows {
		return nil, errors.ErrResourceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find authorized email by ID: %w", err)
	}
	return email, nil
}

func (r *AuthorizedEmailRepository) FindBySlug(ctx context.Context, slug string) (*entities.AuthorizedEmail, error) {
	query := `SELECT id, slug, email, used, created_at, inviter_id FROM authorized_emails WHERE slug = $1`
	email := &entities.AuthorizedEmail{}
	err := r.db.QueryRow(ctx, query, slug).Scan(
		&email.ID,
		&email.Slug,
		&email.Email,
		&email.Used,
		&email.CreatedAt,
		&email.InviterID,
	)

	if err == pgx.ErrNoRows {
		return nil, errors.ErrResourceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find authorized email by slug: %w", err)
	}
	return email, nil
}

func (r *AuthorizedEmailRepository) FindByEmail(ctx context.Context, email string) (*entities.AuthorizedEmail, error) {
	query := `SELECT id, slug, email, used, created_at, inviter_id FROM authorized_emails WHERE email = $1`
	authEmail := &entities.AuthorizedEmail{}
	err := r.db.QueryRow(ctx, query, email).Scan(
		&authEmail.ID,
		&authEmail.Slug,
		&authEmail.Email,
		&authEmail.Used,
		&authEmail.CreatedAt,
		&authEmail.InviterID,
	)

	if err == pgx.ErrNoRows {
		return nil, errors.ErrResourceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find authorized email by email: %w", err)
	}
	return authEmail, nil
}

func (r *AuthorizedEmailRepository) Update(ctx context.Context, email *entities.AuthorizedEmail) error {
	query := `UPDATE authorized_emails SET used = $2 WHERE id = $1`
	err := r.db.Exec(ctx, query, email.ID, email.Used)

	if err != nil {
		return fmt.Errorf("failed to update authorized email: %w", err)
	}
	return nil
}

func (r *AuthorizedEmailRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM authorized_emails WHERE id = $1`
	err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete authorized email: %w", err)
	}
	return nil
}

func (r *AuthorizedEmailRepository) List(ctx context.Context) ([]*entities.AuthorizedEmail, error) {
	query := `SELECT id, slug, email, used, created_at, inviter_id FROM authorized_emails ORDER BY created_at DESC`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list authorized emails: %w", err)
	}
	defer rows.Close()

	var emails []*entities.AuthorizedEmail
	for rows.Next() {
		email := &entities.AuthorizedEmail{}
		err := rows.Scan(
			&email.ID,
			&email.Slug,
			&email.Email,
			&email.Used,
			&email.CreatedAt,
			&email.InviterID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan authorized email: %w", err)
		}
		emails = append(emails, email)
	}

	return emails, nil
}

func (r *AuthorizedEmailRepository) MarkAsUsed(ctx context.Context, id int64) error {
	query := `UPDATE authorized_emails SET used = true WHERE id = $1`
	err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to mark authorized email as used: %w", err)
	}
	return nil
}

func (r *AuthorizedEmailRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM authorized_emails WHERE email = $1)`
	var exists bool
	err := r.db.QueryRow(ctx, query, email).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check email existence: %w", err)
	}
	return exists, nil
}

func (r *AuthorizedEmailRepository) ExistsBySlug(ctx context.Context, slug string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM authorized_emails WHERE slug = $1)`
	var exists bool
	err := r.db.QueryRow(ctx, query, slug).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check slug existence: %w", err)
	}
	return exists, nil
}
