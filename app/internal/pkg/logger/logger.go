package logger

import (
	"context"
	"fmt"
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	globalLogger *zap.Logger
	sugarLogger  *zap.SugaredLogger
)

type contextKey any

// Init initializes the global logger
func Init(environment string) error {
	var config zap.Config

	if environment == "production" {
		config = zap.NewProductionConfig()
		config.EncoderConfig.TimeKey = "timestamp"
		config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	} else {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	}

	logger, err := config.Build()
	if err != nil {
		return fmt.Errorf("failed to initialize logger: %w", err)
	}

	globalLogger = logger
	sugarLogger = logger.Sugar()
	return nil
}

// GetLogger returns the global logger
func GetLogger() *zap.Logger {
	if globalLogger == nil {
		// Fallback to default logger if not initialized
		logger, _ := zap.NewDevelopment()
		globalLogger = logger
	}
	return globalLogger
}

// GetSugarLogger returns the global sugared logger
func GetSugarLogger() *zap.SugaredLogger {
	if sugarLogger == nil {
		logger := GetLogger()
		sugarLogger = logger.Sugar()
	}
	return sugarLogger
}

// WithContext returns a logger with context fields
func WithContext(ctx context.Context) *zap.Logger {
	logger := GetLogger()
	if requestID := ctx.Value("request_id"); requestID != nil {
		logger = logger.With(zap.Any("request_id", requestID))
	}
	if userID := ctx.Value("user_id"); userID != nil {
		logger = logger.With(zap.Any("user_id", userID))
	}
	return logger
}

// Info logs an info message
func Info(msg string, fields ...zap.Field) {
	GetLogger().Info(msg, fields...)
}

// Error logs an error message
func Error(msg string, fields ...zap.Field) {
	GetLogger().Error(msg, fields...)
}

// Debug logs a debug message
func Debug(msg string, fields ...zap.Field) {
	GetLogger().Debug(msg, fields...)
}

// Warn logs a warning message
func Warn(msg string, fields ...zap.Field) {
	GetLogger().Warn(msg, fields...)
}

// Fatal logs a fatal message and exits
func Fatal(msg string, fields ...zap.Field) {
	GetLogger().Fatal(msg, fields...)
}

// Sync flushes any buffered log entries
func Sync() error {
	return GetLogger().Sync()
}

// WithField returns a logger with additional field
func WithField(key string, value interface{}) *zap.Logger {
	return GetLogger().With(zap.Any(key, value))
}

// WithFields returns a logger with additional fields
func WithFields(fields map[string]interface{}) *zap.Logger {
	zapFields := make([]zap.Field, 0, len(fields))
	for k, v := range fields {
		zapFields = append(zapFields, zap.Any(k, v))
	}
	return GetLogger().With(zapFields...)
}

// RequestLogger middleware helper
func LogRequest(ctx context.Context, method, path string, statusCode int, latency string) {
	logger := WithContext(ctx)
	logger.Info("HTTP request",
		zap.String("method", method),
		zap.String("path", path),
		zap.Int("status", statusCode),
		zap.String("latency", latency),
	)
}

// LogError logs an error with context
func LogError(ctx context.Context, err error, msg string, withTrace ...bool) {
	logger := WithContext(ctx)

	// Check if trace was explicitly requested
	showTrace := false
	if len(withTrace) > 0 && withTrace[0] {
		showTrace = true
	}

	// Configure trace fallback dynamically
	var opts zap.Option
	if showTrace {
		opts = zap.AddStacktrace(zap.ErrorLevel) // Captures path
	} else {
		opts = zap.AddStacktrace(zap.PanicLevel) // Mutes path
	}

	if err != nil {
		logger.WithOptions(opts).Error(msg,
			zap.Error(err),
			zap.String("error_type", fmt.Sprintf("%T", err)),
		)
	} else {
		logger.WithOptions(opts).Error(msg)
	}
}

// InitTestLogger initializes a logger for testing (writes to stdout)
func InitTestLogger() {
	logger, _ := zap.NewDevelopment()
	globalLogger = logger
	sugarLogger = logger.Sugar()
}

// Close closes the logger and releases resources
func Close() {
	if globalLogger != nil {
		_ = globalLogger.Sync()
	}
}

// StdoutWriter returns a writer that writes to stdout
func StdoutWriter() *os.File {
	return os.Stdout
}

// StderrWriter returns a writer that writes to stderr
func StderrWriter() *os.File {
	return os.Stderr
}
