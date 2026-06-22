package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"app/internal/pkg/config"
	"app/internal/pkg/logger"
)

// Postgres represents a PostgreSQL database connection
type Postgres struct {
	pool *pgxpool.Pool
}

// NewPostgres creates a new PostgreSQL connection
func NewPostgres(cfg *config.DatabaseConfig) (*Postgres, error) {
	connString := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode,
	)

	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database config: %w", err)
	}

	config.MaxConns = int32(cfg.MaxOpenConns)
	config.MinConns = int32(cfg.MaxIdleConns)
	config.MaxConnLifetime = time.Duration(cfg.ConnMaxLifetime) * time.Second
	config.MaxConnIdleTime = time.Duration(cfg.ConnMaxLifetime) * time.Second
	config.HealthCheckPeriod = 1 * time.Minute

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("Database connection established")

	return &Postgres{pool: pool}, nil
}

// Pool returns the connection pool
func (p *Postgres) Pool() *pgxpool.Pool {
	return p.pool
}

// Close closes the database connection
func (p *Postgres) Close(ctx context.Context) error {
	p.pool.Close()
	logger.Info("Database connection closed")
	return nil
}

// Ping checks if the database is reachable
func (p *Postgres) Ping(ctx context.Context) error {
	return p.pool.Ping(ctx)
}

// BeginTx begins a transaction
func (p *Postgres) BeginTx(ctx context.Context) (pgx.Tx, error) {
	return p.pool.Begin(ctx)
}

// Exec executes a query without returning any rows
func (p *Postgres) Exec(ctx context.Context, sql string, args ...interface{}) error {
	_, err := p.pool.Exec(ctx, sql, args...)
	return err
}

// Query executes a query that returns rows
func (p *Postgres) Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
	return p.pool.Query(ctx, sql, args...)
}

// QueryRow executes a query that returns at most one row
func (p *Postgres) QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	return p.pool.QueryRow(ctx, sql, args...)
}
