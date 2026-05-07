package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	mw "github.com/typecall/api/internal/middleware"
)

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type Validator struct {
	errors []FieldError
}

func (v *Validator) addError(field, message string) {
	v.errors = append(v.errors, FieldError{Field: field, Message: message})
}

// AddError exposes addError so handler-specific validators (e.g., theme schema
// checks) can record failures without re-implementing the whole struct.
func (v *Validator) AddError(field, message string) {
	v.addError(field, message)
}

func (v *Validator) HasErrors() bool {
	return len(v.errors) > 0
}

func (v *Validator) WriteResponse(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnprocessableEntity)
	json.NewEncoder(w).Encode(ErrorResponse{
		Error:   "validation failed",
		Code:    "VALIDATION_ERROR",
		Details: v.errors,
	})
}

func (v *Validator) Required(field, value string) {
	if strings.TrimSpace(value) == "" {
		v.addError(field, "is required")
	}
}

func (v *Validator) MinLen(field, value string, min int) {
	if value != "" && len(value) < min {
		v.addError(field, fmt.Sprintf("must be at least %d characters", min))
	}
}

func (v *Validator) MaxLen(field, value string, max int) {
	if len(value) > max {
		v.addError(field, fmt.Sprintf("must be at most %d characters", max))
	}
}

func (v *Validator) MaxBytes(field string, value json.RawMessage, max int) {
	if len(value) > max {
		v.addError(field, fmt.Sprintf("must be at most %d bytes", max))
	}
}

func (v *Validator) Email(field, value string) {
	if value == "" {
		v.addError(field, "is required")
		return
	}
	at := strings.IndexByte(value, '@')
	if at < 1 || at >= len(value)-1 {
		v.addError(field, "invalid email format")
		return
	}
	domain := value[at+1:]
	if !strings.Contains(domain, ".") || strings.HasSuffix(domain, ".") {
		v.addError(field, "invalid email format")
	}
}

func (v *Validator) Positive(field string, value int) {
	if value <= 0 {
		v.addError(field, "must be greater than 0")
	}
}

func (v *Validator) InRange(field string, value, min, max int) {
	if value < min || value > max {
		v.addError(field, fmt.Sprintf("must be between %d and %d", min, max))
	}
}

func (v *Validator) HTTPS(field, value string) {
	if value == "" {
		v.addError(field, "is required")
		return
	}
	if !strings.HasPrefix(value, "https://") {
		v.addError(field, "must use HTTPS")
		return
	}
	if _, err := url.ParseRequestURI(value); err != nil {
		v.addError(field, "invalid URL format")
	}
}

func (v *Validator) FutureTime(field string, value time.Time) {
	if value.IsZero() {
		v.addError(field, "is required")
		return
	}
	if value.Before(time.Now()) {
		v.addError(field, "must be in the future")
	}
}

var slugRegex = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

func (v *Validator) Slug(field, value string) {
	if value != "" && !slugRegex.MatchString(value) {
		v.addError(field, "must be lowercase alphanumeric with hyphens only")
	}
}

func (v *Validator) TimeBefore(fieldStart, fieldEnd, start, end string) {
	if start == "" || end == "" {
		return
	}
	if start >= end {
		v.addError(fieldEnd, "must be after "+fieldStart)
	}
}

func decodeBody(w http.ResponseWriter, r *http.Request, dest interface{}) bool {
	if err := json.NewDecoder(r.Body).Decode(dest); err != nil {
		if mw.HandleBodyTooLarge(err) {
			mw.WriteBodyTooLargeError(w)
			return false
		}
		writeError(w, http.StatusBadRequest, "invalid request body", "INVALID_INPUT")
		return false
	}
	return true
}
