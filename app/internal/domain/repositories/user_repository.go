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

// UserRepository implements UserRepository interface
type UserRepository struct {
	db *database.Postgres
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *database.Postgres) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *entities.User) error {
	query := `
		INSERT INTO users (fname, lname, uname, email, phone,  h_password)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`
	err := r.db.QueryRow(ctx, query,
		user.FirstName,
		user.LastName,
		user.Username,
		user.Email,
		user.Phone,
		user.PasswordHash,
	).Scan(&user.ID)

	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*entities.User, error) {
	query := `
		SELECT id, uid, fname, mname, lname, uname, email, h_password, is_superuser, created_at
		FROM users WHERE id = $1
	`
	user := &entities.User{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.CreatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, errors.ErrResourceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by ID: %w", err)
	}
	return user, nil
}

func (r *UserRepository) FindByUID(ctx context.Context, uid string) (*entities.User, error) {
	query := `
		SELECT id, uid, fname, mname, lname, uname, email, h_password, is_superuser, created_at
		FROM users WHERE uid = $1
	`
	user := &entities.User{}
	err := r.db.QueryRow(ctx, query, uid).Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.CreatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, errors.ErrResourceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by UID: %w", err)
	}
	return user, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*entities.User, error) {
	query := `
		SELECT id, uid, fname, mname, lname, uname, email, h_password, is_superuser, created_at
		FROM users WHERE email = $1
	`
	user := &entities.User{}
	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID,

		&user.FirstName,
		&user.LastName,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.CreatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, errors.ErrResourceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by email: %w", err)
	}
	return user, nil
}

func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*entities.User, error) {
	query := `
		SELECT id, uid, fname, mname, lname, uname, email, h_password, is_superuser, created_at
		FROM users WHERE uname = $1
	`
	user := &entities.User{}
	err := r.db.QueryRow(ctx, query, username).Scan(
		&user.ID,

		&user.FirstName,
		&user.LastName,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.CreatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, errors.ErrResourceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by username: %w", err)
	}
	return user, nil
}

func (r *UserRepository) FindByEmailOrUsername(ctx context.Context, emailOrUsername string) (*entities.User, error) {
	query := `
		SELECT id, uid, fname, mname, lname, uname, email, h_password, is_superuser, created_at
		FROM users WHERE email = $1 OR uname = $1
	`
	user := &entities.User{}
	err := r.db.QueryRow(ctx, query, emailOrUsername).Scan(
		&user.ID,

		&user.FirstName,
		&user.LastName,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.CreatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, errors.ErrResourceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by email or username: %w", err)
	}
	return user, nil
}

func (r *UserRepository) Update(ctx context.Context, user *entities.User) error {
	query := `
		UPDATE users 
		SET fname = $2, mname = $3, lname = $4, uname = $5, email = $6, h_password = $7, is_superuser = $8
		WHERE id = $1
	`
	err := r.db.Exec(ctx, query,
		user.ID,
		user.FirstName,
		user.LastName,
		user.Username,
		user.Email,
		user.PasswordHash,
	)

	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	return nil
}

func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	return nil
}

func (r *UserRepository) List(ctx context.Context, limit, offset int) ([]*entities.User, error) {
	query := `
		SELECT id, uid, fname, mname, lname, uname, email, h_password, is_superuser, created_at
		FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	var users []*entities.User
	for rows.Next() {
		user := &entities.User{}
		err := rows.Scan(
			&user.ID,

			&user.FirstName,
			&user.LastName,
			&user.Username,
			&user.Email,
			&user.PasswordHash,
			&user.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}

	return users, nil
}

func (r *UserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`
	var exists bool
	err := r.db.QueryRow(ctx, query, email).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check email existence: %w", err)
	}
	return exists, nil
}

func (r *UserRepository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE uname = $1)`
	var exists bool
	err := r.db.QueryRow(ctx, query, username).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check username existence: %w", err)
	}
	return exists, nil
}
