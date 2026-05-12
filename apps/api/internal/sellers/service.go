package sellers

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
)

var ErrInvalidDate = errors.New("invalid date")

// BookingChecker exposes only the booking lookup needed by the slot calculator.
// Implementacao real fica no booking_repository existente.
type BookingChecker interface {
	ListByHostAndRange(ctx context.Context, hostUserID uuid.UUID, start, end time.Time) ([]domain.Booking, error)
	ListBySellerAndRange(ctx context.Context, sellerID uuid.UUID, start, end time.Time) ([]domain.Booking, error)
}

type Service interface {
	Create(ctx context.Context, orgID uuid.UUID, input domain.CreateSellerInput) (*domain.Seller, error)
	CreateDefaultForOwner(ctx context.Context, userID, orgID uuid.UUID, name string) (*domain.Seller, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Seller, error)
	List(ctx context.Context, orgID uuid.UUID, activeOnly bool) ([]domain.Seller, error)
	ListByTag(ctx context.Context, orgID uuid.UUID, tag string) ([]domain.Seller, error)
	Update(ctx context.Context, id uuid.UUID, input domain.UpdateSellerInput) (*domain.Seller, error)

	GetAvailability(ctx context.Context, sellerID uuid.UUID) ([]domain.SellerAvailability, error)
	SetAvailability(ctx context.Context, sellerID, orgID uuid.UUID, input domain.SetSellerAvailabilityInput) ([]domain.SellerAvailability, error)

	CreateGoal(ctx context.Context, sellerID, orgID uuid.UUID, input domain.CreateSellerGoalInput) (*domain.SellerGoal, error)
	ListGoals(ctx context.Context, sellerID uuid.UUID) ([]domain.SellerGoal, error)

	GetAvailableSlots(ctx context.Context, sellerID uuid.UUID, date time.Time, tz string) ([]domain.SellerSlot, error)
	GetAggregatedSlotsForTag(ctx context.Context, orgID uuid.UUID, tag string, date time.Time, tz string) ([]domain.SellerSlot, error)
	PickSellerForSlot(ctx context.Context, orgID uuid.UUID, tag string, slotStart time.Time, tz string) (*domain.Seller, error)
}

type service struct {
	repo     Repository
	bookings BookingChecker
}

func NewService(repo Repository, bookings BookingChecker) Service {
	return &service{repo: repo, bookings: bookings}
}

func (s *service) Create(ctx context.Context, orgID uuid.UUID, input domain.CreateSellerInput) (*domain.Seller, error) {
	if input.MeetingDurationMinutes <= 0 {
		input.MeetingDurationMinutes = 30
	}
	if input.BufferAfterMinutes < 0 {
		input.BufferAfterMinutes = 0
	}
	if input.LocationType == "" {
		input.LocationType = domain.SellerLocationOnline
	}
	tags := input.AllowedTags
	if tags == nil {
		tags = []string{"diamond", "gold", "silver", "bronze"}
	}
	seller := &domain.Seller{
		ID:                     uuid.New(),
		UserID:                 input.UserID,
		OrganizationID:         orgID,
		Name:                   input.Name,
		MeetingDurationMinutes: input.MeetingDurationMinutes,
		BufferAfterMinutes:     input.BufferAfterMinutes,
		LocationType:           input.LocationType,
		AllowedTags:            tags,
		Active:                 true,
	}
	if err := s.repo.Create(ctx, seller); err != nil {
		return nil, fmt.Errorf("sellers.Service.Create: %w", err)
	}
	return seller, nil
}

// CreateDefaultForOwner cria seller baseline com availability Seg-Sex 09-18.
// Idempotente: se seller para o user_id ja existe na org, retorna o existente.
func (s *service) CreateDefaultForOwner(ctx context.Context, userID, orgID uuid.UUID, name string) (*domain.Seller, error) {
	existing, err := s.repo.GetByUser(ctx, userID, orgID)
	if err != nil && !errors.Is(err, ErrSellerNotFound) {
		return nil, fmt.Errorf("sellers.Service.CreateDefaultForOwner: lookup: %w", err)
	}
	if existing != nil {
		return existing, nil
	}

	seller := &domain.Seller{
		ID:                     uuid.New(),
		UserID:                 userID,
		OrganizationID:         orgID,
		Name:                   name,
		MeetingDurationMinutes: 30,
		BufferAfterMinutes:     15,
		LocationType:           domain.SellerLocationOnline,
		AllowedTags:            []string{"diamond", "gold", "silver", "bronze"},
		Active:                 true,
	}
	if err := s.repo.Create(ctx, seller); err != nil {
		return nil, fmt.Errorf("sellers.Service.CreateDefaultForOwner: create: %w", err)
	}

	slots := make([]domain.SellerAvailability, 0, 5)
	for dow := 1; dow <= 5; dow++ {
		slots = append(slots, domain.SellerAvailability{
			SellerID:       seller.ID,
			OrganizationID: orgID,
			DayOfWeek:      dow,
			StartTime:      "09:00:00",
			EndTime:        "18:00:00",
		})
	}
	if err := s.repo.ReplaceAvailability(ctx, seller.ID, orgID, slots); err != nil {
		return nil, fmt.Errorf("sellers.Service.CreateDefaultForOwner: availability: %w", err)
	}

	return seller, nil
}

func (s *service) GetByID(ctx context.Context, id uuid.UUID) (*domain.Seller, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *service) List(ctx context.Context, orgID uuid.UUID, activeOnly bool) ([]domain.Seller, error) {
	return s.repo.List(ctx, orgID, activeOnly)
}

func (s *service) ListByTag(ctx context.Context, orgID uuid.UUID, tag string) ([]domain.Seller, error) {
	return s.repo.ListByTag(ctx, orgID, tag)
}

func (s *service) Update(ctx context.Context, id uuid.UUID, input domain.UpdateSellerInput) (*domain.Seller, error) {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if input.Name != nil {
		current.Name = *input.Name
	}
	if input.MeetingDurationMinutes != nil {
		current.MeetingDurationMinutes = *input.MeetingDurationMinutes
	}
	if input.BufferAfterMinutes != nil {
		current.BufferAfterMinutes = *input.BufferAfterMinutes
	}
	if input.LocationType != nil {
		current.LocationType = *input.LocationType
	}
	if input.Active != nil {
		current.Active = *input.Active
	}
	if input.AllowedTags != nil {
		current.AllowedTags = *input.AllowedTags
	}
	if err := s.repo.Update(ctx, current); err != nil {
		return nil, err
	}
	return current, nil
}

func (s *service) GetAvailability(ctx context.Context, sellerID uuid.UUID) ([]domain.SellerAvailability, error) {
	return s.repo.ListAvailability(ctx, sellerID)
}

func (s *service) SetAvailability(ctx context.Context, sellerID, orgID uuid.UUID, input domain.SetSellerAvailabilityInput) ([]domain.SellerAvailability, error) {
	slots := make([]domain.SellerAvailability, 0, len(input.Slots))
	for _, in := range input.Slots {
		if in.DayOfWeek < 0 || in.DayOfWeek > 6 {
			return nil, fmt.Errorf("sellers.Service.SetAvailability: invalid day_of_week %d", in.DayOfWeek)
		}
		slots = append(slots, domain.SellerAvailability{
			SellerID:       sellerID,
			OrganizationID: orgID,
			DayOfWeek:      in.DayOfWeek,
			StartTime:      in.StartTime,
			EndTime:        in.EndTime,
		})
	}
	if err := s.repo.ReplaceAvailability(ctx, sellerID, orgID, slots); err != nil {
		return nil, fmt.Errorf("sellers.Service.SetAvailability: %w", err)
	}
	return s.repo.ListAvailability(ctx, sellerID)
}

func (s *service) CreateGoal(ctx context.Context, sellerID, orgID uuid.UUID, input domain.CreateSellerGoalInput) (*domain.SellerGoal, error) {
	goal := &domain.SellerGoal{
		ID:             uuid.New(),
		SellerID:       sellerID,
		OrganizationID: orgID,
		PeriodStart:    input.PeriodStart,
		PeriodEnd:      input.PeriodEnd,
		GoalMeetings:   input.GoalMeetings,
		GoalSales:      input.GoalSales,
		GoalRevenue:    input.GoalRevenue,
	}
	if err := s.repo.CreateGoal(ctx, goal); err != nil {
		return nil, fmt.Errorf("sellers.Service.CreateGoal: %w", err)
	}
	return goal, nil
}

func (s *service) ListGoals(ctx context.Context, sellerID uuid.UUID) ([]domain.SellerGoal, error) {
	return s.repo.ListGoals(ctx, sellerID)
}

// GetAvailableSlots calcula slots disponiveis num unico dia para o seller,
// usando availability semanal + bookings existentes do mesmo user_id como
// fonte de busy. Sem GCal — agenda interna apenas. Granularidade 15min.
func (s *service) GetAvailableSlots(ctx context.Context, sellerID uuid.UUID, date time.Time, tz string) ([]domain.SellerSlot, error) {
	seller, err := s.repo.GetByID(ctx, sellerID)
	if err != nil {
		return nil, err
	}
	if !seller.Active {
		return []domain.SellerSlot{}, nil
	}

	loc, err := time.LoadLocation(tz)
	if err != nil || loc == nil {
		loc = time.UTC
	}

	availability, err := s.repo.ListAvailability(ctx, sellerID)
	if err != nil {
		return nil, fmt.Errorf("sellers.Service.GetAvailableSlots: %w", err)
	}

	dayLocal := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, loc)
	dow := int(dayLocal.Weekday())

	windows := make([][2]time.Time, 0)
	for _, a := range availability {
		if a.DayOfWeek != dow {
			continue
		}
		startT, errs := time.Parse("15:04:05", a.StartTime)
		endT, erre := time.Parse("15:04:05", a.EndTime)
		if errs != nil || erre != nil {
			continue
		}
		ws := time.Date(dayLocal.Year(), dayLocal.Month(), dayLocal.Day(), startT.Hour(), startT.Minute(), 0, 0, loc).UTC()
		we := time.Date(dayLocal.Year(), dayLocal.Month(), dayLocal.Day(), endT.Hour(), endT.Minute(), 0, 0, loc).UTC()
		windows = append(windows, [2]time.Time{ws, we})
	}
	if len(windows) == 0 {
		return []domain.SellerSlot{}, nil
	}

	dayStartUTC := dayLocal.UTC()
	dayEndUTC := dayLocal.Add(24 * time.Hour).UTC()
	bookings, err := s.bookings.ListBySellerAndRange(ctx, seller.ID, dayStartUTC, dayEndUTC)
	if err != nil {
		return nil, fmt.Errorf("sellers.Service.GetAvailableSlots: bookings: %w", err)
	}

	duration := time.Duration(seller.MeetingDurationMinutes) * time.Minute
	bufferAfter := time.Duration(seller.BufferAfterMinutes) * time.Minute
	step := 15 * time.Minute
	now := time.Now().UTC()

	out := make([]domain.SellerSlot, 0)
	for _, w := range windows {
		for slotStart := w[0]; !slotStart.Add(duration).After(w[1]); slotStart = slotStart.Add(step) {
			slotEnd := slotStart.Add(duration)
			if slotStart.Before(now) {
				continue
			}
			if hasConflict(slotStart, slotEnd, bufferAfter, bookings) {
				continue
			}
			out = append(out, domain.SellerSlot{Start: slotStart, End: slotEnd})
		}
	}

	sort.Slice(out, func(i, j int) bool { return out[i].Start.Before(out[j].Start) })
	return out, nil
}

// GetAggregatedSlotsForTag retorna union de slots de todos sellers ativos da org
// que cobrem a tag dada. Slots deduplicados por horario start.
// Lead nao ve seller especifico — apenas horarios agregados.
func (s *service) GetAggregatedSlotsForTag(ctx context.Context, orgID uuid.UUID, tag string, date time.Time, tz string) ([]domain.SellerSlot, error) {
	sellers, err := s.repo.ListByTag(ctx, orgID, tag)
	if err != nil {
		return nil, fmt.Errorf("sellers.Service.GetAggregatedSlotsForTag: %w", err)
	}
	if len(sellers) == 0 {
		return []domain.SellerSlot{}, nil
	}

	seen := make(map[int64]struct{}, 64)
	out := make([]domain.SellerSlot, 0, 32)
	for _, seller := range sellers {
		slots, err := s.GetAvailableSlots(ctx, seller.ID, date, tz)
		if err != nil {
			return nil, fmt.Errorf("sellers.Service.GetAggregatedSlotsForTag: %w", err)
		}
		for _, slot := range slots {
			key := slot.Start.Unix()
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			out = append(out, slot)
		}
	}

	sort.Slice(out, func(i, j int) bool { return out[i].Start.Before(out[j].Start) })
	return out, nil
}

// PickSellerForSlot escolhe seller para atender determinado slot via round-robin
// estrito por tag. Algoritmo:
//  1. Lista sellers ativos que cobrem tag, ordenados por id
//  2. Le last_seller_id de seller_rotation_state pra (orgID, tag)
//  3. Encontra index do last_seller na lista; itera a partir do proximo
//  4. Pra cada candidato, verifica se slot esta livre (sem conflito de booking)
//  5. Primeiro livre vence. Atualiza rotation_state com vencedor.
//  6. Se nenhum candidato livre, retorna nil (caller decide).
//
// O caller deve chamar dentro de TX (tenant middleware) pra que SELECT FOR UPDATE
// e UPSERT do rotation_state sejam atomicos.
func (s *service) PickSellerForSlot(ctx context.Context, orgID uuid.UUID, tag string, slotStart time.Time, tz string) (*domain.Seller, error) {
	loc, errLoc := time.LoadLocation(tz)
	if errLoc != nil || loc == nil {
		loc = time.UTC
	}
	candidates, err := s.repo.ListByTag(ctx, orgID, tag)
	if err != nil {
		return nil, fmt.Errorf("sellers.Service.PickSellerForSlot: %w", err)
	}
	if len(candidates) == 0 {
		return nil, nil
	}

	lastID, err := s.repo.GetRotationLastSeller(ctx, orgID, tag)
	if err != nil {
		return nil, fmt.Errorf("sellers.Service.PickSellerForSlot: %w", err)
	}

	startIdx := 0
	if lastID != nil {
		for i, c := range candidates {
			if c.ID == *lastID {
				startIdx = (i + 1) % len(candidates)
				break
			}
		}
	}

	// Tenta cada candidato a partir de startIdx, em loop circular.
	for i := 0; i < len(candidates); i++ {
		idx := (startIdx + i) % len(candidates)
		cand := candidates[idx]
		slotEnd := slotStart.Add(time.Duration(cand.MeetingDurationMinutes) * time.Minute)
		bufferAfter := time.Duration(cand.BufferAfterMinutes) * time.Minute

		bookings, err := s.bookings.ListBySellerAndRange(ctx,
			cand.ID,
			slotStart.Add(-12*time.Hour),
			slotEnd.Add(12*time.Hour),
		)
		if err != nil {
			return nil, fmt.Errorf("sellers.Service.PickSellerForSlot: bookings: %w", err)
		}
		if hasConflict(slotStart, slotEnd, bufferAfter, bookings) {
			continue
		}

		// Tambem verificar que o seller TEM disponibilidade ativa nesse dia/horario
		// — se admin selecionou seller que nao trabalha na quinta, candidato nao serve.
		availability, err := s.repo.ListAvailability(ctx, cand.ID)
		if err != nil {
			return nil, fmt.Errorf("sellers.Service.PickSellerForSlot: avail: %w", err)
		}
		if !slotInAvailability(slotStart, slotEnd, availability, loc) {
			continue
		}

		// Vencedor — atualiza rotation_state
		if err := s.repo.UpsertRotationLastSeller(ctx, orgID, tag, cand.ID); err != nil {
			return nil, fmt.Errorf("sellers.Service.PickSellerForSlot: rotation upsert: %w", err)
		}
		picked := cand
		return &picked, nil
	}

	return nil, nil
}

func slotInAvailability(slotStart, slotEnd time.Time, rules []domain.SellerAvailability, loc *time.Location) bool {
	if loc == nil {
		loc = time.UTC
	}
	localStart := slotStart.In(loc)
	dow := int(localStart.Weekday())
	for _, a := range rules {
		if a.DayOfWeek != dow {
			continue
		}
		startT, err1 := time.Parse("15:04:05", a.StartTime)
		endT, err2 := time.Parse("15:04:05", a.EndTime)
		if err1 != nil || err2 != nil {
			continue
		}
		ws := time.Date(localStart.Year(), localStart.Month(), localStart.Day(),
			startT.Hour(), startT.Minute(), 0, 0, loc)
		we := time.Date(localStart.Year(), localStart.Month(), localStart.Day(),
			endT.Hour(), endT.Minute(), 0, 0, loc)
		if !slotStart.Before(ws) && !slotEnd.After(we) {
			return true
		}
	}
	return false
}

func hasConflict(start, end time.Time, bufferAfter time.Duration, bookings []domain.Booking) bool {
	bufferedEnd := end.Add(bufferAfter)
	for _, b := range bookings {
		if b.Status == domain.BookingStatusCancelled {
			continue
		}
		bEnd := b.EndTime.Add(bufferAfter)
		if start.Before(bEnd) && bufferedEnd.After(b.StartTime) {
			return true
		}
	}
	return false
}
