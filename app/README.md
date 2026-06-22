# DailyTimes Go Backend

A production-ready Go backend application built with Clean Architecture principles, designed to migrate from the existing FastAPI backend.

## Architecture

This application follows Clean Architecture principles with clear separation of concerns:

- **cmd/** - Application entry points
- **internal/domain/** - Core business logic (entities, repositories, services)
- **internal/infrastructure/** - External implementations (database, message queues, gRPC)
- **internal/interfaces/** - Transport layers (HTTP, gRPC)
- **internal/pkg/** - Shared utilities (config, logger, errors, middleware)

## Features

- **HTTP Server** - Built with chi router
- **gRPC Server** - Ready for microservices communication
- **Message Queues** - RabbitMQ integration for async processing
- **Database** - PostgreSQL with pgx driver
- **Authentication** - JWT-based auth with refresh tokens
- **Rate Limiting** - Configurable per-endpoint rate limits
- **CORS** - Configurable CORS middleware
- **Graceful Shutdown** - Proper cleanup on termination
- **Structured Logging** - Zap logger with context support
- **Error Handling** - Custom error types with HTTP status codes

## Tech Stack

- **Go 1.21+**
- **Chi Router** - HTTP routing
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions
- **RabbitMQ** - Message queuing
- **gRPC** - Microservices communication
- **Zap** - Structured logging
- **Viper** - Configuration management

## Project Structure

```
app.dailyTimes.com/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── internal/
│   ├── domain/
│   │   ├── entities/            # Domain entities
│   │   ├── repositories/        # Repository interfaces
│   │   └── services/            # Business logic services
│   ├── infrastructure/
│   │   ├── database/            # PostgreSQL implementations
│   │   ├── messagequeue/        # RabbitMQ integration
│   │   └── grpc/                # gRPC server
│   ├── interfaces/
│   │   ├── http/                # HTTP handlers and router
│   │   └── grpc/                # gRPC handlers
│   └── pkg/
│       ├── config/              # Configuration management
│       ├── logger/              # Logging utilities
│       ├── errors/              # Error handling
│       └── middleware/          # HTTP middleware
├── configs/
│   └── config.yaml              # Application configuration
├── migrations/                  # Database migrations
├── proto/                       # Protocol buffer definitions
├── Dockerfile                   # Docker image
├── docker-compose.yml           # Docker compose setup
└── go.mod                       # Go module definition
```

## Getting Started

### Prerequisites

- Go 1.21 or higher
- PostgreSQL 15+
- Redis 7+
- RabbitMQ 3+

### Local Development

1. **Clone the repository**
   ```bash
   cd app.dailyTimes.com
   ```

2. **Install dependencies**
   ```bash
   go mod download
   ```

3. **Configure environment**
   ```bash
   cp configs/config.example.yaml configs/config.yaml
   # Edit configs/config.yaml with your settings
   ```

4. **Run database migrations**
   ```bash
   # Apply migrations to PostgreSQL
   ```

5. **Run the application**
   ```bash
   go run cmd/server/main.go
   ```

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f app
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/logout-all` - Logout from all devices
- `POST /api/auth/verify` - Verify access token

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Articles
- `POST /api/articles` - Create article
- `GET /api/articles` - List articles
- `GET /api/articles/search` - Search articles
- `GET /api/articles/:id` - Get article by ID
- `GET /api/articles/slug/:slug` - Get article by slug
- `PUT /api/articles/:id` - Update article
- `DELETE /api/articles/:id` - Delete article

### Categories
- `POST /api/categories` - Create category
- `GET /api/categories` - List categories
- `GET /api/categories/:id` - Get category by ID
- `GET /api/categories/slug/:slug` - Get category by slug
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Authorized Emails
- `POST /api/authorize-emails` - Create authorized email
- `GET /api/authorize-emails` - List authorized emails
- `GET /api/authorize-emails/:slug` - Get authorized email by slug
- `POST /api/authorize-emails/:slug/use` - Mark as used
- `DELETE /api/authorize-emails/:slug` - Delete authorized email

## Configuration

Configuration is managed through `configs/config.yaml`. Key settings:

```yaml
server:
  host: "0.0.0.0"
  port: 8080
  environment: "development"

database:
  host: "localhost"
  port: 5432
  user: "postgres"
  password: "postgres"
  dbname: "dailytimes"

jwt:
  secret: "your-secret-key"
  access_duration: 15m
  refresh_duration: 168h

cors:
  allowed_origins:
    - "http://localhost:3000"
```

## Graceful Shutdown

The application implements graceful shutdown:
- Catches SIGINT and SIGTERM signals
- Shuts down HTTP server gracefully
- Closes database connections
- Cleans up resources
- Configurable timeout (default: 30s)

## Live TV Support

The architecture is designed to support Live TV features:
- gRPC server for streaming protocols
- Message queue for real-time events
- Media entity with controls field
- Extensible for video streaming protocols

## Development Guidelines

- Follow Clean Architecture principles
- Use `context.Context` for all request handling
- Implement proper error handling with custom error types
- Add structured logging with context
- Write repository interfaces before implementations
- Keep transport layers separate from business logic

## Migration from FastAPI

This Go backend is designed to be a direct migration of the FastAPI backend:
- Same domain entities (User, Article, Category, etc.)
- Same API endpoints
- Same database schema
- Same authentication flow
- Enhanced with better performance and concurrency

## License

[Your License Here]
