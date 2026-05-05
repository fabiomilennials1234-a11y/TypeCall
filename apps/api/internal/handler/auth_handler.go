package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/typecall/api/internal/domain"
	mw "github.com/typecall/api/internal/middleware"
	"github.com/typecall/api/internal/service"
)

type AuthHandler struct {
	authSvc service.AuthService
	secure  bool
}

func NewAuthHandler(authSvc service.AuthService, secure bool) *AuthHandler {
	return &AuthHandler{authSvc: authSvc, secure: secure}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var input domain.RegisterInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", "INVALID_INPUT")
		return
	}

	if input.OrgName == "" || input.OrgSlug == "" || input.Email == "" || input.Password == "" || input.Name == "" {
		writeError(w, http.StatusBadRequest, "all fields are required", "MISSING_FIELDS")
		return
	}

	if len(input.Password) < 8 {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters", "WEAK_PASSWORD")
		return
	}

	authUser, tokens, err := h.authSvc.Register(r.Context(), input)
	if err != nil {
		if errors.Is(err, service.ErrSlugTaken) {
			writeError(w, http.StatusConflict, "organization slug already taken", "SLUG_TAKEN")
			return
		}
		if errors.Is(err, service.ErrEmailTaken) {
			writeError(w, http.StatusConflict, "email already registered", "EMAIL_TAKEN")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal server error", "INTERNAL_ERROR")
		return
	}

	h.setAuthCookies(w, tokens)
	writeJSON(w, http.StatusCreated, authUser)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input domain.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", "INVALID_INPUT")
		return
	}

	if input.Email == "" || input.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required", "MISSING_FIELDS")
		return
	}

	authUser, tokens, err := h.authSvc.Login(r.Context(), input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "invalid email or password", "INVALID_CREDENTIALS")
			return
		}
		if errors.Is(err, service.ErrUserNotActive) {
			writeError(w, http.StatusForbidden, "account is disabled", "ACCOUNT_DISABLED")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal server error", "INTERNAL_ERROR")
		return
	}

	h.setAuthCookies(w, tokens)
	writeJSON(w, http.StatusOK, authUser)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		writeError(w, http.StatusUnauthorized, "refresh token missing", "REFRESH_MISSING")
		return
	}

	tokens, err := h.authSvc.Refresh(r.Context(), cookie.Value)
	if err != nil {
		if errors.Is(err, service.ErrRefreshTokenExpired) || errors.Is(err, service.ErrRefreshTokenInvalid) {
			h.clearAuthCookies(w)
			writeError(w, http.StatusUnauthorized, "refresh token expired or invalid", "REFRESH_INVALID")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal server error", "INTERNAL_ERROR")
		return
	}

	h.setAuthCookies(w, tokens)
	writeJSON(w, http.StatusOK, map[string]string{"status": "refreshed"})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, _ := r.Cookie("refresh_token")
	rawToken := ""
	if cookie != nil {
		rawToken = cookie.Value
	}

	h.authSvc.Logout(r.Context(), rawToken)
	h.clearAuthCookies(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := mw.GetUserID(r.Context())
	orgID := mw.GetOrgID(r.Context())

	authUser, err := h.authSvc.GetMe(r.Context(), userID, orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, authUser)
}

func (h *AuthHandler) setAuthCookies(w http.ResponseWriter, tokens *domain.AuthTokens) {
	sameSite := http.SameSiteLaxMode

	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    tokens.AccessToken,
		Path:     "/",
		MaxAge:   int((15 * time.Minute).Seconds()),
		HttpOnly: true,
		Secure:   h.secure,
		SameSite: sameSite,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    tokens.RefreshToken,
		Path:     "/api/v1/auth",
		MaxAge:   int((7 * 24 * time.Hour).Seconds()),
		HttpOnly: true,
		Secure:   h.secure,
		SameSite: sameSite,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "csrf_token",
		Value:    tokens.CSRFToken,
		Path:     "/",
		MaxAge:   int((15 * time.Minute).Seconds()),
		HttpOnly: false,
		Secure:   h.secure,
		SameSite: sameSite,
	})
}

func (h *AuthHandler) clearAuthCookies(w http.ResponseWriter) {
	for _, name := range []string{"access_token", "refresh_token", "csrf_token"} {
		http.SetCookie(w, &http.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: name != "csrf_token",
		})
	}
}
