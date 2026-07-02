package main

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"app/internal/domain/entities"
	"app/internal/domain/handlers"
	"app/internal/domain/repositories"
	"app/internal/domain/services"
	"app/internal/infra/caching"
	"app/internal/infra/database"
	"app/internal/infra/email"
	"app/internal/infra/storage"
	httpInterface "app/internal/interfaces/http"
	"app/internal/pkg/config"
	"app/internal/pkg/crypto"
	"app/internal/pkg/logger"
	"app/internal/pkg/token"
)

func main() {
	ctx := context.Background()
	// Load configuration
	cfg, err := config.Load("configs/config.yaml")
	if err != nil {
		fmt.Printf("Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	if err := logger.Init(cfg.Server.Environment); err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Close()

	logger.Info("Starting application",
		zap.String("environment", cfg.Server.Environment),
		zap.Int("port", cfg.Server.Port),
	)

	// Initialize encryption key
	if cfg.Security.EncryptionKey != "" {
		if err := crypto.SetEncryptionKey([]byte(cfg.Security.EncryptionKey)); err != nil {
			logger.Fatal("Failed to set encryption key", zap.Error(err))
		}
		logger.Info("Encryption key initialized")
	} else {
		logger.Warn("Encryption key not set, refresh tokens will not be encrypted")
	}

	// Initialize database
	db, err := database.NewPostgres(&cfg.Database)
	if err != nil {
		logger.Fatal("Failed to initialize database", zap.Error(err))
	}

	mail, err := email.NewEmailService(cfg.Mail.Host, cfg.Mail.Port, cfg.Mail.Username, cfg.Mail.Password, cfg.Mail.Email)
	if err != nil {
		logger.Fatal("Failed to initialize Mail", zap.Error(err))
	}

	cache, err := caching.NewRedisCache(cfg.Redis.Host, cfg.Redis.Port, cfg.Redis.Password, cfg.Redis.DB)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	// Initialize storage service using config
	storageSvc, err := storage.NewS3Storage(ctx, cfg.Storage.Endpoint, cfg.Storage.BucketName, cfg.Storage.Region)
	if err != nil {
		logger.Fatal("unable to load SDK config, %v", zap.Error(err))
	}
	defer db.Close(context.Background())

	// Initialize repositories
	userRepo := repositories.NewUserRepository(db)
	articleRepo := repositories.NewArticleRepository(db)
	categoryRepo := repositories.NewCategoryRepository(db)
	authEmailRepo := repositories.NewAuthorizedEmailRepository(db)
	invitesRepo := repositories.NewInvitesRepository(db)
	mediaRepo := repositories.NewMediaRepository(db)

	// Seed superadmin user
	if err := seedSuperuser(context.Background(), userRepo, cfg); err != nil {
		logger.Warn("Failed to seed superuser", zap.Error(err))
	}

	// Initialize token manager
	tokenManager := token.NewTokenManager(cfg.JWT.Secret, cfg.JWT.AccessDuration, cfg.JWT.Issuer)

	// Initialize services
	userService := services.NewUserService(userRepo, invitesRepo, mail, cache, cfg)
	authService := services.NewAuthService(userRepo, invitesRepo, cache, cfg)
	articleService := services.NewArticleService(articleRepo, categoryRepo)
	categoryService := services.NewCategoryService(categoryRepo)
	authEmailService := services.NewAuthorizedEmailService(authEmailRepo, userRepo)
	mediaService := services.NewMediaService(mediaRepo, storageSvc, cfg.Storage.MaxFileSize, cfg.Storage.PublicURL)

	// Initialize HTTP handlers
	userHandler := handlers.NewUserHandler(userService)
	authHandler := handlers.NewAuthHandler(authService, cfg)
	articleHandler := handlers.NewArticleHandler(articleService)
	categoryHandler := handlers.NewCategoryHandler(categoryService)
	authEmailHandler := handlers.NewAuthorizedEmailHandler(authEmailService)
	mediaHandler := handlers.NewMediaHandler(mediaService)

	// Initialize HTTP router
	router := httpInterface.NewRouter(
		cfg,
		userHandler,
		authHandler,
		articleHandler,
		categoryHandler,
		authEmailHandler,
		mediaHandler,
		authService,
		tokenManager,
	)

	// Create HTTP server
	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Start server in goroutine
	go func() {
		logger.Info("HTTP server starting", zap.String("addr", server.Addr))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start HTTP server", zap.Error(err))
		}
	}()

	// Graceful shutdown
	GracefulShutdown(context.Background(), server, db, cfg.Server.ShutdownTimeout)
}

// GracefulShutdown handles graceful shutdown of the application
func GracefulShutdown(ctx context.Context, server *http.Server, db *database.Postgres, timeout time.Duration) {
	// Create channel for shutdown signals
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Wait for signal
	sig := <-quit
	logger.Info("Received shutdown signal", zap.String("signal", sig.String()))

	// Create shutdown context with timeout
	shutdownCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// Shutdown HTTP server
	logger.Info("Shutting down HTTP server")
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("Failed to shutdown HTTP server gracefully", zap.Error(err))
	}

	// Close database connection
	logger.Info("Closing database connection")
	if err := db.Close(shutdownCtx); err != nil {
		logger.Error("Failed to close database connection", zap.Error(err))
	}

	// Cleanup other resources
	logger.Info("Cleaning up resources")

	logger.Info("Application shutdown complete")
}

// seedSuperuser seeds the superadmin user if it doesn't exist
func seedSuperuser(ctx context.Context, userRepo *repositories.UserRepository, cfg *config.Config) error {
	// 1. Check if superadmin already exists by Username
	existingUser, err := userRepo.FindByUsername(ctx, "root")
	if err == nil && existingUser != nil {
		logger.Info("Superadmin user already exists (matched by username)")
		return nil
	}

	// 2. Check if superadmin already exists by Email to prevent unique constraint conflicts
	existingEmail, err := userRepo.FindByEmail(ctx, "admin@news.com")
	if err == nil && existingEmail != nil {
		logger.Info("Superadmin user already exists (matched by email)")
		return nil
	}

	// Get superadmin password from environment variable or generate secure password
	superadminPassword := "admin123"
	if superadminPassword == "" {
		// Generate secure random password
		superadminPassword, err := generateSecurePassword(16)
		logger.Warn("SUPERADMIN_PASSWORD not set, generated random password", zap.String("password", superadminPassword))
		if err != nil {
			logger.Fatal("generated random password Failed", zap.String("password", superadminPassword))
		}
	}

	// Hash password using configured bcrypt cost
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(superadminPassword), cfg.Security.BcryptCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Create superadmin user structure
	superadmin := &entities.User{
		FirstName:    "Super",
		LastName:     "Admin",
		Username:     "root",
		Email:        "admin@news.com",
		PasswordHash: string(passwordHash),
	}

	if err := userRepo.Create(ctx, superadmin); err != nil {
		return fmt.Errorf("failed to create superadmin: %w", err)
	}

	logger.Info("Superadmin user created successfully",
		zap.String("username", superadmin.Username),
		zap.String("email", superadmin.Email),
	)

	return nil
}

// generateSecurePassword generates a cryptographically secure random password
func generateSecurePassword(length int) (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate secure password: %w", err)
	}
	for i := range b {
		b[i] = charset[int(b[i])%len(charset)]
	}
	return string(b), nil
}
