package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

type WebhookService interface {
	GetConfig(ctx context.Context, orgID uuid.UUID) (*domain.WebhookConfig, error)
	UpsertConfig(ctx context.Context, orgID uuid.UUID, input domain.CreateWebhookInput) (*domain.WebhookConfig, error)
	UpdateConfig(ctx context.Context, orgID uuid.UUID, input domain.UpdateWebhookInput) (*domain.WebhookConfig, error)
	DeleteConfig(ctx context.Context, orgID uuid.UUID) error
	ListDeliveries(ctx context.Context, orgID uuid.UUID, limit int) ([]domain.WebhookDelivery, error)
	RetryDelivery(ctx context.Context, orgID uuid.UUID, deliveryID uuid.UUID) error
	Dispatch(ctx context.Context, orgID uuid.UUID, event string, payload domain.TorqueWebhookPayload) error
}

type webhookService struct {
	webhookRepo repository.WebhookRepository
	httpClient  *http.Client
}

func NewWebhookService(webhookRepo repository.WebhookRepository) WebhookService {
	return &webhookService{
		webhookRepo: webhookRepo,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (s *webhookService) GetConfig(ctx context.Context, orgID uuid.UUID) (*domain.WebhookConfig, error) {
	cfg, err := s.webhookRepo.GetConfig(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("WebhookService.GetConfig: %w", err)
	}
	return cfg, nil
}

func (s *webhookService) UpsertConfig(ctx context.Context, orgID uuid.UUID, input domain.CreateWebhookInput) (*domain.WebhookConfig, error) {
	now := time.Now()
	cfg := &domain.WebhookConfig{
		ID:             uuid.New(),
		OrganizationID: orgID,
		Name:           input.Name,
		URL:            input.URL,
		Secret:         input.Secret,
		IsActive:       true,
		Events:         input.Events,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if len(cfg.Events) == 0 {
		cfg.Events = []string{"booking.created", "response.completed"}
	}

	if err := s.webhookRepo.UpsertConfig(ctx, cfg); err != nil {
		return nil, fmt.Errorf("WebhookService.UpsertConfig: %w", err)
	}
	return cfg, nil
}

func (s *webhookService) UpdateConfig(ctx context.Context, orgID uuid.UUID, input domain.UpdateWebhookInput) (*domain.WebhookConfig, error) {
	cfg, err := s.webhookRepo.GetConfig(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("WebhookService.UpdateConfig: %w", err)
	}
	if cfg == nil {
		return nil, fmt.Errorf("WebhookService.UpdateConfig: config not found")
	}

	if input.Name != nil {
		cfg.Name = *input.Name
	}
	if input.URL != nil {
		cfg.URL = *input.URL
	}
	if input.Secret != nil {
		cfg.Secret = *input.Secret
	}
	if input.IsActive != nil {
		cfg.IsActive = *input.IsActive
	}
	if input.Events != nil {
		cfg.Events = input.Events
	}
	cfg.UpdatedAt = time.Now()

	if err := s.webhookRepo.UpsertConfig(ctx, cfg); err != nil {
		return nil, fmt.Errorf("WebhookService.UpdateConfig: %w", err)
	}
	return cfg, nil
}

func (s *webhookService) DeleteConfig(ctx context.Context, orgID uuid.UUID) error {
	cfg, err := s.webhookRepo.GetConfig(ctx, orgID)
	if err != nil {
		return fmt.Errorf("WebhookService.DeleteConfig: %w", err)
	}
	if cfg == nil {
		return fmt.Errorf("WebhookService.DeleteConfig: config not found")
	}
	if err := s.webhookRepo.DeleteConfig(ctx, cfg.ID); err != nil {
		return fmt.Errorf("WebhookService.DeleteConfig: %w", err)
	}
	return nil
}

func (s *webhookService) ListDeliveries(ctx context.Context, orgID uuid.UUID, limit int) ([]domain.WebhookDelivery, error) {
	deliveries, err := s.webhookRepo.ListDeliveries(ctx, orgID, limit)
	if err != nil {
		return nil, fmt.Errorf("WebhookService.ListDeliveries: %w", err)
	}
	return deliveries, nil
}

func (s *webhookService) RetryDelivery(ctx context.Context, orgID uuid.UUID, deliveryID uuid.UUID) error {
	cfg, err := s.webhookRepo.GetConfig(ctx, orgID)
	if err != nil {
		return fmt.Errorf("WebhookService.RetryDelivery: %w", err)
	}
	if cfg == nil {
		return fmt.Errorf("WebhookService.RetryDelivery: config not found")
	}

	deliveries, err := s.webhookRepo.ListDeliveries(ctx, orgID, 100)
	if err != nil {
		return fmt.Errorf("WebhookService.RetryDelivery: %w", err)
	}

	var target *domain.WebhookDelivery
	for i := range deliveries {
		if deliveries[i].ID == deliveryID {
			target = &deliveries[i]
			break
		}
	}
	if target == nil {
		return fmt.Errorf("WebhookService.RetryDelivery: delivery not found")
	}

	target.Status = domain.DeliveryPending
	target.Attempts = 0
	if err := s.webhookRepo.UpdateDelivery(ctx, target); err != nil {
		return fmt.Errorf("WebhookService.RetryDelivery: %w", err)
	}

	go s.deliverSingle(cfg, target)

	return nil
}

func (s *webhookService) Dispatch(ctx context.Context, orgID uuid.UUID, event string, payload domain.TorqueWebhookPayload) error {
	cfg, err := s.webhookRepo.GetConfig(ctx, orgID)
	if err != nil {
		return fmt.Errorf("WebhookService.Dispatch: %w", err)
	}
	if cfg == nil || !cfg.IsActive {
		return nil
	}

	eventAllowed := false
	for _, e := range cfg.Events {
		if e == event {
			eventAllowed = true
			break
		}
	}
	if !eventAllowed {
		return nil
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("WebhookService.Dispatch: marshal payload: %w", err)
	}

	delivery := &domain.WebhookDelivery{
		ID:             uuid.New(),
		WebhookID:      cfg.ID,
		OrganizationID: orgID,
		Event:          event,
		Payload:        payloadJSON,
		Status:         domain.DeliveryPending,
		Attempts:       0,
		CreatedAt:      time.Now(),
	}

	if err := s.webhookRepo.CreateDelivery(ctx, delivery); err != nil {
		return fmt.Errorf("WebhookService.Dispatch: create delivery: %w", err)
	}

	go s.deliverSingle(cfg, delivery)

	return nil
}

func (s *webhookService) deliverSingle(cfg *domain.WebhookConfig, d *domain.WebhookDelivery) {
	ctx := context.Background()
	maxAttempts := 5
	backoffs := []time.Duration{0, 5 * time.Second, 30 * time.Second, 2 * time.Minute, 10 * time.Minute}

	for attempt := 0; attempt < maxAttempts; attempt++ {
		if attempt > 0 && attempt < len(backoffs) {
			time.Sleep(backoffs[attempt])
		}

		d.Attempts = attempt + 1
		now := time.Now()
		d.LastAttemptAt = &now

		statusCode, err := s.postWebhook(cfg.URL, cfg.Secret, d.Event, d.Payload)
		d.ResponseStatus = &statusCode

		if err == nil && statusCode >= 200 && statusCode < 300 {
			d.Status = domain.DeliveryDelivered
			d.LastError = nil
			if updateErr := s.webhookRepo.UpdateDelivery(ctx, d); updateErr != nil {
				log.Error().Err(updateErr).Str("delivery_id", d.ID.String()).Msg("webhook: failed to update delivered status")
			}
			return
		}

		errMsg := ""
		if err != nil {
			errMsg = err.Error()
		} else {
			errMsg = fmt.Sprintf("HTTP %d", statusCode)
		}
		d.LastError = &errMsg
		d.Status = domain.DeliveryFailed

		if updateErr := s.webhookRepo.UpdateDelivery(ctx, d); updateErr != nil {
			log.Error().Err(updateErr).Str("delivery_id", d.ID.String()).Msg("webhook: failed to update failed status")
		}

		log.Warn().
			Str("delivery_id", d.ID.String()).
			Int("attempt", attempt+1).
			Str("error", errMsg).
			Msg("webhook: delivery attempt failed")
	}

	d.Status = domain.DeliveryDeadLetter
	if updateErr := s.webhookRepo.UpdateDelivery(ctx, d); updateErr != nil {
		log.Error().Err(updateErr).Str("delivery_id", d.ID.String()).Msg("webhook: failed to update dead_letter status")
	}

	log.Error().
		Str("delivery_id", d.ID.String()).
		Str("webhook_url", cfg.URL).
		Msg("webhook: delivery moved to dead letter after max retries")
}

func (s *webhookService) postWebhook(url, secret, event string, payload json.RawMessage) (int, error) {
	body := payload

	sig := signPayload(secret, body)

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return 0, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-TypeCall-Event", event)
	req.Header.Set("X-TypeCall-Signature", sig)
	req.Header.Set("X-TypeCall-Delivery", uuid.New().String())
	req.Header.Set("User-Agent", "TypeCall-Webhook/1.0")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("http post: %w", err)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	return resp.StatusCode, nil
}

func signPayload(secret string, payload []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}
