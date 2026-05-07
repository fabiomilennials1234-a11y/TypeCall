package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
)

// --- 1. mockOrganizationRepository ---

type mockOrganizationRepository struct {
	CreateFn     func(ctx context.Context, org *domain.Organization) error
	GetByIDFn    func(ctx context.Context, id uuid.UUID) (*domain.Organization, error)
	GetBySlugFn  func(ctx context.Context, slug string) (*domain.Organization, error)
	SlugExistsFn func(ctx context.Context, slug string) (bool, error)
}

func (m *mockOrganizationRepository) Create(ctx context.Context, org *domain.Organization) error {
	if m.CreateFn != nil {
		return m.CreateFn(ctx, org)
	}
	return nil
}

func (m *mockOrganizationRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Organization, error) {
	if m.GetByIDFn != nil {
		return m.GetByIDFn(ctx, id)
	}
	return nil, nil
}

func (m *mockOrganizationRepository) GetBySlug(ctx context.Context, slug string) (*domain.Organization, error) {
	if m.GetBySlugFn != nil {
		return m.GetBySlugFn(ctx, slug)
	}
	return nil, nil
}

func (m *mockOrganizationRepository) SlugExists(ctx context.Context, slug string) (bool, error) {
	if m.SlugExistsFn != nil {
		return m.SlugExistsFn(ctx, slug)
	}
	return false, nil
}

// --- 2. mockUserRepository ---

type mockUserRepository struct {
	CreateFn           func(ctx context.Context, user *domain.User) error
	GetByIDFn          func(ctx context.Context, id uuid.UUID) (*domain.User, error)
	GetByEmailFn       func(ctx context.Context, email string) ([]domain.User, error)
	GetByOrgAndEmailFn func(ctx context.Context, orgID uuid.UUID, email string) (*domain.User, error)
	UpdateLastLoginFn  func(ctx context.Context, id uuid.UUID) error
}

func (m *mockUserRepository) Create(ctx context.Context, user *domain.User) error {
	if m.CreateFn != nil {
		return m.CreateFn(ctx, user)
	}
	return nil
}

func (m *mockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	if m.GetByIDFn != nil {
		return m.GetByIDFn(ctx, id)
	}
	return nil, nil
}

func (m *mockUserRepository) GetByEmail(ctx context.Context, email string) ([]domain.User, error) {
	if m.GetByEmailFn != nil {
		return m.GetByEmailFn(ctx, email)
	}
	return nil, nil
}

func (m *mockUserRepository) GetByOrgAndEmail(ctx context.Context, orgID uuid.UUID, email string) (*domain.User, error) {
	if m.GetByOrgAndEmailFn != nil {
		return m.GetByOrgAndEmailFn(ctx, orgID, email)
	}
	return nil, nil
}

func (m *mockUserRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	if m.UpdateLastLoginFn != nil {
		return m.UpdateLastLoginFn(ctx, id)
	}
	return nil
}

// --- 3. mockRefreshTokenRepository ---

type mockRefreshTokenRepository struct {
	CreateFn           func(ctx context.Context, token *domain.RefreshToken) error
	GetByTokenHashFn   func(ctx context.Context, hash string) (*domain.RefreshToken, error)
	RevokeFn           func(ctx context.Context, id uuid.UUID) error
	RevokeAllForUserFn func(ctx context.Context, userID uuid.UUID) error
	DeleteExpiredFn    func(ctx context.Context) (int64, error)
}

func (m *mockRefreshTokenRepository) Create(ctx context.Context, token *domain.RefreshToken) error {
	if m.CreateFn != nil {
		return m.CreateFn(ctx, token)
	}
	return nil
}

func (m *mockRefreshTokenRepository) GetByTokenHash(ctx context.Context, hash string) (*domain.RefreshToken, error) {
	if m.GetByTokenHashFn != nil {
		return m.GetByTokenHashFn(ctx, hash)
	}
	return nil, nil
}

func (m *mockRefreshTokenRepository) Revoke(ctx context.Context, id uuid.UUID) error {
	if m.RevokeFn != nil {
		return m.RevokeFn(ctx, id)
	}
	return nil
}

func (m *mockRefreshTokenRepository) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	if m.RevokeAllForUserFn != nil {
		return m.RevokeAllForUserFn(ctx, userID)
	}
	return nil
}

func (m *mockRefreshTokenRepository) DeleteExpired(ctx context.Context) (int64, error) {
	if m.DeleteExpiredFn != nil {
		return m.DeleteExpiredFn(ctx)
	}
	return 0, nil
}

// --- 4. mockFormRepository ---

type mockFormRepository struct {
	CreateFn      func(ctx context.Context, form *domain.Form) error
	GetByIDFn     func(ctx context.Context, id uuid.UUID) (*domain.Form, error)
	ListFn        func(ctx context.Context, params domain.ListFormsParams) (*domain.ListFormsResult, error)
	UpdateFn      func(ctx context.Context, form *domain.Form) error
	UpdateDraftFn func(ctx context.Context, id uuid.UUID, draft json.RawMessage) error
	SoftDeleteFn  func(ctx context.Context, id uuid.UUID) error
	SlugExistsFn  func(ctx context.Context, slug string) (bool, error)
}

func (m *mockFormRepository) Create(ctx context.Context, form *domain.Form) error {
	if m.CreateFn != nil {
		return m.CreateFn(ctx, form)
	}
	return nil
}

func (m *mockFormRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Form, error) {
	if m.GetByIDFn != nil {
		return m.GetByIDFn(ctx, id)
	}
	return nil, nil
}

func (m *mockFormRepository) List(ctx context.Context, params domain.ListFormsParams) (*domain.ListFormsResult, error) {
	if m.ListFn != nil {
		return m.ListFn(ctx, params)
	}
	return nil, nil
}

func (m *mockFormRepository) Update(ctx context.Context, form *domain.Form) error {
	if m.UpdateFn != nil {
		return m.UpdateFn(ctx, form)
	}
	return nil
}

func (m *mockFormRepository) UpdateDraft(ctx context.Context, id uuid.UUID, draft json.RawMessage) error {
	if m.UpdateDraftFn != nil {
		return m.UpdateDraftFn(ctx, id, draft)
	}
	return nil
}

func (m *mockFormRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	if m.SoftDeleteFn != nil {
		return m.SoftDeleteFn(ctx, id)
	}
	return nil
}

func (m *mockFormRepository) SlugExists(ctx context.Context, slug string) (bool, error) {
	if m.SlugExistsFn != nil {
		return m.SlugExistsFn(ctx, slug)
	}
	return false, nil
}

// --- 5. mockFormVersionRepository ---

type mockFormVersionRepository struct {
	CreateFn            func(ctx context.Context, v *domain.FormVersion) error
	ListByFormIDFn      func(ctx context.Context, formID uuid.UUID) ([]domain.FormVersion, error)
	GetLatestByFormIDFn func(ctx context.Context, formID uuid.UUID) (*domain.FormVersion, error)
}

func (m *mockFormVersionRepository) Create(ctx context.Context, v *domain.FormVersion) error {
	if m.CreateFn != nil {
		return m.CreateFn(ctx, v)
	}
	return nil
}

func (m *mockFormVersionRepository) ListByFormID(ctx context.Context, formID uuid.UUID) ([]domain.FormVersion, error) {
	if m.ListByFormIDFn != nil {
		return m.ListByFormIDFn(ctx, formID)
	}
	return nil, nil
}

func (m *mockFormVersionRepository) GetLatestByFormID(ctx context.Context, formID uuid.UUID) (*domain.FormVersion, error) {
	if m.GetLatestByFormIDFn != nil {
		return m.GetLatestByFormIDFn(ctx, formID)
	}
	return nil, nil
}

// --- 6. mockEventTypeRepository ---

type mockEventTypeRepository struct {
	CreateFn     func(ctx context.Context, et *domain.EventType) error
	GetByIDFn    func(ctx context.Context, id uuid.UUID) (*domain.EventType, error)
	ListFn       func(ctx context.Context, params domain.ListEventTypesParams) (*domain.ListEventTypesResult, error)
	UpdateFn     func(ctx context.Context, et *domain.EventType) error
	DeleteFn     func(ctx context.Context, id uuid.UUID) error
	SlugExistsFn func(ctx context.Context, orgID uuid.UUID, slug string) (bool, error)
}

func (m *mockEventTypeRepository) Create(ctx context.Context, et *domain.EventType) error {
	if m.CreateFn != nil {
		return m.CreateFn(ctx, et)
	}
	return nil
}

func (m *mockEventTypeRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.EventType, error) {
	if m.GetByIDFn != nil {
		return m.GetByIDFn(ctx, id)
	}
	return nil, nil
}

func (m *mockEventTypeRepository) List(ctx context.Context, params domain.ListEventTypesParams) (*domain.ListEventTypesResult, error) {
	if m.ListFn != nil {
		return m.ListFn(ctx, params)
	}
	return nil, nil
}

func (m *mockEventTypeRepository) Update(ctx context.Context, et *domain.EventType) error {
	if m.UpdateFn != nil {
		return m.UpdateFn(ctx, et)
	}
	return nil
}

func (m *mockEventTypeRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if m.DeleteFn != nil {
		return m.DeleteFn(ctx, id)
	}
	return nil
}

func (m *mockEventTypeRepository) SlugExists(ctx context.Context, orgID uuid.UUID, slug string) (bool, error) {
	if m.SlugExistsFn != nil {
		return m.SlugExistsFn(ctx, orgID, slug)
	}
	return false, nil
}

// --- 7. mockAvailabilityRepository ---

type mockAvailabilityRepository struct {
	ListRulesFn                 func(ctx context.Context, eventTypeID uuid.UUID) ([]domain.AvailabilityRule, error)
	ReplaceRulesFn              func(ctx context.Context, eventTypeID uuid.UUID, userID uuid.UUID, rules []domain.AvailabilityRule) error
	CreateOverrideFn            func(ctx context.Context, o *domain.AvailabilityOverride) error
	ListOverridesFn             func(ctx context.Context, eventTypeID uuid.UUID) ([]domain.AvailabilityOverride, error)
	DeleteOverrideFn            func(ctx context.Context, id uuid.UUID) error
	GetOverrideByIDFn           func(ctx context.Context, id uuid.UUID) (*domain.AvailabilityOverride, error)
	ListRulesByUserAndDayFn     func(ctx context.Context, userID uuid.UUID, eventTypeID uuid.UUID, dayOfWeek int) ([]domain.AvailabilityRule, error)
	ListOverridesByUserAndDateFn func(ctx context.Context, userID uuid.UUID, eventTypeID uuid.UUID, date string) ([]domain.AvailabilityOverride, error)
}

func (m *mockAvailabilityRepository) ListRules(ctx context.Context, eventTypeID uuid.UUID) ([]domain.AvailabilityRule, error) {
	if m.ListRulesFn != nil {
		return m.ListRulesFn(ctx, eventTypeID)
	}
	return nil, nil
}

func (m *mockAvailabilityRepository) ReplaceRules(ctx context.Context, eventTypeID uuid.UUID, userID uuid.UUID, rules []domain.AvailabilityRule) error {
	if m.ReplaceRulesFn != nil {
		return m.ReplaceRulesFn(ctx, eventTypeID, userID, rules)
	}
	return nil
}

func (m *mockAvailabilityRepository) CreateOverride(ctx context.Context, o *domain.AvailabilityOverride) error {
	if m.CreateOverrideFn != nil {
		return m.CreateOverrideFn(ctx, o)
	}
	return nil
}

func (m *mockAvailabilityRepository) ListOverrides(ctx context.Context, eventTypeID uuid.UUID) ([]domain.AvailabilityOverride, error) {
	if m.ListOverridesFn != nil {
		return m.ListOverridesFn(ctx, eventTypeID)
	}
	return nil, nil
}

func (m *mockAvailabilityRepository) DeleteOverride(ctx context.Context, id uuid.UUID) error {
	if m.DeleteOverrideFn != nil {
		return m.DeleteOverrideFn(ctx, id)
	}
	return nil
}

func (m *mockAvailabilityRepository) GetOverrideByID(ctx context.Context, id uuid.UUID) (*domain.AvailabilityOverride, error) {
	if m.GetOverrideByIDFn != nil {
		return m.GetOverrideByIDFn(ctx, id)
	}
	return nil, nil
}

func (m *mockAvailabilityRepository) ListRulesByUserAndDay(ctx context.Context, userID uuid.UUID, eventTypeID uuid.UUID, dayOfWeek int) ([]domain.AvailabilityRule, error) {
	if m.ListRulesByUserAndDayFn != nil {
		return m.ListRulesByUserAndDayFn(ctx, userID, eventTypeID, dayOfWeek)
	}
	return nil, nil
}

func (m *mockAvailabilityRepository) ListOverridesByUserAndDate(ctx context.Context, userID uuid.UUID, eventTypeID uuid.UUID, date string) ([]domain.AvailabilityOverride, error) {
	if m.ListOverridesByUserAndDateFn != nil {
		return m.ListOverridesByUserAndDateFn(ctx, userID, eventTypeID, date)
	}
	return nil, nil
}

// --- 8. mockBookingRepository ---

type mockBookingRepository struct {
	CreateFn               func(ctx context.Context, b *domain.Booking) error
	GetByIDFn              func(ctx context.Context, id uuid.UUID) (*domain.Booking, error)
	ListFn                 func(ctx context.Context, params domain.ListBookingsParams) (*domain.ListBookingsResult, error)
	UpdateStatusFn         func(ctx context.Context, id uuid.UUID, status domain.BookingStatus) error
	CancelFn               func(ctx context.Context, id uuid.UUID, reason *string) error
	GetByCancelTokenFn     func(ctx context.Context, token string) (*domain.Booking, error)
	GetByRescheduleTokenFn func(ctx context.Context, token string) (*domain.Booking, error)
	CheckConflictFn        func(ctx context.Context, hostUserID uuid.UUID, start time.Time, end time.Time) (bool, error)
	CountByHostAndDateFn   func(ctx context.Context, hostUserID uuid.UUID, date time.Time) (int, error)
	ListByHostAndRangeFn   func(ctx context.Context, hostUserID uuid.UUID, start time.Time, end time.Time) ([]domain.Booking, error)
}

func (m *mockBookingRepository) Create(ctx context.Context, b *domain.Booking) error {
	if m.CreateFn != nil {
		return m.CreateFn(ctx, b)
	}
	return nil
}

func (m *mockBookingRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Booking, error) {
	if m.GetByIDFn != nil {
		return m.GetByIDFn(ctx, id)
	}
	return nil, nil
}

func (m *mockBookingRepository) List(ctx context.Context, params domain.ListBookingsParams) (*domain.ListBookingsResult, error) {
	if m.ListFn != nil {
		return m.ListFn(ctx, params)
	}
	return nil, nil
}

func (m *mockBookingRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.BookingStatus) error {
	if m.UpdateStatusFn != nil {
		return m.UpdateStatusFn(ctx, id, status)
	}
	return nil
}

func (m *mockBookingRepository) Cancel(ctx context.Context, id uuid.UUID, reason *string) error {
	if m.CancelFn != nil {
		return m.CancelFn(ctx, id, reason)
	}
	return nil
}

func (m *mockBookingRepository) GetByCancelToken(ctx context.Context, token string) (*domain.Booking, error) {
	if m.GetByCancelTokenFn != nil {
		return m.GetByCancelTokenFn(ctx, token)
	}
	return nil, nil
}

func (m *mockBookingRepository) GetByRescheduleToken(ctx context.Context, token string) (*domain.Booking, error) {
	if m.GetByRescheduleTokenFn != nil {
		return m.GetByRescheduleTokenFn(ctx, token)
	}
	return nil, nil
}

func (m *mockBookingRepository) CheckConflict(ctx context.Context, hostUserID uuid.UUID, start time.Time, end time.Time) (bool, error) {
	if m.CheckConflictFn != nil {
		return m.CheckConflictFn(ctx, hostUserID, start, end)
	}
	return false, nil
}

func (m *mockBookingRepository) CountByHostAndDate(ctx context.Context, hostUserID uuid.UUID, date time.Time) (int, error) {
	if m.CountByHostAndDateFn != nil {
		return m.CountByHostAndDateFn(ctx, hostUserID, date)
	}
	return 0, nil
}

func (m *mockBookingRepository) ListByHostAndRange(ctx context.Context, hostUserID uuid.UUID, start time.Time, end time.Time) ([]domain.Booking, error) {
	if m.ListByHostAndRangeFn != nil {
		return m.ListByHostAndRangeFn(ctx, hostUserID, start, end)
	}
	return nil, nil
}

// --- 9. mockPublicEventTypeRepository ---

type mockPublicEventTypeRepository struct {
	GetActiveByIDFn func(ctx context.Context, id uuid.UUID) (*domain.EventType, error)
}

func (m *mockPublicEventTypeRepository) GetActiveByID(ctx context.Context, id uuid.UUID) (*domain.EventType, error) {
	if m.GetActiveByIDFn != nil {
		return m.GetActiveByIDFn(ctx, id)
	}
	return nil, nil
}

// --- 10. mockWebhookRepository ---

type mockWebhookRepository struct {
	GetConfigFn           func(ctx context.Context, orgID uuid.UUID) (*domain.WebhookConfig, error)
	GetConfigByIDFn       func(ctx context.Context, id uuid.UUID) (*domain.WebhookConfig, error)
	UpsertConfigFn        func(ctx context.Context, cfg *domain.WebhookConfig) error
	DeleteConfigFn        func(ctx context.Context, id uuid.UUID) error
	CreateDeliveryFn      func(ctx context.Context, d *domain.WebhookDelivery) error
	UpdateDeliveryFn      func(ctx context.Context, d *domain.WebhookDelivery) error
	ListDeliveriesFn      func(ctx context.Context, orgID uuid.UUID, limit int) ([]domain.WebhookDelivery, error)
	GetPendingDeliveriesFn func(ctx context.Context, limit int) ([]domain.WebhookDelivery, error)
}

func (m *mockWebhookRepository) GetConfig(ctx context.Context, orgID uuid.UUID) (*domain.WebhookConfig, error) {
	if m.GetConfigFn != nil {
		return m.GetConfigFn(ctx, orgID)
	}
	return nil, nil
}

func (m *mockWebhookRepository) GetConfigByID(ctx context.Context, id uuid.UUID) (*domain.WebhookConfig, error) {
	if m.GetConfigByIDFn != nil {
		return m.GetConfigByIDFn(ctx, id)
	}
	return nil, nil
}

func (m *mockWebhookRepository) UpsertConfig(ctx context.Context, cfg *domain.WebhookConfig) error {
	if m.UpsertConfigFn != nil {
		return m.UpsertConfigFn(ctx, cfg)
	}
	return nil
}

func (m *mockWebhookRepository) DeleteConfig(ctx context.Context, id uuid.UUID) error {
	if m.DeleteConfigFn != nil {
		return m.DeleteConfigFn(ctx, id)
	}
	return nil
}

func (m *mockWebhookRepository) CreateDelivery(ctx context.Context, d *domain.WebhookDelivery) error {
	if m.CreateDeliveryFn != nil {
		return m.CreateDeliveryFn(ctx, d)
	}
	return nil
}

func (m *mockWebhookRepository) UpdateDelivery(ctx context.Context, d *domain.WebhookDelivery) error {
	if m.UpdateDeliveryFn != nil {
		return m.UpdateDeliveryFn(ctx, d)
	}
	return nil
}

func (m *mockWebhookRepository) ListDeliveries(ctx context.Context, orgID uuid.UUID, limit int) ([]domain.WebhookDelivery, error) {
	if m.ListDeliveriesFn != nil {
		return m.ListDeliveriesFn(ctx, orgID, limit)
	}
	return nil, nil
}

func (m *mockWebhookRepository) GetPendingDeliveries(ctx context.Context, limit int) ([]domain.WebhookDelivery, error) {
	if m.GetPendingDeliveriesFn != nil {
		return m.GetPendingDeliveriesFn(ctx, limit)
	}
	return nil, nil
}

// --- 11. mockAnalyticsRepository ---

type mockAnalyticsRepository struct {
	IngestEventsFn           func(ctx context.Context, orgID uuid.UUID, events []domain.IngestEventInput) (int, error)
	GetDailyMetricsFn        func(ctx context.Context, formID uuid.UUID, from, to time.Time) ([]domain.FormDailyMetric, error)
	GetSummaryFn             func(ctx context.Context, formID uuid.UUID, from, to time.Time) (*domain.AnalyticsSummary, error)
	GetStepDropoffFn         func(ctx context.Context, formID uuid.UUID, from, to time.Time) ([]domain.StepDropoff, error)
	RefreshMaterializedViewFn func(ctx context.Context) error
}

func (m *mockAnalyticsRepository) IngestEvents(ctx context.Context, orgID uuid.UUID, events []domain.IngestEventInput) (int, error) {
	if m.IngestEventsFn != nil {
		return m.IngestEventsFn(ctx, orgID, events)
	}
	return 0, nil
}

func (m *mockAnalyticsRepository) GetDailyMetrics(ctx context.Context, formID uuid.UUID, from, to time.Time) ([]domain.FormDailyMetric, error) {
	if m.GetDailyMetricsFn != nil {
		return m.GetDailyMetricsFn(ctx, formID, from, to)
	}
	return nil, nil
}

func (m *mockAnalyticsRepository) GetSummary(ctx context.Context, formID uuid.UUID, from, to time.Time) (*domain.AnalyticsSummary, error) {
	if m.GetSummaryFn != nil {
		return m.GetSummaryFn(ctx, formID, from, to)
	}
	return nil, nil
}

func (m *mockAnalyticsRepository) GetStepDropoff(ctx context.Context, formID uuid.UUID, from, to time.Time) ([]domain.StepDropoff, error) {
	if m.GetStepDropoffFn != nil {
		return m.GetStepDropoffFn(ctx, formID, from, to)
	}
	return nil, nil
}

func (m *mockAnalyticsRepository) RefreshMaterializedView(ctx context.Context) error {
	if m.RefreshMaterializedViewFn != nil {
		return m.RefreshMaterializedViewFn(ctx)
	}
	return nil
}

// --- 12. mockPublicAnalyticsRepository ---

type mockPublicAnalyticsRepository struct {
	IngestEventsFn func(ctx context.Context, orgID uuid.UUID, events []domain.IngestEventInput) (int, error)
}

func (m *mockPublicAnalyticsRepository) IngestEvents(ctx context.Context, orgID uuid.UUID, events []domain.IngestEventInput) (int, error) {
	if m.IngestEventsFn != nil {
		return m.IngestEventsFn(ctx, orgID, events)
	}
	return 0, nil
}

// --- 13. mockResponseRepository ---

type mockResponseRepository struct {
	CreateFn                func(ctx context.Context, resp *domain.Response) error
	GetByIDFn               func(ctx context.Context, id uuid.UUID) (*domain.Response, error)
	ListFn                  func(ctx context.Context, params domain.ListResponsesParams) (*domain.ListResponsesResult, error)
	ListByFormFn            func(ctx context.Context, formID uuid.UUID, limit int) ([]domain.Response, error)
	CreateAnswersFn         func(ctx context.Context, answers []domain.ResponseAnswer) error
	GetAnswersByResponseIDFn func(ctx context.Context, responseID uuid.UUID) ([]domain.ResponseAnswer, error)
}

func (m *mockResponseRepository) Create(ctx context.Context, resp *domain.Response) error {
	if m.CreateFn != nil {
		return m.CreateFn(ctx, resp)
	}
	return nil
}

func (m *mockResponseRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Response, error) {
	if m.GetByIDFn != nil {
		return m.GetByIDFn(ctx, id)
	}
	return nil, nil
}

func (m *mockResponseRepository) List(ctx context.Context, params domain.ListResponsesParams) (*domain.ListResponsesResult, error) {
	if m.ListFn != nil {
		return m.ListFn(ctx, params)
	}
	return nil, nil
}

func (m *mockResponseRepository) ListByForm(ctx context.Context, formID uuid.UUID, limit int) ([]domain.Response, error) {
	if m.ListByFormFn != nil {
		return m.ListByFormFn(ctx, formID, limit)
	}
	return nil, nil
}

func (m *mockResponseRepository) CreateAnswers(ctx context.Context, answers []domain.ResponseAnswer) error {
	if m.CreateAnswersFn != nil {
		return m.CreateAnswersFn(ctx, answers)
	}
	return nil
}

func (m *mockResponseRepository) GetAnswersByResponseID(ctx context.Context, responseID uuid.UUID) ([]domain.ResponseAnswer, error) {
	if m.GetAnswersByResponseIDFn != nil {
		return m.GetAnswersByResponseIDFn(ctx, responseID)
	}
	return nil, nil
}

// --- 14. mockPublicFormRepository ---

type mockPublicFormRepository struct {
	GetPublishedBySlugFn func(ctx context.Context, slug string) (*domain.PublicForm, error)
}

func (m *mockPublicFormRepository) GetPublishedBySlug(ctx context.Context, slug string) (*domain.PublicForm, error) {
	if m.GetPublishedBySlugFn != nil {
		return m.GetPublishedBySlugFn(ctx, slug)
	}
	return nil, nil
}

// --- 15. mockWebhookService ---

type mockWebhookService struct {
	GetConfigFn      func(ctx context.Context, orgID uuid.UUID) (*domain.WebhookConfig, error)
	UpsertConfigFn   func(ctx context.Context, orgID uuid.UUID, input domain.CreateWebhookInput) (*domain.WebhookConfig, error)
	UpdateConfigFn   func(ctx context.Context, orgID uuid.UUID, input domain.UpdateWebhookInput) (*domain.WebhookConfig, error)
	DeleteConfigFn   func(ctx context.Context, orgID uuid.UUID) error
	ListDeliveriesFn func(ctx context.Context, orgID uuid.UUID, limit int) ([]domain.WebhookDelivery, error)
	RetryDeliveryFn  func(ctx context.Context, orgID uuid.UUID, deliveryID uuid.UUID) error
	DispatchFn       func(ctx context.Context, orgID uuid.UUID, event string, payload domain.TorqueWebhookPayload) error
}

func (m *mockWebhookService) GetConfig(ctx context.Context, orgID uuid.UUID) (*domain.WebhookConfig, error) {
	if m.GetConfigFn != nil {
		return m.GetConfigFn(ctx, orgID)
	}
	return nil, nil
}

func (m *mockWebhookService) UpsertConfig(ctx context.Context, orgID uuid.UUID, input domain.CreateWebhookInput) (*domain.WebhookConfig, error) {
	if m.UpsertConfigFn != nil {
		return m.UpsertConfigFn(ctx, orgID, input)
	}
	return nil, nil
}

func (m *mockWebhookService) UpdateConfig(ctx context.Context, orgID uuid.UUID, input domain.UpdateWebhookInput) (*domain.WebhookConfig, error) {
	if m.UpdateConfigFn != nil {
		return m.UpdateConfigFn(ctx, orgID, input)
	}
	return nil, nil
}

func (m *mockWebhookService) DeleteConfig(ctx context.Context, orgID uuid.UUID) error {
	if m.DeleteConfigFn != nil {
		return m.DeleteConfigFn(ctx, orgID)
	}
	return nil
}

func (m *mockWebhookService) ListDeliveries(ctx context.Context, orgID uuid.UUID, limit int) ([]domain.WebhookDelivery, error) {
	if m.ListDeliveriesFn != nil {
		return m.ListDeliveriesFn(ctx, orgID, limit)
	}
	return nil, nil
}

func (m *mockWebhookService) RetryDelivery(ctx context.Context, orgID uuid.UUID, deliveryID uuid.UUID) error {
	if m.RetryDeliveryFn != nil {
		return m.RetryDeliveryFn(ctx, orgID, deliveryID)
	}
	return nil
}

func (m *mockWebhookService) Dispatch(ctx context.Context, orgID uuid.UUID, event string, payload domain.TorqueWebhookPayload) error {
	if m.DispatchFn != nil {
		return m.DispatchFn(ctx, orgID, event, payload)
	}
	return nil
}
