package errors

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// AppError represents a custom application error with HTTP status code
type AppError struct {
	Code       int    `json:"code"`
	Message    string `json:"message"`
	StatusCode int    `json:"-"`
	Internal   error  `json:"-"` // Internal error for logging, not exposed to client
}

func (e *AppError) Error() string {
	if e.Internal != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Internal)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Internal
}

// New creates a new AppError
func New(code int, message string, statusCode int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

// Wrap wraps an existing error with additional context
func Wrap(err error, code int, message string, statusCode int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
		Internal:   err,
	}
}

// Common error constructors
var (
	ErrBadRequest       = New(400, "Bad request", http.StatusBadRequest)
	ErrUnauthorized     = New(401, "Unauthorized", http.StatusUnauthorized)
	ErrForbidden        = New(403, "Forbidden", http.StatusForbidden)
	ErrNotFound         = New(404, "Resource not found", http.StatusNotFound)
	ErrConflict         = New(409, "Resource conflict", http.StatusConflict)
	ErrUnprocessableEntity = New(422, "Unprocessable entity", http.StatusUnprocessableEntity)
	ErrInternalServer   = New(500, "Internal server error", http.StatusInternalServerError)
	ErrServiceUnavailable = New(503, "Service unavailable", http.StatusServiceUnavailable)
)

// Domain-specific errors
var (
	ErrInvalidCredentials = New(1001, "Invalid credentials", http.StatusUnauthorized)
	ErrTokenExpired       = New(1002, "Token expired", http.StatusUnauthorized)
	ErrInvalidToken       = New(1003, "Invalid token", http.StatusUnauthorized)
	ErrUserExists         = New(1004, "User already exists", http.StatusConflict)
	ErrEmailNotAuthorized = New(1005, "Email not authorized", http.StatusForbidden)
	ErrInvalidInput       = New(1006, "Invalid input", http.StatusBadRequest)
	ErrResourceNotFound   = New(1007, "Resource not found", http.StatusNotFound)
)

// ErrorResponse represents the error response structure
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// ToJSON converts AppError to JSON response
func (e *AppError) ToJSON() []byte {
	resp := ErrorResponse{
		Error: ErrorDetail{
			Code:    e.Code,
			Message: e.Message,
		},
	}
	if e.Internal != nil {
		resp.Error.Details = e.Internal.Error()
	}
	data, _ := json.Marshal(resp)
	return data
}

// GetStatusCode returns the HTTP status code for the error
func (e *AppError) GetStatusCode() int {
	return e.StatusCode
}

// IsAppError checks if an error is an AppError
func IsAppError(err error) bool {
	_, ok := err.(*AppError)
	return ok
}

// FromAppError extracts AppError from error, or converts generic error
func FromAppError(err error) *AppError {
	if appErr, ok := err.(*AppError); ok {
		return appErr
	}
	return Wrap(err, 500, "Internal server error", http.StatusInternalServerError)
}
