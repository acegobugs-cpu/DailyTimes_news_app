package services

import (
	"context"
	"net/http"

	"golang.org/x/crypto/bcrypt"

	"app/internal/domain/entities"
	"app/internal/domain/repositories"
	"app/internal/pkg/errors"
)

// UserService handles user business logic
type UserService struct {
	userRepo *repositories.UserRepository
}

// NewUserService creates a new user service
func NewUserService(userRepo *repositories.UserRepository) *UserService {
	return &UserService{
		userRepo: userRepo,
	}
}

// Register registers a new user
func (s *UserService) Register(ctx context.Context, firstName, lastName, username, email, password string) (*entities.User, error) {
	// Check if email already exists
	exists, err := s.userRepo.ExistsByEmail(ctx, email)
	if err != nil {
		return nil, errors.Wrap(err, 0, "Failed to check email existence", http.StatusInternalServerError)
	}
	if exists {
		return nil, errors.ErrUserExists
	}

	// Check if username already exists
	exists, err = s.userRepo.ExistsByUsername(ctx, username)
	if err != nil {
		return nil, errors.Wrap(err, 0, "Failed to check username existence", http.StatusInternalServerError)
	}
	if exists {
		return nil, errors.ErrUserExists
	}

	// Hash password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.Wrap(err, 0, "Failed to hash password", http.StatusInternalServerError)
	}

	// Create user
	user := entities.NewUser(firstName, lastName, username, email, string(passwordHash))
	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, errors.Wrap(err, 0, "Failed to create user", http.StatusInternalServerError)
	}

	return user, nil
}

// GetUserByID retrieves a user by ID
func (s *UserService) GetUserByID(ctx context.Context, id int64) (*entities.User, error) {
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
		return errors.Wrap(err, 0, "Failed to update user", http.StatusInternalServerError)
	}
	return nil
}

// DeleteUser deletes a user
func (s *UserService) DeleteUser(ctx context.Context, id int64) error {
	if err := s.userRepo.Delete(ctx, id); err != nil {
		return errors.Wrap(err, 0, "Failed to delete user", http.StatusInternalServerError)
	}
	return nil
}

// ListUsers lists all users with pagination
func (s *UserService) ListUsers(ctx context.Context, limit, offset int) ([]*entities.User, error) {
	users, err := s.userRepo.List(ctx, limit, offset)
	if err != nil {
		return nil, errors.Wrap(err, 0, "Failed to list users", http.StatusInternalServerError)
	}
	return users, nil
}

// ChangePassword changes a user's password
func (s *UserService) ChangePassword(ctx context.Context, userID int64, oldPassword, newPassword string) error {
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
		return errors.Wrap(err, 0, "Failed to hash password", http.StatusInternalServerError)
	}

	user.PasswordHash = string(passwordHash)
	if err := s.userRepo.Update(ctx, user); err != nil {
		return errors.Wrap(err, 0, "Failed to update password", http.StatusInternalServerError)
	}

	return nil
}
