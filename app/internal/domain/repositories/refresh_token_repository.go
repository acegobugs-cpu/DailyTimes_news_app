package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"app/internal/domain/entities"
	"app/internal/infra/database"
	"app/internal/pkg/errors"
)

// RefreshTokenRepository implements RefreshTokenRepository interface
type RefreshTokenRepository struct {
	db *database.Postgres
}

// NewRefreshTokenRepository creates a new refresh token repository
func NewRefreshTokenRepository(db *database.Postgres) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

func (r *RefreshTokenRepository) Create(ctx context.Context, token *entities.RefreshToken) error {
	query := `
		INSERT INTO refresh_tokens (user_id, token_hash, created_at, expires_at, revoked, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	err := r.db.QueryRow(ctx, query,
		token.ID,
		token.TokenHash,
		token.CreatedAt,
		token.ExpiresAt,
		token.Revoked,
		token.IPAddress,
		token.UserAgent,
	).Scan(&token.ID)

	if err != nil {
		return fmt.Errorf("failed to create refresh token: %w", err)
	}
	return nil
}

func (r *RefreshTokenRepository) FindByID(ctx context.Context, id uuid.UUID) (*entities.RefreshToken, error) {
	query := `
		SELECT id, user_id, token_hash, created_at, expires_at, revoked, replaced_by_id, ip_address, user_agent
		FROM refresh_tokens WHERE id = $1
	`
	token := &entities.RefreshToken{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&token.ID,
		&token.TokenHash,
		&token.CreatedAt,
		&token.ExpiresAt,
		&token.Revoked,
		&token.ReplacedByID,
		&token.IPAddress,
		&token.UserAgent,
	)

	if err == pgx.ErrNoRows {
		return nil, errors.ErrResourceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find refresh token by ID: %w", err)
	}
	return token, nil
}

func (r *RefreshTokenRepository) FindByTokenHash(ctx context.Context, tokenHash string) (*entities.RefreshToken, error) {
	query := `
		SELECT id, user_id, token_hash, created_at, expires_at, revoked, replaced_by_id, ip_address, user_agent
		FROM refresh_tokens WHERE token_hash = $1
	`
	token := &entities.RefreshToken{}
	err := r.db.QueryRow(ctx, query, tokenHash).Scan(
		&token.ID,
		&token.TokenHash,
		&token.CreatedAt,
		&token.ExpiresAt,
		&token.Revoked,
		&token.ReplacedByID,
		&token.IPAddress,
		&token.UserAgent,
	)

	if err == pgx.ErrNoRows {
		return nil, errors.ErrResourceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find refresh token by hash: %w", err)
	}
	return token, nil
}

func (r *RefreshTokenRepository) FindByUserID(ctx context.Context, userID uuid.UUID) ([]*entities.RefreshToken, error) {
	query := `
		SELECT id, user_id, token_hash, created_at, expires_at, revoked, replaced_by_id, ip_address, user_agent
		FROM refresh_tokens WHERE user_id = $1 ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to find refresh tokens by user ID: %w", err)
	}
	defer rows.Close()

	var tokens []*entities.RefreshToken
	for rows.Next() {
		token := &entities.RefreshToken{}
		err := rows.Scan(
			&token.ID,
			&token.TokenHash,
			&token.CreatedAt,
			&token.ExpiresAt,
			&token.Revoked,
			&token.ReplacedByID,
			&token.IPAddress,
			&token.UserAgent,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan refresh token: %w", err)
		}
		tokens = append(tokens, token)
	}

	return tokens, nil
}

func (r *RefreshTokenRepository) Update(ctx context.Context, token *entities.RefreshToken) error {
	query := `
		UPDATE refresh_tokens 
		SET revoked = $2, replaced_by_id = $3
		WHERE id = $1
	`
	err := r.db.Exec(ctx, query, token.ID, token.Revoked, token.ReplacedByID)

	if err != nil {
		return fmt.Errorf("failed to update refresh token: %w", err)
	}
	return nil
}

func (r *RefreshTokenRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM refresh_tokens WHERE id = $1`
	err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete refresh token: %w", err)
	}
	return nil
}

func (r *RefreshTokenRepository) Revoke(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE refresh_tokens SET revoked = true WHERE id = $1`
	err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to revoke refresh token: %w", err)
	}
	return nil
}

func (r *RefreshTokenRepository) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	query := `UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`
	err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to revoke all refresh tokens for user: %w", err)
	}
	return nil
}

func (r *RefreshTokenRepository) DeleteExpired(ctx context.Context) error {
	query := `DELETE FROM refresh_tokens WHERE expires_at < $1`
	err := r.db.Exec(ctx, query, time.Now())
	if err != nil {
		return fmt.Errorf("failed to delete expired refresh tokens: %w", err)
	}
	return nil
}

func (r *RefreshTokenRepository) Rotate(ctx context.Context, oldTokenID uuid.UUID, newToken *entities.RefreshToken) error {
	tx, err := r.db.BeginTx(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Revoke old token
	_, err = tx.Exec(ctx, `UPDATE refresh_tokens SET revoked = true WHERE id = $1`, oldTokenID)
	if err != nil {
		return fmt.Errorf("failed to revoke old token: %w", err)
	}

	// Create new token
	query := `
		INSERT INTO refresh_tokens (user_id, token_hash, created_at, expires_at, revoked, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	err = tx.QueryRow(ctx, query,
		newToken.ID,
		newToken.TokenHash,
		newToken.CreatedAt,
		newToken.ExpiresAt,
		newToken.Revoked,
		newToken.IPAddress,
		newToken.UserAgent,
	).Scan(&newToken.ID)

	if err != nil {
		return fmt.Errorf("failed to create new refresh token: %w", err)
	}

	// Set replaced_by_id on old token
	_, err = tx.Exec(ctx, `UPDATE refresh_tokens SET replaced_by_id = $2 WHERE id = $1`, oldTokenID, newToken.ID)
	if err != nil {
		return fmt.Errorf("failed to update old token reference: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}
