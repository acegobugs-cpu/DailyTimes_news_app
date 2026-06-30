package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"app/internal/infra/caching"

	"app/internal/domain/services"
	"app/internal/pkg/errors"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// UserHandler handles user HTTP requests
type UserHandler struct {
	handler     *Handler
	userService *services.UserService
	Cache       *caching.RedisCache
}

// NewUserHandler creates a new user handler
func NewUserHandler(userService *services.UserService, cache *caching.RedisCache) *UserHandler {
	return &UserHandler{
		handler:     NewHandler(),
		userService: userService,
		Cache:       cache,
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

	// TODO: Extract this from your JWT auth context middleware once ready!
	// For now, using a temporary dummy UUID to represent the HR Administrator inviting them.
	inviterID := uuid.New()

	// 3. Delegate ALL storage work to your Service Layer (Postgres + Redis)
	ttl := 24 * time.Hour
	err := h.userService.SavePendingUser(ctx, req, inviterID, ttl)
	if err != nil {
		// The error was built inside the service, pass it back to the client
		h.handler.RespondError(w, err)
		return
	}

	// 6. Respond back to HR acknowledging invitation sent
	h.handler.RespondJSON(w, http.StatusAccepted, map[string]string{
		"message": "Invitation link sent successfully",
	})

}

func (h *UserHandler) GetPendingRegistration(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "token is required", http.StatusBadRequest)
		return
	}

	redisKey := fmt.Sprintf("registration:token:%s", token)

	// Fetch from Redis
	val, err := h.Cache.Client.Get(ctx, redisKey).Result()
	if err == redis.Nil {
		// Token doesn't exist or expired
		http.Error(w, "invalid or expired registration link", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "database error", http.StatusInternalServerError)
		return
	}

	// Deserialize JSON back into struct
	var pendingUser services.RegisterRequest
	if err := json.Unmarshal([]byte(val), &pendingUser); err != nil {
		http.Error(w, "failed to parse registration data", http.StatusInternalServerError)
		return
	}

	// Return the data to the user's UI screen (omitting roles if they shouldn't see them)
	h.handler.RespondJSON(w, http.StatusOK, pendingUser)
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
