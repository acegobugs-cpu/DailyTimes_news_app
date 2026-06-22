package handlers

import (
	"app/internal/domain/services"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/go-chi/chi/v5"
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

func (h *MediaHandler) ListUploadedFiles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 1. Extract user context (Depends(get_current_user) equivalent)
	userID := ctx.Value("user_id")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. Call Service Layer
	res, err := h.mediaService.ListUploadedFiles(ctx)
	if err != nil {
		http.Error(w, "Failed to retrieve file list", http.StatusInternalServerError)
		return
	}

	// 3. Return JSON response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}

func (h *MediaHandler) GetFile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Extract URL parameter: /upload/{filename} -> chi.URLParam(r, "filename")
	filename := chi.URLParam(r, "filename")
	if filename == "" {
		http.Error(w, "Filename parameter is required", http.StatusBadRequest)
		return
	}

	// Fetch file stream from service layer
	bodyStream, contentType, err := h.mediaService.Download(ctx, filename)
	if err != nil {
		// Type-assert AWS API specific errors to match Python's ClientError behavior
		var noSuchKey *types.NoSuchKey
		if errors.As(err, &noSuchKey) {
			http.Error(w, "File not found", http.StatusNotFound) // 404
			return
		}

		http.Error(w, "Internal Server Error", http.StatusInternalServerError) // 500
		return
	}
	// Crucial: Close the S3 network body stream when the HTTP request finishes
	defer bodyStream.Close()

	// Set response headers
	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(http.StatusOK)

	// Stream directly to client: copies chunks from S3 network stream to HTTP response writer
	_, err = io.Copy(w, bodyStream)
	if err != nil {
		// Connection dropped mid-flight; log it if necessary, server can no longer write headers
		return
	}
}

// ReplaceFile corresponds to PUT /upload/{filename}
func (h *MediaHandler) ReplaceFile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	filename := chi.URLParam(r, "filename")

	if ctx.Value("user_id") == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Missing file parameter", http.StatusBadRequest)
		return
	}
	defer file.Close()

	err = h.mediaService.Replace(ctx, filename, file, header.Header.Get("Content-Type"))
	if err != nil {

		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message":  "File replaced",
		"filename": filename,
	})
}

// DeleteFile corresponds to DELETE /upload/{filename}
func (h *MediaHandler) DeleteFile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	filename := chi.URLParam(r, "filename")

	if ctx.Value("user_id") == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	err := h.mediaService.Delete(ctx, filename)
	if err != nil {

		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// 204 No Content
	w.WriteHeader(http.StatusNoContent)
}
