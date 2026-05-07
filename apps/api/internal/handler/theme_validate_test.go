package handler

import (
	"encoding/json"
	"testing"
)

func TestValidateThemeJSON(t *testing.T) {
	valid := `{
		"background": {"kind": "color", "color": "#ffffff"},
		"primaryColor": "hsl(263 70% 58%)",
		"textColor": "#0f172a",
		"cardColor": "rgba(255,255,255,0.9)",
		"headingFont": "playfair",
		"bodyFont": "inter",
		"borderRadius": "lg",
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
		{"valid gradient", `{"background":{"kind":"gradient","from":"#000","to":"#fff","angle":90},"primaryColor":"#fff","textColor":"#000","cardColor":"#000","headingFont":"inter","bodyFont":"inter","borderRadius":"md","alignment":"left"}`, false},
		{"valid image", `{"background":{"kind":"image","url":"/uploads/x.jpg","fit":"cover","assetId":"a"},"primaryColor":"#fff","textColor":"#000","cardColor":"#000","headingFont":"geist","bodyFont":"inter","borderRadius":"none","alignment":"left"}`, false},

		{"unknown field rejected", `{"background":{"kind":"color","color":"#fff"},"primaryColor":"#fff","textColor":"#000","cardColor":"#000","headingFont":"inter","bodyFont":"inter","borderRadius":"md","alignment":"left","customCss":"x"}`, true},
		{"bad bg kind", `{"background":{"kind":"video"},"primaryColor":"#fff","textColor":"#000","cardColor":"#000","headingFont":"inter","bodyFont":"inter","borderRadius":"md","alignment":"left"}`, true},
		{"bad color", `{"background":{"kind":"color","color":"javascript:alert"},"primaryColor":"#fff","textColor":"#000","cardColor":"#000","headingFont":"inter","bodyFont":"inter","borderRadius":"md","alignment":"left"}`, true},
		{"unknown font", `{"background":{"kind":"color","color":"#fff"},"primaryColor":"#fff","textColor":"#000","cardColor":"#000","headingFont":"comic","bodyFont":"inter","borderRadius":"md","alignment":"left"}`, true},
		{"bad radius", `{"background":{"kind":"color","color":"#fff"},"primaryColor":"#fff","textColor":"#000","cardColor":"#000","headingFont":"inter","bodyFont":"inter","borderRadius":"huge","alignment":"left"}`, true},
		{"bad alignment", `{"background":{"kind":"color","color":"#fff"},"primaryColor":"#fff","textColor":"#000","cardColor":"#000","headingFont":"inter","bodyFont":"inter","borderRadius":"md","alignment":"right"}`, true},
		{"angle out of range", `{"background":{"kind":"gradient","from":"#000","to":"#fff","angle":400},"primaryColor":"#fff","textColor":"#000","cardColor":"#000","headingFont":"inter","bodyFont":"inter","borderRadius":"md","alignment":"left"}`, true},
		{"image missing url", `{"background":{"kind":"image","fit":"cover"},"primaryColor":"#fff","textColor":"#000","cardColor":"#000","headingFont":"inter","bodyFont":"inter","borderRadius":"md","alignment":"left"}`, true},
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
