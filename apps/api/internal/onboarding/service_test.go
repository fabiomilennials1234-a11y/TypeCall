package onboarding

import (
	"encoding/json"
	"testing"
)

func TestFlowHasNodes(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want bool
	}{
		{"empty bytes", "", false},
		{"empty json", `{}`, false},
		{"empty nodes array", `{"nodes":[],"edges":[]}`, false},
		{"single node", `{"nodes":[{"id":"a","type":"welcome"}],"edges":[]}`, true},
		{"multiple nodes", `{"nodes":[{"id":"a"},{"id":"b"}]}`, true},
		{"malformed json", `{nodes:`, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := flowHasNodes(json.RawMessage(tt.raw))
			if got != tt.want {
				t.Errorf("flowHasNodes(%q) = %v, want %v", tt.raw, got, tt.want)
			}
		})
	}
}

func TestMetaPixelIDRegex(t *testing.T) {
	tests := []struct {
		input string
		match bool
	}{
		{"123456789012345", true},     // 15 digits
		{"1234567890123456", true},    // 16 digits
		{"12345678901234", false},     // 14 digits
		{"12345678901234567", false},  // 17 digits
		{"abc123456789012", false},    // letters
		{"", false},                   // empty
		{"123-456-789-0123", false},   // dashes
	}
	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := metaPixelIDRegex.MatchString(tt.input)
			if got != tt.match {
				t.Errorf("regex.MatchString(%q) = %v, want %v", tt.input, got, tt.match)
			}
		})
	}
}
