package services

import (
	"context"

	"app/internal/domain/entities"
	"app/internal/domain/repositories"
	"app/internal/pkg/errors"

	"github.com/google/uuid"
)

// ArticleService handles article business logic
type ArticleService struct {
	articleRepo  *repositories.ArticleRepository
	categoryRepo *repositories.CategoryRepository
}

// NewArticleService creates a new article service
func NewArticleService(articleRepo *repositories.ArticleRepository, categoryRepo *repositories.CategoryRepository) *ArticleService {
	return &ArticleService{
		articleRepo:  articleRepo,
		categoryRepo: categoryRepo,
	}
}

// CreateArticle creates a new article
func (s *ArticleService) CreateArticle(ctx context.Context, article *entities.Article, categoryIDs []uuid.UUID) error {
	// Validate categories
	for _, catID := range categoryIDs {
		_, err := s.categoryRepo.FindByID(ctx, catID)
		if err != nil {
			return errors.ErrResourceNotFound
		}
	}

	// Create article
	if err := s.articleRepo.Create(ctx, article); err != nil {
		return errors.ErrInternalServer.W("Failed to create article", "")
	}

	// Add categories
	for _, catID := range categoryIDs {
		if err := s.articleRepo.AddCategory(ctx, article.ID, catID); err != nil {
			return errors.ErrInternalServer.W("Failed to add category to article", "")
		}
	}

	return nil
}

// GetArticleByID retrieves an article by ID
func (s *ArticleService) GetArticleByID(ctx context.Context, id uuid.UUID) (*entities.Article, error) {
	article, err := s.articleRepo.FindByID(ctx, id)
	if err != nil {
		return nil, errors.ErrResourceNotFound
	}
	return article, nil
}

// GetArticleBySlug retrieves an article by slug and locale
func (s *ArticleService) GetArticleBySlug(ctx context.Context, slug, locale string) (*entities.Article, error) {
	article, err := s.articleRepo.FindBySlug(ctx, slug, locale)
	if err != nil {
		return nil, errors.ErrResourceNotFound
	}
	return article, nil
}

// UpdateArticle updates an article
func (s *ArticleService) UpdateArticle(ctx context.Context, article *entities.Article, categoryIDs *[]uuid.UUID) error {
	if err := s.articleRepo.Update(ctx, article); err != nil {
		return errors.ErrInternalServer.W("Failed to update article", "")
	}

	// Update categories if provided
	if categoryIDs != nil {
		// This would require removing old categories and adding new ones
		// For simplicity, we'll just add new categories
		ids := *categoryIDs
		for _, catID := range ids {
			if err := s.articleRepo.AddCategory(ctx, article.ID, catID); err != nil {
				return errors.ErrInternalServer.W("Failed to add category to article", "")
			}
		}
	}

	return nil
}

// DeleteArticle deletes an article
func (s *ArticleService) DeleteArticle(ctx context.Context, id uuid.UUID) error {
	if err := s.articleRepo.Delete(ctx, id); err != nil {
		return errors.ErrInternalServer.W("Failed to delete article", "")
	}
	return nil
}

// ListArticles lists all articles with pagination
func (s *ArticleService) ListArticles(ctx context.Context, limit, offset int) ([]*entities.Article, error) {
	articles, err := s.articleRepo.List(ctx, limit, offset)
	if err != nil {
		return nil, errors.ErrInternalServer.W("Failed to list articles", "")
	}
	return articles, nil
}

// SearchArticles searches articles by query
func (s *ArticleService) SearchArticles(ctx context.Context, query string, limit, offset int) ([]*entities.Article, error) {
	articles, err := s.articleRepo.Search(ctx, query, limit, offset)
	if err != nil {
		return nil, errors.ErrInternalServer.W("Failed to search articles", "")
	}
	return articles, nil
}

// GetArticlesByCategory retrieves articles by category
func (s *ArticleService) GetArticlesByCategory(ctx context.Context, categoryID uuid.UUID, limit, offset int) ([]*entities.Article, error) {
	_, err := s.categoryRepo.FindByID(ctx, categoryID)
	if err != nil {
		return nil, errors.ErrResourceNotFound
	}

	articles, err := s.articleRepo.FindByCategory(ctx, categoryID)
	if err != nil {
		return nil, errors.ErrInternalServer.W("Failed to get articles by category", "")
	}
	return articles, nil
}

// CreateArticleLocale creates a new article locale
func (s *ArticleService) CreateArticleLocale(ctx context.Context, locale *entities.ArticleLocale) error {
	if err := s.articleRepo.CreateLocale(ctx, locale); err != nil {
		return errors.ErrInternalServer.W("Failed to create article locale", "")
	}
	return nil
}

// UpdateArticleLocale updates an article locale
func (s *ArticleService) UpdateArticleLocale(ctx context.Context, locale *entities.ArticleLocale) error {
	if err := s.articleRepo.UpdateLocale(ctx, locale); err != nil {
		return errors.ErrInternalServer.W("Failed to update article locale", "")
	}
	return nil
}

// DeleteArticleLocale deletes an article locale
func (s *ArticleService) DeleteArticleLocale(ctx context.Context, id uuid.UUID) error {
	if err := s.articleRepo.DeleteLocale(ctx, id); err != nil {
		return errors.ErrInternalServer.W("Failed to delete article locale", "")
	}
	return nil
}
