package handler

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	mw "github.com/typecall/api/internal/middleware"
	"github.com/typecall/api/internal/service"
)

type AssetHandler struct {
	svc service.AssetService
}

func NewAssetHandler(svc service.AssetService) *AssetHandler {
	return &AssetHandler{svc: svc}
}

// Upload handles POST /api/v1/forms/{formID}/assets.
// Expects multipart/form-data with a "file" field. Returns the persisted FormAsset.
func (h *AssetHandler) Upload(w http.ResponseWriter, r *http.Request) {
	formID, err := uuid.Parse(chi.URLParam(r, "formID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid form id", "INVALID_ID")
		return
	}

	if err := r.ParseMultipartForm(service.MaxAssetSize + 1024); err != nil {
		writeError(w, http.StatusBadRequest, "invalid multipart payload", "INVALID_BODY")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing file field", "FILE_MISSING")
		return
	}
	defer file.Close()

	orgID := mw.GetOrgID(r.Context())

	mimeType := header.Header.Get("Content-Type")
	asset, err := h.svc.Upload(r.Context(), formID, orgID, mimeType, header.Size, file)
	if err != nil {
		if errors.Is(err, service.ErrAssetTooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "file exceeds 5MB", "FILE_TOO_LARGE")
			return
		}
		if errors.Is(err, service.ErrAssetUnsupported) {
			writeError(w, http.StatusUnsupportedMediaType, "only image/jpeg, image/png, image/webp, image/gif are accepted", "MIME_NOT_SUPPORTED")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to upload", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusCreated, asset)
}
