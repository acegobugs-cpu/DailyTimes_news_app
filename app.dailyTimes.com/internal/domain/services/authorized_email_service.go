package services

import (
	"context"
	"net/http"

	"app/internal/domain/entities"
	"app/internal/domain/repositories"
	"app/internal/pkg/errors"
)

// AuthorizedEmailService handles authorized email business logic
type AuthorizedEmailService struct {
	emailRepo *repositories.AuthorizedEmailRepository
	userRepo  *repositories.UserRepository
}

// NewAuthorizedEmailService creates a new authorized email service
func NewAuthorizedEmailService(emailRepo *repositories.AuthorizedEmailRepository, userRepo *repositories.UserRepository) *AuthorizedEmailService {
	return &AuthorizedEmailService{
		emailRepo: emailRepo,
		userRepo:  userRepo,
	}
}

// CreateAuthorizedEmail creates a new authorized email
func (s *AuthorizedEmailService) CreateAuthorizedEmail(ctx context.Context, email string, inviterID int64) (*entities.AuthorizedEmail, error) {
	// Check if email already exists
	exists, err := s.emailRepo.ExistsByEmail(ctx, email)
	if err != nil {
		return nil, errors.Wrap(err, 0, "Failed to check email existence", http.StatusInternalServerError)
	}
	if exists {
		return nil, errors.ErrConflict
	}

	// Verify inviter exists
	if inviterID > 0 {
		_, err := s.userRepo.FindByID(ctx, inviterID)
		if err != nil {
			return nil, errors.ErrResourceNotFound
		}
	}

	authEmail := entities.NewAuthorizedEmail(email)
	authEmail.InviterID = &inviterID

	if err := s.emailRepo.Create(ctx, authEmail); err != nil {
		return nil, errors.Wrap(err, 0, "Failed to create authorized email", http.StatusInternalServerError)
	}

	return authEmail, nil
}

// GetAuthorizedEmailBySlug retrieves an authorized email by slug
func (s *AuthorizedEmailService) GetAuthorizedEmailBySlug(ctx context.Context, slug string) (*entities.AuthorizedEmail, error) {
	email, err := s.emailRepo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, errors.ErrResourceNotFound
	}
	return email, nil
}

// GetAuthorizedEmailByEmail retrieves an authorized email by email
func (s *AuthorizedEmailService) GetAuthorizedEmailByEmail(ctx context.Context, email string) (*entities.AuthorizedEmail, error) {
	authEmail, err := s.emailRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil, errors.ErrEmailNotAuthorized
	}
	return authEmail, nil
}

// ListAuthorizedEmails lists all authorized emails
func (s *AuthorizedEmailService) ListAuthorizedEmails(ctx context.Context) ([]*entities.AuthorizedEmail, error) {
	emails, err := s.emailRepo.List(ctx)
	if err != nil {
		return nil, errors.Wrap(err, 0, "Failed to list authorized emails", http.StatusInternalServerError)
	}
	return emails, nil
}

// MarkAsUsed marks an authorized email as used
func (s *AuthorizedEmailService) MarkAsUsed(ctx context.Context, slug string) error {
	authEmail, err := s.emailRepo.FindBySlug(ctx, slug)
	if err != nil {
		return errors.ErrResourceNotFound
	}

	if authEmail.Used {
		return errors.ErrConflict
	}

	if err := s.emailRepo.MarkAsUsed(ctx, authEmail.ID); err != nil {
		return errors.Wrap(err, 0, "Failed to mark email as used", http.StatusInternalServerError)
	}

	return nil
}

// DeleteAuthorizedEmail deletes an authorized email
func (s *AuthorizedEmailService) DeleteAuthorizedEmail(ctx context.Context, id int64) error {
	if err := s.emailRepo.Delete(ctx, id); err != nil {
		return errors.Wrap(err, 0, "Failed to delete authorized email", http.StatusInternalServerError)
	}
	return nil
}
