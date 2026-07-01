-- +goose Up
SELECT 'up SQL query';
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag VARCHAR(50) NOT NULL,
    media JSONB,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_articles_published_updated ON articles(published_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_articles_tag ON articles(tag);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_updated_at ON articles(updated_at);

-- CHANGED: editor_id is now UUID to match users.id
CREATE TABLE IF NOT EXISTS article_locale (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    editor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    content JSONB,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (locale, slug)
);
CREATE INDEX IF NOT EXISTS idx_article_locale_article_id ON article_locale(article_id);
CREATE INDEX IF NOT EXISTS idx_article_locale_locale ON article_locale(locale);
CREATE INDEX IF NOT EXISTS idx_article_locale_slug ON article_locale(slug);


CREATE TABLE IF NOT EXISTS article_category (
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_article_category_article_id ON article_category(article_id);
CREATE INDEX IF NOT EXISTS idx_article_category_category_id ON article_category(category_id);

-- +goose StatementEnd

-- +goose Down
SELECT 'down SQL query';
-- +goose StatementBegin

DROP TABLE IF EXISTS article_category;
DROP TABLE IF EXISTS article_locale;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS categories;

-- +goose StatementEnd
