package handler

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"

	mw "github.com/typecall/api/internal/middleware"
	"github.com/typecall/api/internal/repository"
	"github.com/typecall/api/internal/service"
)

type SalesAnalyticsHandler struct {
	svc       service.AnalyticsService
	abTestRepo repository.ABTestRepository
}

func NewSalesAnalyticsHandler(svc service.AnalyticsService, abTestRepo repository.ABTestRepository) *SalesAnalyticsHandler {
	return &SalesAnalyticsHandler{svc: svc, abTestRepo: abTestRepo}
}

// GET /api/v1/analytics/sales-overview?period=7d|30d|90d
func (h *SalesAnalyticsHandler) Overview(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	orgID := mw.GetOrgID(r.Context())
	out, err := h.svc.GetSalesOverview(r.Context(), orgID, period)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load overview", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, out)
}

// GET /api/v1/analytics/ab-test?funnel_id=UUID
func (h *SalesAnalyticsHandler) ABTest(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("funnel_id")
	if q == "" {
		writeError(w, http.StatusBadRequest, "funnel_id is required", "INVALID_INPUT")
		return
	}
	id, err := uuid.Parse(q)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid funnel_id", "INVALID_ID")
		return
	}
	orgID := mw.GetOrgID(r.Context())
	out, err := h.svc.GetABTest(r.Context(), orgID, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load ab test", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, out)
}

// POST /api/v1/funnels/ab-test — body {name, form_ids: [uuid, uuid, ...]}
func (h *SalesAnalyticsHandler) CreateABTest(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name    string   `json:"name"`
		FormIDs []string `json:"form_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body", "INVALID_BODY")
		return
	}
	if body.Name == "" || len(body.FormIDs) < 2 {
		writeError(w, http.StatusUnprocessableEntity, "name and at least 2 form_ids required", "VALIDATION_ERROR")
		return
	}
	formIDs := make([]uuid.UUID, 0, len(body.FormIDs))
	for _, s := range body.FormIDs {
		id, err := uuid.Parse(s)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid form_id: "+s, "INVALID_ID")
			return
		}
		formIDs = append(formIDs, id)
	}
	orgID := mw.GetOrgID(r.Context())
	id, err := h.abTestRepo.Create(r.Context(), orgID, body.Name, formIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create ab test", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}
