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
	"github.com/rs/zerolog/log"

	"github.com/typecall/api/internal/db"
	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/integration/gcal"
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
	pool        *pgxpool.Pool
	publicForm  repository.PublicFormRepository
	sellersSvc  sellers.Service
	bookingRepo repository.BookingRepository
	userRepo    repository.UserRepository
	gcal        gcal.Provider
}

func NewService(
	pool *pgxpool.Pool,
	publicForm repository.PublicFormRepository,
	sellersSvc sellers.Service,
	bookingRepo repository.BookingRepository,
	userRepo repository.UserRepository,
	gcalProvider gcal.Provider,
) Service {
	return &service_{
		pool:        pool,
		publicForm:  publicForm,
		sellersSvc:  sellersSvc,
		bookingRepo: bookingRepo,
		userRepo:    userRepo,
		gcal:        gcalProvider,
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
	tzIn := input.Timezone
	if tzIn == "" {
		tzIn = "America/Sao_Paulo"
	}
	err = db.WithTenantTx(ctx, s.pool, form.OrganizationID, func(txCtx context.Context) error {
		seller, err := s.sellersSvc.PickSellerForSlot(txCtx, form.OrganizationID, input.Tag, input.StartTime, tzIn)
		if err != nil {
			return fmt.Errorf("pick seller: %w", err)
		}
		if seller == nil {
			return ErrSlotUnavailable
		}

		end := input.StartTime.Add(time.Duration(seller.MeetingDurationMinutes) * time.Minute)
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
			Timezone:       tzIn,
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

		s.syncToGoogleCalendar(txCtx, booking, seller)

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

// syncToGoogleCalendar dispara CreateEvent na agenda do host (seller.user_id).
// Soft-fail: booking persiste sem meeting_url se sync falhar.
func (s *service_) syncToGoogleCalendar(ctx context.Context, b *domain.Booking, seller *domain.Seller) {
	if s.gcal == nil || s.userRepo == nil || seller.UserID == uuid.Nil {
		return
	}
	hostID := seller.UserID

	host, err := s.userRepo.GetByID(ctx, hostID)
	if err != nil || host == nil {
		log.Warn().Err(err).Str("booking_id", b.ID.String()).Msg("publicschedule gcal sync: failed to load host")
		return
	}

	connected, err := s.gcal.IsConnected(ctx, hostID)
	if err != nil || !connected {
		return
	}

	out, err := s.gcal.CreateEvent(ctx, hostID, gcal.EventInput{
		Summary:       fmt.Sprintf("Reuniao com %s", b.AttendeeName),
		Description:   fmt.Sprintf("Lead: %s\nEmail: %s\nTelefone: %s", b.AttendeeName, b.AttendeeEmail, derefPhone(b.AttendeePhone)),
		Start:         b.StartTime,
		End:           b.EndTime,
		Timezone:      b.Timezone,
		HostEmail:     host.Email,
		AttendeeEmail: b.AttendeeEmail,
		AttendeeName:  b.AttendeeName,
		BookingID:     b.ID,
	})
	if err != nil {
		log.Warn().Err(err).Str("booking_id", b.ID.String()).Msg("publicschedule gcal sync: CreateEvent failed")
		return
	}

	if err := s.bookingRepo.SetGoogleEvent(ctx, b.ID, out.GoogleEventID, out.MeetingURL); err != nil {
		log.Error().Err(err).Str("booking_id", b.ID.String()).Msg("publicschedule gcal sync: persisted event but failed to save IDs")
		return
	}
	gid := out.GoogleEventID
	url := out.MeetingURL
	b.GoogleEventID = &gid
	b.MeetingURL = &url
}

func derefPhone(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func setBookingSeller(ctx context.Context, pool *pgxpool.Pool, bookingID, sellerID uuid.UUID) error {
	conn := db.Conn(ctx, pool)
	_, err := conn.Exec(ctx, `UPDATE bookings SET seller_id = $1 WHERE id = $2`, sellerID, bookingID)
	return err
}
