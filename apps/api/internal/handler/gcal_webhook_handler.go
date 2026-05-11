package handler

import (
	"net/http"

	"github.com/rs/zerolog/log"
)

// GCalWebhookHandler receives push notifications from Google Calendar watch
// channels. The endpoint is intentionally lightweight: Google retries on 5xx,
// and we must respond within seconds. We log the headers so a future cache
// layer can hook into invalidation.
type GCalWebhookHandler struct{}

func NewGCalWebhookHandler() *GCalWebhookHandler {
	return &GCalWebhookHandler{}
}

func (h *GCalWebhookHandler) Notify(w http.ResponseWriter, r *http.Request) {
	channelID := r.Header.Get("X-Goog-Channel-Id")
	resourceID := r.Header.Get("X-Goog-Resource-Id")
	resourceState := r.Header.Get("X-Goog-Resource-State")

	if channelID == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	log.Info().
		Str("channel_id", channelID).
		Str("resource_id", resourceID).
		Str("resource_state", resourceState).
		Msg("gcal watch notification received")

	// Future: dispatch cache invalidation per user (channel_id encodes user_id).
	w.WriteHeader(http.StatusOK)
}
