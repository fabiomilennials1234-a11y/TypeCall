package middleware

import (
	"net/http"

	"github.com/typecall/api/internal/domain"
)

// RequireRole returns 403 unless the request's claims carry one of the allowed roles.
// Use after Auth middleware.
func RequireRole(roles ...domain.Role) func(http.Handler) http.Handler {
	allowed := make(map[domain.Role]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := GetRole(r.Context())
			if !allowed[role] {
				http.Error(w, `{"error":"forbidden","code":"ROLE_FORBIDDEN"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// IsRole reports whether the current claims match any of the given roles.
func IsRole(r *http.Request, roles ...domain.Role) bool {
	current := GetRole(r.Context())
	for _, role := range roles {
		if current == role {
			return true
		}
	}
	return false
}
