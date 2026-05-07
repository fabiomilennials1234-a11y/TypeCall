package config

import (
	"encoding/hex"
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port               int
	Env                string
	DatabaseURL        string
	RedisURL           string
	JWTSecret          string
	CSRFSecret         string
	EncryptionKey      string
	CORSOrigins        string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURI  string
}

func Load() (*Config, error) {
	port, err := strconv.Atoi(getEnv("PORT", "8080"))
	if err != nil {
		return nil, fmt.Errorf("config.Load: invalid PORT: %w", err)
	}

	cfg := &Config{
		Port:               port,
		Env:                getEnv("ENV", "development"),
		DatabaseURL:        getEnv("DATABASE_URL", ""),
		RedisURL:           getEnv("REDIS_URL", ""),
		JWTSecret:          getEnv("JWT_SECRET", ""),
		CSRFSecret:         getEnv("CSRF_SECRET", ""),
		EncryptionKey:      getEnv("ENCRYPTION_KEY", ""),
		CORSOrigins:        getEnv("CORS_ORIGINS", ""),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURI:  getEnv("GOOGLE_REDIRECT_URI", ""),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("config.Load: DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("config.Load: JWT_SECRET is required")
	}
	if len(cfg.JWTSecret) < 32 {
		return nil, fmt.Errorf("config.Load: JWT_SECRET must be at least 32 characters")
	}
	if cfg.CSRFSecret == "" {
		return nil, fmt.Errorf("config.Load: CSRF_SECRET is required")
	}

	if !cfg.IsTest() {
		if cfg.EncryptionKey == "" {
			return nil, fmt.Errorf("config.Load: ENCRYPTION_KEY is required (64 hex chars = 32 bytes)")
		}
		if err := validateHexKey(cfg.EncryptionKey, 32); err != nil {
			return nil, fmt.Errorf("config.Load: ENCRYPTION_KEY: %w", err)
		}
	}

	if cfg.IsProduction() {
		if cfg.GoogleClientID == "" {
			return nil, fmt.Errorf("config.Load: GOOGLE_CLIENT_ID is required in production")
		}
		if cfg.GoogleClientSecret == "" {
			return nil, fmt.Errorf("config.Load: GOOGLE_CLIENT_SECRET is required in production")
		}
		if cfg.GoogleRedirectURI == "" {
			return nil, fmt.Errorf("config.Load: GOOGLE_REDIRECT_URI is required in production")
		}
	}

	return cfg, nil
}

func (c *Config) IsDevelopment() bool {
	return c.Env == "development"
}

func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

func (c *Config) IsTest() bool {
	return c.Env == "test"
}

func validateHexKey(s string, wantBytes int) error {
	decoded, err := hex.DecodeString(s)
	if err != nil {
		return fmt.Errorf("invalid hex: %w", err)
	}
	if len(decoded) != wantBytes {
		return fmt.Errorf("expected %d bytes, got %d", wantBytes, len(decoded))
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
