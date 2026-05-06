package handler

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/service"
)

type ResponseHandler struct {
	responseSvc service.ResponseService
}

func NewResponseHandler(responseSvc service.ResponseService) *ResponseHandler {
	return &ResponseHandler{responseSvc: responseSvc}
}

func (h *ResponseHandler) List(w http.ResponseWriter, r *http.Request) {
	formID, err := uuid.Parse(chi.URLParam(r, "formID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form ID", "INVALID_ID")
		return
	}

	params := domain.ListResponsesParams{
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
		s := domain.ResponseStatus(q)
		params.Status = &s
	}

	result, err := h.responseSvc.List(r.Context(), formID, params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list responses", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *ResponseHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "responseID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid response ID", "INVALID_ID")
		return
	}

	resp, err := h.responseSvc.GetWithAnswers(r.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrFormNotFound) {
			writeError(w, http.StatusNotFound, "response not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get response", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
