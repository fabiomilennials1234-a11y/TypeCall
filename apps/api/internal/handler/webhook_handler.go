package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	mw "github.com/typecall/api/internal/middleware"
	"github.com/typecall/api/internal/service"
)

type WebhookHandler struct {
	webhookSvc service.WebhookService
}

func NewWebhookHandler(webhookSvc service.WebhookService) *WebhookHandler {
	return &WebhookHandler{webhookSvc: webhookSvc}
}

func (h *WebhookHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	orgID := mw.GetOrgID(r.Context())

	cfg, err := h.webhookSvc.GetConfig(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get webhook config", "INTERNAL_ERROR")
		return
	}
	if cfg == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{"config": nil})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"config": cfg})
}

func (h *WebhookHandler) UpsertConfig(w http.ResponseWriter, r *http.Request) {
	orgID := mw.GetOrgID(r.Context())

	var input domain.CreateWebhookInput
	if !decodeBody(w, r, &input) {
		return
	}

	v := &Validator{}
	v.HTTPS("url", input.URL)
	v.Required("secret", input.Secret)
	v.Required("name", input.Name)
	if v.HasErrors() {
		v.WriteResponse(w)
		return
	}

	cfg, err := h.webhookSvc.UpsertConfig(r.Context(), orgID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save webhook config", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, cfg)
}

func (h *WebhookHandler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	orgID := mw.GetOrgID(r.Context())

	var input domain.UpdateWebhookInput
	if !decodeBody(w, r, &input) {
		return
	}

	v := &Validator{}
	if input.URL != nil {
		v.HTTPS("url", *input.URL)
	}
	if v.HasErrors() {
		v.WriteResponse(w)
		return
	}

	cfg, err := h.webhookSvc.UpdateConfig(r.Context(), orgID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update webhook config", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, cfg)
}

func (h *WebhookHandler) DeleteConfig(w http.ResponseWriter, r *http.Request) {
	orgID := mw.GetOrgID(r.Context())

	if err := h.webhookSvc.DeleteConfig(r.Context(), orgID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete webhook config", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *WebhookHandler) ListDeliveries(w http.ResponseWriter, r *http.Request) {
	orgID := mw.GetOrgID(r.Context())

	limit := 20
	if q := r.URL.Query().Get("limit"); q != "" {
		if l := parseInt(q, 20); l > 0 && l <= 100 {
			limit = l
		}
	}

	deliveries, err := h.webhookSvc.ListDeliveries(r.Context(), orgID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list deliveries", "INTERNAL_ERROR")
		return
	}
	if deliveries == nil {
		deliveries = []domain.WebhookDelivery{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"deliveries": deliveries})
}

func (h *WebhookHandler) RetryDelivery(w http.ResponseWriter, r *http.Request) {
	orgID := mw.GetOrgID(r.Context())

	deliveryID, err := uuid.Parse(chi.URLParam(r, "deliveryID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid delivery ID", "INVALID_ID")
		return
	}

	if err := h.webhookSvc.RetryDelivery(r.Context(), orgID, deliveryID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to retry delivery", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "retrying"})
}
