package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

var (
	ErrFormNotPublished = errors.New("form is not published")
	ErrNoAnswers        = errors.New("at least one answer is required")
)

type ResponseService interface {
	Submit(ctx context.Context, slug string, input domain.SubmitResponseInput) (*domain.Response, error)
	GetPublicForm(ctx context.Context, slug string) (*domain.PublicForm, error)
	List(ctx context.Context, formID uuid.UUID, params domain.ListResponsesParams) (*domain.ListResponsesResult, error)
	GetWithAnswers(ctx context.Context, id uuid.UUID) (*domain.Response, error)
}

type responseService struct {
	responseRepo   repository.ResponseRepository
	publicFormRepo repository.PublicFormRepository
}

func NewResponseService(responseRepo repository.ResponseRepository, publicFormRepo repository.PublicFormRepository) ResponseService {
	return &responseService{
		responseRepo:   responseRepo,
		publicFormRepo: publicFormRepo,
	}
}

func (s *responseService) GetPublicForm(ctx context.Context, slug string) (*domain.PublicForm, error) {
	form, err := s.publicFormRepo.GetPublishedBySlug(ctx, slug)
	if err != nil {
		return nil, fmt.Errorf("ResponseService.GetPublicForm: %w", err)
	}
	if form == nil {
		return nil, ErrFormNotPublished
	}
	return form, nil
}

func (s *responseService) Submit(ctx context.Context, slug string, input domain.SubmitResponseInput) (*domain.Response, error) {
	if len(input.Answers) == 0 {
		return nil, ErrNoAnswers
	}

	form, err := s.publicFormRepo.GetPublishedBySlug(ctx, slug)
	if err != nil {
		return nil, fmt.Errorf("ResponseService.Submit: %w", err)
	}
	if form == nil {
		return nil, ErrFormNotPublished
	}

	now := time.Now()
	responseID := uuid.New()

	metadata := input.Metadata
	if metadata == nil {
		metadata = json.RawMessage(`{}`)
	}

	resp := &domain.Response{
		ID:              responseID,
		FormID:          form.ID,
		FormVersionID:   form.FormVersionID,
		OrganizationID:  form.OrganizationID,
		RespondentEmail: input.RespondentEmail,
		RespondentName:  input.RespondentName,
		Status:          domain.ResponseStatusCompleted,
		Metadata:        metadata,
		StartedAt:       now,
		CompletedAt:     &now,
		CreatedAt:       now,
	}

	if err := s.responseRepo.Create(ctx, resp); err != nil {
		return nil, fmt.Errorf("ResponseService.Submit: create response: %w", err)
	}

	answers := make([]domain.ResponseAnswer, 0, len(input.Answers))
	for _, a := range input.Answers {
		answers = append(answers, domain.ResponseAnswer{
			ID:         uuid.New(),
			ResponseID: responseID,
			NodeID:     a.NodeID,
			Value:      a.Value,
			AnsweredAt: now,
		})
	}

	if err := s.responseRepo.CreateAnswers(ctx, answers); err != nil {
		return nil, fmt.Errorf("ResponseService.Submit: create answers: %w", err)
	}

	resp.Answers = answers
	return resp, nil
}

func (s *responseService) List(ctx context.Context, formID uuid.UUID, params domain.ListResponsesParams) (*domain.ListResponsesResult, error) {
	params.FormID = formID
	result, err := s.responseRepo.List(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("ResponseService.List: %w", err)
	}
	return result, nil
}

func (s *responseService) GetWithAnswers(ctx context.Context, id uuid.UUID) (*domain.Response, error) {
	resp, err := s.responseRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("ResponseService.GetWithAnswers: %w", err)
	}
	if resp == nil {
		return nil, ErrFormNotFound
	}

	answers, err := s.responseRepo.GetAnswersByResponseID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("ResponseService.GetWithAnswers: answers: %w", err)
	}
	resp.Answers = answers
	return resp, nil
}

