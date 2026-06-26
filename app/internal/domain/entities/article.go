package entities

import (
	"time"

	"github.com/google/uuid"
)

// Article represents an article entity
type Article struct {
	ID           uuid.UUID              `json:"id"`
	Tag          string                 `json:"tag"`
	Media        map[string]interface{} `json:"media,omitempty"`
	PublishedAt  time.Time              `json:"published_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
	Translations []*ArticleLocale       `json:"translations"`
	Categories   []Category             `json:"categories,omitempty"`
}

// NewArticle creates a new article entity
func NewArticle(tag string, media map[string]interface{}) *Article {
	now := time.Now()
	return &Article{
		Tag:         tag,
		Media:       media,
		PublishedAt: now,
		UpdatedAt:   now,
	}
}

// TableName returns the database table name
func (a *Article) TableName() string {
	return "articles"
}

// ArticleLocale represents a localized version of an article
type ArticleLocale struct {
	ID          int64                  `json:"id"`
	ArticleID   uuid.UUID              `json:"article_id"`
	EditorID    uuid.UUID              `json:"editor_id"`
	Locale      string                 `json:"locale"`
	Title       string                 `json:"title"`
	Slug        string                 `json:"slug"`
	Description string                 `json:"description"`
	Content     map[string]interface{} `json:"content,omitempty"`
	PublishedAt time.Time              `json:"published_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// NewArticleLocale creates a new article locale entity
func NewArticleLocale(articleID, editorID uuid.UUID, locale, title, slug, description string) *ArticleLocale {
	now := time.Now()
	return &ArticleLocale{
		ArticleID:   articleID,
		EditorID:    editorID,
		Locale:      locale,
		Title:       title,
		Slug:        slug,
		Description: description,
		PublishedAt: now,
		UpdatedAt:   now,
	}
}

// TableName returns the database table name
func (al *ArticleLocale) TableName() string {
	return "article_locale"
}
