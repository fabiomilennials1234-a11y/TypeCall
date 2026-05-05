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

type FormHandler struct {
	formSvc service.FormService
}

func NewFormHandler(formSvc service.FormService) *FormHandler {
	return &FormHandler{formSvc: formSvc}
}

func (h *FormHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input domain.CreateFormInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", "INVALID_INPUT")
		return
	}

	if input.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required", "MISSING_FIELDS")
		return
	}

	orgID := mw.GetOrgID(r.Context())
	form, err := h.formSvc.Create(r.Context(), orgID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create form", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusCreated, form)
}

func (h *FormHandler) List(w http.ResponseWriter, r *http.Request) {
	params := domain.ListFormsParams{
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
		s := domain.FormStatus(q)
		params.Status = &s
	}

	result, err := h.formSvc.List(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list forms", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *FormHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "formID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form ID", "INVALID_ID")
		return
	}

	form, err := h.formSvc.Get(r.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrFormNotFound) {
			writeError(w, http.StatusNotFound, "form not found", "NOT_FOUND")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get form", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, form)
}

func (h *FormHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "formID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form ID", "INVALID_ID")
		return
	}

	var input domain.UpdateFormInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", "INVALID_INPUT")
		return
	}

	form, err := h.formSvc.Update(r.Context(), id, input)
	if err != nil {
		if errors.Is(err, service.ErrFormNotFound) {
			writeError(w, http.StatusNotFound, "form not found", "NOT_FOUND")
			return
		}
		if errors.Is(err, service.ErrSlugConflict) {
			writeError(w, http.StatusConflict, "slug already exists", "SLUG_CONFLICT")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update form", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, form)
}

func (h *FormHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "formID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form ID", "INVALID_ID")
		return
	}

	if err := h.formSvc.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete form", "INTERNAL_ERROR")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *FormHandler) SaveDraft(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "formID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form ID", "INVALID_ID")
		return
	}

	var body struct {
		Definition json.RawMessage `json:"definition"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Definition == nil {
		writeError(w, http.StatusBadRequest, "definition is required", "INVALID_INPUT")
		return
	}

	if err := h.formSvc.SaveDraft(r.Context(), id, body.Definition); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save draft", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "saved"})
}

func (h *FormHandler) Publish(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "formID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form ID", "INVALID_ID")
		return
	}

	userID := mw.GetUserID(r.Context())

	version, err := h.formSvc.Publish(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, service.ErrFormNotFound) {
			writeError(w, http.StatusNotFound, "form not found", "NOT_FOUND")
			return
		}
		if errors.Is(err, service.ErrFormNotDraft) {
			writeError(w, http.StatusConflict, "form cannot be published in current state", "INVALID_STATUS")
			return
		}
		if errors.Is(err, service.ErrEmptyDraft) {
			writeError(w, http.StatusBadRequest, "cannot publish empty draft", "EMPTY_DRAFT")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to publish form", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusCreated, version)
}

func parseInt(s string, defaultVal int) int {
	var n int
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		} else {
			return defaultVal
		}
	}
	if n == 0 {
		return defaultVal
	}
	return n
}
