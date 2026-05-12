package qualification

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	mw "github.com/typecall/api/internal/middleware"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

// POST /api/v1/forms/:formID/qualification-rules
func (h *Handler) CreateRule(w http.ResponseWriter, r *http.Request) {
	formID, err := uuid.Parse(chi.URLParam(r, "formID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form id", "INVALID_ID")
		return
	}

	var input domain.CreateQualificationRuleInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body", "INVALID_BODY")
		return
	}
	input.FormID = formID

	if input.BlockID == "" {
		writeError(w, http.StatusUnprocessableEntity, "block_id is required", "VALIDATION_ERROR")
		return
	}
	if !validTag(input.Tag) {
		writeError(w, http.StatusUnprocessableEntity, "tag must be one of diamond|gold|silver|bronze|disqualified", "VALIDATION_ERROR")
		return
	}

	orgID := mw.GetOrgID(r.Context())
	rule, err := h.svc.CreateRule(r.Context(), orgID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create rule", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusCreated, rule)
}

// GET /api/v1/forms/:formID/qualification-rules
func (h *Handler) ListRules(w http.ResponseWriter, r *http.Request) {
	formID, err := uuid.Parse(chi.URLParam(r, "formID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form id", "INVALID_ID")
		return
	}
	rules, err := h.svc.ListRulesByForm(r.Context(), formID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list rules", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"rules": rules})
}

// PATCH /api/v1/forms/:formID/qualification-rules/:ruleID
func (h *Handler) UpdateRule(w http.ResponseWriter, r *http.Request) {
	ruleID, err := uuid.Parse(chi.URLParam(r, "ruleID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid rule id", "INVALID_ID")
		return
	}

	var input domain.CreateQualificationRuleInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body", "INVALID_BODY")
		return
	}
	if !validTag(input.Tag) {
		writeError(w, http.StatusUnprocessableEntity, "invalid tag", "VALIDATION_ERROR")
		return
	}

	orgID := mw.GetOrgID(r.Context())
	rule, err := h.svc.UpdateRule(r.Context(), orgID, ruleID, input)
	if err != nil {
		if errors.Is(err, ErrRuleNotFound) {
			writeError(w, http.StatusNotFound, "rule not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update rule", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, rule)
}

// DELETE /api/v1/forms/:formID/qualification-rules/:ruleID
func (h *Handler) DeleteRule(w http.ResponseWriter, r *http.Request) {
	ruleID, err := uuid.Parse(chi.URLParam(r, "ruleID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid rule id", "INVALID_ID")
		return
	}
	if err := h.svc.DeleteRule(r.Context(), ruleID); err != nil {
		if errors.Is(err, ErrRuleNotFound) {
			writeError(w, http.StatusNotFound, "rule not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete rule", "INTERNAL_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/v1/responses/:responseID/score
func (h *Handler) GetScore(w http.ResponseWriter, r *http.Request) {
	responseID, err := uuid.Parse(chi.URLParam(r, "responseID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid response id", "INVALID_ID")
		return
	}
	score, err := h.svc.GetScoreByResponse(r.Context(), responseID)
	if err != nil {
		if errors.Is(err, ErrScoreNotFound) {
			writeError(w, http.StatusNotFound, "score not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get score", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, score)
}

// POST /api/v1/responses/:responseID/score (re-run scoring on demand)
func (h *Handler) RescoreResponse(w http.ResponseWriter, r *http.Request) {
	responseID, err := uuid.Parse(chi.URLParam(r, "responseID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid response id", "INVALID_ID")
		return
	}
	score, err := h.svc.ScoreResponse(r.Context(), responseID)
	if err != nil {
		if errors.Is(err, ErrResponseNotFound) {
			writeError(w, http.StatusNotFound, "response not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to score response", "INTERNAL_ERROR")
		return
	}
	if score == nil {
		writeJSON(w, http.StatusOK, map[string]any{"final_tag": nil, "matches": []any{}})
		return
	}
	writeJSON(w, http.StatusOK, score)
}

func validTag(t domain.LeadTag) bool {
	switch t {
	case domain.LeadTagDiamond, domain.LeadTagGold, domain.LeadTagSilver, domain.LeadTagBronze, domain.LeadTagDisqualified:
		return true
	}
	return false
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg, code string) {
	writeJSON(w, status, map[string]any{"error": msg, "code": code})
}
