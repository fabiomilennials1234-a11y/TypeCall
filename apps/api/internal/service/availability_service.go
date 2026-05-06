package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

var (
	ErrOverrideNotFound = errors.New("availability override not found")
)

type AvailabilityService interface {
	GetRules(ctx context.Context, eventTypeID uuid.UUID) ([]domain.AvailabilityRule, error)
	SetRules(ctx context.Context, eventTypeID uuid.UUID, userID uuid.UUID, input domain.SetAvailabilityInput) ([]domain.AvailabilityRule, error)
	GetOverrides(ctx context.Context, eventTypeID uuid.UUID) ([]domain.AvailabilityOverride, error)
	CreateOverride(ctx context.Context, eventTypeID uuid.UUID, userID uuid.UUID, input domain.CreateOverrideInput) (*domain.AvailabilityOverride, error)
	DeleteOverride(ctx context.Context, id uuid.UUID) error
	GetAvailableSlots(ctx context.Context, params domain.SlotParams) ([]domain.TimeSlot, error)
}

type availabilityService struct {
	availRepo   repository.AvailabilityRepository
	etRepo      repository.EventTypeRepository
	bookingRepo repository.BookingRepository
	pubETRepo   repository.PublicEventTypeRepository
}

func NewAvailabilityService(
	availRepo repository.AvailabilityRepository,
	etRepo repository.EventTypeRepository,
	bookingRepo repository.BookingRepository,
	pubETRepo repository.PublicEventTypeRepository,
) AvailabilityService {
	return &availabilityService{
		availRepo:   availRepo,
		etRepo:      etRepo,
		bookingRepo: bookingRepo,
		pubETRepo:   pubETRepo,
	}
}

func (s *availabilityService) GetRules(ctx context.Context, eventTypeID uuid.UUID) ([]domain.AvailabilityRule, error) {
	rules, err := s.availRepo.ListRules(ctx, eventTypeID)
	if err != nil {
		return nil, fmt.Errorf("AvailabilityService.GetRules: %w", err)
	}
	return rules, nil
}

func (s *availabilityService) SetRules(ctx context.Context, eventTypeID uuid.UUID, userID uuid.UUID, input domain.SetAvailabilityInput) ([]domain.AvailabilityRule, error) {
	rules := make([]domain.AvailabilityRule, 0, len(input.Rules))
	for _, ri := range input.Rules {
		rules = append(rules, domain.AvailabilityRule{
			ID:          uuid.New(),
			EventTypeID: eventTypeID,
			UserID:      userID,
			DayOfWeek:   ri.DayOfWeek,
			StartTime:   ri.StartTime,
			EndTime:     ri.EndTime,
		})
	}

	if err := s.availRepo.ReplaceRules(ctx, eventTypeID, userID, rules); err != nil {
		return nil, fmt.Errorf("AvailabilityService.SetRules: %w", err)
	}

	return s.availRepo.ListRules(ctx, eventTypeID)
}

func (s *availabilityService) GetOverrides(ctx context.Context, eventTypeID uuid.UUID) ([]domain.AvailabilityOverride, error) {
	overrides, err := s.availRepo.ListOverrides(ctx, eventTypeID)
	if err != nil {
		return nil, fmt.Errorf("AvailabilityService.GetOverrides: %w", err)
	}
	return overrides, nil
}

func (s *availabilityService) CreateOverride(ctx context.Context, eventTypeID uuid.UUID, userID uuid.UUID, input domain.CreateOverrideInput) (*domain.AvailabilityOverride, error) {
	o := &domain.AvailabilityOverride{
		ID:          uuid.New(),
		EventTypeID: eventTypeID,
		UserID:      userID,
		Date:        input.Date,
		IsAvailable: input.IsAvailable,
		StartTime:   input.StartTime,
		EndTime:     input.EndTime,
		Reason:      input.Reason,
	}

	if err := s.availRepo.CreateOverride(ctx, o); err != nil {
		return nil, fmt.Errorf("AvailabilityService.CreateOverride: %w", err)
	}

	return o, nil
}

func (s *availabilityService) DeleteOverride(ctx context.Context, id uuid.UUID) error {
	o, err := s.availRepo.GetOverrideByID(ctx, id)
	if err != nil {
		return fmt.Errorf("AvailabilityService.DeleteOverride: %w", err)
	}
	if o == nil {
		return ErrOverrideNotFound
	}

	if err := s.availRepo.DeleteOverride(ctx, id); err != nil {
		return fmt.Errorf("AvailabilityService.DeleteOverride: %w", err)
	}
	return nil
}

func (s *availabilityService) GetAvailableSlots(ctx context.Context, params domain.SlotParams) ([]domain.TimeSlot, error) {
	et, err := s.pubETRepo.GetActiveByID(ctx, params.EventTypeID)
	if err != nil {
		return nil, fmt.Errorf("AvailabilityService.GetAvailableSlots: %w", err)
	}
	if et == nil {
		return nil, ErrEventTypeNotFound
	}

	loc, err := time.LoadLocation(params.Timezone)
	if err != nil {
		loc = time.UTC
	}

	now := time.Now().UTC()
	minStart := now.Add(time.Duration(et.MinNoticeHours) * time.Hour)
	maxEnd := now.AddDate(0, 0, et.MaxAdvanceDays)

	from := params.From.UTC()
	to := params.To.UTC()

	if from.Before(minStart) {
		from = minStart
	}
	if to.After(maxEnd) {
		to = maxEnd
	}
	if from.After(to) {
		return []domain.TimeSlot{}, nil
	}

	hostID := et.UserID
	duration := time.Duration(et.DurationMinutes) * time.Minute
	bufferBefore := time.Duration(et.BufferBeforeMinutes) * time.Minute
	bufferAfter := time.Duration(et.BufferAfterMinutes) * time.Minute

	existingBookings, err := s.bookingRepo.ListByHostAndRange(ctx, hostID, from, to)
	if err != nil {
		return nil, fmt.Errorf("AvailabilityService.GetAvailableSlots: list bookings: %w", err)
	}

	var slots []domain.TimeSlot

	current := time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, loc)
	endDay := time.Date(to.Year(), to.Month(), to.Day(), 23, 59, 59, 0, loc)

	for current.Before(endDay) {
		dayOfWeek := int(current.Weekday())
		dateStr := current.Format("2006-01-02")

		overrides, err := s.availRepo.ListOverridesByUserAndDate(ctx, hostID, et.ID, dateStr)
		if err != nil {
			return nil, fmt.Errorf("AvailabilityService.GetAvailableSlots: overrides: %w", err)
		}

		var windows []timeWindow

		if len(overrides) > 0 {
			for _, o := range overrides {
				if !o.IsAvailable {
					windows = nil
					break
				}
				if o.StartTime != nil && o.EndTime != nil {
					start, _ := time.Parse("15:04:05", *o.StartTime)
					end, _ := time.Parse("15:04:05", *o.EndTime)
					ws := time.Date(current.Year(), current.Month(), current.Day(), start.Hour(), start.Minute(), 0, 0, loc).UTC()
					we := time.Date(current.Year(), current.Month(), current.Day(), end.Hour(), end.Minute(), 0, 0, loc).UTC()
					windows = append(windows, timeWindow{start: ws, end: we})
				}
			}
		} else {
			rules, err := s.availRepo.ListRulesByUserAndDay(ctx, hostID, et.ID, dayOfWeek)
			if err != nil {
				return nil, fmt.Errorf("AvailabilityService.GetAvailableSlots: rules: %w", err)
			}
			for _, rule := range rules {
				start, _ := time.Parse("15:04:05", rule.StartTime)
				end, _ := time.Parse("15:04:05", rule.EndTime)
				ws := time.Date(current.Year(), current.Month(), current.Day(), start.Hour(), start.Minute(), 0, 0, loc).UTC()
				we := time.Date(current.Year(), current.Month(), current.Day(), end.Hour(), end.Minute(), 0, 0, loc).UTC()
				windows = append(windows, timeWindow{start: ws, end: we})
			}
		}

		if et.MaxPerDay != nil {
			dayUTC := current.UTC()
			count, err := s.bookingRepo.CountByHostAndDate(ctx, hostID, dayUTC)
			if err != nil {
				return nil, fmt.Errorf("AvailabilityService.GetAvailableSlots: count: %w", err)
			}
			if count >= *et.MaxPerDay {
				current = current.AddDate(0, 0, 1)
				continue
			}
		}

		for _, w := range windows {
			slotStart := w.start
			for slotStart.Add(duration).Before(w.end) || slotStart.Add(duration).Equal(w.end) {
				slotEnd := slotStart.Add(duration)

				if slotStart.Before(minStart) {
					slotStart = slotStart.Add(15 * time.Minute)
					continue
				}

				if hasConflict(slotStart, slotEnd, bufferBefore, bufferAfter, existingBookings) {
					slotStart = slotStart.Add(15 * time.Minute)
					continue
				}

				slots = append(slots, domain.TimeSlot{
					Start:  slotStart,
					End:    slotEnd,
					HostID: hostID,
				})

				slotStart = slotStart.Add(15 * time.Minute)
			}
		}

		current = current.AddDate(0, 0, 1)
	}

	return slots, nil
}

type timeWindow struct {
	start time.Time
	end   time.Time
}

func hasConflict(start, end time.Time, bufferBefore, bufferAfter time.Duration, bookings []domain.Booking) bool {
	bufferedStart := start.Add(-bufferBefore)
	bufferedEnd := end.Add(bufferAfter)

	for _, b := range bookings {
		if bufferedStart.Before(b.EndTime) && bufferedEnd.After(b.StartTime) {
			return true
		}
	}
	return false
}
