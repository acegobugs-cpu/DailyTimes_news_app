package services

import (
	"bytes"
	"context"
	"crypto/md5"
	"fmt"
	"io"
	"path/filepath"

	"app/internal/domain/entities"
	"app/internal/domain/repositories"
)

// DTOs matching your FastAPI MediaReq and MediaRes
type MediaUploadReq struct {
	Type      string
	Source    string
	Caption   *string
	Thumbnail *string
	Controls  *int
	Alt       *string
	Credit    *string
}

type MinioService interface {
	UploadFile(ctx context.Context, content []byte, filename, contentType string) error
}

type MediaService interface {
	Upload(ctx context.Context, fileReader io.Reader, filename, contentType string, req MediaUploadReq) (*entities.Media, error)
}

type mediaService struct {
	repo         *repositories.MediaRepository
	minio        MinioService
	maxFileSize  int64
	minioBaseURL string
}

func NewMediaService(repo *repositories.MediaRepository, minio MinioService, maxFile int64, minioURL string) MediaService {
	return &mediaService{
		repo:         repo,
		minio:        minio,
		maxFileSize:  maxFile,
		minioBaseURL: minioURL,
	}
}

// Custom errors to decouple business logic from HTTP status codes
var (
	ErrFileTooLarge = fmt.Errorf("file size exceeds maximum allowed limit")
	ErrStorageError = fmt.Errorf("failed to upload to storage")
)

func (s *mediaService) Upload(ctx context.Context, fileReader io.Reader, filename, contentType string, req MediaUploadReq) (*entities.Media, error) {
	var totalSize int64
	chunkSize := 64 * 1024 // 64KB
	buf := make([]byte, chunkSize)
	var content bytes.Buffer

	// 1. Read in chunks & validate size dynamically (mimicking the Python loop)
	for {
		n, err := fileReader.Read(buf)
		if n > 0 {
			totalSize += int64(n)
			if totalSize > s.maxFileSize {
				return nil, ErrFileTooLarge
			}
			content.Write(buf[:n])
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
	}

	fileBytes := content.Bytes()

	// 2. Hash and Filename construction
	hash := md5.Sum(fileBytes)
	fileHashHex := fmt.Sprintf("%x", hash)
	uniqueFilename := fmt.Sprintf("%s_%s", fileHashHex, filepath.Base(filename))

	fileURL := uniqueFilename
	if s.minioBaseURL != "" {
		fileURL = fmt.Sprintf("%s/%s", s.minioBaseURL, uniqueFilename)
	}

	// 3. Upload to Minio
	if err := s.minio.UploadFile(ctx, fileBytes, uniqueFilename, contentType); err != nil {
		return nil, ErrStorageError
	}

	// 4. Save to Database
	media := &entities.Media{
		Name:      filename,
		URL:       fileURL,
		Type:      req.Type,
		Source:    &req.Source,
		Caption:   req.Caption,
		Thumbnail: req.Thumbnail,
		Controls:  req.Controls,
		Alt:       req.Alt,
		Credit:    req.Credit,
	}

	if err := s.repo.Create(ctx, media); err != nil {
		return nil, err
	}

	return media, nil
}
