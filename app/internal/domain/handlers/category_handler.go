package handlers

import (
	"net/http"

	"app/internal/domain/services"
	"app/internal/pkg/errors"
)

// CategoryHandler handles category HTTP requests
type CategoryHandler struct {
	handler         *Handler
	categoryService *services.CategoryService
}

// NewCategoryHandler creates a new category handler
func NewCategoryHandler(categoryService *services.CategoryService) *CategoryHandler {
	return &CategoryHandler{
		handler:         NewHandler(),
		categoryService: categoryService,
	}
}

// CreateCategoryRequest represents a create category request
type CreateCategoryRequest struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}

// CreateCategory handles creating a new category
func (h *CategoryHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var req CreateCategoryRequest
	if err := h.handler.ParseJSON(r, &req); err != nil {
		h.handler.RespondError(w, errors.ErrInvalidInput)
		return
	}

	category, err := h.categoryService.CreateCategory(r.Context(), req.Name, req.Slug)
	if err != nil {
		h.handler.RespondError(w, err)
		return
	}

	h.handler.RespondJSON(w, http.StatusCreated, category)
}

// GetCategory handles getting a category by ID
func (h *CategoryHandler) GetCategory(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Get category endpoint"})
}

// GetCategoryBySlug handles getting a category by slug
func (h *CategoryHandler) GetCategoryBySlug(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Get category by slug endpoint"})
}

// UpdateCategory handles updating a category
func (h *CategoryHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Update category endpoint"})
}

// DeleteCategory handles deleting a category
func (h *CategoryHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Delete category endpoint"})
}

// ListCategories handles listing all categories
func (h *CategoryHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.categoryService.ListCategories(r.Context())
	if err != nil {
		h.handler.RespondError(w, err)
		return
	}

	h.handler.RespondJSON(w, http.StatusOK, categories)
}
