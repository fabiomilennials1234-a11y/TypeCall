package pixels

import (
	"encoding/json"
	"net/http"

	"github.com/typecall/api/internal/domain"
	mw "github.com/typecall/api/internal/middleware"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

// GET /api/v1/settings/pixel
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	orgID := mw.GetOrgID(r.Context())
	cfg, err := h.svc.Get(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load pixel config", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, cfg)
}

// PUT /api/v1/settings/pixel
func (h *Handler) Upsert(w http.ResponseWriter, r *http.Request) {
	var input domain.UpsertPixelConfigInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body", "INVALID_BODY")
		return
	}
	orgID := mw.GetOrgID(r.Context())
	cfg, err := h.svc.Upsert(r.Context(), orgID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save pixel config", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, cfg)
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg, code string) {
	writeJSON(w, status, map[string]any{"error": msg, "code": code})
}
