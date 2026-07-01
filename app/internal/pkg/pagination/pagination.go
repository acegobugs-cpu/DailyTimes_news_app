package pagination

import (
	"strconv"
)

// Pagination represents pagination parameters
type Pagination struct {
	Page     int `json:"page"`
	Limit    int `json:"limit"`
	Offset   int `json:"offset"`
	Total    int `json:"total,omitempty"`
	LastPage int `json:"last_page,omitempty"`
}

// DefaultPagination returns default pagination values
func DefaultPagination() *Pagination {
	return &Pagination{
		Page:   1,
		Limit:  10,
		Offset: 0,
	}
}

// NewPaginationFromRequest creates pagination from query parameters
func NewPaginationFromRequest(pageStr, limitStr string) *Pagination {
	p := DefaultPagination()

	// Parse page
	if pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			p.Page = page
		}
	}

	// Parse limit
	if limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			p.Limit = limit
		}
	}

	// Calculate offset
	p.Offset = (p.Page - 1) * p.Limit

	return p
}

// CalculateLastPage calculates the last page number based on total records
func (p *Pagination) CalculateLastPage(total int) {
	p.Total = total
	if p.Limit > 0 {
		p.LastPage = (total + p.Limit - 1) / p.Limit
	}
	if p.LastPage < 1 {
		p.LastPage = 1
	}
}

// PaginatedResponse represents a paginated response
type PaginatedResponse struct {
	Data       any        `json:"data"`
	Pagination Pagination `json:"pagination"`
}

// NewPaginatedResponse creates a new paginated response
func NewPaginatedResponse(data interface{}, pagination *Pagination) *PaginatedResponse {
	return &PaginatedResponse{
		Data:       data,
		Pagination: *pagination,
	}
}
