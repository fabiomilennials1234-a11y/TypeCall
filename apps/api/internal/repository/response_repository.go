package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/typecall/api/internal/db"
	"github.com/typecall/api/internal/domain"
)

type ResponseRepository interface {
	Create(ctx context.Context, resp *domain.Response) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Response, error)
	List(ctx context.Context, params domain.ListResponsesParams) (*domain.ListResponsesResult, error)
	CreateAnswers(ctx context.Context, answers []domain.ResponseAnswer) error
	GetAnswersByResponseID(ctx context.Context, responseID uuid.UUID) ([]domain.ResponseAnswer, error)
}

type PublicFormRepository interface {
	GetPublishedBySlug(ctx context.Context, slug string) (*domain.PublicForm, error)
}

type responseRepository struct {
	pool *pgxpool.Pool
}

func NewResponseRepository(pool *pgxpool.Pool) ResponseRepository {
	return &responseRepository{pool: pool}
}

func (r *responseRepository) Create(ctx context.Context, resp *domain.Response) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		INSERT INTO responses (id, form_id, form_version_id, organization_id,
			respondent_email, respondent_name, status, metadata, started_at, completed_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	_, err := conn.Exec(ctx, query,
		resp.ID, resp.FormID, resp.FormVersionID, resp.OrganizationID,
		resp.RespondentEmail, resp.RespondentName, resp.Status, resp.Metadata,
		resp.StartedAt, resp.CompletedAt, resp.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("ResponseRepository.Create: %w", err)
	}
	return nil
}

func (r *responseRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Response, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, form_id, form_version_id, organization_id,
			respondent_email, respondent_name, status, metadata, started_at, completed_at, created_at
		FROM responses
		WHERE id = $1`

	resp := &domain.Response{}
	err := conn.QueryRow(ctx, query, id).Scan(
		&resp.ID, &resp.FormID, &resp.FormVersionID, &resp.OrganizationID,
		&resp.RespondentEmail, &resp.RespondentName, &resp.Status, &resp.Metadata,
		&resp.StartedAt, &resp.CompletedAt, &resp.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("ResponseRepository.GetByID: %w", err)
	}
	return resp, nil
}

func (r *responseRepository) List(ctx context.Context, params domain.ListResponsesParams) (*domain.ListResponsesResult, error) {
	conn := db.Conn(ctx, r.pool)

	conditions := []string{"form_id = $1"}
	args := []any{params.FormID}
	argIdx := 2

	if params.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, string(*params.Status))
		argIdx++
	}

	if params.Cursor != nil {
		cursorTime, cursorID, err := decodeCursor(*params.Cursor)
		if err == nil {
			conditions = append(conditions, fmt.Sprintf("(created_at, id) < ($%d, $%d)", argIdx, argIdx+1))
			args = append(args, cursorTime, cursorID)
			argIdx += 2
		}
	}

	limit := params.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	query := fmt.Sprintf(`
		SELECT id, form_id, form_version_id, organization_id,
			respondent_email, respondent_name, status, metadata, started_at, completed_at, created_at
		FROM responses
		WHERE %s
		ORDER BY created_at DESC, id DESC
		LIMIT $%d`, strings.Join(conditions, " AND "), argIdx)
	args = append(args, limit+1)

	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("ResponseRepository.List: %w", err)
	}
	defer rows.Close()

	responses := make([]domain.Response, 0, limit)
	for rows.Next() {
		var resp domain.Response
		if err := rows.Scan(
			&resp.ID, &resp.FormID, &resp.FormVersionID, &resp.OrganizationID,
			&resp.RespondentEmail, &resp.RespondentName, &resp.Status, &resp.Metadata,
			&resp.StartedAt, &resp.CompletedAt, &resp.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("ResponseRepository.List: scan: %w", err)
		}
		responses = append(responses, resp)
	}

	hasMore := len(responses) > limit
	if hasMore {
		responses = responses[:limit]
	}

	var nextCursor *string
	if hasMore && len(responses) > 0 {
		last := responses[len(responses)-1]
		c := encodeCursor(last.CreatedAt, last.ID)
		nextCursor = &c
	}

	return &domain.ListResponsesResult{
		Responses:  responses,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

func (r *responseRepository) CreateAnswers(ctx context.Context, answers []domain.ResponseAnswer) error {
	conn := db.Conn(ctx, r.pool)
	query := `INSERT INTO response_answers (id, response_id, node_id, value, answered_at) VALUES ($1, $2, $3, $4, $5)`

	for _, a := range answers {
		if _, err := conn.Exec(ctx, query, a.ID, a.ResponseID, a.NodeID, a.Value, a.AnsweredAt); err != nil {
			return fmt.Errorf("ResponseRepository.CreateAnswers: %w", err)
		}
	}
	return nil
}

func (r *responseRepository) GetAnswersByResponseID(ctx context.Context, responseID uuid.UUID) ([]domain.ResponseAnswer, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, response_id, node_id, value, answered_at
		FROM response_answers
		WHERE response_id = $1
		ORDER BY answered_at ASC`

	rows, err := conn.Query(ctx, query, responseID)
	if err != nil {
		return nil, fmt.Errorf("ResponseRepository.GetAnswersByResponseID: %w", err)
	}
	defer rows.Close()

	var answers []domain.ResponseAnswer
	for rows.Next() {
		var a domain.ResponseAnswer
		if err := rows.Scan(&a.ID, &a.ResponseID, &a.NodeID, &a.Value, &a.AnsweredAt); err != nil {
			return nil, fmt.Errorf("ResponseRepository.GetAnswersByResponseID: scan: %w", err)
		}
		answers = append(answers, a)
	}
	return answers, nil
}

// PublicFormRepository — no RLS, uses direct pool query
type publicFormRepository struct {
	pool *pgxpool.Pool
}

func NewPublicFormRepository(pool *pgxpool.Pool) PublicFormRepository {
	return &publicFormRepository{pool: pool}
}

func (r *publicFormRepository) GetPublishedBySlug(ctx context.Context, slug string) (*domain.PublicForm, error) {
	query := `
		SELECT f.id, f.organization_id, f.title, f.slug, f.description,
			fv.id, fv.version_number, fv.flow_definition, f.theme, f.settings
		FROM forms f
		JOIN form_versions fv ON fv.form_id = f.id AND fv.version_number = f.version
		WHERE f.slug = $1 AND f.status = 'published' AND f.deleted_at IS NULL`

	pf := &domain.PublicForm{}
	err := r.pool.QueryRow(ctx, query, slug).Scan(
		&pf.ID, &pf.OrganizationID, &pf.Title, &pf.Slug, &pf.Description,
		&pf.FormVersionID, &pf.VersionNumber, &pf.FlowDefinition, &pf.Theme, &pf.Settings,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("PublicFormRepository.GetPublishedBySlug: %w", err)
	}
	return pf, nil
}
