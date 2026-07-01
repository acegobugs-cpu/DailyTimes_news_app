package config

import (
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server    ServerConfig    `mapstructure:"server"`
	Database  DatabaseConfig  `mapstructure:"database"`
	Redis     RedisConfig     `mapstructure:"redis"`
	Mail      MailConfig      `mapstructure:"mail"`
	RabbitMQ  RabbitMQConfig  `mapstructure:"rabbitmq"`
	JWT       JWTConfig       `mapstructure:"jwt"`
	GRPC      GRPCConfig      `mapstructure:"grpc"`
	CORS      CORSConfig      `mapstructure:"cors"`
	Auth      AuthConfig      `mapstructure:"auth"`
	Storage   StorageConfig   `mapstructure:"storage"`
	RateLimit RateLimitConfig `mapstructure:"ratelimit"`
	Security  SecurityConfig  `mapstructure:"security"`
}

type ServerConfig struct {
	Host            string        `mapstructure:"host"`
	Port            int           `mapstructure:"port"`
	ReadTimeout     time.Duration `mapstructure:"read_timeout"`
	WriteTimeout    time.Duration `mapstructure:"write_timeout"`
	ShutdownTimeout time.Duration `mapstructure:"shutdown_timeout"`
	Environment     string        `mapstructure:"environment"`
}

type DatabaseConfig struct {
	Host            string `mapstructure:"host"`
	Port            int    `mapstructure:"port"`
	User            string `mapstructure:"user"`
	Password        string `mapstructure:"password"`
	DBName          string `mapstructure:"dbname"`
	SSLMode         string `mapstructure:"sslmode"`
	MaxOpenConns    int    `mapstructure:"max_open_conns"`
	MaxIdleConns    int    `mapstructure:"max_idle_conns"`
	ConnMaxLifetime int    `mapstructure:"conn_max_lifetime"`
}

type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

type MailConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`
	Email    string `mapstructure:"email"`
}

type RabbitMQConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	Vhost    string `mapstructure:"vhost"`
}

type JWTConfig struct {
	Secret          string        `mapstructure:"secret"`
	AccessDuration  time.Duration `mapstructure:"access_duration"`
	RefreshDuration time.Duration `mapstructure:"refresh_duration"`
	Issuer          string        `mapstructure:"issuer"`
}

type GRPCConfig struct {
	Host string `mapstructure:"host"`
	Port int    `mapstructure:"port"`
}

type CORSConfig struct {
	AllowedOrigins   []string `mapstructure:"allowed_origins"`
	AllowedMethods   []string `mapstructure:"allowed_methods"`
	AllowedHeaders   []string `mapstructure:"allowed_headers"`
	AllowCredentials bool     `mapstructure:"allow_credentials"`
}

type AuthConfig struct {
	FrontendURL      string        `mapstructure:"frontend_url"`
	InvitationTTL    time.Duration `mapstructure:"invitation_ttl"`
	MaxLoginAttempts int           `mapstructure:"max_login_attempts"`
	LockoutDuration  time.Duration `mapstructure:"lockout_duration"`
}

type StorageConfig struct {
	Endpoint    string `mapstructure:"endpoint"`
	BucketName  string `mapstructure:"bucket_name"`
	Region      string `mapstructure:"region"`
	MaxFileSize int64  `mapstructure:"max_file_size"`
	PublicURL   string `mapstructure:"public_url"`
}

type RateLimitConfig struct {
	AuthRequestsPerMinute     int `mapstructure:"auth_requests_per_minute"`
	GlobalRequestsPerMinute   int `mapstructure:"global_requests_per_minute"`
	LoginRequestsPerMinute    int `mapstructure:"login_requests_per_minute"`
	RefreshRequestsPerMinute  int `mapstructure:"refresh_requests_per_minute"`
	RegisterRequestsPerMinute int `mapstructure:"register_requests_per_minute"`
}

type SecurityConfig struct {
	BcryptCost               int      `mapstructure:"bcrypt_cost"`
	TrustedProxies           []string `mapstructure:"trusted_proxies"`
	PasswordMinLength        int      `mapstructure:"password_min_length"`
	PasswordRequireUppercase bool     `mapstructure:"password_require_uppercase"`
	PasswordRequireLowercase bool     `mapstructure:"password_require_lowercase"`
	PasswordRequireNumber    bool     `mapstructure:"password_require_number"`
	PasswordRequireSpecial   bool     `mapstructure:"password_require_special"`
	EncryptionKey            string   `mapstructure:"encryption_key"` // For encrypting sensitive data like refresh tokens
}

func Load(configPath string) (*Config, error) {
	viper.SetConfigFile(configPath)
	viper.SetConfigType("yaml")

	// 1. FIX: Tell Viper how to translate nested YAML keys to Environment Variables
	// Example: "server.port" becomes "APP_SERVER_PORT"
	viper.SetEnvPrefix("APP") // Good practice: prefix to avoid overlapping with system envs
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// Set defaults
	setDefaults()

	// Enable environment variable override
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		// If the file doesn't exist, we can choose to ignore it if we expect env variables instead
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return &config, nil
}

func setDefaults() {
	// Server defaults
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.port", 8080)
	viper.SetDefault("server.read_timeout", 15*time.Second)
	viper.SetDefault("server.write_timeout", 15*time.Second)
	viper.SetDefault("server.shutdown_timeout", 30*time.Second)
	viper.SetDefault("server.environment", "development")

	// Database defaults
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.sslmode", "disable")
	viper.SetDefault("database.max_open_conns", 25)
	viper.SetDefault("database.max_idle_conns", 5)
	viper.SetDefault("database.conn_max_lifetime", 300)

	// Redis defaults
	viper.SetDefault("redis.host", "localhost")
	viper.SetDefault("redis.port", 6379)
	viper.SetDefault("redis.db", 0)

	viper.SetDefault("mail.host", "")
	viper.SetDefault("mail.port", 0)
	viper.SetDefault("mail.username", "")
	viper.SetDefault("mail.password", "")
	viper.SetDefault("mail.email", "")

	// RabbitMQ defaults
	viper.SetDefault("rabbitmq.host", "localhost")
	viper.SetDefault("rabbitmq.port", 5672)
	viper.SetDefault("rabbitmq.vhost", "/")

	// JWT defaults
	viper.SetDefault("jwt.access_duration", 15*time.Minute)
	viper.SetDefault("jwt.refresh_duration", 7*24*time.Hour)
	viper.SetDefault("jwt.issuer", "app.dailytimes.com")

	// gRPC defaults
	viper.SetDefault("grpc.host", "0.0.0.0")
	viper.SetDefault("grpc.port", 50051)

	// CORS defaults
	viper.SetDefault("cors.allowed_origins", []string{})
	viper.SetDefault("cors.allowed_methods", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"})
	viper.SetDefault("cors.allowed_headers", []string{"*"})
	viper.SetDefault("cors.allow_credentials", false)

	// Auth defaults
	viper.SetDefault("auth.frontend_url", "http://localhost:3000")
	viper.SetDefault("auth.invitation_ttl", 24*time.Hour)
	viper.SetDefault("auth.max_login_attempts", 5)
	viper.SetDefault("auth.lockout_duration", 15*time.Minute)

	// Storage defaults
	viper.SetDefault("storage.endpoint", "http://localhost:4566")
	viper.SetDefault("storage.bucket_name", "media-bucket")
	viper.SetDefault("storage.region", "us-east-1")
	viper.SetDefault("storage.max_file_size", 64*1024*1024) // 64MB
	viper.SetDefault("storage.public_url", "http://localhost:4566/media-bucket")

	// Rate limit defaults
	viper.SetDefault("ratelimit.auth_requests_per_minute", 10)
	viper.SetDefault("ratelimit.global_requests_per_minute", 100)
	viper.SetDefault("ratelimit.login_requests_per_minute", 5)
	viper.SetDefault("ratelimit.refresh_requests_per_minute", 20)

	// Security defaults
	viper.SetDefault("security.bcrypt_cost", 10)
	viper.SetDefault("security.trusted_proxies", []string{"127.0.0.1", "::1"})
	viper.SetDefault("security.password_min_length", 8)
	viper.SetDefault("security.password_require_uppercase", true)
	viper.SetDefault("security.password_require_lowercase", true)
	viper.SetDefault("security.password_require_number", true)
	viper.SetDefault("security.password_require_special", false)
	viper.SetDefault("security.encryption_key", "") // Must be set via environment variable in production
}

// Validate validates the configuration
func (c *Config) Validate() error {
	// Look how much cleaner this is. No os.Getenv needed!
	if c.JWT.Secret == "" {
		return fmt.Errorf("JWT secret is required (set APP_JWT_SECRET)")
	}
	if len(c.JWT.Secret) < 32 {
		return fmt.Errorf("JWT secret must be at least 32 characters")
	}

	if c.Server.Environment == "production" && c.Security.EncryptionKey == "" {
		return fmt.Errorf("encryption key is required in production environment (set APP_SECURITY_ENCRYPTION_KEY)")
	}

	// ... rest of your validation logic
	return nil
}

// GetJWTSecret returns the JWT secret from environment variable
func (c *Config) GetJWTSecret() string {
	if jwtSecret := os.Getenv("JWT_SECRET"); jwtSecret != "" {
		return jwtSecret
	}
	return c.JWT.Secret
}

// GetEncryptionKey returns the encryption key from config
func (c *Config) GetEncryptionKey() []byte {
	key := c.Security.EncryptionKey
	// If it's hex encoded, decode it
	switch len(key) {
	case 16, 24, 32: // 32 bytes in hex
		decoded, err := hex.DecodeString(key)
		if err == nil {
			return decoded
		}
	default:
		return nil
	}
	// Otherwise treat as raw bytes
	return []byte(key)
}

// IsTrustedProxy checks if an IP address is in the trusted proxy list
func (c *Config) IsTrustedProxy(ip string) bool {
	for _, trusted := range c.Security.TrustedProxies {
		if ip == trusted {
			return true
		}
	}
	return false
}
