package validator

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"

	"app/internal/pkg/config"
)

// Validator provides validation functions
type Validator struct {
	config *config.Config
}

// NewValidator creates a new validator
func NewValidator(cfg *config.Config) *Validator {
	return &Validator{config: cfg}
}

// ValidateEmail validates email format
func (v *Validator) ValidateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("email is required")
	}

	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}

	if len(email) > 255 {
		return fmt.Errorf("email too long (max 255 characters)")
	}

	return nil
}

// ValidatePhone validates phone number format (basic validation)
func (v *Validator) ValidatePhone(phone string) error {
	if phone == "" {
		return nil // Phone is optional
	}

	// Remove common separators
	cleaned := strings.ReplaceAll(phone, " ", "")
	cleaned = strings.ReplaceAll(cleaned, "-", "")
	cleaned = strings.ReplaceAll(cleaned, "(", "")
	cleaned = strings.ReplaceAll(cleaned, ")", "")
	cleaned = strings.ReplaceAll(cleaned, "+", "")

	// Basic validation: 10-15 digits
	phoneRegex := regexp.MustCompile(`^[0-9]{10,15}$`)
	if !phoneRegex.MatchString(cleaned) {
		return fmt.Errorf("invalid phone number format")
	}

	if len(phone) > 20 {
		return fmt.Errorf("phone number too long (max 20 characters)")
	}

	return nil
}

// ValidateUsername validates username format
func (v *Validator) ValidateUsername(username string) error {
	if username == "" {
		return fmt.Errorf("username is required")
	}

	if len(username) < 3 {
		return fmt.Errorf("username must be at least 3 characters")
	}

	if len(username) > 30 {
		return fmt.Errorf("username too long (max 30 characters)")
	}

	// Allow only alphanumeric, underscore, hyphen
	usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	if !usernameRegex.MatchString(username) {
		return fmt.Errorf("username can only contain letters, numbers, underscore, and hyphen")
	}

	return nil
}

// ValidatePassword validates password complexity
func (v *Validator) ValidatePassword(password string) error {
	if password == "" {
		return fmt.Errorf("password is required")
	}

	if len(password) < v.config.Security.PasswordMinLength {
		return fmt.Errorf("password must be at least %d characters", v.config.Security.PasswordMinLength)
	}

	if len(password) > 128 {
		return fmt.Errorf("password too long (max 128 characters)")
	}

	var (
		hasUpper   bool
		hasLower   bool
		hasNumber  bool
		hasSpecial bool
	)

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if v.config.Security.PasswordRequireUppercase && !hasUpper {
		return fmt.Errorf("password must contain at least one uppercase letter")
	}

	if v.config.Security.PasswordRequireLowercase && !hasLower {
		return fmt.Errorf("password must contain at least one lowercase letter")
	}

	if v.config.Security.PasswordRequireNumber && !hasNumber {
		return fmt.Errorf("password must contain at least one number")
	}

	if v.config.Security.PasswordRequireSpecial && !hasSpecial {
		return fmt.Errorf("password must contain at least one special character")
	}

	return nil
}

// ValidateName validates first/last name
func (v *Validator) ValidateName(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Errorf("name is required")
	}

	if len(name) > 100 {
		return fmt.Errorf("name too long (max 100 characters)")
	}

	// Allow letters, spaces, hyphens, apostrophes
	nameRegex := regexp.MustCompile(`^[a-zA-Z\s\-']+$`)
	if !nameRegex.MatchString(name) {
		return fmt.Errorf("name can only contain letters, spaces, hyphens, and apostrophes")
	}

	return nil
}

// ValidateRoleIDs validates role IDs
func (v *Validator) ValidateRoleIDs(roleIDs []string) error {
	if len(roleIDs) == 0 {
		return fmt.Errorf("at least one role ID is required")
	}

	for _, roleID := range roleIDs {
		if roleID == "" {
			return fmt.Errorf("role ID cannot be empty")
		}
		// Add additional validation for role ID format if needed
	}

	return nil
}

// ValidateInputLength validates string length
func (v *Validator) ValidateInputLength(value, fieldName string, min, max int) error {
	if value == "" {
		return fmt.Errorf("%s is required", fieldName)
	}

	if len(value) < min {
		return fmt.Errorf("%s must be at least %d characters", fieldName, min)
	}

	if len(value) > max {
		return fmt.Errorf("%s too long (max %d characters)", fieldName, max)
	}

	return nil
}
