package service

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
)

func TestAnalyticsService_IngestEvents(t *testing.T) {
	orgID := uuid.New()
	formID := uuid.New()

	validEvent := domain.IngestEventInput{
		EventID:   uuid.New(),
		FormID:    formID,
		EventType: domain.EventView,
	}

	tests := []struct {
		name    string
		input   domain.IngestBatchInput
		wantN   int
		wantErr string
	}{
		{
			name:    "happy path",
			input:   domain.IngestBatchInput{Events: []domain.IngestEventInput{validEvent}},
			wantN:   1,
			wantErr: "",
		},
		{
			name:    "empty batch returns zero",
			input:   domain.IngestBatchInput{Events: nil},
			wantN:   0,
			wantErr: "",
		},
		{
			name: "exceeds max batch size",
			input: func() domain.IngestBatchInput {
				events := make([]domain.IngestEventInput, 11)
				for i := range events {
					events[i] = domain.IngestEventInput{
						EventID: uuid.New(), FormID: formID, EventType: domain.EventView,
					}
				}
				return domain.IngestBatchInput{Events: events}
			}(),
			wantN:   0,
			wantErr: "max 10 events",
		},
		{
			name: "invalid event type",
			input: domain.IngestBatchInput{Events: []domain.IngestEventInput{
				{EventID: uuid.New(), FormID: formID, EventType: "invalid_type"},
			}},
			wantN:   0,
			wantErr: "invalid event_type",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pubRepo := &mockPublicAnalyticsRepository{
				IngestEventsFn: func(_ context.Context, _ uuid.UUID, events []domain.IngestEventInput) (int, error) {
					return len(events), nil
				},
			}
			svc := NewAnalyticsService(&mockAnalyticsRepository{}, pubRepo, &mockResponseRepository{})
			n, err := svc.IngestEvents(context.Background(), orgID, tt.input)

			if tt.wantErr != "" {
				if err == nil {
					t.Fatalf("expected error containing %q, got nil", tt.wantErr)
				}
				if !strings.Contains(err.Error(), tt.wantErr) {
					t.Errorf("expected error containing %q, got %v", tt.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if n != tt.wantN {
				t.Errorf("expected %d inserted, got %d", tt.wantN, n)
			}
		})
	}
}

func TestAnalyticsService_GetSummary(t *testing.T) {
	formID := uuid.New()
	from := time.Now().AddDate(0, 0, -30)
	to := time.Now()

	expected := &domain.AnalyticsSummary{
		Views: 100, Starts: 80, Completions: 60, Abandons: 20,
		CompletionRate: 75.0,
	}

	analyticsRepo := &mockAnalyticsRepository{
		GetSummaryFn: func(_ context.Context, _ uuid.UUID, _, _ time.Time) (*domain.AnalyticsSummary, error) {
			return expected, nil
		},
	}

	svc := NewAnalyticsService(analyticsRepo, &mockPublicAnalyticsRepository{}, &mockResponseRepository{})
	summary, err := svc.GetSummary(context.Background(), formID, from, to)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if summary == nil {
		t.Fatal("expected summary, got nil")
	}
	if summary.Views != 100 {
		t.Errorf("expected 100 views, got %d", summary.Views)
	}
	if summary.CompletionRate != 75.0 {
		t.Errorf("expected 75%% completion rate, got %.1f", summary.CompletionRate)
	}
}
