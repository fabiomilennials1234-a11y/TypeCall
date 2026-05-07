package middleware

import (
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"
)

type CORSConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
	MaxAge         int
}

func NewCORSConfig(origins string, isDev bool) CORSConfig {
	cfg := CORSConfig{
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization", "X-CSRF-Token", "X-Request-ID"},
		MaxAge:         86400,
	}

	if origins != "" {
		parts := strings.Split(origins, ",")
		for _, p := range parts {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				cfg.AllowedOrigins = append(cfg.AllowedOrigins, trimmed)
			}
		}
	}

	if len(cfg.AllowedOrigins) == 0 {
		if isDev {
			cfg.AllowedOrigins = []string{"http://localhost:5173", "http://localhost:3000"}
		} else {
			log.Warn().Msg("CORS_ORIGINS not set in production — no origins allowed")
		}
	}

	return cfg
}

func CORS(cfg CORSConfig) func(http.Handler) http.Handler {
	allowedOrigins := make(map[string]bool, len(cfg.AllowedOrigins))
	for _, o := range cfg.AllowedOrigins {
		allowedOrigins[o] = true
	}

	methods := strings.Join(cfg.AllowedMethods, ", ")
	headers := strings.Join(cfg.AllowedHeaders, ", ")

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			if allowedOrigins[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Methods", methods)
				w.Header().Set("Access-Control-Allow-Headers", headers)
				w.Header().Set("Access-Control-Max-Age", "86400")
				w.Header().Set("Vary", "Origin")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
