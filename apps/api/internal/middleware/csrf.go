package middleware

import (
	"net/http"
)

func CSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		cookieToken, err := r.Cookie("csrf_token")
		if err != nil {
			http.Error(w, `{"error":"CSRF token missing","code":"CSRF_MISSING"}`, http.StatusForbidden)
			return
		}

		headerToken := r.Header.Get("X-CSRF-Token")
		if headerToken == "" {
			http.Error(w, `{"error":"CSRF header missing","code":"CSRF_MISSING"}`, http.StatusForbidden)
			return
		}

		if cookieToken.Value != headerToken {
			http.Error(w, `{"error":"CSRF token mismatch","code":"CSRF_INVALID"}`, http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}
