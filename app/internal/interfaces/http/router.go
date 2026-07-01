package http

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"go.uber.org/zap"

	"app/internal/domain/handlers"
	"app/internal/domain/services"
	"app/internal/pkg/config"
	"app/internal/pkg/middleware"
)

// Router represents the HTTP router
type Router struct {
	router           *chi.Mux
	config           *config.Config
	userHandler      *handlers.UserHandler
	authHandler      *handlers.AuthHandler
	articleHandler   *handlers.ArticleHandler
	categoryHandler  *handlers.CategoryHandler
	authEmailHandler *handlers.AuthorizedEmailHandler
	mediaHandler     *handlers.MediaHandler
	csrfProtection   *middleware.CSRFProtection
	authMiddleware   *middleware.AuthMiddleware
}

// NewRouter creates a new HTTP router
func NewRouter(
	config *config.Config,
	userHandler *handlers.UserHandler,
	authHandler *handlers.AuthHandler,
	articleHandler *handlers.ArticleHandler,
	categoryHandler *handlers.CategoryHandler,
	authEmailHandler *handlers.AuthorizedEmailHandler,
	mediaHandler *handlers.MediaHandler,
	authService *services.AuthService,
) *Router {
	r := chi.NewRouter()

	// Initialize CSRF protection
	csrfProtection := middleware.NewCSRFProtection(zap.L())

	// Initialize authentication middleware
	authMiddleware := middleware.NewAuthMiddleware(authService)

	router := &Router{
		router:           r,
		config:           config,
		userHandler:      userHandler,
		authHandler:      authHandler,
		articleHandler:   articleHandler,
		categoryHandler:  categoryHandler,
		authEmailHandler: authEmailHandler,
		mediaHandler:     mediaHandler,
		csrfProtection:   csrfProtection,
		authMiddleware:   authMiddleware,
	}

	router.setupMiddleware()
	router.setupRoutes()

	return router
}

// setupMiddleware sets up global middleware
func (r *Router) setupMiddleware() {
	// Basic middleware
	r.router.Use(chiMiddleware.RequestID)
	r.router.Use(chiMiddleware.RealIP)
	r.router.Use(chiMiddleware.Recoverer)
	r.router.Use(chiMiddleware.Logger)
	r.router.Use(middleware.Timeout(r.config.Server.ReadTimeout))
	r.router.Use(middleware.ContentType)

	// CORS
	corsMiddleware := cors.New(cors.Options{
		AllowedOrigins:   r.config.CORS.AllowedOrigins,
		AllowedMethods:   r.config.CORS.AllowedMethods,
		AllowedHeaders:   r.config.CORS.AllowedHeaders,
		AllowCredentials: r.config.CORS.AllowCredentials,
		MaxAge:           300,
	})
	r.router.Use(corsMiddleware.Handler)

	// Rate limiting - use configured global rate limit
	r.router.Use(httprate.LimitByIP(r.config.RateLimit.GlobalRequestsPerMinute, 1*time.Minute))
}

// setupRoutes sets up application routes
func (r *Router) setupRoutes() {
	r.router.Route("/api/v1", func(router chi.Router) {
		// Health check
		router.Get("/health", r.healthCheck)

		// CSRF token endpoint (no CSRF protection needed to get token)
		router.Get("/csrf/token", r.csrfProtection.GetCSRFTokenHandler)

		// Auth routes with per-endpoint rate limiting
		router.With(httprate.LimitByIP(r.config.RateLimit.AuthRequestsPerMinute, 1*time.Minute)).Route("/auth", func(router chi.Router) {
			// Apply CSRF protection to state-changing auth routes
			router.With(httprate.LimitByIP(r.config.RateLimit.LoginRequestsPerMinute, 1*time.Minute)).Post("/login", r.authHandler.Login)
			router.With(r.csrfProtection.Middleware).With(httprate.LimitByIP(r.config.RateLimit.RefreshRequestsPerMinute, 1*time.Minute)).Post("/refresh", r.authHandler.RefreshToken)
			router.With(r.csrfProtection.Middleware).With(httprate.LimitByIP(r.config.RateLimit.RegisterRequestsPerMinute, 1*time.Minute)).Post("/signin", r.authHandler.Signin)
			router.With(r.csrfProtection.Middleware).Post("/logout", r.authHandler.Logout)
			router.With(r.csrfProtection.Middleware).Post("/logout-all", r.authHandler.LogoutAll)
			router.With(r.csrfProtection.Middleware).Post("/verify", r.authHandler.VerifyToken)

			// GET requests don't need CSRF
			router.With(httprate.LimitByIP(r.config.RateLimit.RegisterRequestsPerMinute, 1*time.Minute)).Get("/register", r.authHandler.GetPendingInvitation)
			router.With(r.csrfProtection.Middleware).With(httprate.LimitByIP(r.config.RateLimit.RegisterRequestsPerMinute, 1*time.Minute)).Post("/register", r.authHandler.GetPendingInvitation)
			router.Get("/me", r.authHandler.Me)
		})

		// User routes with CSRF protection for state-changing operations
		router.Route("/users", func(router chi.Router) {
			router.With(r.csrfProtection.Middleware).Post("/invite", r.userHandler.Invite)
			router.With(r.authMiddleware.Middleware).Get("/invites", r.userHandler.GetInvitationList)
			router.With(r.authMiddleware.Middleware).Get("/", r.userHandler.ListUsers)
			router.Route("/{id}", func(router chi.Router) {
				router.With(r.authMiddleware.Middleware).Get("/", r.userHandler.GetUser)
				router.With(r.csrfProtection.Middleware).With(r.authMiddleware.Middleware).Put("/", r.userHandler.UpdateUser)
				router.With(r.csrfProtection.Middleware).With(r.authMiddleware.Middleware).Delete("/", r.userHandler.DeleteUser)
			})
		})

		// Article routes with CSRF protection for state-changing operations
		router.Route("/articles", func(router chi.Router) {
			router.With(r.csrfProtection.Middleware).With(r.authMiddleware.Middleware).Post("/", r.articleHandler.CreateArticle)
			router.Get("/", r.articleHandler.ListArticles)
			router.Get("/search", r.articleHandler.SearchArticles)
			router.Route("/{id}", func(router chi.Router) {
				router.Get("/", r.articleHandler.GetArticle)
				router.With(r.csrfProtection.Middleware).With(r.authMiddleware.Middleware).Put("/", r.articleHandler.UpdateArticle)
				router.With(r.csrfProtection.Middleware).With(r.authMiddleware.Middleware).Delete("/", r.articleHandler.DeleteArticle)
			})
			router.Get("/slug/{slug}", r.articleHandler.GetArticleBySlug)
		})

		// Category routes with CSRF protection for state-changing operations
		router.Route("/categories", func(router chi.Router) {
			router.With(r.csrfProtection.Middleware).With(r.authMiddleware.Middleware).Post("/", r.categoryHandler.CreateCategory)
			router.Get("/", r.categoryHandler.ListCategories)
			router.Route("/{id}", func(router chi.Router) {
				router.Get("/", r.categoryHandler.GetCategory)
				router.With(r.csrfProtection.Middleware).With(r.authMiddleware.Middleware).Put("/", r.categoryHandler.UpdateCategory)
				router.With(r.csrfProtection.Middleware).With(r.authMiddleware.Middleware).Delete("/", r.categoryHandler.DeleteCategory)
			})
			router.Get("/slug/{slug}", r.categoryHandler.GetCategoryBySlug)
		})

		// Authorized email routes with CSRF protection for state-changing operations
		router.Route("/authorize-emails", func(router chi.Router) {
			router.With(r.csrfProtection.Middleware).With(r.authMiddleware.Middleware).Post("/", r.authEmailHandler.CreateAuthorizedEmail)
			router.With(r.authMiddleware.Middleware).Get("/", r.authEmailHandler.ListAuthorizedEmails)
			router.Route("/{slug}", func(router chi.Router) {
				router.With(r.authMiddleware.Middleware).Get("/", r.authEmailHandler.GetAuthorizedEmail)
				router.With(r.csrfProtection.Middleware).With(r.authMiddleware.Middleware).Post("/use", r.authEmailHandler.MarkAsUsed)
				router.With(r.csrfProtection.Middleware).With(r.authMiddleware.Middleware).Delete("/", r.authEmailHandler.DeleteAuthorizedEmail)
			})
		})

		router.Route("/uploads", func(router chi.Router) {
			router.With(r.csrfProtection.Middleware).With(r.authMiddleware.Middleware).Post("/", r.mediaHandler.UploadFile)
			router.With(r.authMiddleware.Middleware).Get("/", r.mediaHandler.ListUploadedFiles)
			// router.Put("/:id")
			router.Get("/{filename}", r.mediaHandler.GetFile)
			// router.Delete("/:id")
		})
	})
}

// healthCheck handles health check requests
func (r *Router) healthCheck(w http.ResponseWriter, req *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

// ServeHTTP implements http.Handler interface
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	r.router.ServeHTTP(w, req)
}

// Shutdown gracefully shuts down the HTTP server
func (r *Router) Shutdown(ctx context.Context, server *http.Server) error {
	return server.Shutdown(ctx)
}
