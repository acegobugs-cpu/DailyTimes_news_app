package repositories

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"

	"app/internal/domain/entities"
	"app/internal/infra/database"
	"app/internal/pkg/errors"
)

// CategoryRepository implements CategoryRepository interface
type CategoryRepository struct {
	db *database.Postgres
}

// NewCategoryRepository creates a new category repository
func NewCategoryRepository(db *database.Postgres) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) Create(ctx context.Context, category *entities.Category) error {
	query := `
		INSERT INTO categories (name, slug)
		VALUES ($1, $2)
		RETURNING id
	`
	err := r.db.QueryRow(ctx, query, category.Name, category.Slug).Scan(&category.ID)

	if err != nil {
		return fmt.Errorf("failed to create category: %w", err)
	}
	return nil
}

func (r *CategoryRepository) FindByID(ctx context.Context, id int64) (*entities.Category, error) {
	query := `SELECT id, name, slug FROM categories WHERE id = $1`
	category := &entities.Category{}
	err := r.db.QueryRow(ctx, query, id).Scan(&category.ID, &category.Name, &category.Slug)

	if err == pgx.ErrNoRows {
		return nil, errors.ErrResourceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find category by ID: %w", err)
	}
	return category, nil
}

func (r *CategoryRepository) FindBySlug(ctx context.Context, slug string) (*entities.Category, error) {
	query := `SELECT id, name, slug FROM categories WHERE slug = $1`
	category := &entities.Category{}
	err := r.db.QueryRow(ctx, query, slug).Scan(&category.ID, &category.Name, &category.Slug)

	if err == pgx.ErrNoRows {
		return nil, errors.ErrResourceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find category by slug: %w", err)
	}
	return category, nil
}

func (r *CategoryRepository) FindByName(ctx context.Context, name string) (*entities.Category, error) {
	query := `SELECT id, name, slug FROM categories WHERE name = $1`
	category := &entities.Category{}
	err := r.db.QueryRow(ctx, query, name).Scan(&category.ID, &category.Name, &category.Slug)

	if err == pgx.ErrNoRows {
		return nil, errors.ErrResourceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find category by name: %w", err)
	}
	return category, nil
}

func (r *CategoryRepository) Update(ctx context.Context, category *entities.Category) error {
	query := `UPDATE categories SET name = $2, slug = $3 WHERE id = $1`
	err := r.db.Exec(ctx, query, category.ID, category.Name, category.Slug)

	if err != nil {
		return fmt.Errorf("failed to update category: %w", err)
	}
	return nil
}

func (r *CategoryRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM categories WHERE id = $1`
	err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete category: %w", err)
	}
	return nil
}

func (r *CategoryRepository) List(ctx context.Context) ([]*entities.Category, error) {
	query := `SELECT id, name, slug FROM categories ORDER BY name`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list categories: %w", err)
	}
	defer rows.Close()

	var categories []*entities.Category
	for rows.Next() {
		category := &entities.Category{}
		err := rows.Scan(&category.ID, &category.Name, &category.Slug)
		if err != nil {
			return nil, fmt.Errorf("failed to scan category: %w", err)
		}
		categories = append(categories, category)
	}

	return categories, nil
}

func (r *CategoryRepository) ExistsBySlug(ctx context.Context, slug string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM categories WHERE slug = $1)`
	var exists bool
	err := r.db.QueryRow(ctx, query, slug).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check slug existence: %w", err)
	}
	return exists, nil
}

func (r *CategoryRepository) ExistsByName(ctx context.Context, name string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM categories WHERE name = $1)`
	var exists bool
	err := r.db.QueryRow(ctx, query, name).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check name existence: %w", err)
	}
	return exists, nil
}
