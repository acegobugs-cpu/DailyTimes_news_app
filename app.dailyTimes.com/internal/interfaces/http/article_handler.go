package http

import (
	"net/http"

	"app/internal/domain/entities"
	"app/internal/domain/services"
	"app/internal/pkg/errors"
)

// ArticleHandler handles article HTTP requests
type ArticleHandler struct {
	handler        *Handler
	articleService *services.ArticleService
}

// NewArticleHandler creates a new article handler
func NewArticleHandler(articleService *services.ArticleService) *ArticleHandler {
	return &ArticleHandler{
		handler:        NewHandler(),
		articleService: articleService,
	}
}

// CreateArticleRequest represents a create article request
type CreateArticleRequest struct {
	Tag          string                 `json:"tag"`
	Media        map[string]interface{} `json:"media,omitempty"`
	CategoryIDs  []int64                `json:"category_ids"`
	Translations []ArticleLocaleRequest `json:"translations"`
}

// ArticleLocaleRequest represents an article locale request
type ArticleLocaleRequest struct {
	Locale      string                 `json:"locale"`
	Title       string                 `json:"title"`
	Slug        string                 `json:"slug"`
	Description string                 `json:"description"`
	Content     map[string]interface{} `json:"content,omitempty"`
}

// CreateArticle handles creating a new article
func (h *ArticleHandler) CreateArticle(w http.ResponseWriter, r *http.Request) {
	var req CreateArticleRequest
	if err := h.handler.ParseJSON(r, &req); err != nil {
		h.handler.RespondError(w, errors.ErrInvalidInput)
		return
	}

	// Get editor ID from context
	editorID, ok := h.handler.GetUserIDFromContext(r)
	if !ok {
		h.handler.RespondError(w, errors.ErrUnauthorized)
		return
	}

	// Create article entity
	article := entities.NewArticle(req.Tag, req.Media)

	// Create locales
	for _, transReq := range req.Translations {
		locale := entities.NewArticleLocale(0, editorID, transReq.Locale, transReq.Title, transReq.Slug, transReq.Description)
		locale.Content = transReq.Content
		article.Translations = append(article.Translations, locale)
	}

	if err := h.articleService.CreateArticle(r.Context(), article, req.CategoryIDs); err != nil {
		h.handler.RespondError(w, err)
		return
	}

	h.handler.RespondJSON(w, http.StatusCreated, article)
}

// GetArticle handles getting an article by ID
func (h *ArticleHandler) GetArticle(w http.ResponseWriter, r *http.Request) {
	// Extract article ID from URL params
	// For now, this is a placeholder
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Get article endpoint"})
}

// GetArticleBySlug handles getting an article by slug
func (h *ArticleHandler) GetArticleBySlug(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Get article by slug endpoint"})
}

// UpdateArticle handles updating an article
func (h *ArticleHandler) UpdateArticle(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Update article endpoint"})
}

// DeleteArticle handles deleting an article
func (h *ArticleHandler) DeleteArticle(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Delete article endpoint"})
}

// ListArticles handles listing all articles
func (h *ArticleHandler) ListArticles(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "List articles endpoint"})
}

// SearchArticles handles searching articles
func (h *ArticleHandler) SearchArticles(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Search articles endpoint"})
}
