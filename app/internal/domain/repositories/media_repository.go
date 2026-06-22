package repositories

import (
	"context"

	"app/internal/domain/entities"
	"app/internal/infra/database"
)

type MediaRepository struct {
	db *database.Postgres
}

func NewMediaRepository(db *database.Postgres) *MediaRepository {
	return &MediaRepository{db: db}
}

func (r *MediaRepository) Create(ctx context.Context, media *entities.Media) error {
	return nil
}
