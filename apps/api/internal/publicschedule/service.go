// Package publicschedule expoe endpoints publicos pra schedule step do form
// runner com agregacao multi-vendedor + round-robin atomico por rank.
package publicschedule

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/typecall/api/internal/db"
	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
	"github.com/typecall/api/internal/sellers"
)

var (
	ErrFormNotFound  = errors.New("form not found")
	ErrInvalidTag    = errors.New("invalid tag")
	ErrSlotUnavailable = errors.New("slot unavailable")
	ErrNoSellerForTag = errors.New("no seller covers this tag")
)

var validTags = map[string]bool{
	"diamond":      true,
	"gold":         true,
	"silver":       true,
	"bronze":       true,
	"disqualified": true,
}

type Service interface {
	GetSlots(ctx context.Context, slug, tag string, date time.Time, tz string) ([]domain.SellerSlot, error)
	BookSlot(ctx context.Context, input BookSlotInput) (*BookSlotOutput, error)
}

type service_ struct {
	pool       *pgxpool.Pool
	publicForm repository.PublicFormRepository
	sellersSvc sellers.Service
	bookingRepo repository.BookingRepository
}

func NewService(
	pool *pgxpool.Pool,
	publicForm repository.PublicFormRepository,
	sellersSvc sellers.Service,
	bookingRepo repository.BookingRepository,
) Service {
	return &service_{
		pool:        pool,
		publicForm:  publicForm,
		sellersSvc:  sellersSvc,
		bookingRepo: bookingRepo,
	}
}

func (s *service_) GetSlots(ctx context.Context, slug, tag string, date time.Time, tz string) ([]domain.SellerSlot, error) {
	if !validTags[tag] {
		return nil, ErrInvalidTag
	}
	form, err := s.publicForm.GetPublishedBySlug(ctx, slug)
	if err != nil {
		return nil, fmt.Errorf("publicschedule.Service.GetSlots: form: %w", err)
	}
	if form == nil {
		return nil, ErrFormNotFound
	}

	var slots []domain.SellerSlot
	err = db.WithTenantTx(ctx, s.pool, form.OrganizationID, func(txCtx context.Context) error {
		var inner error
		slots, inner = s.sellersSvc.GetAggregatedSlotsForTag(txCtx, form.OrganizationID, tag, date, tz)
		return inner
	})
	if err != nil {
		return nil, fmt.Errorf("publicschedule.Service.GetSlots: %w", err)
	}
	return slots, nil
}

type BookSlotInput struct {
	FormSlug      string    `json:"form_slug"`
	Tag           string    `json:"tag"`
	StartTime     time.Time `json:"start_time"`
	Timezone      string    `json:"timezone"`
	AttendeeName  string    `json:"attendee_name"`
	AttendeeEmail string    `json:"attendee_email"`
	AttendeePhone string    `json:"attendee_phone"`
	ResponseID    *uuid.UUID `json:"response_id,omitempty"`
}

type BookSlotOutput struct {
	BookingID   uuid.UUID `json:"booking_id"`
	SellerID    uuid.UUID `json:"seller_id"`
	SellerName  string    `json:"seller_name"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
}

func (s *service_) BookSlot(ctx context.Context, input BookSlotInput) (*BookSlotOutput, error) {
	if !validTags[input.Tag] {
		return nil, ErrInvalidTag
	}
	form, err := s.publicForm.GetPublishedBySlug(ctx, input.FormSlug)
	if err != nil {
		return nil, fmt.Errorf("publicschedule.Service.BookSlot: form: %w", err)
	}
	if form == nil {
		return nil, ErrFormNotFound
	}

	var out *BookSlotOutput
	err = db.WithTenantTx(ctx, s.pool, form.OrganizationID, func(txCtx context.Context) error {
		seller, err := s.sellersSvc.PickSellerForSlot(txCtx, form.OrganizationID, input.Tag, input.StartTime)
		if err != nil {
			return fmt.Errorf("pick seller: %w", err)
		}
		if seller == nil {
			return ErrSlotUnavailable
		}

		end := input.StartTime.Add(time.Duration(seller.MeetingDurationMinutes) * time.Minute)
		tz := input.Timezone
		if tz == "" {
			tz = "America/Sao_Paulo"
		}
		booking := &domain.Booking{
			ID:             uuid.New(),
			OrganizationID: form.OrganizationID,
			EventTypeID:    nil,
			HostUserID:     seller.UserID,
			ResponseID:     input.ResponseID,
			AttendeeName:   input.AttendeeName,
			AttendeeEmail:  input.AttendeeEmail,
			StartTime:      input.StartTime,
			EndTime:        end,
			Timezone:       tz,
			Status:          domain.BookingStatusConfirmed,
			LocationType:    mapSellerToBookingLocation(seller.LocationType),
			Metadata:        json.RawMessage(`{}`),
			CancelToken:     uuid.NewString(),
			RescheduleToken: uuid.NewString(),
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}
		if input.AttendeePhone != "" {
			p := input.AttendeePhone
			booking.AttendeePhone = &p
		}
		// Vincula seller_id em bookings via UPDATE pos-create (coluna ja existe).
		if err := s.bookingRepo.Create(txCtx, booking); err != nil {
			return fmt.Errorf("create booking: %w", err)
		}
		if err := setBookingSeller(txCtx, s.pool, booking.ID, seller.ID); err != nil {
			return fmt.Errorf("set seller_id: %w", err)
		}

		out = &BookSlotOutput{
			BookingID:  booking.ID,
			SellerID:   seller.ID,
			SellerName: seller.Name,
			StartTime:  booking.StartTime,
			EndTime:    booking.EndTime,
		}
		return nil
	})

	if err != nil {
		if errors.Is(err, ErrSlotUnavailable) {
			return nil, err
		}
		return nil, fmt.Errorf("publicschedule.Service.BookSlot: %w", err)
	}
	return out, nil
}

// mapSellerToBookingLocation converte enum seller_location_type → location_type
// usado em bookings (definido em migration 0004).
func mapSellerToBookingLocation(s domain.SellerLocationType) domain.LocationType {
	switch s {
	case domain.SellerLocationOnline:
		return domain.LocationGoogleMeet
	case domain.SellerLocationWhatsapp:
		return domain.LocationCustomURL
	case domain.SellerLocationPresencial:
		return domain.LocationInPerson
	default:
		return domain.LocationGoogleMeet
	}
}

func setBookingSeller(ctx context.Context, pool *pgxpool.Pool, bookingID, sellerID uuid.UUID) error {
	conn := db.Conn(ctx, pool)
	_, err := conn.Exec(ctx, `UPDATE bookings SET seller_id = $1 WHERE id = $2`, sellerID, bookingID)
	return err
}
