import { api } from '@/api/client'

export interface Booking {
  id: string
  organizationId: string
  eventTypeId: string
  hostUserId: string
  responseId: string | null
  attendeeName: string
  attendeeEmail: string
  attendeePhone: string | null
  startTime: string
  endTime: string
  timezone: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show'
  locationType: string
  locationValue: string | null
  googleEventId: string | null
  meetingUrl: string | null
  notes: string | null
  metadata: Record<string, unknown>
  cancelledAt: string | null
  cancelReason: string | null
  rescheduledFromId: string | null
  createdAt: string
  updatedAt: string
}

export interface ListBookingsResult {
  bookings: Booking[]
  nextCursor: string | null
  hasMore: boolean
}

export interface TimeSlot {
  start: string
  end: string
  hostId: string
}

export interface CreateBookingInput {
  eventTypeId: string
  attendeeName: string
  attendeeEmail: string
  attendeePhone?: string
  startTime: string
  timezone: string
  notes?: string
  responseId?: string
}

export function listBookings(params?: {
  limit?: number
  cursor?: string
  status?: string
  eventTypeId?: string
  from?: string
  to?: string
}): Promise<ListBookingsResult> {
  const search = new URLSearchParams()
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.cursor) search.set('cursor', params.cursor)
  if (params?.status) search.set('status', params.status)
  if (params?.eventTypeId) search.set('event_type_id', params.eventTypeId)
  if (params?.from) search.set('from', params.from)
  if (params?.to) search.set('to', params.to)
  const qs = search.toString()
  return api<ListBookingsResult>(`/api/v1/bookings${qs ? `?${qs}` : ''}`)
}

export function getBooking(id: string): Promise<Booking> {
  return api<Booking>(`/api/v1/bookings/${id}`)
}

export function cancelBooking(id: string, reason?: string): Promise<void> {
  return api<void>(`/api/v1/bookings/${id}/cancel`, { method: 'POST', body: { reason } })
}

// Public endpoints (no auth)

export function getSlots(eventTypeId: string, params?: {
  from?: string
  to?: string
  timezone?: string
}): Promise<{ slots: TimeSlot[] }> {
  const search = new URLSearchParams()
  if (params?.from) search.set('from', params.from)
  if (params?.to) search.set('to', params.to)
  if (params?.timezone) search.set('timezone', params.timezone)
  const qs = search.toString()
  return api(`/api/v1/public/event-types/${eventTypeId}/slots${qs ? `?${qs}` : ''}`, { noAuth: true })
}

export function createPublicBooking(input: CreateBookingInput): Promise<Booking> {
  return api<Booking>('/api/v1/public/bookings', { method: 'POST', body: input, noAuth: true })
}

export function cancelByToken(token: string, reason?: string): Promise<void> {
  return api<void>(`/api/v1/public/bookings/cancel/${token}`, { method: 'POST', body: { reason }, noAuth: true })
}
