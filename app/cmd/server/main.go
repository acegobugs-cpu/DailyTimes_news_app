package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"app/internal/domain/entities"
	"app/internal/domain/handlers"
	"app/internal/domain/repositories"
	"app/internal/domain/services"
	"app/internal/infra/database"
	"app/internal/infra/storage"
	httpInterface "app/internal/interfaces/http"
	"app/internal/pkg/config"
	"app/internal/pkg/logger"
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

	// Initialize database
	db, err := database.NewPostgres(&cfg.Database)
	if err != nil {
		logger.Fatal("Failed to initialize database", zap.Error(err))
	}

	s3Endpoint := "http://localhost:4566"
	bucketName := "media-bucket"
	region := "us-east-1"

	maxFileSize := int64(64 * 1024 * 1024) // 64MB
	publicURL := "http://localhost:4566/" + bucketName

	// 2. Initialize S3 adapter client
	storageSvc, err := storage.NewS3Storage(ctx, s3Endpoint, bucketName, region)
	if err != nil {
		logger.Fatal("unable to load SDK config, %v", zap.Error(err))
	}
	defer db.Close(context.Background())

	// Initialize repositories
	userRepo := repositories.NewUserRepository(db)
	articleRepo := repositories.NewArticleRepository(db)
	categoryRepo := repositories.NewCategoryRepository(db)
	refreshTokenRepo := repositories.NewRefreshTokenRepository(db)
	authEmailRepo := repositories.NewAuthorizedEmailRepository(db)
	mediaRepo := repositories.NewMediaRepository(db)

	// Seed superadmin user
	if err := seedSuperuser(context.Background(), userRepo); err != nil {
		logger.Warn("Failed to seed superuser", zap.Error(err))
	}

	// Initialize services
	userService := services.NewUserService(userRepo)
	authService := services.NewAuthService(
		userRepo,
		refreshTokenRepo,
		cfg.JWT.Secret,
		cfg.JWT.AccessDuration,
		cfg.JWT.RefreshDuration,
		cfg.JWT.Issuer,
	)
	articleService := services.NewArticleService(articleRepo, categoryRepo)
	categoryService := services.NewCategoryService(categoryRepo)
	authEmailService := services.NewAuthorizedEmailService(authEmailRepo, userRepo)
	mediaService := services.NewMediaService(mediaRepo, storageSvc, maxFileSize, publicURL)

	// Initialize HTTP handlers
	userHandler := handlers.NewUserHandler(userService)
	authHandler := handlers.NewAuthHandler(authService)
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
func seedSuperuser(ctx context.Context, userRepo *repositories.UserRepository) error {
	// Check if superadmin already exists
	existingUser, err := userRepo.FindByUsername(ctx, "root")
	if err == nil && existingUser != nil {
		logger.Info("Superadmin user already exists")
		return nil
	}

	// Hash password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Create superadmin user
	superadmin := &entities.User{
		UID:          uuid.New().String(),
		FirstName:    "Super",
		MiddleName:   nil,
		LastName:     "Admin",
		Username:     "root",
		Email:        "admin@news.com",
		PasswordHash: string(passwordHash),
		IsSuperuser:  true,
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
