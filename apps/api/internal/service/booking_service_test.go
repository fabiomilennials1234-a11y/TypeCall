package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
)

func TestBookingService_Create(t *testing.T) {
	orgID := uuid.New()
	userID := uuid.New()
	etID := uuid.New()
	futureStart := time.Now().Add(48 * time.Hour).UTC()

	activeET := &domain.EventType{
		ID: etID, OrganizationID: orgID, UserID: userID,
		Title: "Discovery Call", DurationMinutes: 30,
		LocationType: domain.LocationGoogleMeet, IsActive: true,
	}

	tests := []struct {
		name      string
		input     domain.CreateBookingInput
		setupET   func(*mockPublicEventTypeRepository)
		setupBook func(*mockBookingRepository)
		wantErr   error
	}{
		{
			name: "happy path",
			input: domain.CreateBookingInput{
				EventTypeID: etID, AttendeeName: "John",
				AttendeeEmail: "john@example.com", StartTime: futureStart,
			},
			setupET: func(m *mockPublicEventTypeRepository) {
				m.GetActiveByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.EventType, error) {
					return activeET, nil
				}
			},
			setupBook: func(m *mockBookingRepository) {},
			wantErr:   nil,
		},
		{
			name: "event type not found",
			input: domain.CreateBookingInput{
				EventTypeID: uuid.New(), AttendeeName: "John",
				AttendeeEmail: "john@example.com", StartTime: futureStart,
			},
			setupET: func(m *mockPublicEventTypeRepository) {
				m.GetActiveByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.EventType, error) {
					return nil, nil
				}
			},
			setupBook: func(m *mockBookingRepository) {},
			wantErr:   ErrEventTypeNotFound,
		},
		{
			name: "slot conflict",
			input: domain.CreateBookingInput{
				EventTypeID: etID, AttendeeName: "John",
				AttendeeEmail: "john@example.com", StartTime: futureStart,
			},
			setupET: func(m *mockPublicEventTypeRepository) {
				m.GetActiveByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.EventType, error) {
					return activeET, nil
				}
			},
			setupBook: func(m *mockBookingRepository) {
				m.CheckConflictFn = func(_ context.Context, _ uuid.UUID, _, _ time.Time) (bool, error) {
					return true, nil
				}
			},
			wantErr: ErrSlotConflict,
		},
		{
			name: "booking in the past",
			input: domain.CreateBookingInput{
				EventTypeID: etID, AttendeeName: "John",
				AttendeeEmail: "john@example.com",
				StartTime:     time.Now().Add(-1 * time.Hour).UTC(),
			},
			setupET: func(m *mockPublicEventTypeRepository) {
				m.GetActiveByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.EventType, error) {
					return activeET, nil
				}
			},
			setupBook: func(m *mockBookingRepository) {},
			wantErr:   ErrBookingPast,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pubETRepo := &mockPublicEventTypeRepository{}
			bookingRepo := &mockBookingRepository{}
			webhookSvc := &mockWebhookService{}

			tt.setupET(pubETRepo)
			tt.setupBook(bookingRepo)

			svc := NewBookingService(bookingRepo, pubETRepo, &mockUserRepository{}, webhookSvc, nil)
			booking, err := svc.Create(context.Background(), tt.input)

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
			if booking == nil {
				t.Fatal("expected booking, got nil")
			}
			if booking.Status != domain.BookingStatusConfirmed {
				t.Errorf("expected status confirmed, got %s", booking.Status)
			}
			if booking.CancelToken == "" {
				t.Error("expected cancel token to be generated")
			}
			if booking.RescheduleToken == "" {
				t.Error("expected reschedule token to be generated")
			}
			if booking.AttendeeName != "John" {
				t.Errorf("expected attendee John, got %s", booking.AttendeeName)
			}
			endExpected := futureStart.Add(30 * time.Minute)
			if !booking.EndTime.Equal(endExpected) {
				t.Errorf("expected end time %v, got %v", endExpected, booking.EndTime)
			}
		})
	}
}

func TestBookingService_Cancel(t *testing.T) {
	bookingID := uuid.New()

	tests := []struct {
		name      string
		setupBook func(*mockBookingRepository)
		wantErr   error
	}{
		{
			name: "happy path",
			setupBook: func(m *mockBookingRepository) {
				m.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.Booking, error) {
					return &domain.Booking{ID: bookingID, Status: domain.BookingStatusConfirmed}, nil
				}
			},
			wantErr: nil,
		},
		{
			name: "not found",
			setupBook: func(m *mockBookingRepository) {
				m.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.Booking, error) {
					return nil, nil
				}
			},
			wantErr: ErrBookingNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bookingRepo := &mockBookingRepository{}
			tt.setupBook(bookingRepo)

			svc := NewBookingService(bookingRepo, &mockPublicEventTypeRepository{}, &mockUserRepository{}, &mockWebhookService{}, nil)
			err := svc.Cancel(context.Background(), bookingID, nil)

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

func TestBookingService_CancelByToken(t *testing.T) {
	bookingID := uuid.New()

	tests := []struct {
		name      string
		token     string
		setupBook func(*mockBookingRepository)
		wantErr   error
	}{
		{
			name:  "happy path",
			token: "valid-cancel-token",
			setupBook: func(m *mockBookingRepository) {
				m.GetByCancelTokenFn = func(_ context.Context, _ string) (*domain.Booking, error) {
					return &domain.Booking{ID: bookingID, Status: domain.BookingStatusConfirmed}, nil
				}
			},
			wantErr: nil,
		},
		{
			name:  "token not found",
			token: "invalid-token",
			setupBook: func(m *mockBookingRepository) {
				m.GetByCancelTokenFn = func(_ context.Context, _ string) (*domain.Booking, error) {
					return nil, nil
				}
			},
			wantErr: ErrBookingNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bookingRepo := &mockBookingRepository{}
			tt.setupBook(bookingRepo)

			svc := NewBookingService(bookingRepo, &mockPublicEventTypeRepository{}, &mockUserRepository{}, &mockWebhookService{}, nil)
			err := svc.CancelByToken(context.Background(), tt.token, nil)

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
