package middleware

import (
	"net/http"
	"runtime/debug"

	"github.com/rs/zerolog/log"
)

func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				requestID := GetRequestID(r.Context())
				log.Error().
					Interface("panic", rec).
					Str("stack", string(debug.Stack())).
					Str("request_id", requestID).
					Str("method", r.Method).
					Str("path", r.URL.Path).
					Msg("panic recovered")

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte(`{"error":"internal server error","code":"INTERNAL_ERROR"}`))
			}
		}()

		next.ServeHTTP(w, r)
	})
}
