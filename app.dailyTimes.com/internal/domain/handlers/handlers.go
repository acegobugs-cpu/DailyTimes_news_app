package handlers

import (
	"encoding/json"
	"net/http"

	"app/internal/pkg/errors"
)

// Response represents a standard API response
type Response struct {
	Success bool   `json:"success"`
	Code    int    `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
}

// Handler represents an HTTP handler
type Handler struct{}

// NewHandler creates a new HTTP handler
func NewHandler() *Handler {
	return &Handler{}
}

// RespondJSON writes a JSON response
func (h *Handler) RespondJSON(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := Response{
		Success: statusCode >= 200 && statusCode < 300,
		Data:    data,
	}

	json.NewEncoder(w).Encode(response)
}

// RespondError writes an error response
func (h *Handler) RespondError(w http.ResponseWriter, err error) {
	appErr := errors.FromAppError(err)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.GetStatusCode())

	response := Response{
		Success: false,
		Code:    appErr.Code,
		Message: appErr.Message,
	}

	json.NewEncoder(w).Encode(response)
}

// ParseJSON parses JSON request body
func (h *Handler) ParseJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}

// GetUserIDFromContext gets user ID from context
func (h *Handler) GetUserIDFromContext(r *http.Request) (int64, bool) {
	userID, ok := r.Context().Value("user_id").(int64)
	return userID, ok
}

// GetRequestID gets request ID from context
func (h *Handler) GetRequestID(r *http.Request) string {
	requestID, ok := r.Context().Value("request_id").(string)
	if !ok {
		return ""
	}
	return requestID
}
