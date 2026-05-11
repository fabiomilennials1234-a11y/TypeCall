package sellers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

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

// POST /api/v1/sellers
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input domain.CreateSellerInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body", "INVALID_BODY")
		return
	}
	if input.Name == "" {
		writeError(w, http.StatusUnprocessableEntity, "name is required", "VALIDATION_ERROR")
		return
	}
	orgID := mw.GetOrgID(r.Context())
	seller, err := h.svc.Create(r.Context(), orgID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create seller", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusCreated, seller)
}

// GET /api/v1/sellers
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	orgID := mw.GetOrgID(r.Context())
	activeOnly := r.URL.Query().Get("active") == "true"
	sellers, err := h.svc.List(r.Context(), orgID, activeOnly)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list sellers", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"sellers": sellers})
}

// GET /api/v1/sellers/:id
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "sellerID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id", "INVALID_ID")
		return
	}
	seller, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrSellerNotFound) {
			writeError(w, http.StatusNotFound, "seller not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to fetch seller", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, seller)
}

// PATCH /api/v1/sellers/:id
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "sellerID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id", "INVALID_ID")
		return
	}
	var input domain.UpdateSellerInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body", "INVALID_BODY")
		return
	}
	seller, err := h.svc.Update(r.Context(), id, input)
	if err != nil {
		if errors.Is(err, ErrSellerNotFound) {
			writeError(w, http.StatusNotFound, "seller not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update seller", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, seller)
}

// GET /api/v1/sellers/:id/availability
func (h *Handler) GetAvailability(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "sellerID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id", "INVALID_ID")
		return
	}
	slots, err := h.svc.GetAvailability(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get availability", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"slots": slots})
}

// PUT /api/v1/sellers/:id/availability
func (h *Handler) SetAvailability(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "sellerID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id", "INVALID_ID")
		return
	}
	var input domain.SetSellerAvailabilityInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body", "INVALID_BODY")
		return
	}
	orgID := mw.GetOrgID(r.Context())
	slots, err := h.svc.SetAvailability(r.Context(), id, orgID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to set availability", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"slots": slots})
}

// POST /api/v1/sellers/:id/goals
func (h *Handler) CreateGoal(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "sellerID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id", "INVALID_ID")
		return
	}
	var input domain.CreateSellerGoalInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body", "INVALID_BODY")
		return
	}
	orgID := mw.GetOrgID(r.Context())
	goal, err := h.svc.CreateGoal(r.Context(), id, orgID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create goal", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusCreated, goal)
}

// GET /api/v1/sellers/:id/goals
func (h *Handler) ListGoals(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "sellerID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id", "INVALID_ID")
		return
	}
	goals, err := h.svc.ListGoals(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list goals", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"goals": goals})
}

// GET /api/v1/sellers/:id/slots?date=YYYY-MM-DD&tz=America/Sao_Paulo
func (h *Handler) GetSlots(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "sellerID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id", "INVALID_ID")
		return
	}
	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		writeError(w, http.StatusBadRequest, "date is required (YYYY-MM-DD)", "INVALID_INPUT")
		return
	}
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid date format", "INVALID_INPUT")
		return
	}
	tz := r.URL.Query().Get("tz")
	if tz == "" {
		tz = "America/Sao_Paulo"
	}
	slots, err := h.svc.GetAvailableSlots(r.Context(), id, date, tz)
	if err != nil {
		if errors.Is(err, ErrSellerNotFound) {
			writeError(w, http.StatusNotFound, "seller not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to compute slots", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"slots": slots})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg, code string) {
	writeJSON(w, status, map[string]any{"error": msg, "code": code})
}
