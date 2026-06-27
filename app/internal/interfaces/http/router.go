package http

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"

	"app/internal/domain/handlers"
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
) *Router {
	r := chi.NewRouter()

	router := &Router{
		router:           r,
		config:           config,
		userHandler:      userHandler,
		authHandler:      authHandler,
		articleHandler:   articleHandler,
		categoryHandler:  categoryHandler,
		authEmailHandler: authEmailHandler,
		mediaHandler:     mediaHandler,
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

	// Rate limiting
	r.router.Use(httprate.LimitByIP(100, 1*time.Minute))
}

// setupRoutes sets up application routes
func (r *Router) setupRoutes() {
	r.router.Route("/api/v1", func(router chi.Router) {
		// Health check
		router.Get("/health", r.healthCheck)

		// Auth routes
		router.With(httprate.LimitByIP(10, 1*time.Minute)).Route("/auth", func(router chi.Router) {
			router.Post("/signin", r.authHandler.Signin)
			router.Post("/login", r.authHandler.Login)
			router.Get("/me", r.authHandler.Me)
			// router.Post("/refresh", r.authHandler.RefreshToken)
			// router.Post("/logout", r.authHandler.Logout)
			// router.Post("/logout-all", r.authHandler.LogoutAll)
			// router.Post("/verify", r.authHandler.VerifyToken)
		})

		// User routes
		router.Route("/users", func(router chi.Router) {
			router.Post("/invite", r.userHandler.Invite)
			router.Get("/invites", r.userHandler.GetPendingRegistration)
			router.Get("/", r.userHandler.ListUsers)
			router.Route("/{id}", func(router chi.Router) {
				router.Get("/", r.userHandler.GetUser)
				router.Put("/", r.userHandler.UpdateUser)
				router.Delete("/", r.userHandler.DeleteUser)
			})
		})

		// Article routes
		router.Route("/articles", func(router chi.Router) {
			router.Post("/", r.articleHandler.CreateArticle)
			router.Get("/", r.articleHandler.ListArticles)
			router.Get("/search", r.articleHandler.SearchArticles)
			router.Route("/{id}", func(router chi.Router) {
				router.Get("/", r.articleHandler.GetArticle)
				router.Put("/", r.articleHandler.UpdateArticle)
				router.Delete("/", r.articleHandler.DeleteArticle)
			})
			router.Get("/slug/{slug}", r.articleHandler.GetArticleBySlug)
		})

		// Category routes
		router.Route("/categories", func(router chi.Router) {
			router.Post("/", r.categoryHandler.CreateCategory)
			router.Get("/", r.categoryHandler.ListCategories)
			router.Route("/{id}", func(router chi.Router) {
				router.Get("/", r.categoryHandler.GetCategory)
				router.Put("/", r.categoryHandler.UpdateCategory)
				router.Delete("/", r.categoryHandler.DeleteCategory)
			})
			router.Get("/slug/{slug}", r.categoryHandler.GetCategoryBySlug)
		})

		// Authorized email routes
		router.Route("/authorize-emails", func(router chi.Router) {
			router.Post("/", r.authEmailHandler.CreateAuthorizedEmail)
			router.Get("/", r.authEmailHandler.ListAuthorizedEmails)
			router.Route("/{slug}", func(router chi.Router) {
				router.Get("/", r.authEmailHandler.GetAuthorizedEmail)
				router.Post("/use", r.authEmailHandler.MarkAsUsed)
				router.Delete("/", r.authEmailHandler.DeleteAuthorizedEmail)
			})
		})

		router.Route("/uploads", func(router chi.Router) {
			router.Post("/", r.mediaHandler.UploadFile)
			router.Get("/", r.mediaHandler.ListUploadedFiles)
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
