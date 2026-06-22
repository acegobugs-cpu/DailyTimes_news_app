package entities

// Media represents a media entity
type Media struct {
	ID        int64    `json:"id"`
	Name      string   `json:"name"`
	URL       string   `json:"url"`
	Type      string   `json:"type"`
	Caption   *string  `json:"caption,omitempty"`
	Thumbnail *string  `json:"thumbnail,omitempty"`
	Controls  *int     `json:"controls,omitempty"`
	Source    *string  `json:"source,omitempty"`
	Alt       *string  `json:"alt,omitempty"`
	Credit    *string  `json:"credit,omitempty"`
}

// NewMedia creates a new media entity
func NewMedia(name, url, mediaType string) *Media {
	return &Media{
		Name: name,
		URL:  url,
		Type: mediaType,
	}
}

// TableName returns the database table name
func (m *Media) TableName() string {
	return "media"
}
