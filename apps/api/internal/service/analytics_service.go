package service

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

type AnalyticsService interface {
	IngestEvents(ctx context.Context, orgID uuid.UUID, input domain.IngestBatchInput) (int, error)
	GetSummary(ctx context.Context, formID uuid.UUID, from, to time.Time) (*domain.AnalyticsSummary, error)
	GetDailyMetrics(ctx context.Context, formID uuid.UUID, from, to time.Time) ([]domain.FormDailyMetric, error)
	GetStepDropoff(ctx context.Context, formID uuid.UUID, from, to time.Time) ([]domain.StepDropoff, error)
	ExportCSV(ctx context.Context, formID uuid.UUID, from, to time.Time, w io.Writer) error
	RefreshMetrics(ctx context.Context) error

	GetSalesOverview(ctx context.Context, orgID uuid.UUID, period string) (*domain.SalesOverview, error)
	GetABTest(ctx context.Context, orgID, abTestID uuid.UUID) (*domain.ABTestResult, error)
}

type analyticsService struct {
	analyticsRepo repository.AnalyticsRepository
	pubAnalytics  repository.PublicAnalyticsRepository
	responseRepo  repository.ResponseRepository
	abRepo        ABTestRepo
}

func NewAnalyticsService(
	analyticsRepo repository.AnalyticsRepository,
	pubAnalytics repository.PublicAnalyticsRepository,
	responseRepo repository.ResponseRepository,
) AnalyticsService {
	return &analyticsService{
		analyticsRepo: analyticsRepo,
		pubAnalytics:  pubAnalytics,
		responseRepo:  responseRepo,
	}
}

// WireABTestRepo injeta o ABTestRepo apos construcao para evitar ciclo de
// imports entre pacotes. main.go faz o type assert para conectar.
func WireABTestRepo(svc AnalyticsService, repo ABTestRepo) {
	if s, ok := svc.(*analyticsService); ok {
		s.abRepo = repo
	}
}

var validEventTypes = map[domain.AnalyticsEventType]bool{
	domain.EventView:                true,
	domain.EventStart:               true,
	domain.EventQuestionSeen:        true,
	domain.EventQuestionAnswered:    true,
	domain.EventBookingSlotSelected: true,
	domain.EventSubmit:              true,
	domain.EventAbandon:             true,
	domain.EventShare:               true,
}

func (s *analyticsService) IngestEvents(ctx context.Context, orgID uuid.UUID, input domain.IngestBatchInput) (int, error) {
	if len(input.Events) == 0 {
		return 0, nil
	}
	if len(input.Events) > 10 {
		return 0, fmt.Errorf("AnalyticsService.IngestEvents: max 10 events per batch")
	}

	for _, e := range input.Events {
		if !validEventTypes[e.EventType] {
			return 0, fmt.Errorf("AnalyticsService.IngestEvents: invalid event_type: %s", e.EventType)
		}
	}

	inserted, err := s.pubAnalytics.IngestEvents(ctx, orgID, input.Events)
	if err != nil {
		return 0, fmt.Errorf("AnalyticsService.IngestEvents: %w", err)
	}
	return inserted, nil
}

func (s *analyticsService) GetSummary(ctx context.Context, formID uuid.UUID, from, to time.Time) (*domain.AnalyticsSummary, error) {
	summary, err := s.analyticsRepo.GetSummary(ctx, formID, from, to)
	if err != nil {
		return nil, fmt.Errorf("AnalyticsService.GetSummary: %w", err)
	}
	return summary, nil
}

func (s *analyticsService) GetDailyMetrics(ctx context.Context, formID uuid.UUID, from, to time.Time) ([]domain.FormDailyMetric, error) {
	metrics, err := s.analyticsRepo.GetDailyMetrics(ctx, formID, from, to)
	if err != nil {
		return nil, fmt.Errorf("AnalyticsService.GetDailyMetrics: %w", err)
	}
	return metrics, nil
}

func (s *analyticsService) GetStepDropoff(ctx context.Context, formID uuid.UUID, from, to time.Time) ([]domain.StepDropoff, error) {
	dropoff, err := s.analyticsRepo.GetStepDropoff(ctx, formID, from, to)
	if err != nil {
		return nil, fmt.Errorf("AnalyticsService.GetStepDropoff: %w", err)
	}
	return dropoff, nil
}

func (s *analyticsService) ExportCSV(ctx context.Context, formID uuid.UUID, from, to time.Time, w io.Writer) error {
	_, err := w.Write([]byte{0xEF, 0xBB, 0xBF})
	if err != nil {
		return fmt.Errorf("AnalyticsService.ExportCSV: write BOM: %w", err)
	}

	cw := csv.NewWriter(w)
	defer cw.Flush()

	header := []string{"response_id", "respondent_email", "status", "created_at"}
	if err := cw.Write(header); err != nil {
		return fmt.Errorf("AnalyticsService.ExportCSV: write header: %w", err)
	}

	responses, err := s.responseRepo.ListByForm(ctx, formID, 10000)
	if err != nil {
		return fmt.Errorf("AnalyticsService.ExportCSV: list responses: %w", err)
	}

	for _, r := range responses {
		email := ""
		if r.RespondentEmail != nil {
			email = *r.RespondentEmail
		}
		row := []string{
			r.ID.String(),
			email,
			string(r.Status),
			r.CreatedAt.Format(time.RFC3339),
		}
		if err := cw.Write(row); err != nil {
			return fmt.Errorf("AnalyticsService.ExportCSV: write row: %w", err)
		}
	}

	return nil
}

func (s *analyticsService) RefreshMetrics(ctx context.Context) error {
	if err := s.analyticsRepo.RefreshMaterializedView(ctx); err != nil {
		return fmt.Errorf("AnalyticsService.RefreshMetrics: %w", err)
	}
	return nil
}

// --- Sales Deals --------------------------------------------------------

func (s *analyticsService) GetSalesOverview(ctx context.Context, orgID uuid.UUID, period string) (*domain.SalesOverview, error) {
	from := time.Now().AddDate(0, 0, -30)
	switch period {
	case "7d":
		from = time.Now().AddDate(0, 0, -7)
	case "90d":
		from = time.Now().AddDate(0, 0, -90)
	}
	return s.analyticsRepo.GetSalesOverview(ctx, orgID, from)
}

// ABTestRepo is the minimal lookup needed by GetABTest. Implementado pelo
// repository.ABTestRepository (novo arquivo).
type ABTestRepo interface {
	ListFormIDs(ctx context.Context, orgID, abTestID uuid.UUID) ([]uuid.UUID, error)
	Create(ctx context.Context, orgID uuid.UUID, name string, formIDs []uuid.UUID) (uuid.UUID, error)
}


func (s *analyticsService) GetABTest(ctx context.Context, orgID, abTestID uuid.UUID) (*domain.ABTestResult, error) {
	if s.abRepo == nil {
		return &domain.ABTestResult{Forms: []domain.ABTestForm{}}, nil
	}
	formIDs, err := s.abRepo.ListFormIDs(ctx, orgID, abTestID)
	if err != nil {
		return nil, fmt.Errorf("AnalyticsService.GetABTest: %w", err)
	}
	from := time.Now().AddDate(0, 0, -30)
	out := &domain.ABTestResult{Forms: make([]domain.ABTestForm, 0, len(formIDs))}
	for _, fid := range formIDs {
		row, err := s.analyticsRepo.GetFormFunnel(ctx, orgID, fid, from)
		if err != nil {
			continue
		}
		out.Forms = append(out.Forms, *row)
	}
	return out, nil
}
