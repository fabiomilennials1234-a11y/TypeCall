import { api } from '@/api/client'

export interface EventType {
  id: string
  organizationId: string
  userId: string
  title: string
  slug: string
  description: string | null
  durationMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  minNoticeHours: number
  maxAdvanceDays: number
  maxPerDay: number | null
  locationType: 'google_meet' | 'custom_url' | 'in_person'
  locationValue: string | null
  color: string
  isActive: boolean
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ListEventTypesResult {
  eventTypes: EventType[]
  nextCursor: string | null
  hasMore: boolean
}

export interface CreateEventTypeInput {
  title: string
  slug?: string
  description?: string
  durationMinutes?: number
  bufferBeforeMinutes?: number
  bufferAfterMinutes?: number
  minNoticeHours?: number
  maxAdvanceDays?: number
  maxPerDay?: number | null
  locationType?: string
  locationValue?: string
  color?: string
}

export interface UpdateEventTypeInput {
  title?: string
  slug?: string
  description?: string
  durationMinutes?: number
  bufferBeforeMinutes?: number
  bufferAfterMinutes?: number
  minNoticeHours?: number
  maxAdvanceDays?: number
  maxPerDay?: number | null
  locationType?: string
  locationValue?: string
  color?: string
  isActive?: boolean
}

export interface AvailabilityRule {
  id: string
  eventTypeId: string
  userId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface AvailabilityOverride {
  id: string
  eventTypeId: string
  userId: string
  date: string
  isAvailable: boolean
  startTime: string | null
  endTime: string | null
  reason: string | null
}

export interface SetAvailabilityInput {
  rules: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
  }>
}

export interface CreateOverrideInput {
  date: string
  isAvailable: boolean
  startTime?: string
  endTime?: string
  reason?: string
}

export function listEventTypes(params?: { limit?: number; cursor?: string }): Promise<ListEventTypesResult> {
  const search = new URLSearchParams()
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.cursor) search.set('cursor', params.cursor)
  const qs = search.toString()
  return api<ListEventTypesResult>(`/api/v1/event-types${qs ? `?${qs}` : ''}`)
}

export function getEventType(id: string): Promise<EventType> {
  return api<EventType>(`/api/v1/event-types/${id}`)
}

export function createEventType(input: CreateEventTypeInput): Promise<EventType> {
  return api<EventType>('/api/v1/event-types', { method: 'POST', body: input })
}

export function updateEventType(id: string, input: UpdateEventTypeInput): Promise<EventType> {
  return api<EventType>(`/api/v1/event-types/${id}`, { method: 'PATCH', body: input })
}

export function deleteEventType(id: string): Promise<void> {
  return api<void>(`/api/v1/event-types/${id}`, { method: 'DELETE' })
}

export function getAvailability(eventTypeId: string): Promise<{ rules: AvailabilityRule[]; overrides: AvailabilityOverride[] }> {
  return api(`/api/v1/event-types/${eventTypeId}/availability`)
}

export function setAvailability(eventTypeId: string, input: SetAvailabilityInput): Promise<{ rules: AvailabilityRule[] }> {
  return api(`/api/v1/event-types/${eventTypeId}/availability`, { method: 'PUT', body: input })
}

export function createOverride(eventTypeId: string, input: CreateOverrideInput): Promise<AvailabilityOverride> {
  return api(`/api/v1/event-types/${eventTypeId}/availability/overrides`, { method: 'POST', body: input })
}

export function deleteOverride(eventTypeId: string, overrideId: string): Promise<void> {
  return api(`/api/v1/event-types/${eventTypeId}/availability/overrides/${overrideId}`, { method: 'DELETE' })
}
