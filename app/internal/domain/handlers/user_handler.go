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

func (h *UserHandler) Invite(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 1. Parse incoming request body
	var req services.RegisterRequest
	if err := h.handler.ParseJSON(r, &req); err != nil {
		h.handler.RespondError(w, errors.ErrBadRequest)
		return
	}

	// Extract inviter ID from JWT auth context middleware
	inviterID, ok := h.handler.GetUserIDFromContext(r)
	if !ok {
		h.handler.RespondError(w, errors.ErrUnauthorized)
		return
	}

	// Delegate ALL storage work to your Service LayerPostgres + Redis)
	err := h.userService.SavePendingUser(ctx, req, inviterID)
	if err != nil {
		// The error was built inside the service, pass it back to the client
		h.handler.RespondError(w, err)
		return
	}

	// Respond back to HR acknowledging invitation sent
	h.handler.RespondJSON(w, http.StatusAccepted, map[string]string{
		"message": "Invitation link sent successfully",
	})
}

func (h *UserHandler) GetInvitationList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// Deserialize JSON back into struct
	pendingUser, err := h.userService.ListInvitations(ctx)
	if err != nil {
		// The error was built inside the service, pass it back to the client
		h.handler.RespondError(w, err)
		return
	}

	// Return the data to the user's UI screen (omitting roles if they shouldn't see them)
	h.handler.RespondJSON(w, http.StatusOK, pendingUser)
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
