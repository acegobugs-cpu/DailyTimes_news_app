-- +goose Up
SELECT 'up SQL query';
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS media (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    url VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    caption TEXT,
    thumbnail VARCHAR(255),
    controls INTEGER,
    source VARCHAR(255),
    alt VARCHAR(255),
    credit VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_media_url ON media(url);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);

-- +goose StatementEnd

-- +goose Down
SELECT 'down SQL query';
-- +goose StatementBegin

DROP TABLE IF EXISTS media;

-- +goose StatementEnd
