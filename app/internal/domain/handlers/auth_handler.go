package handlers

import (
	"encoding/json"
	"net"
	"net/http"
	"strings"

	"app/internal/domain/services"
	"app/internal/pkg/config"
	"app/internal/pkg/errors"
	"app/internal/pkg/logger"

	"github.com/google/uuid"
)

// AuthHandler handles authentication HTTP requests
type AuthHandler struct {
	handler     *Handler
	authService *services.AuthService
	config      *config.Config
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService *services.AuthService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		handler:     NewHandler(),
		authService: authService,
		config:      cfg,
	}
}

// RegisterRequest represents a user registration request
type SigninRequest struct {
	FirstName string `json:"fname"`
	LastName  string `json:"lname"`
	Username  string `json:"uname"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Password  string `json:"password"`
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

type UserResponse struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
	Email    string    `json:"email"`
}

// ValidateInvitationRequest represents a request to validate an invitation token
type ValidateInvitationRequest struct {
	Token string `json:"token"`
}

func (h *AuthHandler) GetPendingInvitation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Support both GET (for backward compatibility) and POST (recommended)
	var token string
	if r.Method == http.MethodPost {
		var req ValidateInvitationRequest
		if err := h.handler.ParseJSON(r, &req); err != nil {
			h.handler.RespondError(w, errors.ErrInvalidInput)
			return
		}
		token = req.Token
	} else {
		token = r.URL.Query().Get("token")
	}

	if token == "" {
		http.Error(w, "token is required", http.StatusBadRequest)
		return
	}

	res, err := h.authService.VerifyInvitation(ctx, token)
	if err != nil {
		h.handler.RespondError(w, err)
		return
	}

	// Return the data to the user's UI screen (omitting roles if they shouldn't see them)
	h.handler.RespondJSON(w, http.StatusOK, res)
}

// Register handles user registration
func (h *AuthHandler) Signin(w http.ResponseWriter, r *http.Request) {
	var req SigninRequest
	if err := h.handler.ParseJSON(r, &req); err != nil {
		h.handler.RespondError(w, errors.ErrInvalidInput)
		return
	}

	user, err := h.authService.Signin(r.Context(), req.FirstName, req.LastName, req.Username, req.Email, req.Phone, req.Password)
	if err != nil {
		h.handler.RespondError(w, err)
		return
	}

	res := UserResponse{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
	}

	h.handler.RespondJSON(w, http.StatusCreated, res)
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

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Extract Bearer Token from Authorization Header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		logger.Info("empty header")
		h.handler.RespondError(w, errors.ErrUnauthorized.W("Authorization header missing", "No Authorization header provided"))
		return
	}

	// Check if it's a Bearer token
	if !strings.HasPrefix(authHeader, "Bearer ") {
		logger.Info("invalid format")
		h.handler.RespondError(w, errors.ErrUnauthorized.W("Invalid authorization format", "Authorization header must be in the format 'Bearer <token>'"))
		return
	}

	accessToken := strings.TrimPrefix(authHeader, "Bearer ")
	if accessToken == "" {
		logger.Info("missing token")
		h.handler.RespondError(w, errors.ErrUnauthorized.W("Invalid authorization format", "Bearer token is missing"))
		return
	}

	// Execute Service Layer Logic
	user, err := h.authService.Me(ctx, accessToken)
	if err != nil {
		h.handler.RespondError(w, err)
		return
	}

	// Construct and write the presentation response
	resp := UserResponse{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
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
	// 1. Extract Bearer Token from Authorization Header
	cookie, err := r.Cookie("access_token")
	if err != nil {
		h.handler.RespondError(w, errors.ErrUnauthorized)
		return
	}
	accessToken := cookie.Value

	claims, err := h.authService.ValidateAccessToken(accessToken)
	if err != nil {
		h.handler.RespondError(w, err)
		return
	}

	h.handler.RespondJSON(w, http.StatusOK, claims)
}

func (h *AuthHandler) readUserIP(r *http.Request) string {
	// Get the direct connection IP
	directIP, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		directIP = r.RemoteAddr
	}

	// Check if the direct IP is a trusted proxy
	isTrusted := h.config.IsTrustedProxy(directIP)

	// Only trust X-Forwarded-For if the request comes from a trusted proxy
	if isTrusted {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			parts := strings.Split(xff, ",")
			for i := len(parts) - 1; i >= 0; i-- {
				candidate := strings.TrimSpace(parts[i])
				ip := net.ParseIP(candidate)
				if ip == nil {
					continue
				}
				if !h.config.IsTrustedProxy(ip.String()) {
					return ip.String()
				}
			}
		}

		if xri := r.Header.Get("X-Real-IP"); xri != "" {
			if ip := net.ParseIP(strings.TrimSpace(xri)); ip != nil {
				return ip.String()
			}
		}
	}

	// Fallback to direct IP if not from trusted proxy or no proxy headers
	return directIP
}
