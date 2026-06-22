package handlers

import (
	"net/http"

	"app/internal/domain/services"
	"app/internal/pkg/errors"
)

// UserHandler handles user HTTP requests
type UserHandler struct {
	handler     *Handler
	userService *services.UserService
}

// NewUserHandler creates a new user handler
func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{
		handler:     NewHandler(),
		userService: userService,
	}
}

// RegisterRequest represents a user registration request
type RegisterRequest struct {
	FirstName string `json:"fname"`
	LastName  string `json:"lname"`
	Username  string `json:"uname"`
	Email     string `json:"email"`
	Password  string `json:"password"`
}

// Register handles user registration
func (h *UserHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := h.handler.ParseJSON(r, &req); err != nil {
		h.handler.RespondError(w, errors.ErrInvalidInput)
		return
	}

	user, err := h.userService.Register(r.Context(), req.FirstName, req.LastName, req.Username, req.Email, req.Password)
	if err != nil {
		h.handler.RespondError(w, err)
		return
	}

	h.handler.RespondJSON(w, http.StatusCreated, user)
}

// GetUser handles getting a user by ID
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	// Extract user ID from URL params (would use chi URL params)
	// For now, this is a placeholder
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Get user endpoint"})
}

// UpdateUser handles updating a user
func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Update user endpoint"})
}

// DeleteUser handles deleting a user
func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Delete user endpoint"})
}

// ListUsers handles listing all users
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "List users endpoint"})
}
