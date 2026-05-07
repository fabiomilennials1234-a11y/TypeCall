package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

const (
	// MaxAssetSize caps uploads at 5 MB (typical hero image size).
	MaxAssetSize = 5 * 1024 * 1024
	// UploadDir is the on-disk root; nginx serves the same path in production.
	UploadDir = "data/uploads"
	// PublicURLPrefix is the path the static server mounts. Must match cmd/api/main.go.
	PublicURLPrefix = "/uploads"
)

var (
	ErrAssetTooLarge   = errors.New("asset exceeds maximum size")
	ErrAssetUnsupported = errors.New("asset mime type not supported")

	allowedMimes = map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/webp": ".webp",
		"image/gif":  ".gif",
	}
)

type AssetService interface {
	Upload(ctx context.Context, formID, orgID uuid.UUID, mimeType string, size int64, body io.Reader) (*domain.FormAsset, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type assetService struct {
	repo    repository.AssetRepository
	rootDir string
}

func NewAssetService(repo repository.AssetRepository, rootDir string) AssetService {
	if rootDir == "" {
		rootDir = UploadDir
	}
	return &assetService{repo: repo, rootDir: rootDir}
}

func (s *assetService) Upload(ctx context.Context, formID, orgID uuid.UUID, mimeType string, size int64, body io.Reader) (*domain.FormAsset, error) {
	if size > MaxAssetSize {
		return nil, ErrAssetTooLarge
	}

	mt := normalizeMime(mimeType)
	ext, ok := allowedMimes[mt]
	if !ok {
		return nil, ErrAssetUnsupported
	}

	id := uuid.New()
	relPath := filepath.ToSlash(filepath.Join(orgID.String(), id.String()+ext))
	absPath := filepath.Join(s.rootDir, relPath)

	if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
		return nil, fmt.Errorf("AssetService.Upload: mkdir: %w", err)
	}

	f, err := os.OpenFile(absPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		return nil, fmt.Errorf("AssetService.Upload: create file: %w", err)
	}
	defer f.Close()

	written, err := io.Copy(f, io.LimitReader(body, MaxAssetSize+1))
	if err != nil {
		_ = os.Remove(absPath)
		return nil, fmt.Errorf("AssetService.Upload: write: %w", err)
	}
	if written > MaxAssetSize {
		_ = os.Remove(absPath)
		return nil, ErrAssetTooLarge
	}

	asset := &domain.FormAsset{
		ID:             id,
		FormID:         formID,
		OrganizationID: orgID,
		StoragePath:    relPath,
		URL:            PublicURLPrefix + "/" + relPath,
		MimeType:       mt,
		SizeBytes:      written,
	}

	if err := s.repo.Create(ctx, asset); err != nil {
		_ = os.Remove(absPath)
		return nil, fmt.Errorf("AssetService.Upload: %w", err)
	}
	return asset, nil
}

func (s *assetService) Delete(ctx context.Context, id uuid.UUID) error {
	asset, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("AssetService.Delete: %w", err)
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("AssetService.Delete: %w", err)
	}
	abs := filepath.Join(s.rootDir, asset.StoragePath)
	_ = os.Remove(abs) // file deletion is best-effort; DB row is gone either way
	return nil
}

func normalizeMime(s string) string {
	mt, _, err := mime.ParseMediaType(s)
	if err != nil {
		return strings.ToLower(strings.TrimSpace(s))
	}
	return strings.ToLower(mt)
}
