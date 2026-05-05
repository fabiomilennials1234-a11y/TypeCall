package middleware

import (
	"fmt"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

func Tenant(pool *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r.Context())
			if claims == nil {
				http.Error(w, `{"error":"tenant context missing","code":"TENANT_MISSING"}`, http.StatusUnauthorized)
				return
			}

			conn, err := pool.Acquire(r.Context())
			if err != nil {
				log.Error().Err(err).Msg("failed to acquire connection for tenant")
				http.Error(w, `{"error":"internal server error","code":"INTERNAL_ERROR"}`, http.StatusInternalServerError)
				return
			}
			defer conn.Release()

			_, err = conn.Exec(r.Context(), fmt.Sprintf("SET LOCAL app.current_org = '%s'", claims.Org.String()))
			if err != nil {
				log.Error().Err(err).Str("org_id", claims.Org.String()).Msg("failed to set tenant context")
				http.Error(w, `{"error":"internal server error","code":"INTERNAL_ERROR"}`, http.StatusInternalServerError)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
