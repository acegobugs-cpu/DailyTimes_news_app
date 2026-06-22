package http

import (
	"net"
	"net/http"
	"strings"

	"app/internal/domain/services"
	"app/internal/pkg/errors"
)

// AuthHandler handles authentication HTTP requests
type AuthHandler struct {
	handler     *Handler
	authService *services.AuthService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		handler:     NewHandler(),
		authService: authService,
	}
}

// LoginRequest represents a login request
type LoginRequest struct {
	EmailOrUsername string `json:"email_or_username"`
	Password        string `json:"password"`
}

// RefreshTokenRequest represents a refresh token request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// Login handles user login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		EmailOrUsername string `json:"email_or_username"`
		Password        string `json:"password"`
	}
	if err := h.handler.ParseJSON(r, &req); err != nil {
		h.handler.RespondError(w, errors.ErrInvalidInput)
		return
	}

	// 1. Extract the User-Agent header
	userAgent := r.Header.Get("User-Agent")
	// 2. Extract the IP Address (taking proxies/load balancers into account)
	ipAddress := h.readUserIP(r)

	// 3. Pass them into the updated service call
	user, tokens, err := h.authService.Login(r.Context(), req.EmailOrUsername, req.Password, ipAddress, userAgent)
	if err != nil {
		h.handler.RespondError(w, err)
		return
	}

	h.handler.RespondJSON(w, http.StatusOK, map[string]any{
		"user":   user,
		"tokens": tokens,
	})
}

// RefreshToken handles refreshing an access token
func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req RefreshTokenRequest
	if err := h.handler.ParseJSON(r, &req); err != nil {
		h.handler.RespondError(w, errors.ErrInvalidInput)
		return
	}

	tokens, err := h.authService.RefreshAccessToken(r.Context(), req.RefreshToken)
	if err != nil {
		h.handler.RespondError(w, err)
		return
	}

	h.handler.RespondJSON(w, http.StatusOK, tokens)
}

// Logout handles user logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req RefreshTokenRequest
	if err := h.handler.ParseJSON(r, &req); err != nil {
		h.handler.RespondError(w, errors.ErrInvalidInput)
		return
	}

	if err := h.authService.Logout(r.Context(), req.RefreshToken); err != nil {
		h.handler.RespondError(w, err)
		return
	}

	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}

// LogoutAll handles logging out from all devices
func (h *AuthHandler) LogoutAll(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.handler.GetUserIDFromContext(r)
	if !ok {
		h.handler.RespondError(w, errors.ErrUnauthorized)
		return
	}

	if err := h.authService.LogoutAll(r.Context(), userID); err != nil {
		h.handler.RespondError(w, err)
		return
	}

	h.handler.RespondJSON(w, http.StatusOK, map[string]string{"message": "Logged out from all devices"})
}

// VerifyToken handles token verification
func (h *AuthHandler) VerifyToken(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		h.handler.RespondError(w, errors.ErrUnauthorized)
		return
	}

	// Extract token from "Bearer <token>"
	tokenString := authHeader[7:] // Remove "Bearer " prefix

	claims, err := h.authService.ValidateAccessToken(tokenString)
	if err != nil {
		h.handler.RespondError(w, err)
		return
	}

	h.handler.RespondJSON(w, http.StatusOK, claims)
}

func (h *AuthHandler) readUserIP(r *http.Request) string {
	// Check if a proxy forwarded the real user IP
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For can be a comma-separated list if it passed through multiple proxies.
		// The first IP in the list is always the original client.
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}

	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fallback to RemoteAddr if no proxy header exists (e.g., local development)
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}
