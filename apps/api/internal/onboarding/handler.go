package onboarding

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/rs/zerolog/log"

	"github.com/typecall/api/internal/domain"
	mw "github.com/typecall/api/internal/middleware"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

// GET /api/v1/onboarding/state
func (h *Handler) State(w http.ResponseWriter, r *http.Request) {
	orgID := mw.GetOrgID(r.Context())
	state, err := h.svc.GetState(r.Context(), orgID)
	if err != nil {
		if errors.Is(err, ErrOrgNotFound) {
			writeError(w, http.StatusNotFound, "organization not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load state", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, state)
}

// POST /api/v1/onboarding/skip
func (h *Handler) Skip(w http.ResponseWriter, r *http.Request) {
	if !requireAdminOrMaster(w, r) {
		return
	}
	orgID := mw.GetOrgID(r.Context())
	if err := h.svc.Skip(r.Context(), orgID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to skip onboarding", "INTERNAL_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/v1/onboarding/complete
func (h *Handler) Complete(w http.ResponseWriter, r *http.Request) {
	if !requireAdminOrMaster(w, r) {
		return
	}

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var input CompleteInput
	if err := dec.Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body: "+err.Error(), "INVALID_BODY")
		return
	}

	orgID := mw.GetOrgID(r.Context())
	userID := mw.GetUserID(r.Context())

	user := userNameFromCtx(r)
	out, err := h.svc.Complete(r.Context(), userID, orgID, user, input)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidPixelID):
			writeError(w, http.StatusUnprocessableEntity, "meta_pixel_id must be 15-16 digits", "INVALID_PIXEL_ID")
		case errors.Is(err, ErrEmptyFlow):
			writeError(w, http.StatusUnprocessableEntity, "flow_definition must contain at least 1 node", "EMPTY_FLOW")
		case errors.Is(err, ErrOrgNotFound):
			writeError(w, http.StatusNotFound, "organization not found", "NOT_FOUND")
		default:
			log.Error().
				Err(err).
				Str("user_id", userID.String()).
				Str("org_id", orgID.String()).
				Msg("onboarding.Complete failed")
			writeError(w, http.StatusInternalServerError, "failed to complete onboarding", "INTERNAL_ERROR")
		}
		return
	}

	status := http.StatusCreated
	if out.AlreadyOnboarded {
		status = http.StatusOK
	}
	writeJSON(w, status, out)
}

func requireAdminOrMaster(w http.ResponseWriter, r *http.Request) bool {
	role := mw.GetRole(r.Context())
	if role != domain.RoleAdmin && role != domain.RoleMaster {
		writeError(w, http.StatusForbidden, "only admin or master can run onboarding", "FORBIDDEN")
		return false
	}
	return true
}

// userNameFromCtx tenta obter um nome de exibicao. Caso nao exista no JWT,
// retorna fallback "Owner". Servico usara como nome do seller baseline somente
// se nao houver seller existente — caso ja exista, nome nao e alterado.
func userNameFromCtx(_ *http.Request) string {
	// JWT nao carrega name. Fallback usado apenas em criacao de seller novo.
	// Caminho normal: seller ja existe (criado no register) e nome nao e alterado.
	return "Owner"
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg, code string) {
	writeJSON(w, status, map[string]any{"error": msg, "code": code})
}
