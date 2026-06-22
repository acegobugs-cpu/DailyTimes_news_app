package storage

import (
	"bytes"
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Storage struct {
	client     *s3.Client
	bucketName string
}

// NewS3StorageService initializes the S3 Client for either LocalStack or MinIO
// localstackEndpoint default: "http://localhost:4566"
// minioEndpoint default:      "http://localhost:9000"
func NewS3Storage(ctx context.Context, endpointURL, bucketName, region string) (*S3Storage, error) {
	// LocalStack & MinIO accept arbitrary dummy values for credentials
	customProvider := credentials.NewStaticCredentialsProvider("mock-access-key", "mock-secret-key", "")

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
		config.WithCredentialsProvider(customProvider),
	)
	if err != nil {
		return nil, err
	}

	// Create the S3 client specifying local endpoints and forcing path style routing
	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpointURL)
		o.UsePathStyle = true // Crucial for LocalStack/MinIO to bypass DNS bucket routing
	})

	return &S3Storage{
		client:     s3Client,
		bucketName: bucketName,
	}, nil
}

// UploadFile fulfills the interface required by your MediaService
func (s *S3Storage) UploadFile(ctx context.Context, content []byte, filename, contentType string) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{ // <-- Fixed this line
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(filename),
		Body:        bytes.NewReader(content),
		ContentType: aws.String(contentType),
	})
	return err
}
