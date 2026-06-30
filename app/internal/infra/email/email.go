package email

import (
	"context"
	"fmt"

	"github.com/wneessen/go-mail"
)

type EmailService struct {
	client *mail.Client
	from   string
}

func NewEmailService(host string, port int, username, password, fromEmail string) (*EmailService, error) {
	// Initialize SMTP configuration
	c, err := mail.NewClient(host, mail.WithPort(port), mail.WithSMTPAuth(mail.SMTPAuthPlain),
		mail.WithUsername(username), mail.WithPassword(password))
	if err != nil {
		return nil, fmt.Errorf("failed to init mail client: %w", err)
	}

	return &EmailService{client: c, from: fromEmail}, nil
}

func (s *EmailService) SendRegistrationLink(ctx context.Context, toEmail, link string) error {
	m := mail.NewMsg()
	if err := m.From(s.from); err != nil {
		return err
	}
	if err := m.To(toEmail); err != nil {
		return err
	}

	m.Subject("You have been invited to join PrimeMedia!")

	body := fmt.Sprintf(`
		<h1>Welcome to PrimeMedia</h1>
		<p>An administrator has invited you to set up your account.</p>
		<p>Click the link below to complete your registration (expires in 24 hours):</p>
		<a href="%s" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; display: inline-block;">Verify & Register</a>
		<p>If the button doesn't work, copy-paste this link: %s</p>
	`, link, link)

	// FIX: Use SetBody() with mail.TypeTextHTML
	m.SetBodyString(mail.TypeTextHTML, body)

	// Send via SMTP engine
	return s.client.DialAndSendWithContext(ctx, m)
}
