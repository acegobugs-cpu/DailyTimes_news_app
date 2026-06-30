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
	"app/internal/infra/email"
	"app/internal/pkg/errors"
)

// UserService handles user business logic
type UserService struct {
	userRepo     *repositories.UserRepository
	invitesRepo  *repositories.InvitesRepository
	emailService *email.EmailService
	cache        *caching.RedisCache
}

// NewUserService creates a new user service
func NewUserService(userRepo *repositories.UserRepository, invitesRepo *repositories.InvitesRepository, emailService *email.EmailService, cache *caching.RedisCache) *UserService {
	return &UserService{
		userRepo:     userRepo,
		invitesRepo:  invitesRepo,
		emailService: emailService,
		cache:        cache,
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
	Fname   string   `json:"firstName"`
	Mname   string   `json:"middleName"`
	Lname   string   `json:"lastName"`
	Email   string   `json:"email"`
	Phone   string   `json:"phone"`
	RoleIDs []string `json:"roleIds"` // Resolved from role_ids
}

func (s *UserService) SavePendingUser(ctx context.Context, user RegisterRequest, inviterId uuid.UUID, ttl time.Duration) *errors.AppError {
	expiresAt := time.Now().Add(ttl)

	// 1. Generate a cryptographically secure token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return errors.ErrInternalServer.W("failed to generate token", "").Log(ctx, err, true)
	}
	token := hex.EncodeToString(tokenBytes)

	var invite = entities.NewInvites(
		user.FirstName,
		user.MiddleName,
		user.LastName,
		user.Email,
		user.Phone,
		user.RoleIDs,
		"PENDING",
		inviterId,
		&expiresAt,
	)

	// STEP 1: Persist base record to database first so the ID definitely exists
	if err := s.invitesRepo.Create(ctx, invite); err != nil {
		return errors.ErrInternalServer.W("failed to create system invitation record", "").Log(ctx, err, true)
	}

	// STEP 2: Securely save tracking token to cache
	redisKey := fmt.Sprintf("invite:token:%s", token)
	err := s.cache.Client.Set(ctx, redisKey, invite.ID.String(), ttl).Err()
	if err != nil {
		return errors.ErrInternalServer.W("failed to cache security token session", "").Log(ctx, err, true)
	}

	// STEP 3: Now that data is safely saved everywhere, dispatch async background email
	registrationLink := fmt.Sprintf("http://localhost:3000/register?token=%s", token)

	go func(email, link string) {
		// Prevent nil pointer panic if mail client failed initializing on app startup
		if s.emailService == nil {
			fmt.Println("ASYNC MAIL SKIPPED: Mail service was not initialized properly")
			return
		}

		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mailErr := s.emailService.SendRegistrationLink(bgCtx, email, link)
		if mailErr != nil {
			fmt.Printf("ASYNC MAIL FAILURE: failed to deliver registration email: %v\n", mailErr)
		}
	}(user.Email, registrationLink)

	return nil
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

func (s *UserService) ListInvitations(ctx context.Context) ([]*entities.Invites, error) {
	invitations, err := s.invitesRepo.List(ctx)
	if err != nil {
		return nil, errors.ErrInternalServer.W("Failed to list invitations", "")
	}
	return invitations, nil
}
