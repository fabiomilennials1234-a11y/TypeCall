package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

var (
	ErrBookingNotFound = errors.New("booking not found")
	ErrSlotConflict    = errors.New("time slot is no longer available")
	ErrBookingPast     = errors.New("cannot book in the past")
)

type BookingService interface {
	Create(ctx context.Context, input domain.CreateBookingInput) (*domain.Booking, error)
	Get(ctx context.Context, id uuid.UUID) (*domain.Booking, error)
	List(ctx context.Context, params domain.ListBookingsParams) (*domain.ListBookingsResult, error)
	Cancel(ctx context.Context, id uuid.UUID, reason *string) error
	GetByCancelToken(ctx context.Context, token string) (*domain.Booking, error)
	CancelByToken(ctx context.Context, token string, reason *string) error
}

type bookingService struct {
	bookingRepo repository.BookingRepository
	pubETRepo   repository.PublicEventTypeRepository
}

func NewBookingService(
	bookingRepo repository.BookingRepository,
	pubETRepo repository.PublicEventTypeRepository,
) BookingService {
	return &bookingService{
		bookingRepo: bookingRepo,
		pubETRepo:   pubETRepo,
	}
}

func (s *bookingService) Create(ctx context.Context, input domain.CreateBookingInput) (*domain.Booking, error) {
	et, err := s.pubETRepo.GetActiveByID(ctx, input.EventTypeID)
	if err != nil {
		return nil, fmt.Errorf("BookingService.Create: %w", err)
	}
	if et == nil {
		return nil, ErrEventTypeNotFound
	}

	start := input.StartTime.UTC()
	end := start.Add(time.Duration(et.DurationMinutes) * time.Minute)

	if start.Before(time.Now().UTC()) {
		return nil, ErrBookingPast
	}

	conflict, err := s.bookingRepo.CheckConflict(ctx, et.UserID, start, end)
	if err != nil {
		return nil, fmt.Errorf("BookingService.Create: check conflict: %w", err)
	}
	if conflict {
		return nil, ErrSlotConflict
	}

	cancelToken, err := generateToken()
	if err != nil {
		return nil, fmt.Errorf("BookingService.Create: generate cancel token: %w", err)
	}
	rescheduleToken, err := generateToken()
	if err != nil {
		return nil, fmt.Errorf("BookingService.Create: generate reschedule token: %w", err)
	}

	tz := input.Timezone
	if tz == "" {
		tz = "America/Sao_Paulo"
	}

	now := time.Now()
	booking := &domain.Booking{
		ID:              uuid.New(),
		OrganizationID:  et.OrganizationID,
		EventTypeID:     et.ID,
		HostUserID:      et.UserID,
		ResponseID:      input.ResponseID,
		AttendeeName:    input.AttendeeName,
		AttendeeEmail:   input.AttendeeEmail,
		AttendeePhone:   input.AttendeePhone,
		StartTime:       start,
		EndTime:         end,
		Timezone:        tz,
		Status:          domain.BookingStatusConfirmed,
		LocationType:    et.LocationType,
		LocationValue:   et.LocationValue,
		CancelToken:     cancelToken,
		RescheduleToken: rescheduleToken,
		Notes:           input.Notes,
		Metadata:        json.RawMessage(`{}`),
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if err := s.bookingRepo.Create(ctx, booking); err != nil {
		return nil, fmt.Errorf("BookingService.Create: %w", err)
	}

	return booking, nil
}

func (s *bookingService) Get(ctx context.Context, id uuid.UUID) (*domain.Booking, error) {
	b, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("BookingService.Get: %w", err)
	}
	if b == nil {
		return nil, ErrBookingNotFound
	}
	return b, nil
}

func (s *bookingService) List(ctx context.Context, params domain.ListBookingsParams) (*domain.ListBookingsResult, error) {
	result, err := s.bookingRepo.List(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("BookingService.List: %w", err)
	}
	return result, nil
}

func (s *bookingService) Cancel(ctx context.Context, id uuid.UUID, reason *string) error {
	b, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("BookingService.Cancel: %w", err)
	}
	if b == nil {
		return ErrBookingNotFound
	}

	if err := s.bookingRepo.Cancel(ctx, id, reason); err != nil {
		return fmt.Errorf("BookingService.Cancel: %w", err)
	}
	return nil
}

func (s *bookingService) GetByCancelToken(ctx context.Context, token string) (*domain.Booking, error) {
	b, err := s.bookingRepo.GetByCancelToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("BookingService.GetByCancelToken: %w", err)
	}
	if b == nil {
		return nil, ErrBookingNotFound
	}
	return b, nil
}

func (s *bookingService) CancelByToken(ctx context.Context, token string, reason *string) error {
	b, err := s.bookingRepo.GetByCancelToken(ctx, token)
	if err != nil {
		return fmt.Errorf("BookingService.CancelByToken: %w", err)
	}
	if b == nil {
		return ErrBookingNotFound
	}

	if err := s.bookingRepo.Cancel(ctx, b.ID, reason); err != nil {
		return fmt.Errorf("BookingService.CancelByToken: %w", err)
	}
	return nil
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
