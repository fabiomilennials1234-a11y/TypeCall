package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/service"
)

type claimsKey struct{}

func Auth(authSvc service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("access_token")
			if err != nil {
				http.Error(w, `{"error":"authentication required","code":"UNAUTHORIZED"}`, http.StatusUnauthorized)
				return
			}

			claims, err := authSvc.ValidateAccessToken(cookie.Value)
			if err != nil {
				http.Error(w, `{"error":"invalid or expired token","code":"TOKEN_INVALID"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), claimsKey{}, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetClaims(ctx context.Context) *domain.JWTClaims {
	if claims, ok := ctx.Value(claimsKey{}).(*domain.JWTClaims); ok {
		return claims
	}
	return nil
}

func GetUserID(ctx context.Context) uuid.UUID {
	if claims := GetClaims(ctx); claims != nil {
		return claims.Sub
	}
	return uuid.Nil
}

func GetOrgID(ctx context.Context) uuid.UUID {
	if claims := GetClaims(ctx); claims != nil {
		return claims.Org
	}
	return uuid.Nil
}

func GetRole(ctx context.Context) domain.Role {
	if claims := GetClaims(ctx); claims != nil {
		return claims.Role
	}
	return ""
}
