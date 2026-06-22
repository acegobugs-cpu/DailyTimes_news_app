package handlers

import (
	"app/internal/domain/services"
	"encoding/json"
	"errors"
	"net/http"
)

type MediaHandler struct {
	mediaService services.MediaService
}

func NewMediaHandler(mediaService services.MediaService) *MediaHandler {
	return &MediaHandler{mediaService: mediaService}
}

func (h *MediaHandler) UploadFile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 0. Extract user context (equivalent to Depends(get_current_user))
	// Assumes your authentication middleware sets a "user" context value
	userID := ctx.Value("user_id")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse Multipart Form (Max memory budget for parsing, e.g., 32MB)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	// 1. Extract File
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Missing file parameter", http.StatusBadRequest)
		return
	}
	defer file.Close()

	reqData := services.MediaUploadReq{
		Type:      r.FormValue("type"),
		Source:    r.FormValue("source"),
		Caption:   nil,
		Thumbnail: nil,
		Controls:  nil,
		Alt:       nil,
		Credit:    nil,
	}

	// 3. Call Service Layer
	media, err := h.mediaService.Upload(ctx, file, header.Filename, header.Header.Get("Content-Type"), reqData)
	if err != nil {
		if errors.Is(err, services.ErrFileTooLarge) {
			http.Error(w, err.Error(), http.StatusRequestEntityTooLarge) // 413
			return
		}
		if errors.Is(err, services.ErrStorageError) {
			http.Error(w, err.Error(), http.StatusInternalServerError) // 500
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// 4. Return Response (Equivalent to response_model=MediaRes, status_code=201)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(media)
}
