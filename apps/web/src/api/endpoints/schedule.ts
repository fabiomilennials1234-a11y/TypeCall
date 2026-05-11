import { api } from '@/api/client'

export interface AggSlot {
  start: string
  end: string
}

export function getAggregatedSlots(params: {
  formSlug: string
  tag: string
  date: string
  tz: string
}): Promise<{ slots: AggSlot[] }> {
  const q = new URLSearchParams({
    form_slug: params.formSlug,
    tag: params.tag,
    date: params.date,
    tz: params.tz,
  })
  return api<{ slots: AggSlot[] }>(`/api/v1/public/schedule/slots?${q.toString()}`, { noAuth: true })
}

export interface BookSlotInput {
  formSlug: string
  tag: string
  startTime: string
  timezone: string
  attendeeName: string
  attendeeEmail: string
  attendeePhone?: string
  responseId?: string
}

export interface BookSlotOutput {
  bookingId: string
  sellerId: string
  sellerName: string
  startTime: string
  endTime: string
}

export function bookAggregatedSlot(input: BookSlotInput): Promise<BookSlotOutput> {
  return api<BookSlotOutput>('/api/v1/public/schedule/book', {
    method: 'POST',
    body: input,
    noAuth: true,
  })
}
