package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/service"
)

type PublicHandler struct {
	responseSvc service.ResponseService
}

func NewPublicHandler(responseSvc service.ResponseService) *PublicHandler {
	return &PublicHandler{responseSvc: responseSvc}
}

func (h *PublicHandler) GetForm(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		writeError(w, http.StatusBadRequest, "slug is required", "MISSING_SLUG")
		return
	}

	form, err := h.responseSvc.GetPublicForm(r.Context(), slug)
	if err != nil {
		if errors.Is(err, service.ErrFormNotPublished) {
			writeError(w, http.StatusNotFound, "form not found or not published", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get form", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, form)
}

func (h *PublicHandler) SubmitResponse(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		writeError(w, http.StatusBadRequest, "slug is required", "MISSING_SLUG")
		return
	}

	var input domain.SubmitResponseInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", "INVALID_INPUT")
		return
	}

	resp, err := h.responseSvc.Submit(r.Context(), slug, input)
	if err != nil {
		if errors.Is(err, service.ErrFormNotPublished) {
			writeError(w, http.StatusNotFound, "form not found or not published", "NOT_FOUND")
			return
		}
		if errors.Is(err, service.ErrNoAnswers) {
			writeError(w, http.StatusBadRequest, "at least one answer is required", "NO_ANSWERS")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to submit response", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusCreated, resp)
}
