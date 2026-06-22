package grpc

import (
	"context"
	"fmt"
	"net"

	"google.golang.org/grpc"

	"app/internal/pkg/config"
	"app/internal/pkg/logger"
)

// Server represents a gRPC server
type Server struct {
	server *grpc.Server
	config *config.GRPCConfig
}

// NewServer creates a new gRPC server
func NewServer(cfg *config.GRPCConfig) *Server {
	opts := []grpc.ServerOption{
		grpc.MaxRecvMsgSize(1024 * 1024 * 10), // 10MB
		grpc.MaxSendMsgSize(1024 * 1024 * 10), // 10MB
	}

	server := grpc.NewServer(opts...)

	return &Server{
		server: server,
		config: cfg,
	}
}

// Server returns the gRPC server instance
func (s *Server) Server() *grpc.Server {
	return s.server
}

// Start starts the gRPC server
func (s *Server) Start() error {
	addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to listen: %w", err)
	}

	// logger.Info("gRPC server starting", logger.WithField("addr", addr))

	go func() {
		if err := s.server.Serve(listener); err != nil {
			// logger.Fatal("gRPC server failed", logger.WithField("error", err))
		}
	}()

	return nil
}

// Shutdown gracefully shuts down the gRPC server
func (s *Server) Shutdown(ctx context.Context) error {
	logger.Info("Shutting down gRPC server")

	// Create a channel to signal when shutdown is complete
	done := make(chan struct{})

	go func() {
		s.server.GracefulStop()
		close(done)
	}()

	// Wait for shutdown or timeout
	select {
	case <-done:
		logger.Info("gRPC server shutdown complete")
		return nil
	case <-ctx.Done():
		logger.Warn("gRPC server shutdown timeout, forcing stop")
		s.server.Stop()
		return ctx.Err()
	}
}

// RegisterService registers a gRPC service
func (s *Server) RegisterService(sd *grpc.ServiceDesc, ss interface{}) {
	s.server.RegisterService(sd, ss)
}
