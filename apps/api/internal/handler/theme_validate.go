package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
)

// themeShape mirrors the FormTheme TS type. Unknown fields are rejected to keep
// the JSONB column schema-bound and prevent injection of arbitrary CSS later.
//
// HeadingFont/BodyFont are legacy fields kept here so older theme blobs still
// validate. They are ignored at render time — fonts are now per-block.
type themeShape struct {
	Background   themeBackground `json:"background"`
	PrimaryColor string          `json:"primary_color"`
	TextColor    string          `json:"text_color"`
	CardColor    string          `json:"card_color"`
	HeadingFont  string          `json:"heading_font,omitempty"`
	BodyFont     string          `json:"body_font,omitempty"`
	BorderRadius string          `json:"border_radius"`
	Alignment    string          `json:"alignment"`
}

type themeBackground struct {
	Kind     string `json:"kind"`
	Color    string `json:"color,omitempty"`
	From     string `json:"from,omitempty"`
	To       string `json:"to,omitempty"`
	Angle    int    `json:"angle,omitempty"`
	AssetID  string `json:"asset_id,omitempty"`
	URL      string `json:"url,omitempty"`
	Fit      string `json:"fit,omitempty"`
}

var (
	radiusEnum    = map[string]bool{"none": true, "sm": true, "md": true, "lg": true, "xl": true}
	alignmentEnum = map[string]bool{"left": true, "center": true}
	fontEnum      = map[string]bool{
		"inter": true, "geist": true, "manrope": true, "space-grotesk": true,
		"playfair": true, "cormorant": true, "crimson": true, "jetbrains": true,
	}
	bgKindEnum = map[string]bool{"color": true, "gradient": true, "image": true}
	fitEnum    = map[string]bool{"cover": true, "contain": true, "": true}

	cssColorRe = regexp.MustCompile(`^(#[0-9a-fA-F]{3,8}|hsl\([^)]{1,80}\)|rgb\([^)]{1,80}\)|rgba\([^)]{1,80}\)|hsla\([^)]{1,80}\))$`)
)

// validateThemeJSON enforces the FormTheme contract on the raw JSONB blob.
// Returns nil if valid, error with the first issue otherwise. Empty / null
// theme is accepted (treated as "use defaults").
func validateThemeJSON(raw json.RawMessage) error {
	if len(raw) == 0 || string(raw) == "null" || string(raw) == "{}" {
		return nil
	}

	var reader io.Reader = bytes.NewReader(raw)
	dec := json.NewDecoder(reader)
	dec.DisallowUnknownFields()

	var t themeShape
	if err := dec.Decode(&t); err != nil {
		return fmt.Errorf("invalid theme shape: %w", err)
	}

	if !bgKindEnum[t.Background.Kind] {
		return fmt.Errorf("background.kind must be color|gradient|image")
	}
	switch t.Background.Kind {
	case "color":
		if !cssColorRe.MatchString(t.Background.Color) {
			return fmt.Errorf("background.color must be a CSS color")
		}
	case "gradient":
		if !cssColorRe.MatchString(t.Background.From) || !cssColorRe.MatchString(t.Background.To) {
			return fmt.Errorf("background.from / background.to must be CSS colors")
		}
		if t.Background.Angle < 0 || t.Background.Angle > 360 {
			return fmt.Errorf("background.angle must be 0-360")
		}
	case "image":
		if t.Background.URL == "" {
			return fmt.Errorf("background.url is required for image kind")
		}
		if !fitEnum[t.Background.Fit] {
			return fmt.Errorf("background.fit must be cover|contain")
		}
	}

	if !cssColorRe.MatchString(t.PrimaryColor) {
		return fmt.Errorf("primaryColor must be a CSS color")
	}
	if !cssColorRe.MatchString(t.TextColor) {
		return fmt.Errorf("textColor must be a CSS color")
	}
	if !cssColorRe.MatchString(t.CardColor) {
		return fmt.Errorf("cardColor must be a CSS color")
	}
	// legacy headingFont/bodyFont kept optional; if present, must still be a known font
	if t.HeadingFont != "" && !fontEnum[t.HeadingFont] {
		return fmt.Errorf("headingFont must be one of the curated fonts")
	}
	if t.BodyFont != "" && !fontEnum[t.BodyFont] {
		return fmt.Errorf("bodyFont must be one of the curated fonts")
	}
	if !radiusEnum[t.BorderRadius] {
		return fmt.Errorf("borderRadius must be none|sm|md|lg|xl")
	}
	if !alignmentEnum[t.Alignment] {
		return fmt.Errorf("alignment must be left|center")
	}

	return nil
}

