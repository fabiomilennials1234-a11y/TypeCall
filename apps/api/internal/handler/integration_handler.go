package handler

import (
	"errors"
	"net/http"
	"net/url"

	"github.com/typecall/api/internal/domain"
	mw "github.com/typecall/api/internal/middleware"
	"github.com/typecall/api/internal/service"
)

type IntegrationHandler struct {
	svc        service.IntegrationService
	webBaseURL string
}

func NewIntegrationHandler(svc service.IntegrationService, webBaseURL string) *IntegrationHandler {
	return &IntegrationHandler{svc: svc, webBaseURL: webBaseURL}
}

// GoogleAuthorize returns the Google OAuth consent URL for the authenticated user.
func (h *IntegrationHandler) GoogleAuthorize(w http.ResponseWriter, r *http.Request) {
	userID := mw.GetUserID(r.Context())
	orgID := mw.GetOrgID(r.Context())

	authURL, err := h.svc.GenerateGoogleAuthURL(r.Context(), userID, orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to build authorize url", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"authorize_url": authURL})
}

// GoogleCallback handles the redirect from Google. No auth middleware — identity
// is derived from the signed `state` JWT.
func (h *IntegrationHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if errParam := q.Get("error"); errParam != "" {
		h.redirectToWeb(w, r, "oauth_denied")
		return
	}

	code := q.Get("code")
	state := q.Get("state")
	if code == "" || state == "" {
		h.redirectToWeb(w, r, "missing_params")
		return
	}

	if _, err := h.svc.HandleGoogleCallback(r.Context(), code, state); err != nil {
		reason := "callback_failed"
		if errors.Is(err, service.ErrInvalidOAuthState) {
			reason = "invalid_state"
		}
		h.redirectToWeb(w, r, reason)
		return
	}
	h.redirectToWebSuccess(w, r)
}

func (h *IntegrationHandler) redirectToWeb(w http.ResponseWriter, r *http.Request, reason string) {
	target := h.webBaseURL + "/settings/integrations?error=" + url.QueryEscape(reason)
	http.Redirect(w, r, target, http.StatusFound)
}

func (h *IntegrationHandler) redirectToWebSuccess(w http.ResponseWriter, r *http.Request) {
	target := h.webBaseURL + "/settings/integrations?connected=google"
	http.Redirect(w, r, target, http.StatusFound)
}

// GoogleStatus returns the current Google integration status for the user.
func (h *IntegrationHandler) GoogleStatus(w http.ResponseWriter, r *http.Request) {
	userID := mw.GetUserID(r.Context())
	status, err := h.svc.GetStatus(r.Context(), userID, domain.IntegrationProviderGoogleCalendar)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get status", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, status)
}

// GoogleDisconnect removes the user's Google credential.
func (h *IntegrationHandler) GoogleDisconnect(w http.ResponseWriter, r *http.Request) {
	userID := mw.GetUserID(r.Context())
	err := h.svc.Disconnect(r.Context(), userID, domain.IntegrationProviderGoogleCalendar)
	if err != nil {
		if errors.Is(err, service.ErrIntegrationNotConnected) {
			writeError(w, http.StatusNotFound, "not connected", "NOT_CONNECTED")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to disconnect", "INTERNAL_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
