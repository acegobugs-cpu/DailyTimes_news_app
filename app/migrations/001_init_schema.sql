-- Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    uid VARCHAR(100) UNIQUE NOT NULL,
    fname VARCHAR(50) NOT NULL,
    mname VARCHAR(50),
    lname VARCHAR(50) NOT NULL,
    uname VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    h_password TEXT NOT NULL,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_uid ON users(uid);
CREATE INDEX idx_users_uname ON users(uname);
CREATE INDEX idx_users_email ON users(email);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE INDEX idx_categories_slug ON categories(slug);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
    id BIGSERIAL PRIMARY KEY,
    tag VARCHAR(50) NOT NULL,
    media JSONB,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_articles_tag ON articles(tag);
CREATE INDEX idx_articles_published_at ON articles(published_at);

-- Article locale table
CREATE TABLE IF NOT EXISTS article_locale (
    id BIGSERIAL PRIMARY KEY,
    article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    editor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    content JSONB,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (locale, slug)
);

CREATE INDEX idx_article_locale_article_id ON article_locale(article_id);
CREATE INDEX idx_article_locale_locale ON article_locale(locale);
CREATE INDEX idx_article_locale_slug ON article_locale(slug);

-- Article-Category junction table
CREATE TABLE IF NOT EXISTS article_category (
    article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, category_id)
);

CREATE INDEX idx_article_category_article_id ON article_category(article_id);
CREATE INDEX idx_article_category_category_id ON article_category(category_id);

-- Authorized emails table
CREATE TABLE IF NOT EXISTS authorized_emails (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    inviter_id BIGINT REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_authorized_emails_slug ON authorized_emails(slug);
CREATE INDEX idx_authorized_emails_email ON authorized_emails(email);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    replaced_by_id BIGINT REFERENCES refresh_tokens(id),
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Media table
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

CREATE INDEX idx_media_url ON media(url);
CREATE INDEX idx_media_type ON media(type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_article_locale_updated_at BEFORE UPDATE ON article_locale
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
