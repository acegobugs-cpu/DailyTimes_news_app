package tests

import (
	"bytes"
	"context"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"app/internal/domain/handlers"
	"app/internal/domain/repositories"
	"app/internal/domain/services"
	"app/internal/infra/database"
	"app/internal/pkg/config"

	"github.com/go-chi/chi/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func TestRegister_Integration(t *testing.T) {

	connStr := "postgres://postgres:postgres@localhost:5432/dailytimes_test?sslmode=disable"

	// 1. Run migrations using standard library + pgx compatibility driver wrapper
	migrationDB, err := sql.Open("pgx", connStr)
	if err != nil {
		t.Fatalf("Failed to open migration DB connection: %v", err)
	}

	// Execute your migrations from your local Goose folder
	if err := goose.Up(migrationDB, "../migrations"); err != nil {
		migrationDB.Close()
		t.Fatalf("Goose migrations failed to run: %v", err)
	}
	migrationDB.Close()
	// 1. Build the config pointing to your test database
	cfg := &config.DatabaseConfig{
		Host:            "localhost",
		Port:            5432,
		User:            "postgres",
		Password:        "postgres",        // Change to match your .env
		DBName:          "dailytimes_test", // The test database we initialized earlier
		SSLMode:         "disable",
		MaxOpenConns:    5,
		MaxIdleConns:    2,
		ConnMaxLifetime: 300,
	}

	// 2. Use your actual constructor to initialize the database wrapper
	pgDb, err := database.NewPostgres(cfg)
	if err != nil {
		t.Fatalf("Failed to connect to test DB pool: %v", err)
	}
	// Close pool at the end of the test execution
	defer pgDb.Close(context.Background())

	// 3. Wire up your components exactly like before
	userRepo := repositories.NewUserRepository(pgDb)
	authService := services.NewAuthService(userRepo, nil, "super-secret-key", time.Hour, time.Hour*24, "my-app")
	authHandler := handlers.NewAuthHandler(authService)

	// 4. Truncate tables using your wrapper's Exec method
	ctx := context.Background()
	err = pgDb.Exec(ctx, "TRUNCATE TABLE users CASCADE")
	if err != nil {
		t.Fatalf("Failed to truncate users table: %v", err)
	}

	// ... set up Chi router and execute your request here ...
	r := chi.NewRouter()
	r.Route("/auth", func(router chi.Router) {
		router.Post("/register", authHandler.Signin)
	})

	// 5. Prepare a real registration payload
	jsonPayload := []byte(`{
		"fname": "Alex",
		"lname": "Smith",
		"uname": "alexsmith123",
		"email": "alex@example.com",
		"phone": "9999999999999",
		"password": "SecurePassword101!"
	}`)

	req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	// 6. Execute the HTTP request through the entire stack
	r.ServeHTTP(rr, req)

	// 7. Assertions on HTTP Layer
	if rr.Code != http.StatusCreated {
		t.Errorf("Expected status 201 Created, but got %d. Body: %s", rr.Code, rr.Body.String())
	}

	// 5. Query for verification using pgDb.QueryRow
	var exists bool
	err = pgDb.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", "alex@example.com").Scan(&exists)
	if err != nil {
		t.Fatalf("Failed to verify user row: %v", err)
	}

	if !exists {
		t.Error("User was not found in database!")
	}
}
