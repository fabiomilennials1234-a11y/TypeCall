package publicschedule

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

// GET /api/v1/public/schedule/slots?form_slug=&tag=&date=&tz=
func (h *Handler) Slots(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	slug := strings.TrimSpace(q.Get("form_slug"))
	tag := strings.TrimSpace(q.Get("tag"))
	dateStr := strings.TrimSpace(q.Get("date"))
	tz := strings.TrimSpace(q.Get("tz"))
	if tz == "" {
		tz = "America/Sao_Paulo"
	}

	if slug == "" || tag == "" || dateStr == "" {
		writeError(w, http.StatusBadRequest, "form_slug, tag, date are required", "INVALID_INPUT")
		return
	}
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid date format YYYY-MM-DD", "INVALID_DATE")
		return
	}

	slots, err := h.svc.GetSlots(r.Context(), slug, tag, date, tz)
	if err != nil {
		switch {
		case errors.Is(err, ErrFormNotFound):
			writeError(w, http.StatusNotFound, "form not found", "FORM_NOT_FOUND")
		case errors.Is(err, ErrInvalidTag):
			writeError(w, http.StatusBadRequest, "invalid tag", "INVALID_TAG")
		default:
			log.Error().Err(err).Msg("publicschedule.Slots failed")
			writeError(w, http.StatusInternalServerError, "failed to load slots", "INTERNAL_ERROR")
		}
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"slots": slots})
}

// POST /api/v1/public/schedule/book
func (h *Handler) Book(w http.ResponseWriter, r *http.Request) {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var input BookSlotInput
	if err := dec.Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body: "+err.Error(), "INVALID_BODY")
		return
	}

	if input.FormSlug == "" || input.Tag == "" || input.AttendeeName == "" || input.AttendeeEmail == "" {
		writeError(w, http.StatusUnprocessableEntity, "form_slug, tag, attendee_name, attendee_email are required", "VALIDATION_ERROR")
		return
	}
	if input.StartTime.IsZero() {
		writeError(w, http.StatusUnprocessableEntity, "start_time is required", "VALIDATION_ERROR")
		return
	}

	out, err := h.svc.BookSlot(r.Context(), input)
	if err != nil {
		switch {
		case errors.Is(err, ErrFormNotFound):
			writeError(w, http.StatusNotFound, "form not found", "FORM_NOT_FOUND")
		case errors.Is(err, ErrInvalidTag):
			writeError(w, http.StatusBadRequest, "invalid tag", "INVALID_TAG")
		case errors.Is(err, ErrSlotUnavailable):
			writeError(w, http.StatusConflict, "slot is no longer available", "SLOT_UNAVAILABLE")
		default:
			log.Error().Err(err).Msg("publicschedule.Book failed")
			writeError(w, http.StatusInternalServerError, "failed to book slot", "INTERNAL_ERROR")
		}
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg, code string) {
	writeJSON(w, status, map[string]any{"error": msg, "code": code})
}
