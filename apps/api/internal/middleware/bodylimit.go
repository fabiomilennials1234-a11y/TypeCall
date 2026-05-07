package middleware

import (
	"encoding/json"
	"net/http"
)

const DefaultBodyLimit int64 = 1 << 20 // 1MB

func BodyLimit(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil && r.ContentLength != 0 {
				r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			}
			next.ServeHTTP(w, r)
		})
	}
}

func HandleBodyTooLarge(err error) bool {
	if err == nil {
		return false
	}
	_, ok := err.(*http.MaxBytesError)
	return ok
}

func WriteBodyTooLargeError(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusRequestEntityTooLarge)
	json.NewEncoder(w).Encode(map[string]string{
		"error": "request body too large",
		"code":  "BODY_TOO_LARGE",
	})
}
