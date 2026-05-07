package domain

import (
	"time"

	"github.com/google/uuid"
)

type SellerLocationType string

const (
	SellerLocationOnline     SellerLocationType = "online"
	SellerLocationWhatsapp   SellerLocationType = "whatsapp"
	SellerLocationPresencial SellerLocationType = "presencial"
)

type Seller struct {
	ID                     uuid.UUID          `json:"id"`
	UserID                 uuid.UUID          `json:"user_id"`
	OrganizationID         uuid.UUID          `json:"organization_id"`
	Name                   string             `json:"name"`
	MeetingDurationMinutes int                `json:"meeting_duration_minutes"`
	BufferAfterMinutes     int                `json:"buffer_after_minutes"`
	LocationType           SellerLocationType `json:"location_type"`
	Active                 bool               `json:"active"`
	CreatedAt              time.Time          `json:"created_at"`
	UpdatedAt              time.Time          `json:"updated_at"`
}

type CreateSellerInput struct {
	UserID                 uuid.UUID          `json:"user_id"`
	Name                   string             `json:"name"`
	MeetingDurationMinutes int                `json:"meeting_duration_minutes"`
	BufferAfterMinutes     int                `json:"buffer_after_minutes"`
	LocationType           SellerLocationType `json:"location_type"`
}

type UpdateSellerInput struct {
	Name                   *string             `json:"name,omitempty"`
	MeetingDurationMinutes *int                `json:"meeting_duration_minutes,omitempty"`
	BufferAfterMinutes     *int                `json:"buffer_after_minutes,omitempty"`
	LocationType           *SellerLocationType `json:"location_type,omitempty"`
	Active                 *bool               `json:"active,omitempty"`
}

type SellerAvailability struct {
	ID             uuid.UUID `json:"id"`
	SellerID       uuid.UUID `json:"seller_id"`
	OrganizationID uuid.UUID `json:"organization_id"`
	DayOfWeek      int       `json:"day_of_week"`
	StartTime      string    `json:"start_time"`
	EndTime        string    `json:"end_time"`
	CreatedAt      time.Time `json:"created_at"`
}

type SetSellerAvailabilityInput struct {
	Slots []SellerAvailabilityInput `json:"slots"`
}

type SellerAvailabilityInput struct {
	DayOfWeek int    `json:"day_of_week"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
}

type SellerGoal struct {
	ID             uuid.UUID `json:"id"`
	SellerID       uuid.UUID `json:"seller_id"`
	OrganizationID uuid.UUID `json:"organization_id"`
	PeriodStart    string    `json:"period_start"`
	PeriodEnd      string    `json:"period_end"`
	GoalMeetings   int       `json:"goal_meetings"`
	GoalSales      int       `json:"goal_sales"`
	GoalRevenue    string    `json:"goal_revenue"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type CreateSellerGoalInput struct {
	PeriodStart  string `json:"period_start"`
	PeriodEnd    string `json:"period_end"`
	GoalMeetings int    `json:"goal_meetings"`
	GoalSales    int    `json:"goal_sales"`
	GoalRevenue  string `json:"goal_revenue"`
}

type SellerSlot struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}
