package services

import (
	"context"
	"net/http"

	"app/internal/domain/entities"
	"app/internal/domain/repositories"
	"app/internal/pkg/errors"
)

// CategoryService handles category business logic
type CategoryService struct {
	categoryRepo *repositories.CategoryRepository
}

// NewCategoryService creates a new category service
func NewCategoryService(categoryRepo *repositories.CategoryRepository) *CategoryService {
	return &CategoryService{
		categoryRepo: categoryRepo,
	}
}

// CreateCategory creates a new category
func (s *CategoryService) CreateCategory(ctx context.Context, name, slug string) (*entities.Category, error) {
	// Check if slug already exists
	exists, err := s.categoryRepo.ExistsBySlug(ctx, slug)
	if err != nil {
		return nil, errors.Wrap(err, 0, "Failed to check slug existence", http.StatusInternalServerError)
	}
	if exists {
		return nil, errors.ErrConflict
	}

	// Check if name already exists
	exists, err = s.categoryRepo.ExistsByName(ctx, name)
	if err != nil {
		return nil, errors.Wrap(err, 0, "Failed to check name existence", http.StatusInternalServerError)
	}
	if exists {
		return nil, errors.ErrConflict
	}

	category := entities.NewCategory(name, slug)
	if err := s.categoryRepo.Create(ctx, category); err != nil {
		return nil, errors.Wrap(err, 0, "Failed to create category", http.StatusInternalServerError)
	}

	return category, nil
}

// GetCategoryByID retrieves a category by ID
func (s *CategoryService) GetCategoryByID(ctx context.Context, id int64) (*entities.Category, error) {
	category, err := s.categoryRepo.FindByID(ctx, id)
	if err != nil {
		return nil, errors.ErrResourceNotFound
	}
	return category, nil
}

// GetCategoryBySlug retrieves a category by slug
func (s *CategoryService) GetCategoryBySlug(ctx context.Context, slug string) (*entities.Category, error) {
	category, err := s.categoryRepo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, errors.ErrResourceNotFound
	}
	return category, nil
}

// UpdateCategory updates a category
func (s *CategoryService) UpdateCategory(ctx context.Context, category *entities.Category) error {
	if err := s.categoryRepo.Update(ctx, category); err != nil {
		return errors.Wrap(err, 0, "Failed to update category", http.StatusInternalServerError)
	}
	return nil
}

// DeleteCategory deletes a category
func (s *CategoryService) DeleteCategory(ctx context.Context, id int64) error {
	if err := s.categoryRepo.Delete(ctx, id); err != nil {
		return errors.Wrap(err, 0, "Failed to delete category", http.StatusInternalServerError)
	}
	return nil
}

// ListCategories lists all categories
func (s *CategoryService) ListCategories(ctx context.Context) ([]*entities.Category, error) {
	categories, err := s.categoryRepo.List(ctx)
	if err != nil {
		return nil, errors.Wrap(err, 0, "Failed to list categories", http.StatusInternalServerError)
	}
	return categories, nil
}
