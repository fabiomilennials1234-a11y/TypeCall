package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/typecall/api/internal/domain"
	mw "github.com/typecall/api/internal/middleware"
	"github.com/typecall/api/internal/service"
)

type AuthHandler struct {
	authSvc      service.AuthService
	googleSignin service.GoogleSigninFlow
	webBaseURL   string
	secure       bool
}

func NewAuthHandler(authSvc service.AuthService, googleSignin service.GoogleSigninFlow, webBaseURL string, secure bool) *AuthHandler {
	return &AuthHandler{authSvc: authSvc, googleSignin: googleSignin, webBaseURL: webBaseURL, secure: secure}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var input domain.RegisterInput
	if !decodeBody(w, r, &input) {
		return
	}

	v := &Validator{}
	v.Required("org_name", input.OrgName)
	v.Required("org_slug", input.OrgSlug)
	v.Slug("org_slug", input.OrgSlug)
	v.Email("email", input.Email)
	v.Required("password", input.Password)
	v.MinLen("password", input.Password, 8)
	v.Required("name", input.Name)
	if v.HasErrors() {
		v.WriteResponse(w)
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
	if !decodeBody(w, r, &input) {
		return
	}

	v := &Validator{}
	v.Email("email", input.Email)
	v.Required("password", input.Password)
	if v.HasErrors() {
		v.WriteResponse(w)
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

func (h *AuthHandler) GoogleSigninAuthorize(w http.ResponseWriter, r *http.Request) {
	url, err := h.googleSignin.GenerateSigninURL(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to build authorize url", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"authorize_url": url})
}

func (h *AuthHandler) GoogleSigninCallback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if q.Get("error") != "" {
		h.redirectToWebLogin(w, r, "oauth_denied")
		return
	}
	code := q.Get("code")
	state := q.Get("state")
	if code == "" || state == "" {
		h.redirectToWebLogin(w, r, "missing_params")
		return
	}

	_, tokens, err := h.googleSignin.HandleSigninCallback(r.Context(), code, state)
	if err != nil {
		log.Error().Err(err).Msg("google signin callback failed")
		reason := "callback_failed"
		if errors.Is(err, service.ErrInvalidOAuthState) {
			reason = "invalid_state"
		} else if errors.Is(err, service.ErrUserNotActive) {
			reason = "account_disabled"
		}
		h.redirectToWebLogin(w, r, reason)
		return
	}

	h.setAuthCookies(w, tokens)
	http.Redirect(w, r, h.webBaseURL+"/", http.StatusFound)
}

func (h *AuthHandler) redirectToWebLogin(w http.ResponseWriter, r *http.Request, reason string) {
	target := h.webBaseURL + "/login?error=" + reason
	http.Redirect(w, r, target, http.StatusFound)
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
