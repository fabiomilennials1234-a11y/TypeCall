package handler

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/service"
)

type AnalyticsHandler struct {
	analyticsSvc service.AnalyticsService
}

func NewAnalyticsHandler(analyticsSvc service.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{analyticsSvc: analyticsSvc}
}

func (h *AnalyticsHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	formID, err := uuid.Parse(chi.URLParam(r, "formID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form ID", "INVALID_ID")
		return
	}

	from, to := parseDateRange(r)

	summary, err := h.analyticsSvc.GetSummary(r.Context(), formID, from, to)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get summary", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, summary)
}

func (h *AnalyticsHandler) GetDailyMetrics(w http.ResponseWriter, r *http.Request) {
	formID, err := uuid.Parse(chi.URLParam(r, "formID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form ID", "INVALID_ID")
		return
	}

	from, to := parseDateRange(r)

	metrics, err := h.analyticsSvc.GetDailyMetrics(r.Context(), formID, from, to)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get daily metrics", "INTERNAL_ERROR")
		return
	}
	if metrics == nil {
		metrics = []domain.FormDailyMetric{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"metrics": metrics})
}

func (h *AnalyticsHandler) GetStepDropoff(w http.ResponseWriter, r *http.Request) {
	formID, err := uuid.Parse(chi.URLParam(r, "formID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form ID", "INVALID_ID")
		return
	}

	from, to := parseDateRange(r)

	dropoff, err := h.analyticsSvc.GetStepDropoff(r.Context(), formID, from, to)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get step dropoff", "INTERNAL_ERROR")
		return
	}
	if dropoff == nil {
		dropoff = []domain.StepDropoff{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"steps": dropoff})
}

func (h *AnalyticsHandler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	formID, err := uuid.Parse(chi.URLParam(r, "formID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form ID", "INVALID_ID")
		return
	}

	from, to := parseDateRange(r)

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=responses.csv")

	if err := h.analyticsSvc.ExportCSV(r.Context(), formID, from, to, w); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to export CSV", "INTERNAL_ERROR")
		return
	}
}

func (h *AnalyticsHandler) RefreshMetrics(w http.ResponseWriter, r *http.Request) {
	if err := h.analyticsSvc.RefreshMetrics(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to refresh metrics", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "refreshed"})
}

type PublicEventsHandler struct {
	analyticsSvc service.AnalyticsService
	pool         *pgxpool.Pool
}

func NewPublicEventsHandler(analyticsSvc service.AnalyticsService, pool *pgxpool.Pool) *PublicEventsHandler {
	return &PublicEventsHandler{analyticsSvc: analyticsSvc, pool: pool}
}

func (h *PublicEventsHandler) IngestEvents(w http.ResponseWriter, r *http.Request) {
	var input domain.IngestBatchInput
	if !decodeBody(w, r, &input) {
		return
	}

	v := &Validator{}
	if len(input.Events) == 0 {
		v.addError("events", "at least one event is required")
	}
	if len(input.Events) > 50 {
		v.addError("events", "maximum 50 events per batch")
	}
	if v.HasErrors() {
		v.WriteResponse(w)
		return
	}

	orgID, err := h.resolveOrgFromFormID(r.Context(), input.Events)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form_id", "INVALID_FORM")
		return
	}

	inserted, err := h.analyticsSvc.IngestEvents(r.Context(), orgID, input)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error(), "VALIDATION_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, map[string]int{"inserted": inserted})
}

func parseDateRange(r *http.Request) (time.Time, time.Time) {
	from := time.Now().AddDate(0, 0, -30)
	to := time.Now()

	if q := r.URL.Query().Get("from"); q != "" {
		if t, err := time.Parse("2006-01-02", q); err == nil {
			from = t
		}
	}
	if q := r.URL.Query().Get("to"); q != "" {
		if t, err := time.Parse("2006-01-02", q); err == nil {
			to = t.Add(24*time.Hour - time.Second)
		}
	}
	return from, to
}

func (h *PublicEventsHandler) resolveOrgFromFormID(ctx context.Context, events []domain.IngestEventInput) (uuid.UUID, error) {
	if len(events) == 0 {
		return uuid.Nil, fmt.Errorf("no events")
	}
	var orgID uuid.UUID
	err := h.pool.QueryRow(ctx,
		"SELECT organization_id FROM forms WHERE id = $1 AND deleted_at IS NULL",
		events[0].FormID,
	).Scan(&orgID)
	if err != nil {
		return uuid.Nil, err
	}
	return orgID, nil
}
