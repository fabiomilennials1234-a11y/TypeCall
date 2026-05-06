package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/service"
)

type BookingHandler struct {
	bookingSvc service.BookingService
}

func NewBookingHandler(bookingSvc service.BookingService) *BookingHandler {
	return &BookingHandler{bookingSvc: bookingSvc}
}

func (h *BookingHandler) List(w http.ResponseWriter, r *http.Request) {
	params := domain.ListBookingsParams{
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
	if q := r.URL.Query().Get("status"); q != "" {
		s := domain.BookingStatus(q)
		params.Status = &s
	}
	if q := r.URL.Query().Get("event_type_id"); q != "" {
		if id, err := uuid.Parse(q); err == nil {
			params.EventType = &id
		}
	}
	if q := r.URL.Query().Get("from"); q != "" {
		if t, err := time.Parse(time.RFC3339, q); err == nil {
			params.From = &t
		}
	}
	if q := r.URL.Query().Get("to"); q != "" {
		if t, err := time.Parse(time.RFC3339, q); err == nil {
			params.To = &t
		}
	}

	result, err := h.bookingSvc.List(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list bookings", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *BookingHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "bookingID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid booking ID", "INVALID_ID")
		return
	}

	booking, err := h.bookingSvc.Get(r.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrBookingNotFound) {
			writeError(w, http.StatusNotFound, "booking not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get booking", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, booking)
}

func (h *BookingHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "bookingID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid booking ID", "INVALID_ID")
		return
	}

	var body struct {
		Reason *string `json:"reason"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	if err := h.bookingSvc.Cancel(r.Context(), id, body.Reason); err != nil {
		if errors.Is(err, service.ErrBookingNotFound) {
			writeError(w, http.StatusNotFound, "booking not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to cancel booking", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

// Public handlers — no auth

type PublicBookingHandler struct {
	bookingSvc service.BookingService
	availSvc   service.AvailabilityService
}

func NewPublicBookingHandler(bookingSvc service.BookingService, availSvc service.AvailabilityService) *PublicBookingHandler {
	return &PublicBookingHandler{bookingSvc: bookingSvc, availSvc: availSvc}
}

func (h *PublicBookingHandler) GetSlots(w http.ResponseWriter, r *http.Request) {
	eventTypeID, err := uuid.Parse(chi.URLParam(r, "eventTypeID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event type ID", "INVALID_ID")
		return
	}

	tz := r.URL.Query().Get("timezone")
	if tz == "" {
		tz = "America/Sao_Paulo"
	}

	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")

	var from, to time.Time
	if fromStr != "" {
		from, err = time.Parse("2006-01-02", fromStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid from date (use YYYY-MM-DD)", "INVALID_INPUT")
			return
		}
	} else {
		from = time.Now().UTC()
	}

	if toStr != "" {
		to, err = time.Parse("2006-01-02", toStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid to date (use YYYY-MM-DD)", "INVALID_INPUT")
			return
		}
		to = to.Add(24*time.Hour - time.Second)
	} else {
		to = from.AddDate(0, 0, 30)
	}

	slots, err := h.availSvc.GetAvailableSlots(r.Context(), domain.SlotParams{
		EventTypeID: eventTypeID,
		From:        from,
		To:          to,
		Timezone:    tz,
	})
	if err != nil {
		if errors.Is(err, service.ErrEventTypeNotFound) {
			writeError(w, http.StatusNotFound, "event type not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get slots", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"slots": slots})
}

func (h *PublicBookingHandler) CreateBooking(w http.ResponseWriter, r *http.Request) {
	var input domain.CreateBookingInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", "INVALID_INPUT")
		return
	}

	if input.AttendeeName == "" || input.AttendeeEmail == "" {
		writeError(w, http.StatusBadRequest, "name and email are required", "MISSING_FIELDS")
		return
	}
	if input.StartTime.IsZero() {
		writeError(w, http.StatusBadRequest, "start_time is required", "MISSING_FIELDS")
		return
	}

	booking, err := h.bookingSvc.Create(r.Context(), input)
	if err != nil {
		if errors.Is(err, service.ErrEventTypeNotFound) {
			writeError(w, http.StatusNotFound, "event type not found", "NOT_FOUND")
			return
		}
		if errors.Is(err, service.ErrSlotConflict) {
			writeError(w, http.StatusConflict, "time slot is no longer available", "SLOT_CONFLICT")
			return
		}
		if errors.Is(err, service.ErrBookingPast) {
			writeError(w, http.StatusBadRequest, "cannot book in the past", "BOOKING_PAST")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create booking", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusCreated, booking)
}

func (h *PublicBookingHandler) CancelByToken(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "token is required", "MISSING_TOKEN")
		return
	}

	var body struct {
		Reason *string `json:"reason"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	if err := h.bookingSvc.CancelByToken(r.Context(), token, body.Reason); err != nil {
		if errors.Is(err, service.ErrBookingNotFound) {
			writeError(w, http.StatusNotFound, "booking not found or already cancelled", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to cancel booking", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}
