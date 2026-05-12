package service

import (
	"bytes"
	"context"
	"errors"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

type mockAssetRepository struct {
	CreateFn func(ctx context.Context, a *domain.FormAsset) error
}

func (m *mockAssetRepository) Create(ctx context.Context, a *domain.FormAsset) error {
	if m.CreateFn != nil {
		return m.CreateFn(ctx, a)
	}
	return nil
}
func (m *mockAssetRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.FormAsset, error) {
	return nil, repository.ErrAssetNotFound
}
func (m *mockAssetRepository) ListByForm(ctx context.Context, formID uuid.UUID) ([]domain.FormAsset, error) {
	return nil, nil
}
func (m *mockAssetRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

func TestAssetService_Upload(t *testing.T) {
	tmpDir := t.TempDir()
	formID := uuid.New()
	orgID := uuid.New()
	body := bytes.NewReader([]byte("FAKEPNGDATA"))

	svc := NewAssetService(&mockAssetRepository{}, tmpDir)
	asset, err := svc.Upload(context.Background(), formID, orgID, "image/png", int64(body.Len()), body)
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	if !strings.HasSuffix(asset.URL, ".png") {
		t.Errorf("expected .png suffix, got %s", asset.URL)
	}
	if asset.OrganizationID != orgID || asset.FormID != formID {
		t.Errorf("ids mismatch")
	}
	// File should exist
	abs := tmpDir + "/" + asset.StoragePath
	if _, err := os.Stat(abs); err != nil {
		t.Errorf("file not on disk: %v", err)
	}
}

func TestAssetService_Upload_RejectsBadMime(t *testing.T) {
	svc := NewAssetService(&mockAssetRepository{}, t.TempDir())
	_, err := svc.Upload(context.Background(), uuid.New(), uuid.New(), "application/pdf", 100, bytes.NewReader([]byte("x")))
	if !errors.Is(err, ErrAssetUnsupported) {
		t.Errorf("expected ErrAssetUnsupported, got %v", err)
	}
}

func TestAssetService_Upload_RejectsOversize(t *testing.T) {
	svc := NewAssetService(&mockAssetRepository{}, t.TempDir())
	_, err := svc.Upload(context.Background(), uuid.New(), uuid.New(), "image/jpeg", MaxAssetSize+1, bytes.NewReader([]byte("x")))
	if !errors.Is(err, ErrAssetTooLarge) {
		t.Errorf("expected ErrAssetTooLarge, got %v", err)
	}
}

func TestAssetService_Upload_TruncatesIfBodyExceedsLimit(t *testing.T) {
	// Header reports OK size but body exceeds — io.LimitReader should catch
	tmpDir := t.TempDir()
	big := make([]byte, MaxAssetSize+200)
	for i := range big {
		big[i] = 'x'
	}
	svc := NewAssetService(&mockAssetRepository{}, tmpDir)
	_, err := svc.Upload(context.Background(), uuid.New(), uuid.New(), "image/jpeg", MaxAssetSize, bytes.NewReader(big))
	if !errors.Is(err, ErrAssetTooLarge) {
		t.Errorf("expected ErrAssetTooLarge from streaming check, got %v", err)
	}
}

func TestAssetService_Upload_NormalizesMimeWithCharset(t *testing.T) {
	svc := NewAssetService(&mockAssetRepository{}, t.TempDir())
	_, err := svc.Upload(context.Background(), uuid.New(), uuid.New(), "image/jpeg; charset=binary", 5, bytes.NewReader([]byte("hello")))
	if err != nil {
		t.Errorf("expected normalize to strip params, got: %v", err)
	}
}
