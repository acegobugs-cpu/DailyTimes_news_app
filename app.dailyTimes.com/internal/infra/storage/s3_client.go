package storage

import (
	"bytes"
	"context"
	"errors"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go"
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

func (s *S3Storage) ListFiles(ctx context.Context) ([]string, error) {
	var fileKeys []string

	input := &s3.ListObjectsV2Input{
		Bucket: aws.String(s.bucketName),
	}

	// Fetch objects from S3/LocalStack
	result, err := s.client.ListObjectsV2(ctx, input)
	if err != nil {
		return nil, err
	}

	for _, object := range result.Contents {
		if object.Key != nil {
			fileKeys = append(fileKeys, *object.Key)
		}
	}

	return fileKeys, nil
}

func (s *S3Storage) GetFile(ctx context.Context, filename string) (io.ReadCloser, string, error) {
	output, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(filename),
	})
	if err != nil {
		return nil, "", err
	}

	contentType := "application/octet-stream"
	if output.ContentType != nil {
		contentType = *output.ContentType
	}

	return output.Body, contentType, nil
}

func (s *S3Storage) CheckFileExists(ctx context.Context, filename string) (bool, error) {
	_, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(filename),
	})
	if err != nil {
		var apiErr smithy.APIError
		if errors.As(err, &apiErr) {
			// AWS and localstack return "NotFound" or "NoSuchKey" for missing keys
			if apiErr.ErrorCode() == "NotFound" || apiErr.ErrorCode() == "NoSuchKey" {
				return false, nil
			}
		}
		return false, err
	}
	return true, nil
}

// DeleteFile physically removes the object from the S3 bucket
func (s *S3Storage) DeleteFile(ctx context.Context, filename string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(filename),
	})
	return err
}
