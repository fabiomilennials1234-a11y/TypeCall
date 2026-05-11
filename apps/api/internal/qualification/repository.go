// Package qualification implements lead qualification: rules per quiz block,
// scoring engine, and persisted snapshots in lead_scores.
package qualification

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/typecall/api/internal/db"
	"github.com/typecall/api/internal/domain"
)

var (
	ErrRuleNotFound  = errors.New("qualification rule not found")
	ErrScoreNotFound = errors.New("lead score not found")
)

type Repository interface {
	CreateRule(ctx context.Context, r *domain.QualificationRule) error
	UpdateRule(ctx context.Context, r *domain.QualificationRule) error
	DeleteRule(ctx context.Context, id uuid.UUID) error
	ListRulesByForm(ctx context.Context, formID uuid.UUID) ([]domain.QualificationRule, error)
	UpsertScore(ctx context.Context, s *domain.LeadScore) error
	GetScoreByResponse(ctx context.Context, responseID uuid.UUID) (*domain.LeadScore, error)
}

type pgRepo struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgRepo{pool: pool}
}

func (r *pgRepo) CreateRule(ctx context.Context, q *domain.QualificationRule) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		INSERT INTO qualification_rules
			(id, form_id, block_id, organization_id, answer_value, tag, priority, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
		RETURNING created_at, updated_at`

	err := conn.QueryRow(ctx, query,
		q.ID, q.FormID, q.BlockID, q.OrganizationID, q.AnswerValue, q.Tag, q.Priority,
	).Scan(&q.CreatedAt, &q.UpdatedAt)
	if err != nil {
		return fmt.Errorf("qualification.Repository.CreateRule: %w", err)
	}
	return nil
}

func (r *pgRepo) UpdateRule(ctx context.Context, q *domain.QualificationRule) error {
	conn := db.Conn(ctx, r.pool)
	tag, err := conn.Exec(ctx, `
		UPDATE qualification_rules
		   SET answer_value = $2, tag = $3, priority = $4, updated_at = now()
		 WHERE id = $1`,
		q.ID, q.AnswerValue, q.Tag, q.Priority,
	)
	if err != nil {
		return fmt.Errorf("qualification.Repository.UpdateRule: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrRuleNotFound
	}
	return nil
}

func (r *pgRepo) DeleteRule(ctx context.Context, id uuid.UUID) error {
	conn := db.Conn(ctx, r.pool)
	tag, err := conn.Exec(ctx, `DELETE FROM qualification_rules WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("qualification.Repository.DeleteRule: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrRuleNotFound
	}
	return nil
}

func (r *pgRepo) ListRulesByForm(ctx context.Context, formID uuid.UUID) ([]domain.QualificationRule, error) {
	conn := db.Conn(ctx, r.pool)
	rows, err := conn.Query(ctx, `
		SELECT id, form_id, block_id, organization_id, answer_value, tag, priority, created_at, updated_at
		  FROM qualification_rules
		 WHERE form_id = $1
		 ORDER BY priority DESC, created_at ASC`, formID)
	if err != nil {
		return nil, fmt.Errorf("qualification.Repository.ListRulesByForm: %w", err)
	}
	defer rows.Close()

	out := make([]domain.QualificationRule, 0)
	for rows.Next() {
		var q domain.QualificationRule
		if err := rows.Scan(
			&q.ID, &q.FormID, &q.BlockID, &q.OrganizationID,
			&q.AnswerValue, &q.Tag, &q.Priority, &q.CreatedAt, &q.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("qualification.Repository.ListRulesByForm: scan: %w", err)
		}
		out = append(out, q)
	}
	return out, nil
}

func (r *pgRepo) UpsertScore(ctx context.Context, s *domain.LeadScore) error {
	conn := db.Conn(ctx, r.pool)
	scores := s.Scores
	if len(scores) == 0 {
		scores = json.RawMessage(`{}`)
	}
	query := `
		INSERT INTO lead_scores (id, response_id, organization_id, final_tag, scores, created_at)
		VALUES ($1, $2, $3, $4, $5, now())
		ON CONFLICT (response_id) DO UPDATE SET
			final_tag = EXCLUDED.final_tag,
			scores    = EXCLUDED.scores
		RETURNING id, created_at`

	err := conn.QueryRow(ctx, query, s.ID, s.ResponseID, s.OrganizationID, s.FinalTag, scores).
		Scan(&s.ID, &s.CreatedAt)
	if err != nil {
		return fmt.Errorf("qualification.Repository.UpsertScore: %w", err)
	}
	s.Scores = scores
	return nil
}

func (r *pgRepo) GetScoreByResponse(ctx context.Context, responseID uuid.UUID) (*domain.LeadScore, error) {
	conn := db.Conn(ctx, r.pool)
	s := &domain.LeadScore{}
	err := conn.QueryRow(ctx, `
		SELECT id, response_id, organization_id, final_tag, scores, created_at
		  FROM lead_scores
		 WHERE response_id = $1`, responseID).Scan(
		&s.ID, &s.ResponseID, &s.OrganizationID, &s.FinalTag, &s.Scores, &s.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrScoreNotFound
		}
		return nil, fmt.Errorf("qualification.Repository.GetScoreByResponse: %w", err)
	}
	return s, nil
}
