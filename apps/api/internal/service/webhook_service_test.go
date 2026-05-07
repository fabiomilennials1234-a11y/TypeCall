package service

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
)

func TestWebhookService_UpsertConfig(t *testing.T) {
	orgID := uuid.New()

	tests := []struct {
		name    string
		input   domain.CreateWebhookInput
		wantErr bool
	}{
		{
			name: "happy path with custom events",
			input: domain.CreateWebhookInput{
				Name: "CRM Hook", URL: "https://crm.example.com/hook",
				Secret: "s3cret", Events: []string{"booking.created"},
			},
			wantErr: false,
		},
		{
			name: "default events when empty",
			input: domain.CreateWebhookInput{
				Name: "Default Hook", URL: "https://example.com/hook",
				Secret: "s3cret", Events: nil,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &mockWebhookRepository{}

			svc := NewWebhookService(repo)
			cfg, err := svc.UpsertConfig(context.Background(), orgID, tt.input)

			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if cfg == nil {
				t.Fatal("expected config, got nil")
			}
			if cfg.OrganizationID != orgID {
				t.Errorf("expected orgID %s, got %s", orgID, cfg.OrganizationID)
			}
			if cfg.Name != tt.input.Name {
				t.Errorf("expected name %q, got %q", tt.input.Name, cfg.Name)
			}
			if len(tt.input.Events) == 0 && len(cfg.Events) != 2 {
				t.Errorf("expected 2 default events, got %d", len(cfg.Events))
			}
		})
	}
}

func TestWebhookService_Dispatch(t *testing.T) {
	orgID := uuid.New()
	cfgID := uuid.New()

	activeCfg := &domain.WebhookConfig{
		ID: cfgID, OrganizationID: orgID,
		URL: "https://example.com/hook", Secret: "s3cret",
		IsActive: true, Events: []string{"booking.created", "response.completed"},
	}

	tests := []struct {
		name           string
		event          string
		setupRepo      func(*mockWebhookRepository)
		wantDelivery   bool
		wantErr        error
	}{
		{
			name:  "active config matching event creates delivery",
			event: "booking.created",
			setupRepo: func(m *mockWebhookRepository) {
				m.GetConfigFn = func(_ context.Context, _ uuid.UUID) (*domain.WebhookConfig, error) {
					return activeCfg, nil
				}
			},
			wantDelivery: true,
			wantErr:      nil,
		},
		{
			name:  "no config returns nil",
			event: "booking.created",
			setupRepo: func(m *mockWebhookRepository) {
				m.GetConfigFn = func(_ context.Context, _ uuid.UUID) (*domain.WebhookConfig, error) {
					return nil, nil
				}
			},
			wantDelivery: false,
			wantErr:      nil,
		},
		{
			name:  "non-matching event skips delivery",
			event: "form.submitted",
			setupRepo: func(m *mockWebhookRepository) {
				m.GetConfigFn = func(_ context.Context, _ uuid.UUID) (*domain.WebhookConfig, error) {
					return activeCfg, nil
				}
			},
			wantDelivery: false,
			wantErr:      nil,
		},
		{
			name:  "repo error propagates",
			event: "booking.created",
			setupRepo: func(m *mockWebhookRepository) {
				m.GetConfigFn = func(_ context.Context, _ uuid.UUID) (*domain.WebhookConfig, error) {
					return nil, errors.New("db down")
				}
			},
			wantDelivery: false,
			wantErr:      errors.New("db down"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &mockWebhookRepository{}
			tt.setupRepo(repo)

			deliveryCreated := false
			repo.CreateDeliveryFn = func(_ context.Context, d *domain.WebhookDelivery) error {
				deliveryCreated = true
				if d.Event != tt.event {
					t.Errorf("expected event %q, got %q", tt.event, d.Event)
				}
				return nil
			}

			svc := &webhookService{
				webhookRepo: repo,
				httpClient:  &http.Client{Timeout: 1 * time.Second},
			}

			payload := domain.TorqueWebhookPayload{Source: "typecall"}
			err := svc.Dispatch(context.Background(), orgID, tt.event, payload)

			if tt.wantErr != nil {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.wantDelivery && !deliveryCreated {
				t.Error("expected delivery to be created")
			}
			if !tt.wantDelivery && deliveryCreated {
				t.Error("did not expect delivery to be created")
			}
		})
	}
}
