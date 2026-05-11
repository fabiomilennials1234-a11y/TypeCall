package handler

import (
	"encoding/json"
	"testing"
)

func TestValidateThemeJSON(t *testing.T) {
	valid := `{
		"background": {"kind": "color", "color": "#ffffff"},
		"primary_color": "hsl(263 70% 58%)",
		"text_color": "#0f172a",
		"card_color": "rgba(255,255,255,0.9)",
		"heading_font": "playfair",
		"body_font": "inter",
		"border_radius": "lg",
		"alignment": "center"
	}`

	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{"empty", "", false},
		{"null", "null", false},
		{"empty object", "{}", false},
		{"valid color background", valid, false},
		{"valid without legacy fonts", `{"background":{"kind":"color","color":"#fff"},"primary_color":"#fff","text_color":"#000","card_color":"#000","border_radius":"md","alignment":"left"}`, false},
		{"valid gradient", `{"background":{"kind":"gradient","from":"#000","to":"#fff","angle":90},"primary_color":"#fff","text_color":"#000","card_color":"#000","heading_font":"inter","body_font":"inter","border_radius":"md","alignment":"left"}`, false},
		{"valid image", `{"background":{"kind":"image","url":"/uploads/x.jpg","fit":"cover","asset_id":"a"},"primary_color":"#fff","text_color":"#000","card_color":"#000","heading_font":"geist","body_font":"inter","border_radius":"none","alignment":"left"}`, false},

		{"unknown field rejected", `{"background":{"kind":"color","color":"#fff"},"primary_color":"#fff","text_color":"#000","card_color":"#000","heading_font":"inter","body_font":"inter","border_radius":"md","alignment":"left","custom_css":"x"}`, true},
		{"bad bg kind", `{"background":{"kind":"video"},"primary_color":"#fff","text_color":"#000","card_color":"#000","heading_font":"inter","body_font":"inter","border_radius":"md","alignment":"left"}`, true},
		{"bad color", `{"background":{"kind":"color","color":"javascript:alert"},"primary_color":"#fff","text_color":"#000","card_color":"#000","heading_font":"inter","body_font":"inter","border_radius":"md","alignment":"left"}`, true},
		{"unknown font", `{"background":{"kind":"color","color":"#fff"},"primary_color":"#fff","text_color":"#000","card_color":"#000","heading_font":"comic","body_font":"inter","border_radius":"md","alignment":"left"}`, true},
		{"bad radius", `{"background":{"kind":"color","color":"#fff"},"primary_color":"#fff","text_color":"#000","card_color":"#000","heading_font":"inter","body_font":"inter","border_radius":"huge","alignment":"left"}`, true},
		{"bad alignment", `{"background":{"kind":"color","color":"#fff"},"primary_color":"#fff","text_color":"#000","card_color":"#000","heading_font":"inter","body_font":"inter","border_radius":"md","alignment":"right"}`, true},
		{"angle out of range", `{"background":{"kind":"gradient","from":"#000","to":"#fff","angle":400},"primary_color":"#fff","text_color":"#000","card_color":"#000","heading_font":"inter","body_font":"inter","border_radius":"md","alignment":"left"}`, true},
		{"image missing url", `{"background":{"kind":"image","fit":"cover"},"primary_color":"#fff","text_color":"#000","card_color":"#000","heading_font":"inter","body_font":"inter","border_radius":"md","alignment":"left"}`, true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateThemeJSON(json.RawMessage(tc.input))
			if tc.wantErr && err == nil {
				t.Errorf("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}
