package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port          int
	Env           string
	DatabaseURL   string
	RedisURL      string
	JWTSecret     string
	CSRFSecret    string
	EncryptionKey string
}

func Load() (*Config, error) {
	port, err := strconv.Atoi(getEnv("PORT", "8080"))
	if err != nil {
		return nil, fmt.Errorf("config.Load: invalid PORT: %w", err)
	}

	cfg := &Config{
		Port:          port,
		Env:           getEnv("ENV", "development"),
		DatabaseURL:   getEnv("DATABASE_URL", ""),
		RedisURL:      getEnv("REDIS_URL", ""),
		JWTSecret:     getEnv("JWT_SECRET", ""),
		CSRFSecret:    getEnv("CSRF_SECRET", ""),
		EncryptionKey: getEnv("ENCRYPTION_KEY", ""),
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

	return cfg, nil
}

func (c *Config) IsDevelopment() bool {
	return c.Env == "development"
}

func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
