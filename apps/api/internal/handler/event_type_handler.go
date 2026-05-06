package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	mw "github.com/typecall/api/internal/middleware"
	"github.com/typecall/api/internal/service"
)

type EventTypeHandler struct {
	etSvc    service.EventTypeService
	availSvc service.AvailabilityService
}

func NewEventTypeHandler(etSvc service.EventTypeService, availSvc service.AvailabilityService) *EventTypeHandler {
	return &EventTypeHandler{etSvc: etSvc, availSvc: availSvc}
}

func (h *EventTypeHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input domain.CreateEventTypeInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", "INVALID_INPUT")
		return
	}

	if input.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required", "MISSING_FIELDS")
		return
	}

	orgID := mw.GetOrgID(r.Context())
	userID := mw.GetUserID(r.Context())

	et, err := h.etSvc.Create(r.Context(), orgID, userID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create event type", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusCreated, et)
}

func (h *EventTypeHandler) List(w http.ResponseWriter, r *http.Request) {
	params := domain.ListEventTypesParams{
		Limit: 20,
	}

	if q := r.URL.Query().Get("limit"); q != "" {
		if l := parseInt(q, 20); l > 0 && l <= 100 {
			params.Limit = l
		}
	}
	if q := r.URL.Query().Get("cursor"); q != "" {
		params.Cursor = &q
	}

	result, err := h.etSvc.List(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list event types", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *EventTypeHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "eventTypeID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event type ID", "INVALID_ID")
		return
	}

	et, err := h.etSvc.Get(r.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrEventTypeNotFound) {
			writeError(w, http.StatusNotFound, "event type not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get event type", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, et)
}

func (h *EventTypeHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "eventTypeID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event type ID", "INVALID_ID")
		return
	}

	var input domain.UpdateEventTypeInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", "INVALID_INPUT")
		return
	}

	et, err := h.etSvc.Update(r.Context(), id, input)
	if err != nil {
		if errors.Is(err, service.ErrEventTypeNotFound) {
			writeError(w, http.StatusNotFound, "event type not found", "NOT_FOUND")
			return
		}
		if errors.Is(err, service.ErrEventTypeSlug) {
			writeError(w, http.StatusConflict, "slug already exists", "SLUG_CONFLICT")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update event type", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, et)
}

func (h *EventTypeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "eventTypeID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event type ID", "INVALID_ID")
		return
	}

	if err := h.etSvc.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete event type", "INTERNAL_ERROR")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *EventTypeHandler) SetAvailability(w http.ResponseWriter, r *http.Request) {
	eventTypeID, err := uuid.Parse(chi.URLParam(r, "eventTypeID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event type ID", "INVALID_ID")
		return
	}

	var input domain.SetAvailabilityInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", "INVALID_INPUT")
		return
	}

	userID := mw.GetUserID(r.Context())

	rules, err := h.availSvc.SetRules(r.Context(), eventTypeID, userID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to set availability", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"rules": rules})
}

func (h *EventTypeHandler) GetAvailability(w http.ResponseWriter, r *http.Request) {
	eventTypeID, err := uuid.Parse(chi.URLParam(r, "eventTypeID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event type ID", "INVALID_ID")
		return
	}

	rules, err := h.availSvc.GetRules(r.Context(), eventTypeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get availability", "INTERNAL_ERROR")
		return
	}

	overrides, err := h.availSvc.GetOverrides(r.Context(), eventTypeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get overrides", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"rules":     rules,
		"overrides": overrides,
	})
}

func (h *EventTypeHandler) CreateOverride(w http.ResponseWriter, r *http.Request) {
	eventTypeID, err := uuid.Parse(chi.URLParam(r, "eventTypeID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event type ID", "INVALID_ID")
		return
	}

	var input domain.CreateOverrideInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", "INVALID_INPUT")
		return
	}

	if input.Date == "" {
		writeError(w, http.StatusBadRequest, "date is required", "MISSING_FIELDS")
		return
	}

	userID := mw.GetUserID(r.Context())

	override, err := h.availSvc.CreateOverride(r.Context(), eventTypeID, userID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create override", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusCreated, override)
}

func (h *EventTypeHandler) DeleteOverride(w http.ResponseWriter, r *http.Request) {
	overrideID, err := uuid.Parse(chi.URLParam(r, "overrideID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid override ID", "INVALID_ID")
		return
	}

	if err := h.availSvc.DeleteOverride(r.Context(), overrideID); err != nil {
		if errors.Is(err, service.ErrOverrideNotFound) {
			writeError(w, http.StatusNotFound, "override not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete override", "INTERNAL_ERROR")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
