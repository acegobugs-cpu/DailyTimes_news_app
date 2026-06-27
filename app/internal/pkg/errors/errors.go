package errors

import (
	"app/internal/pkg/logger"
	"context"
	"net/http"
)

// AppError represents a custom application error with HTTP status code
type AppError struct {
	Success    bool   `json:"success"`
	StatusCode int    `json:"statusCode,omitempty"` // This holds your App Code (e.g., 1001, 400)
	Message    string `json:"message,omitempty"`
	Details    string `json:"details,omitempty"`
	Data       any    `json:"data,omitempty"`
	HTTPStatus int    `json:"-"` // Internal network status code (e.g., 401, 500)
}

func (e *AppError) Error() string {
	if e.Details != "" {
		return e.Message + ": " + e.Details
	}
	return e.Message
}

// New matches your global variables perfectly (3 arguments)
func New(code int, message string, httpStatus int) *AppError {
	// If it's a custom domain error code (greater than 599), default network status to 500
	networkStatus := httpStatus
	if code > 599 && httpStatus == 0 {
		networkStatus = http.StatusInternalServerError
	}

	return &AppError{
		Success:    false,
		StatusCode: code,
		Message:    message,
		HTTPStatus: networkStatus,
	}
}

func (e *AppError) W(msg string, details string) *AppError {
	finalMsg := e.Message
	if msg != "" {
		finalMsg = msg
	}
	return &AppError{
		Success:    e.Success,
		StatusCode: e.StatusCode,
		Message:    finalMsg,
		Details:    details,
		HTTPStatus: e.HTTPStatus,
	}
}

// Log logs the error contextually and immediately halts the request cycle
func (e *AppError) Log(ctx context.Context, err error, trace ...bool) *AppError {
	// 1. Fire your existing logger
	showTrace := false
	if len(trace) > 0 && trace[0] {
		showTrace = true
	}
	logger.LogError(ctx, err, e.Error(), showTrace)
	return e
}

// Common error constructors
var (
	ErrBadRequest          = New(400, "Bad request", http.StatusBadRequest)
	ErrUnauthorized        = New(401, "Unauthorized", http.StatusUnauthorized)
	ErrForbidden           = New(403, "Forbidden", http.StatusForbidden)
	ErrNotFound            = New(404, "Resource not found", http.StatusNotFound)
	ErrConflict            = New(409, "Resource conflict", http.StatusConflict)
	ErrUnprocessableEntity = New(422, "Unprocessable entity", http.StatusUnprocessableEntity)
	ErrInternalServer      = New(500, "Internal server error", http.StatusInternalServerError)
	ErrServiceUnavailable  = New(503, "Service unavailable", http.StatusServiceUnavailable)
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

// GetStatusCode returns the HTTP network status code for the error
func (e *AppError) GetStatusCode() int {
	return e.HTTPStatus
}

// IsAppError checks if an error is an AppError
func IsAppError(err error) bool {
	_, ok := err.(*AppError)
	return ok
}

// FromAppError extracts AppError from error, or converts a generic error to a 500
func FromAppError(err error) *AppError {
	if appErr, ok := err.(*AppError); ok {
		return appErr
	}
	return ErrInternalServer
}
