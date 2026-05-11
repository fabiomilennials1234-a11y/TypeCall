package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
)

func TestFormService_Create(t *testing.T) {
	orgID := uuid.New()

	tests := []struct {
		name      string
		input     domain.CreateFormInput
		slugTaken bool
		wantErr   bool
	}{
		{
			name:      "happy path",
			input:     domain.CreateFormInput{Title: "Onboarding Form", Description: "Welcome"},
			slugTaken: false,
			wantErr:   false,
		},
		{
			name:      "slug conflict appends uuid suffix",
			input:     domain.CreateFormInput{Title: "Onboarding Form"},
			slugTaken: true,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var createdForm *domain.Form
			formRepo := &mockFormRepository{
				SlugExistsFn: func(_ context.Context, _ string) (bool, error) {
					return tt.slugTaken, nil
				},
				CreateFn: func(_ context.Context, f *domain.Form) error {
					createdForm = f
					return nil
				},
			}
			versionRepo := &mockFormVersionRepository{}

			svc := NewFormService(formRepo, versionRepo)
			form, err := svc.Create(context.Background(), orgID, tt.input)

			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if form == nil {
				t.Fatal("expected form, got nil")
			}
			if form.Title != "Onboarding Form" {
				t.Errorf("expected title 'Onboarding Form', got %q", form.Title)
			}
			if form.Status != domain.FormStatusDraft {
				t.Errorf("expected status draft, got %s", form.Status)
			}
			if form.OrganizationID != orgID {
				t.Errorf("expected orgID %s, got %s", orgID, form.OrganizationID)
			}
			if tt.slugTaken && createdForm != nil {
				if len(createdForm.Slug) <= len("onboarding-form") {
					t.Error("expected slug to have UUID suffix appended")
				}
			}
		})
	}
}

func TestFormService_Update(t *testing.T) {
	formID := uuid.New()
	orgID := uuid.New()
	existingForm := &domain.Form{
		ID:             formID,
		OrganizationID: orgID,
		Title:          "Original",
		Slug:           "original",
		Status:         domain.FormStatusDraft,
		DraftDefinition: json.RawMessage(`{"nodes":[]}`),
		Theme:          json.RawMessage(`{}`),
		Settings:       json.RawMessage(`{}`),
	}

	newTitle := "Updated Title"

	tests := []struct {
		name      string
		input     domain.UpdateFormInput
		setupForm func(*mockFormRepository)
		wantErr   error
	}{
		{
			name:  "happy path",
			input: domain.UpdateFormInput{Title: &newTitle},
			setupForm: func(m *mockFormRepository) {
				m.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.Form, error) {
					cp := *existingForm
					return &cp, nil
				}
			},
			wantErr: nil,
		},
		{
			name:  "form not found",
			input: domain.UpdateFormInput{Title: &newTitle},
			setupForm: func(m *mockFormRepository) {
				m.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.Form, error) {
					return nil, nil
				}
			},
			wantErr: ErrFormNotFound,
		},
		{
			name: "slug conflict",
			input: func() domain.UpdateFormInput {
				s := "taken-slug"
				return domain.UpdateFormInput{Slug: &s}
			}(),
			setupForm: func(m *mockFormRepository) {
				m.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.Form, error) {
					cp := *existingForm
					return &cp, nil
				}
				m.SlugExistsFn = func(_ context.Context, _ string) (bool, error) {
					return true, nil
				}
			},
			wantErr: ErrSlugConflict,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			formRepo := &mockFormRepository{}
			tt.setupForm(formRepo)
			versionRepo := &mockFormVersionRepository{}

			svc := NewFormService(formRepo, versionRepo)
			form, err := svc.Update(context.Background(), uuid.New(), formID, tt.input)

			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error %v, got nil", tt.wantErr)
				}
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("expected %v, got %v", tt.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if form.Title != "Updated Title" {
				t.Errorf("expected title 'Updated Title', got %q", form.Title)
			}
		})
	}
}

func TestFormService_Publish(t *testing.T) {
	formID := uuid.New()
	orgID := uuid.New()
	userID := uuid.New()

	tests := []struct {
		name      string
		setupForm func(*mockFormRepository)
		wantErr   error
	}{
		{
			name: "happy path",
			setupForm: func(m *mockFormRepository) {
				m.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.Form, error) {
					return &domain.Form{
						ID: formID, OrganizationID: orgID,
						Status:          domain.FormStatusDraft,
						Version:         0,
						DraftDefinition: json.RawMessage(`{"nodes":[{"id":"q1"}],"edges":[]}`),
						Theme:           json.RawMessage(`{}`),
						Settings:        json.RawMessage(`{}`),
					}, nil
				}
			},
			wantErr: nil,
		},
		{
			name: "form not found",
			setupForm: func(m *mockFormRepository) {
				m.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.Form, error) {
					return nil, nil
				}
			},
			wantErr: ErrFormNotFound,
		},
		{
			name: "empty draft",
			setupForm: func(m *mockFormRepository) {
				m.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.Form, error) {
					return &domain.Form{
						ID: formID, OrganizationID: orgID,
						Status:          domain.FormStatusDraft,
						Version:         0,
						DraftDefinition: json.RawMessage(`{"nodes":[],"edges":[]}`),
						Theme:           json.RawMessage(`{}`),
						Settings:        json.RawMessage(`{}`),
					}, nil
				}
			},
			wantErr: ErrEmptyDraft,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			formRepo := &mockFormRepository{}
			tt.setupForm(formRepo)
			versionRepo := &mockFormVersionRepository{}

			svc := NewFormService(formRepo, versionRepo)
			version, err := svc.Publish(context.Background(), uuid.New(), formID, userID)

			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected %v, got nil", tt.wantErr)
				}
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("expected %v, got %v", tt.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if version == nil {
				t.Fatal("expected version, got nil")
			}
			if version.VersionNumber != 1 {
				t.Errorf("expected version 1, got %d", version.VersionNumber)
			}
			if version.FormID != formID {
				t.Errorf("expected formID %s, got %s", formID, version.FormID)
			}
		})
	}
}

func TestFormService_Delete(t *testing.T) {
	formID := uuid.New()
	orgID := uuid.New()
	deleted := false

	formRepo := &mockFormRepository{
		GetByIDFn: func(_ context.Context, id uuid.UUID) (*domain.Form, error) {
			return &domain.Form{ID: id, OrganizationID: orgID}, nil
		},
		SoftDeleteFn: func(_ context.Context, _ uuid.UUID) error {
			deleted = true
			return nil
		},
	}
	versionRepo := &mockFormVersionRepository{}
	svc := NewFormService(formRepo, versionRepo)

	if err := svc.Delete(context.Background(), orgID, formID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !deleted {
		t.Error("expected SoftDelete to be called")
	}
}

func TestFormService_SaveDraft(t *testing.T) {
	formID := uuid.New()
	orgID := uuid.New()
	var savedDraft json.RawMessage

	formRepo := &mockFormRepository{
		GetByIDFn: func(_ context.Context, id uuid.UUID) (*domain.Form, error) {
			return &domain.Form{ID: id, OrganizationID: orgID}, nil
		},
		UpdateDraftFn: func(_ context.Context, _ uuid.UUID, draft json.RawMessage) error {
			savedDraft = draft
			return nil
		},
	}
	versionRepo := &mockFormVersionRepository{}
	svc := NewFormService(formRepo, versionRepo)

	draft := json.RawMessage(`{"nodes":[{"id":"q1","type":"text"}]}`)
	if err := svc.SaveDraft(context.Background(), orgID, formID, draft); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(string(savedDraft), "q1") {
		t.Error("expected draft to contain q1")
	}
}
