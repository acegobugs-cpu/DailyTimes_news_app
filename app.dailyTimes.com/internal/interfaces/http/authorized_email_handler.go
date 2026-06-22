package http

import (
	"net/http"

	"app/internal/domain/services"
	"app/internal/pkg/errors"
)

// AuthorizedEmailHandler handles authorized email HTTP requests
type AuthorizedEmailHandler struct {
	handler                *Handler
	authorizedEmailService *services.AuthorizedEmailService
}

// NewAuthorizedEmailHandler creates a new authorized email handler
func NewAuthorizedEmailHandler(authorizedEmailService *services.AuthorizedEmailService) *AuthorizedEmailHandler {
	return &AuthorizedEmailHandler{
		handler:                NewHandler(),
		authorizedEmailService: authorizedEmailService,
	}
}

// CreateAuthorizedEmailRequest represents a create authorized email request
type CreateAuthorizedEmailRequest struct {
	Email     string `json:"email"`
	InviterID int64  `json:"inviter_id,omitempty"`
}

// CreateAuthorizedEmail handles creating a new authorized email
func (h *AuthorizedEmailHandler) CreateAuthorizedEmail(w http.ResponseWriter, r *http.Request) {
	var req CreateAuthorizedEmailRequest
	if err := h.handler.ParseJSON(r, &req); err != nil {
		h.handler.RespondError(w, errors.ErrInvalidInput)
		return
	}

	// Get inviter ID from context if not provided
	inviterID := req.InviterID
	if inviterID == 0 {
		userID, ok := h.handler.GetUserIDFromContext(r)
		if !ok {
			h.handler.RespondError(w, errors.ErrUnauthorized)
			return
		}
		inviterID = userID
	}

	authEmail, err := h.authorizedEmailService.CreateAuthorizedEmail(r.Context(), req.Email, inviterID)
	if err != nil {
		h.handler.RespondError(w, err)
		return
	}

	h.handler.RespondJSON(w, http.StatusCreated, authEmail)
}

// GetAuthorizedEmail handles getting an authorized email by slug
func (h *AuthorizedEmailHandler) GetAuthorizedEmail(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Get authorized email endpoint"})
}

// ListAuthorizedEmails handles listing all authorized emails
func (h *AuthorizedEmailHandler) ListAuthorizedEmails(w http.ResponseWriter, r *http.Request) {
	emails, err := h.authorizedEmailService.ListAuthorizedEmails(r.Context())
	if err != nil {
		h.handler.RespondError(w, err)
		return
	}

	h.handler.RespondJSON(w, http.StatusOK, emails)
}

// MarkAsUsed handles marking an authorized email as used
func (h *AuthorizedEmailHandler) MarkAsUsed(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Mark as used endpoint"})
}

// DeleteAuthorizedEmail handles deleting an authorized email
func (h *AuthorizedEmailHandler) DeleteAuthorizedEmail(w http.ResponseWriter, r *http.Request) {
	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Delete authorized email endpoint"})
}
