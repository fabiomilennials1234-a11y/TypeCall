package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type LeadTag string

const (
	LeadTagDiamond      LeadTag = "diamond"
	LeadTagGold         LeadTag = "gold"
	LeadTagSilver       LeadTag = "silver"
	LeadTagBronze       LeadTag = "bronze"
	LeadTagDisqualified LeadTag = "disqualified"
)

// Priority is the resolution order when a response matches multiple tags.
// Higher number wins.
func (t LeadTag) Priority() int {
	switch t {
	case LeadTagDiamond:
		return 5
	case LeadTagGold:
		return 4
	case LeadTagSilver:
		return 3
	case LeadTagBronze:
		return 2
	case LeadTagDisqualified:
		return 1
	}
	return 0
}

type QualificationRule struct {
	ID             uuid.UUID `json:"id"`
	FormID         uuid.UUID `json:"form_id"`
	BlockID        string    `json:"block_id"`
	OrganizationID uuid.UUID `json:"organization_id"`
	AnswerValue    string    `json:"answer_value"`
	Tag            LeadTag   `json:"tag"`
	Priority       int       `json:"priority"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type CreateQualificationRuleInput struct {
	FormID      uuid.UUID `json:"form_id"`
	BlockID     string    `json:"block_id"`
	AnswerValue string    `json:"answer_value"`
	Tag         LeadTag   `json:"tag"`
	Priority    int       `json:"priority"`
}

type LeadScore struct {
	ID             uuid.UUID       `json:"id"`
	ResponseID     uuid.UUID       `json:"response_id"`
	OrganizationID uuid.UUID       `json:"organization_id"`
	FinalTag       LeadTag         `json:"final_tag"`
	Scores         json.RawMessage `json:"scores"`
	CreatedAt      time.Time       `json:"created_at"`
}

// ScoreBreakdown is the JSONB shape persisted in lead_scores.scores. Captures
// every rule that matched plus the resolved winning tag for auditability.
type ScoreBreakdown struct {
	Matches  []ScoreMatch `json:"matches"`
	Winner   LeadTag      `json:"winner"`
	WinnerBy string       `json:"winner_by"` // "priority" | "tag_priority" | "first"
}

type ScoreMatch struct {
	RuleID      uuid.UUID `json:"rule_id"`
	BlockID     string    `json:"block_id"`
	AnswerValue string    `json:"answer_value"`
	Tag         LeadTag   `json:"tag"`
	Priority    int       `json:"priority"`
}
