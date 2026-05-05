package repository

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/typecall/api/internal/db"
	"github.com/typecall/api/internal/domain"
)

type FormRepository interface {
	Create(ctx context.Context, form *domain.Form) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Form, error)
	List(ctx context.Context, params domain.ListFormsParams) (*domain.ListFormsResult, error)
	Update(ctx context.Context, form *domain.Form) error
	UpdateDraft(ctx context.Context, id uuid.UUID, draft json.RawMessage) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
	SlugExists(ctx context.Context, slug string) (bool, error)
}

type FormVersionRepository interface {
	Create(ctx context.Context, v *domain.FormVersion) error
	ListByFormID(ctx context.Context, formID uuid.UUID) ([]domain.FormVersion, error)
	GetLatestByFormID(ctx context.Context, formID uuid.UUID) (*domain.FormVersion, error)
}

type formRepository struct {
	pool *pgxpool.Pool
}

func NewFormRepository(pool *pgxpool.Pool) FormRepository {
	return &formRepository{pool: pool}
}

func (r *formRepository) Create(ctx context.Context, form *domain.Form) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		INSERT INTO forms (id, organization_id, title, slug, description, status, version,
			draft_definition, theme, settings, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`

	_, err := conn.Exec(ctx, query,
		form.ID, form.OrganizationID, form.Title, form.Slug, form.Description,
		form.Status, form.Version, form.DraftDefinition, form.Theme, form.Settings,
		form.CreatedAt, form.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("FormRepository.Create: %w", err)
	}
	return nil
}

func (r *formRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Form, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, organization_id, title, slug, description, status, version,
			draft_definition, theme, settings, published_at, created_at, updated_at
		FROM forms
		WHERE id = $1 AND deleted_at IS NULL`

	form := &domain.Form{}
	err := conn.QueryRow(ctx, query, id).Scan(
		&form.ID, &form.OrganizationID, &form.Title, &form.Slug, &form.Description,
		&form.Status, &form.Version, &form.DraftDefinition, &form.Theme, &form.Settings,
		&form.PublishedAt, &form.CreatedAt, &form.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("FormRepository.GetByID: %w", err)
	}
	return form, nil
}

func (r *formRepository) List(ctx context.Context, params domain.ListFormsParams) (*domain.ListFormsResult, error) {
	conn := db.Conn(ctx, r.pool)

	conditions := []string{"deleted_at IS NULL"}
	args := []any{}
	argIdx := 1

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
		SELECT id, organization_id, title, slug, description, status, version,
			theme, settings, published_at, created_at, updated_at
		FROM forms
		WHERE %s
		ORDER BY created_at DESC, id DESC
		LIMIT $%d`, strings.Join(conditions, " AND "), argIdx)
	args = append(args, limit+1)

	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("FormRepository.List: %w", err)
	}
	defer rows.Close()

	forms := make([]domain.Form, 0, limit)
	for rows.Next() {
		var f domain.Form
		if err := rows.Scan(
			&f.ID, &f.OrganizationID, &f.Title, &f.Slug, &f.Description,
			&f.Status, &f.Version, &f.Theme, &f.Settings,
			&f.PublishedAt, &f.CreatedAt, &f.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("FormRepository.List: scan: %w", err)
		}
		forms = append(forms, f)
	}

	hasMore := len(forms) > limit
	if hasMore {
		forms = forms[:limit]
	}

	var nextCursor *string
	if hasMore && len(forms) > 0 {
		last := forms[len(forms)-1]
		c := encodeCursor(last.CreatedAt, last.ID)
		nextCursor = &c
	}

	return &domain.ListFormsResult{
		Forms:      forms,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

func (r *formRepository) Update(ctx context.Context, form *domain.Form) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		UPDATE forms
		SET title = $2, slug = $3, description = $4, status = $5, version = $6,
			theme = $7, settings = $8, published_at = $9
		WHERE id = $1 AND deleted_at IS NULL`

	tag, err := conn.Exec(ctx, query,
		form.ID, form.Title, form.Slug, form.Description, form.Status,
		form.Version, form.Theme, form.Settings, form.PublishedAt,
	)
	if err != nil {
		return fmt.Errorf("FormRepository.Update: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("FormRepository.Update: form not found")
	}
	return nil
}

func (r *formRepository) UpdateDraft(ctx context.Context, id uuid.UUID, draft json.RawMessage) error {
	conn := db.Conn(ctx, r.pool)
	query := `UPDATE forms SET draft_definition = $2 WHERE id = $1 AND deleted_at IS NULL`

	tag, err := conn.Exec(ctx, query, id, draft)
	if err != nil {
		return fmt.Errorf("FormRepository.UpdateDraft: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("FormRepository.UpdateDraft: form not found")
	}
	return nil
}

func (r *formRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	conn := db.Conn(ctx, r.pool)
	query := `UPDATE forms SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`

	tag, err := conn.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("FormRepository.SoftDelete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("FormRepository.SoftDelete: form not found")
	}
	return nil
}

func (r *formRepository) SlugExists(ctx context.Context, slug string) (bool, error) {
	conn := db.Conn(ctx, r.pool)
	query := `SELECT EXISTS(SELECT 1 FROM forms WHERE slug = $1 AND deleted_at IS NULL)`

	var exists bool
	err := conn.QueryRow(ctx, query, slug).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("FormRepository.SlugExists: %w", err)
	}
	return exists, nil
}

// FormVersionRepository implementation

type formVersionRepository struct {
	pool *pgxpool.Pool
}

func NewFormVersionRepository(pool *pgxpool.Pool) FormVersionRepository {
	return &formVersionRepository{pool: pool}
}

func (r *formVersionRepository) Create(ctx context.Context, v *domain.FormVersion) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		INSERT INTO form_versions (id, form_id, organization_id, version_number, flow_definition, published_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := conn.Exec(ctx, query,
		v.ID, v.FormID, v.OrganizationID, v.VersionNumber, v.FlowDefinition, v.PublishedBy, v.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("FormVersionRepository.Create: %w", err)
	}
	return nil
}

func (r *formVersionRepository) ListByFormID(ctx context.Context, formID uuid.UUID) ([]domain.FormVersion, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, form_id, organization_id, version_number, flow_definition, published_by, created_at
		FROM form_versions
		WHERE form_id = $1
		ORDER BY version_number DESC`

	rows, err := conn.Query(ctx, query, formID)
	if err != nil {
		return nil, fmt.Errorf("FormVersionRepository.ListByFormID: %w", err)
	}
	defer rows.Close()

	var versions []domain.FormVersion
	for rows.Next() {
		var v domain.FormVersion
		if err := rows.Scan(
			&v.ID, &v.FormID, &v.OrganizationID, &v.VersionNumber,
			&v.FlowDefinition, &v.PublishedBy, &v.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("FormVersionRepository.ListByFormID: scan: %w", err)
		}
		versions = append(versions, v)
	}
	return versions, nil
}

func (r *formVersionRepository) GetLatestByFormID(ctx context.Context, formID uuid.UUID) (*domain.FormVersion, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, form_id, organization_id, version_number, flow_definition, published_by, created_at
		FROM form_versions
		WHERE form_id = $1
		ORDER BY version_number DESC
		LIMIT 1`

	v := &domain.FormVersion{}
	err := conn.QueryRow(ctx, query, formID).Scan(
		&v.ID, &v.FormID, &v.OrganizationID, &v.VersionNumber,
		&v.FlowDefinition, &v.PublishedBy, &v.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("FormVersionRepository.GetLatestByFormID: %w", err)
	}
	return v, nil
}

func encodeCursor(t time.Time, id uuid.UUID) string {
	raw := fmt.Sprintf("%d:%s", t.UnixNano(), id.String())
	return base64.URLEncoding.EncodeToString([]byte(raw))
}

func decodeCursor(cursor string) (time.Time, uuid.UUID, error) {
	raw, err := base64.URLEncoding.DecodeString(cursor)
	if err != nil {
		return time.Time{}, uuid.Nil, err
	}
	parts := strings.SplitN(string(raw), ":", 2)
	if len(parts) != 2 {
		return time.Time{}, uuid.Nil, fmt.Errorf("invalid cursor")
	}
	nano, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return time.Time{}, uuid.Nil, err
	}
	id, err := uuid.Parse(parts[1])
	if err != nil {
		return time.Time{}, uuid.Nil, err
	}
	return time.Unix(0, nano), id, nil
}
