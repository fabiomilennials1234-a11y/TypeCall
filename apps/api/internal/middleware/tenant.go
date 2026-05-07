package middleware

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	"github.com/typecall/api/internal/db"
)

func Tenant(pool *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r.Context())
			if claims == nil {
				http.Error(w, `{"error":"tenant context missing","code":"TENANT_MISSING"}`, http.StatusUnauthorized)
				return
			}

			tx, err := pool.Begin(r.Context())
			if err != nil {
				log.Error().Err(err).Msg("failed to begin tenant transaction")
				http.Error(w, `{"error":"internal server error","code":"INTERNAL_ERROR"}`, http.StatusInternalServerError)
				return
			}
			defer tx.Rollback(r.Context())

			_, err = tx.Exec(r.Context(), "SELECT set_config('app.current_org', $1, true)", claims.Org.String())
			if err != nil {
				log.Error().Err(err).Str("org_id", claims.Org.String()).Msg("failed to set tenant context")
				http.Error(w, `{"error":"internal server error","code":"INTERNAL_ERROR"}`, http.StatusInternalServerError)
				return
			}

			ctx := db.WithTxCtx(r.Context(), tx)
			sw := &statusWriter{ResponseWriter: w}
			next.ServeHTTP(sw, r.WithContext(ctx))

			if sw.status == 0 || sw.status < 400 {
				if err := tx.Commit(r.Context()); err != nil {
					log.Error().Err(err).Msg("failed to commit tenant transaction")
				}
			}
		})
	}
}

type statusWriter struct {
	http.ResponseWriter
	status  int
	written bool
}

func (w *statusWriter) WriteHeader(code int) {
	if !w.written {
		w.status = code
		w.written = true
	}
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if !w.written {
		w.status = http.StatusOK
		w.written = true
	}
	return w.ResponseWriter.Write(b)
}
