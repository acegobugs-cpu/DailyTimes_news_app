package entities

import "github.com/google/uuid"

// Category represents a category entity
type Category struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	Slug string    `json:"slug"`
}

// NewCategory creates a new category entity
func NewCategory(name, slug string) *Category {
	return &Category{
		ID:   uuid.New(),
		Name: name,
		Slug: slug,
	}
}

// TableName returns the database table name
func (c *Category) TableName() string {
	return "categories"
}
