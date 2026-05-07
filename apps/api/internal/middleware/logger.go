package middleware

import (
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/typecall/api/internal/observability"
)

type wrappedWriter struct {
	http.ResponseWriter
	statusCode int
	written    int
}

func (w *wrappedWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *wrappedWriter) Write(b []byte) (int, error) {
	n, err := w.ResponseWriter.Write(b)
	w.written += n
	return n, err
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &wrappedWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		requestID := GetRequestID(r.Context())

		observability.IncrementRequests()
		if wrapped.statusCode >= 500 {
			observability.Increment5xx()
		}
		if wrapped.statusCode >= 400 {
			observability.IncrementErrors()
		}

		event := log.Info()
		if wrapped.statusCode >= 500 {
			event = log.Error()
		} else if wrapped.statusCode >= 400 {
			event = log.Warn()
		}

		event.
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Int("status", wrapped.statusCode).
			Dur("duration", duration).
			Int("bytes", wrapped.written).
			Str("remote", r.RemoteAddr).
			Str("request_id", requestID).
			Msg("request")
	})
}
