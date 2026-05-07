package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"golang.org/x/oauth2"
	googleoauth "golang.org/x/oauth2/google"

	"github.com/typecall/api/internal/config"
	cryptohelper "github.com/typecall/api/internal/crypto"
	"github.com/typecall/api/internal/db"
	"github.com/typecall/api/internal/handler"
	"github.com/typecall/api/internal/integration/gcal"
	mw "github.com/typecall/api/internal/middleware"
	"github.com/typecall/api/internal/observability"
	"github.com/typecall/api/internal/repository"
	"github.com/typecall/api/internal/service"
	"github.com/typecall/api/migrations"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	observability.SetupLogger(cfg.Env)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer pool.Close()

	if err := db.RunMigrations(ctx, pool, migrations.FS, "."); err != nil {
		log.Fatal().Err(err).Msg("failed to run migrations")
	}

	rdb := newRedisClient(cfg.RedisURL)
	defer rdb.Close()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Warn().Err(err).Msg("redis not available, continuing without cache")
	}

	r := newRouter(cfg, pool, rdb)

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().
			Int("port", cfg.Port).
			Str("env", cfg.Env).
			Msg("server starting")

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down server")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("server forced to shutdown")
	}

	log.Info().Msg("server stopped")
}

func newRouter(cfg *config.Config, pool *pgxpool.Pool, rdb *redis.Client) *chi.Mux {
	orgRepo := repository.NewOrganizationRepository(pool)
	userRepo := repository.NewUserRepository(pool)
	tokenRepo := repository.NewRefreshTokenRepository(pool)
	formRepo := repository.NewFormRepository(pool)
	formVersionRepo := repository.NewFormVersionRepository(pool)
	responseRepo := repository.NewResponseRepository(pool)
	publicFormRepo := repository.NewPublicFormRepository(pool)
	eventTypeRepo := repository.NewEventTypeRepository(pool)
	availRepo := repository.NewAvailabilityRepository(pool)
	bookingRepo := repository.NewBookingRepository(pool)
	pubETRepo := repository.NewPublicEventTypeRepository(pool)
	webhookRepo := repository.NewWebhookRepository(pool)
	analyticsRepo := repository.NewAnalyticsRepository(pool)
	pubAnalyticsRepo := repository.NewPublicAnalyticsRepository(pool)
	integrationRepo := repository.NewIntegrationRepository(pool)

	encKey, err := cryptohelper.DeriveKey(cfg.EncryptionKey)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to derive encryption key")
	}
	gcalOAuth := &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURI,
		Scopes:       service.GoogleScopes,
		Endpoint:     googleoauth.Endpoint,
	}
	gcalProvider := gcal.NewProvider(integrationRepo, gcalOAuth, encKey)

	authSvc := service.NewAuthService(orgRepo, userRepo, tokenRepo, cfg.JWTSecret, cfg.CSRFSecret)
	formSvc := service.NewFormService(formRepo, formVersionRepo)
	responseSvc := service.NewResponseService(responseRepo, publicFormRepo)
	etSvc := service.NewEventTypeService(eventTypeRepo)
	availSvc := service.NewAvailabilityService(availRepo, eventTypeRepo, bookingRepo, pubETRepo, gcalProvider)
	webhookSvc := service.NewWebhookService(webhookRepo)
	bookingSvc := service.NewBookingService(bookingRepo, pubETRepo, userRepo, webhookSvc, gcalProvider)
	analyticsSvc := service.NewAnalyticsService(analyticsRepo, pubAnalyticsRepo, responseRepo)

	integrationSvc := service.NewIntegrationService(
		integrationRepo,
		cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.GoogleRedirectURI,
		cfg.CSRFSecret,
		encKey,
	)
	googleSigninSvc := service.NewGoogleSigninService(
		authSvc,
		integrationRepo,
		cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.GoogleSigninRedirectURI,
		cfg.CSRFSecret,
		encKey,
	)

	authHandler := handler.NewAuthHandler(authSvc, googleSigninSvc, cfg.WebBaseURL, cfg.IsProduction())
	formHandler := handler.NewFormHandler(formSvc)
	responseHandler := handler.NewResponseHandler(responseSvc)
	publicHandler := handler.NewPublicHandler(responseSvc)
	etHandler := handler.NewEventTypeHandler(etSvc, availSvc)
	bookingHandler := handler.NewBookingHandler(bookingSvc)
	pubBookingHandler := handler.NewPublicBookingHandler(bookingSvc, availSvc)
	webhookHandler := handler.NewWebhookHandler(webhookSvc)
	analyticsHandler := handler.NewAnalyticsHandler(analyticsSvc)
	pubEventsHandler := handler.NewPublicEventsHandler(analyticsSvc, pool)
	integrationHandler := handler.NewIntegrationHandler(integrationSvc, cfg.WebBaseURL)

	r := chi.NewRouter()

	r.Use(mw.RequestID)
	r.Use(mw.Recover)
	r.Use(mw.Logger)
	r.Use(mw.SecurityHeaders(cfg.IsDevelopment()))
	r.Use(mw.CORS(mw.NewCORSConfig(cfg.CORSOrigins, cfg.IsDevelopment())))
	r.Use(mw.BodyLimit(mw.DefaultBodyLimit))
	r.Use(mw.RateLimit(rdb, mw.DefaultRateLimitConfig()))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	r.Get("/metrics", observability.MetricsHandler)

	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		if err := pool.Ping(ctx); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"status":"not ready","reason":"database unavailable"}`))
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ready"}`))
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			r.Post("/logout", authHandler.Logout)

			r.Get("/google/authorize", authHandler.GoogleSigninAuthorize)
			r.Get("/google/callback", authHandler.GoogleSigninCallback)

			r.Group(func(r chi.Router) {
				r.Use(mw.Auth(authSvc))
				r.Get("/me", authHandler.Me)
			})
		})

		r.Route("/forms", func(r chi.Router) {
			r.Use(mw.Auth(authSvc))
			r.Use(mw.CSRF)
			r.Use(mw.Tenant(pool))

			r.Post("/", formHandler.Create)
			r.Get("/", formHandler.List)

			r.Route("/{formID}", func(r chi.Router) {
				r.Get("/", formHandler.Get)
				r.Patch("/", formHandler.Update)
				r.Delete("/", formHandler.Delete)
				r.Patch("/draft", formHandler.SaveDraft)
				r.Post("/publish", formHandler.Publish)

				r.Route("/responses", func(r chi.Router) {
					r.Get("/", responseHandler.List)
					r.Get("/{responseID}", responseHandler.Get)
				})
			})
		})

		r.Route("/event-types", func(r chi.Router) {
			r.Use(mw.Auth(authSvc))
			r.Use(mw.CSRF)
			r.Use(mw.Tenant(pool))

			r.Post("/", etHandler.Create)
			r.Get("/", etHandler.List)

			r.Route("/{eventTypeID}", func(r chi.Router) {
				r.Get("/", etHandler.Get)
				r.Patch("/", etHandler.Update)
				r.Delete("/", etHandler.Delete)

				r.Route("/availability", func(r chi.Router) {
					r.Get("/", etHandler.GetAvailability)
					r.Put("/", etHandler.SetAvailability)
					r.Post("/overrides", etHandler.CreateOverride)
					r.Delete("/overrides/{overrideID}", etHandler.DeleteOverride)
				})
			})
		})

		r.Route("/bookings", func(r chi.Router) {
			r.Use(mw.Auth(authSvc))
			r.Use(mw.CSRF)
			r.Use(mw.Tenant(pool))

			r.Get("/", bookingHandler.List)
			r.Get("/{bookingID}", bookingHandler.Get)
			r.Post("/{bookingID}/cancel", bookingHandler.Cancel)
		})

		r.Route("/analytics", func(r chi.Router) {
			r.Use(mw.Auth(authSvc))
			r.Use(mw.CSRF)
			r.Use(mw.Tenant(pool))

			r.Get("/forms/{formID}/summary", analyticsHandler.GetSummary)
			r.Get("/forms/{formID}/daily", analyticsHandler.GetDailyMetrics)
			r.Get("/forms/{formID}/dropoff", analyticsHandler.GetStepDropoff)
			r.Get("/forms/{formID}/export", analyticsHandler.ExportCSV)
			r.Post("/refresh", analyticsHandler.RefreshMetrics)
		})

		r.Route("/webhooks", func(r chi.Router) {
			r.Use(mw.Auth(authSvc))
			r.Use(mw.CSRF)
			r.Use(mw.Tenant(pool))

			r.Get("/config", webhookHandler.GetConfig)
			r.Post("/config", webhookHandler.UpsertConfig)
			r.Patch("/config", webhookHandler.UpdateConfig)
			r.Delete("/config", webhookHandler.DeleteConfig)
			r.Get("/deliveries", webhookHandler.ListDeliveries)
			r.Post("/deliveries/{deliveryID}/retry", webhookHandler.RetryDelivery)
		})

		r.Route("/integrations", func(r chi.Router) {
			r.Get("/google/callback", integrationHandler.GoogleCallback)

			r.Group(func(r chi.Router) {
				r.Use(mw.Auth(authSvc))
				r.Use(mw.Tenant(pool))

				r.Get("/google", integrationHandler.GoogleStatus)
				r.Get("/google/authorize", integrationHandler.GoogleAuthorize)
				r.Delete("/google", integrationHandler.GoogleDisconnect)
			})
		})

		r.Route("/public/forms/{slug}", func(r chi.Router) {
			r.Get("/", publicHandler.GetForm)
			r.Post("/responses", publicHandler.SubmitResponse)
		})

		r.Route("/public/event-types/{eventTypeID}", func(r chi.Router) {
			r.Get("/slots", pubBookingHandler.GetSlots)
		})

		r.Route("/public/bookings", func(r chi.Router) {
			r.Post("/", pubBookingHandler.CreateBooking)
		})

		r.Post("/public/bookings/cancel/{token}", pubBookingHandler.CancelByToken)

		r.Post("/public/events", pubEventsHandler.IngestEvents)
	})

	return r
}

func newRedisClient(redisURL string) *redis.Client {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return redis.NewClient(&redis.Options{
			Addr: "localhost:6379",
		})
	}
	return redis.NewClient(opts)
}
