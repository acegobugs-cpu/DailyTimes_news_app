package handlers

import (
	"encoding/json"
	"net/http"

	"app/internal/pkg/errors"

	"github.com/google/uuid"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

// RespondJSON handles all successful API responses using the unified layout
func (h *Handler) RespondJSON(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	// Maps exactly to the fields clients expect
	response := errors.AppError{
		Success:    true,
		StatusCode: statusCode,
		Data:       data,
	}

	json.NewEncoder(w).Encode(response)
}

// RespondError maps standard application failures to the exact same response structural layout
func (h *Handler) RespondError(w http.ResponseWriter, err error) {
	appErr := errors.FromAppError(err)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.GetStatusCode()) // Network HTTP response layer status code

	json.NewEncoder(w).Encode(appErr) // Encodes directly since it contains the right JSON tags
}

func (h *Handler) ParseJSON(r *http.Request, v interface{}) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 10<<20)
	return json.NewDecoder(r.Body).Decode(v)
}

func (h *Handler) GetUserIDFromContext(r *http.Request) (uuid.UUID, bool) {
	userID, ok := r.Context().Value("user_id").(uuid.UUID)
	return userID, ok
}

func (h *Handler) GetRequestID(r *http.Request) string {
	requestID, ok := r.Context().Value("request_id").(string)
	if !ok {
		return ""
	}
	return requestID
}
