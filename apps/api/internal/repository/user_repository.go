package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/typecall/api/internal/domain"
)

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) ([]domain.User, error)
	GetByOrgAndEmail(ctx context.Context, orgID uuid.UUID, email string) (*domain.User, error)
	UpdateLastLogin(ctx context.Context, id uuid.UUID) error
}

type userRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) UserRepository {
	return &userRepository{pool: pool}
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (id, organization_id, email, password_hash, name, role, avatar_url, timezone, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	_, err := r.pool.Exec(ctx, query,
		user.ID, user.OrganizationID, user.Email, user.PasswordHash, user.Name,
		user.Role, user.AvatarURL, user.Timezone, user.IsActive, user.CreatedAt, user.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("UserRepository.Create: %w", err)
	}
	return nil
}

func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	query := `
		SELECT id, organization_id, email, password_hash, name, role, avatar_url, timezone, is_active, last_login_at, created_at, updated_at
		FROM users WHERE id = $1`

	return r.scanUser(r.pool.QueryRow(ctx, query, id))
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) ([]domain.User, error) {
	query := `
		SELECT id, organization_id, email, password_hash, name, role, avatar_url, timezone, is_active, last_login_at, created_at, updated_at
		FROM users WHERE email = $1 AND is_active = true`

	rows, err := r.pool.Query(ctx, query, email)
	if err != nil {
		return nil, fmt.Errorf("UserRepository.GetByEmail: %w", err)
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		user := domain.User{}
		err := rows.Scan(
			&user.ID, &user.OrganizationID, &user.Email, &user.PasswordHash, &user.Name,
			&user.Role, &user.AvatarURL, &user.Timezone, &user.IsActive, &user.LastLoginAt,
			&user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("UserRepository.GetByEmail: scan: %w", err)
		}
		users = append(users, user)
	}
	return users, nil
}

func (r *userRepository) GetByOrgAndEmail(ctx context.Context, orgID uuid.UUID, email string) (*domain.User, error) {
	query := `
		SELECT id, organization_id, email, password_hash, name, role, avatar_url, timezone, is_active, last_login_at, created_at, updated_at
		FROM users WHERE organization_id = $1 AND email = $2`

	return r.scanUser(r.pool.QueryRow(ctx, query, orgID, email))
}

func (r *userRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE users SET last_login_at = $2 WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id, time.Now())
	if err != nil {
		return fmt.Errorf("UserRepository.UpdateLastLogin: %w", err)
	}
	return nil
}

func (r *userRepository) scanUser(row pgx.Row) (*domain.User, error) {
	user := &domain.User{}
	err := row.Scan(
		&user.ID, &user.OrganizationID, &user.Email, &user.PasswordHash, &user.Name,
		&user.Role, &user.AvatarURL, &user.Timezone, &user.IsActive, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("UserRepository.scanUser: %w", err)
	}
	return user, nil
}
