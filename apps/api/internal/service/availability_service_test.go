package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
)

func TestAvailabilityService_SetRules(t *testing.T) {
	eventTypeID := uuid.New()
	userID := uuid.New()

	replaceCalled := false
	availRepo := &mockAvailabilityRepository{
		ReplaceRulesFn: func(_ context.Context, _ uuid.UUID, _ uuid.UUID, rules []domain.AvailabilityRule) error {
			replaceCalled = true
			if len(rules) != 2 {
				t.Errorf("expected 2 rules, got %d", len(rules))
			}
			return nil
		},
		ListRulesFn: func(_ context.Context, _ uuid.UUID) ([]domain.AvailabilityRule, error) {
			return []domain.AvailabilityRule{
				{DayOfWeek: 1, StartTime: "09:00:00", EndTime: "17:00:00"},
				{DayOfWeek: 3, StartTime: "09:00:00", EndTime: "17:00:00"},
			}, nil
		},
	}

	svc := NewAvailabilityService(availRepo, &mockEventTypeRepository{}, &mockBookingRepository{}, &mockPublicEventTypeRepository{}, nil)
	rules, err := svc.SetRules(context.Background(), eventTypeID, userID, domain.SetAvailabilityInput{
		Rules: []domain.AvailabilityRuleInput{
			{DayOfWeek: 1, StartTime: "09:00:00", EndTime: "17:00:00"},
			{DayOfWeek: 3, StartTime: "09:00:00", EndTime: "17:00:00"},
		},
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !replaceCalled {
		t.Error("expected ReplaceRules to be called")
	}
	if len(rules) != 2 {
		t.Errorf("expected 2 rules returned, got %d", len(rules))
	}
}

func TestAvailabilityService_DeleteOverride(t *testing.T) {
	tests := []struct {
		name    string
		setup   func(*mockAvailabilityRepository)
		wantErr error
	}{
		{
			name: "happy path",
			setup: func(m *mockAvailabilityRepository) {
				m.GetOverrideByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.AvailabilityOverride, error) {
					return &domain.AvailabilityOverride{ID: uuid.New()}, nil
				}
			},
			wantErr: nil,
		},
		{
			name: "not found",
			setup: func(m *mockAvailabilityRepository) {
				m.GetOverrideByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.AvailabilityOverride, error) {
					return nil, nil
				}
			},
			wantErr: ErrOverrideNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			availRepo := &mockAvailabilityRepository{}
			tt.setup(availRepo)

			svc := NewAvailabilityService(availRepo, &mockEventTypeRepository{}, &mockBookingRepository{}, &mockPublicEventTypeRepository{}, nil)
			err := svc.DeleteOverride(context.Background(), uuid.New())

			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected %v, got nil", tt.wantErr)
				}
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("expected %v, got %v", tt.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestAvailabilityService_GetAvailableSlots(t *testing.T) {
	orgID := uuid.New()
	hostID := uuid.New()
	etID := uuid.New()

	targetDate := time.Now().AddDate(0, 0, 3).UTC()
	dayStart := time.Date(targetDate.Year(), targetDate.Month(), targetDate.Day(), 0, 0, 0, 0, time.UTC)
	dayEnd := dayStart.Add(24*time.Hour - time.Second)

	baseET := &domain.EventType{
		ID: etID, OrganizationID: orgID, UserID: hostID,
		DurationMinutes: 30, MinNoticeHours: 0, MaxAdvanceDays: 60,
		BufferBeforeMinutes: 0, BufferAfterMinutes: 0,
		IsActive: true,
	}

	tests := []struct {
		name      string
		params    domain.SlotParams
		setupET   func(*mockPublicEventTypeRepository)
		setupAvail func(*mockAvailabilityRepository)
		setupBook func(*mockBookingRepository)
		wantMin   int
		wantErr   error
	}{
		{
			name: "event type not found",
			params: domain.SlotParams{
				EventTypeID: uuid.New(), From: dayStart, To: dayEnd, Timezone: "UTC",
			},
			setupET: func(m *mockPublicEventTypeRepository) {
				m.GetActiveByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.EventType, error) {
					return nil, nil
				}
			},
			setupAvail: func(m *mockAvailabilityRepository) {},
			setupBook:  func(m *mockBookingRepository) {},
			wantMin:    0,
			wantErr:    ErrEventTypeNotFound,
		},
		{
			name: "no rules returns empty",
			params: domain.SlotParams{
				EventTypeID: etID, From: dayStart, To: dayEnd, Timezone: "UTC",
			},
			setupET: func(m *mockPublicEventTypeRepository) {
				m.GetActiveByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.EventType, error) {
					return baseET, nil
				}
			},
			setupAvail: func(m *mockAvailabilityRepository) {
				m.ListOverridesByUserAndDateFn = func(_ context.Context, _, _ uuid.UUID, _ string) ([]domain.AvailabilityOverride, error) {
					return nil, nil
				}
				m.ListRulesByUserAndDayFn = func(_ context.Context, _, _ uuid.UUID, _ int) ([]domain.AvailabilityRule, error) {
					return nil, nil
				}
			},
			setupBook: func(m *mockBookingRepository) {},
			wantMin:   0,
			wantErr:   nil,
		},
		{
			name: "with rules and no conflicts generates slots",
			params: domain.SlotParams{
				EventTypeID: etID, From: dayStart, To: dayEnd, Timezone: "UTC",
			},
			setupET: func(m *mockPublicEventTypeRepository) {
				m.GetActiveByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.EventType, error) {
					return baseET, nil
				}
			},
			setupAvail: func(m *mockAvailabilityRepository) {
				m.ListOverridesByUserAndDateFn = func(_ context.Context, _, _ uuid.UUID, _ string) ([]domain.AvailabilityOverride, error) {
					return nil, nil
				}
				m.ListRulesByUserAndDayFn = func(_ context.Context, _, _ uuid.UUID, _ int) ([]domain.AvailabilityRule, error) {
					return []domain.AvailabilityRule{
						{StartTime: "09:00:00", EndTime: "12:00:00"},
					}, nil
				}
			},
			setupBook: func(m *mockBookingRepository) {},
			wantMin:   3,
			wantErr:   nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pubETRepo := &mockPublicEventTypeRepository{}
			availRepo := &mockAvailabilityRepository{}
			bookingRepo := &mockBookingRepository{}

			tt.setupET(pubETRepo)
			tt.setupAvail(availRepo)
			tt.setupBook(bookingRepo)

			svc := NewAvailabilityService(availRepo, &mockEventTypeRepository{}, bookingRepo, pubETRepo, nil)
			slots, err := svc.GetAvailableSlots(context.Background(), tt.params)

			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected %v, got nil", tt.wantErr)
				}
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("expected %v, got %v", tt.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(slots) < tt.wantMin {
				t.Errorf("expected at least %d slots, got %d", tt.wantMin, len(slots))
			}
			for _, s := range slots {
				dur := s.End.Sub(s.Start)
				if dur != 30*time.Minute {
					t.Errorf("expected 30min slot, got %v", dur)
				}
			}
		})
	}
}
