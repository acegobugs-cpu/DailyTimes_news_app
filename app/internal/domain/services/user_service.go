package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"app/internal/domain/entities"
	"app/internal/domain/repositories"
	"app/internal/infra/caching"
	"app/internal/pkg/errors"
)

// UserService handles user business logic
type UserService struct {
	userRepo    *repositories.UserRepository
	invitesRepo *repositories.InvitesRepository
	cache       *caching.RedisCache
}

// NewUserService creates a new user service
func NewUserService(userRepo *repositories.UserRepository, invitesRepo *repositories.InvitesRepository, cache *caching.RedisCache) *UserService {
	return &UserService{
		userRepo:    userRepo,
		invitesRepo: invitesRepo,
		cache:       cache,
	}
}

type RegisterRequest struct {
	FirstName  string   `json:"firstName"`
	MiddleName string   `json:"middleName"`
	LastName   string   `json:"lastName"`
	Email      string   `json:"email"`
	Phone      string   `json:"phone"`
	RoleIDs    []string `json:"roleIds"`
}

type CachedUserData struct {
	Name    string   `json:"name" redis:"name"`
	Email   string   `json:"email" redis:"email"`
	Phone   string   `json:"phone" redis:"phone"`
	RoleIDs []string `json:"roleIds" redis:"roleIds"`
}

type RegisterResponse struct {
	Name      string   `json:"name"`
	Email     string   `json:"email"`
	Phone     string   `json:"phone"`
	RoleNames []string `json:"roleNames"` // Resolved from role_ids
}

func (s *UserService) SavePendingUser(ctx context.Context, user RegisterRequest, inviterId uuid.UUID, ttl time.Duration) (*string, error) {
	// FIX: Calculate the expiration time by adding the duration directly to time.Now()
	expiresAt := time.Now().Add(ttl)
	// 2. Generate a cryptographically secure short-lived token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, errors.ErrInternalServer.W("failed to generate token", "")
	}
	token := hex.EncodeToString(tokenBytes)

	// Updated to match your custom NewInvites constructor layout perfectly
	var invite = entities.NewInvites(
		user.FirstName,
		user.MiddleName,
		user.LastName,
		user.Email,
		user.Phone,
		user.RoleIDs,
		"PENDING",
		inviterId,
		expiresAt,
	)

	// Step 1: Persist the base record to Postgres to generate its unique UUID
	if err := s.invitesRepo.Create(ctx, invite); err != nil {
		return nil, errors.ErrInternalServer.W("failed to create system invitation record", "").Log(ctx, err, true)
	}

	// Step 2: Push the token to Redis mapping to the Postgres UUID string
	redisKey := fmt.Sprintf("invite:token:%s", token)

	// Storing just the string ID allows you to refresh the token independently at any time!
	err := s.cache.Client.Set(ctx, redisKey, invite.ID.String(), ttl).Err()
	if err != nil {
		return nil, errors.ErrInternalServer.W("failed to cache security token session", "").Log(ctx, err, true)
	}

	return &token, nil
}

// GetUserByID retrieves a user by ID
func (s *UserService) GetUserByID(ctx context.Context, id uuid.UUID) (*entities.User, error) {
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		return nil, errors.ErrResourceNotFound
	}
	return user, nil
}

// GetUserByUID retrieves a user by UID
func (s *UserService) GetUserByUID(ctx context.Context, uid string) (*entities.User, error) {
	user, err := s.userRepo.FindByUID(ctx, uid)
	if err != nil {
		return nil, errors.ErrResourceNotFound
	}
	return user, nil
}

// UpdateUser updates a user
func (s *UserService) UpdateUser(ctx context.Context, user *entities.User) error {
	if err := s.userRepo.Update(ctx, user); err != nil {
		return errors.ErrInternalServer.W("Failed to update user", "")
	}
	return nil
}

// DeleteUser deletes a user
func (s *UserService) DeleteUser(ctx context.Context, id uuid.UUID) error {
	if err := s.userRepo.Delete(ctx, id); err != nil {
		return errors.ErrInternalServer.W("Failed to delete user", "")
	}
	return nil
}

// ListUsers lists all users with pagination
func (s *UserService) ListUsers(ctx context.Context, limit, offset int) ([]*entities.User, error) {
	users, err := s.userRepo.List(ctx, limit, offset)
	if err != nil {
		return nil, errors.ErrInternalServer.W("Failed to list users", "")
	}
	return users, nil
}

// ChangePassword changes a user's password
func (s *UserService) ChangePassword(ctx context.Context, userID uuid.UUID, oldPassword, newPassword string) error {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return errors.ErrResourceNotFound
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return errors.ErrInvalidCredentials
	}

	// Hash new password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.ErrInternalServer.W("Failed to hash password", "")
	}

	user.PasswordHash = string(passwordHash)
	if err := s.userRepo.Update(ctx, user); err != nil {
		return errors.ErrInternalServer.W("Failed to update password", "")
	}

	return nil
}
