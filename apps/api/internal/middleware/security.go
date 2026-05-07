package middleware

import (
	"net/http"
	"strings"
)

func SecurityHeaders(isDev bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			isPublicRoute := strings.HasPrefix(r.URL.Path, "/api/v1/public/")

			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
			w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

			if !isDev {
				w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
			}

			if isPublicRoute {
				w.Header().Set("Content-Security-Policy", buildCSP(isDev, true))
			} else {
				w.Header().Set("X-Frame-Options", "DENY")
				w.Header().Set("Content-Security-Policy", buildCSP(isDev, false))
			}

			next.ServeHTTP(w, r)
		})
	}
}

func buildCSP(isDev bool, allowEmbed bool) string {
	var parts []string

	if isDev {
		parts = append(parts,
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline'",
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data: https:",
			"connect-src 'self' http://localhost:* ws://localhost:*",
			"base-uri 'self'",
			"form-action 'self'",
		)
	} else {
		parts = append(parts,
			"default-src 'self'",
			"script-src 'self'",
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data: https:",
			"base-uri 'self'",
			"form-action 'self'",
		)
	}

	if allowEmbed {
		parts = append(parts, "frame-ancestors *")
	} else {
		parts = append(parts, "frame-ancestors 'self'")
	}

	return strings.Join(parts, "; ")
}
