package qualification

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

var ErrResponseNotFound = errors.New("response not found")

type Service interface {
	CreateRule(ctx context.Context, orgID uuid.UUID, input domain.CreateQualificationRuleInput) (*domain.QualificationRule, error)
	UpdateRule(ctx context.Context, orgID uuid.UUID, ruleID uuid.UUID, input domain.CreateQualificationRuleInput) (*domain.QualificationRule, error)
	DeleteRule(ctx context.Context, ruleID uuid.UUID) error
	ListRulesByForm(ctx context.Context, formID uuid.UUID) ([]domain.QualificationRule, error)
	GetScoreByResponse(ctx context.Context, responseID uuid.UUID) (*domain.LeadScore, error)
	ScoreResponse(ctx context.Context, responseID uuid.UUID) (*domain.LeadScore, error)
}

// BookingTagger is implemented by the booking service so the qualification
// engine can stamp lead_tag onto an associated booking after scoring.
type BookingTagger interface {
	SetLeadTagByResponse(ctx context.Context, responseID uuid.UUID, tag domain.LeadTag) error
}

type service struct {
	repo         Repository
	responseRepo repository.ResponseRepository
	bookingRepo  BookingTagger
}

func NewService(repo Repository, responseRepo repository.ResponseRepository, bookingTagger BookingTagger) Service {
	return &service{
		repo:         repo,
		responseRepo: responseRepo,
		bookingRepo:  bookingTagger,
	}
}

func (s *service) CreateRule(ctx context.Context, orgID uuid.UUID, input domain.CreateQualificationRuleInput) (*domain.QualificationRule, error) {
	rule := &domain.QualificationRule{
		ID:             uuid.New(),
		FormID:         input.FormID,
		BlockID:        strings.TrimSpace(input.BlockID),
		OrganizationID: orgID,
		AnswerValue:    input.AnswerValue,
		Tag:            input.Tag,
		Priority:       input.Priority,
	}
	if err := s.repo.CreateRule(ctx, rule); err != nil {
		return nil, fmt.Errorf("qualification.Service.CreateRule: %w", err)
	}
	return rule, nil
}

func (s *service) UpdateRule(ctx context.Context, orgID uuid.UUID, ruleID uuid.UUID, input domain.CreateQualificationRuleInput) (*domain.QualificationRule, error) {
	rule := &domain.QualificationRule{
		ID:             ruleID,
		OrganizationID: orgID,
		AnswerValue:    input.AnswerValue,
		Tag:            input.Tag,
		Priority:       input.Priority,
	}
	if err := s.repo.UpdateRule(ctx, rule); err != nil {
		return nil, fmt.Errorf("qualification.Service.UpdateRule: %w", err)
	}
	return rule, nil
}

func (s *service) DeleteRule(ctx context.Context, ruleID uuid.UUID) error {
	if err := s.repo.DeleteRule(ctx, ruleID); err != nil {
		return fmt.Errorf("qualification.Service.DeleteRule: %w", err)
	}
	return nil
}

func (s *service) ListRulesByForm(ctx context.Context, formID uuid.UUID) ([]domain.QualificationRule, error) {
	return s.repo.ListRulesByForm(ctx, formID)
}

func (s *service) GetScoreByResponse(ctx context.Context, responseID uuid.UUID) (*domain.LeadScore, error) {
	return s.repo.GetScoreByResponse(ctx, responseID)
}

// ScoreResponse cruza as respostas com as qualification_rules do form, resolve
// o tag vencedor por priority + LeadTag.Priority, persiste em lead_scores e
// stampa lead_tag no booking se houver.
func (s *service) ScoreResponse(ctx context.Context, responseID uuid.UUID) (*domain.LeadScore, error) {
	resp, err := s.responseRepo.GetByID(ctx, responseID)
	if err != nil {
		return nil, fmt.Errorf("qualification.Service.ScoreResponse: %w", err)
	}
	if resp == nil {
		return nil, ErrResponseNotFound
	}

	rules, err := s.repo.ListRulesByForm(ctx, resp.FormID)
	if err != nil {
		return nil, fmt.Errorf("qualification.Service.ScoreResponse: %w", err)
	}
	if len(rules) == 0 {
		// Sem regras: nao gera score (mantém comportamento idempotente).
		return nil, nil
	}

	answers, err := s.responseRepo.GetAnswersByResponseID(ctx, responseID)
	if err != nil {
		return nil, fmt.Errorf("qualification.Service.ScoreResponse: %w", err)
	}

	answerByBlock := make(map[string][]string, len(answers))
	for _, a := range answers {
		for _, v := range extractAnswerValues(a.Value) {
			answerByBlock[a.NodeID] = append(answerByBlock[a.NodeID], v)
		}
	}

	matches := make([]domain.ScoreMatch, 0)
	for _, r := range rules {
		vals, ok := answerByBlock[r.BlockID]
		if !ok {
			continue
		}
		for _, v := range vals {
			if equalAnswer(v, r.AnswerValue) {
				matches = append(matches, domain.ScoreMatch{
					RuleID:      r.ID,
					BlockID:     r.BlockID,
					AnswerValue: r.AnswerValue,
					Tag:         r.Tag,
					Priority:    r.Priority,
				})
				break
			}
		}
	}

	if len(matches) == 0 {
		return nil, nil
	}

	winner, winnerBy := pickWinner(matches)
	breakdown := domain.ScoreBreakdown{
		Matches:  matches,
		Winner:   winner,
		WinnerBy: winnerBy,
	}
	encoded, err := json.Marshal(breakdown)
	if err != nil {
		return nil, fmt.Errorf("qualification.Service.ScoreResponse: encode: %w", err)
	}

	score := &domain.LeadScore{
		ID:             uuid.New(),
		ResponseID:     responseID,
		OrganizationID: resp.OrganizationID,
		FinalTag:       winner,
		Scores:         encoded,
	}
	if err := s.repo.UpsertScore(ctx, score); err != nil {
		return nil, fmt.Errorf("qualification.Service.ScoreResponse: %w", err)
	}

	if s.bookingRepo != nil {
		if err := s.bookingRepo.SetLeadTagByResponse(ctx, responseID, winner); err != nil {
			// soft-fail: score persistido vale; booking sync e best-effort
			return score, nil
		}
	}
	return score, nil
}

// pickWinner resolve empates: rule.priority > LeadTag.Priority > primeiro.
func pickWinner(matches []domain.ScoreMatch) (domain.LeadTag, string) {
	best := matches[0]
	by := "first"
	for _, m := range matches[1:] {
		if m.Priority > best.Priority {
			best = m
			by = "priority"
			continue
		}
		if m.Priority == best.Priority && m.Tag.Priority() > best.Tag.Priority() {
			best = m
			by = "tag_priority"
		}
	}
	return best.Tag, by
}

// extractAnswerValues normaliza JSON da resposta em strings comparaveis. Aceita
// string, number, bool, array de string. Demais tipos sao serializados.
func extractAnswerValues(raw json.RawMessage) []string {
	if len(raw) == 0 {
		return nil
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return []string{s}
	}
	var arr []string
	if err := json.Unmarshal(raw, &arr); err == nil {
		return arr
	}
	var num float64
	if err := json.Unmarshal(raw, &num); err == nil {
		return []string{trimFloat(num)}
	}
	var b bool
	if err := json.Unmarshal(raw, &b); err == nil {
		if b {
			return []string{"true"}
		}
		return []string{"false"}
	}
	return []string{string(raw)}
}

func trimFloat(f float64) string {
	if f == float64(int64(f)) {
		return fmt.Sprintf("%d", int64(f))
	}
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%f", f), "0"), ".")
}

func equalAnswer(a, b string) bool {
	return strings.EqualFold(strings.TrimSpace(a), strings.TrimSpace(b))
}
