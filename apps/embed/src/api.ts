const API_BASE = import.meta.env.VITE_API_URL ?? ''

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`)
  }

  return res.json() as Promise<T>
}

export interface PublicForm {
  id: string
  title: string
  slug: string
  flowDefinition: {
    nodes: Array<{
      id: string
      type: string
      position: { x: number; y: number }
      data: { props: Record<string, unknown> }
    }>
    edges: Array<{
      id: string
      source: string
      target: string
      condition?: unknown
    }>
  }
}

export interface TimeSlot {
  start: string
  end: string
  hostId: string
}

export async function getPublicForm(slug: string): Promise<PublicForm> {
  const data = await fetchApi<Record<string, unknown>>(`/api/v1/public/forms/${slug}`)
  return snakeToCamelDeep(data) as PublicForm
}

export async function getSlots(eventTypeId: string, params: { from: string; to: string; timezone: string }): Promise<{ slots: TimeSlot[] }> {
  const qs = new URLSearchParams(params).toString()
  const data = await fetchApi<Record<string, unknown>>(`/api/v1/public/event-types/${eventTypeId}/slots?${qs}`)
  return snakeToCamelDeep(data) as { slots: TimeSlot[] }
}

export async function createBooking(input: {
  eventTypeId: string
  attendeeName: string
  attendeeEmail: string
  startTime: string
  timezone: string
}): Promise<{ id: string }> {
  const body = camelToSnakeDeep(input)
  const data = await fetchApi<Record<string, unknown>>('/api/v1/public/bookings', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return snakeToCamelDeep(data) as { id: string }
}

export async function submitResponse(slug: string, answers: Array<{ nodeId: string; value: unknown }>, respondentEmail?: string) {
  const body = camelToSnakeDeep({ answers, respondentEmail })
  return fetchApi<{ id: string }>(`/api/v1/public/forms/${slug}/responses`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

let eventQueue: Array<{ event_id: string; form_id: string; response_id?: string; step_id?: string; event_type: string }> = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function flushEvents() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
  if (eventQueue.length === 0) return
  const batch = eventQueue.splice(0, 10)
  const body = JSON.stringify({ events: batch })
  if (navigator.sendBeacon) {
    navigator.sendBeacon(`${API_BASE}/api/v1/public/events`, new Blob([body], { type: 'application/json' }))
  } else {
    fetch(`${API_BASE}/api/v1/public/events`, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
  }
}

function enqueueEvent(formId: string, eventType: string, stepId?: string, responseId?: string) {
  eventQueue.push({ event_id: crypto.randomUUID(), form_id: formId, event_type: eventType, step_id: stepId, response_id: responseId })
  if (eventQueue.length >= 5) { flushEvents() }
  else if (!flushTimer) { flushTimer = setTimeout(flushEvents, 2000) }
}

export function trackView(formId: string) { enqueueEvent(formId, 'view') }
export function trackStart(formId: string) { enqueueEvent(formId, 'start') }
export function trackQuestionSeen(formId: string, stepId: string) { enqueueEvent(formId, 'question_seen', stepId) }
export function trackQuestionAnswered(formId: string, stepId: string) { enqueueEvent(formId, 'question_answered', stepId) }
export function trackSubmit(formId: string) { flushEvents(); enqueueEvent(formId, 'submit'); flushEvents() }
export function trackAbandon(formId: string) { enqueueEvent(formId, 'abandon'); flushEvents() }

function snakeToCamelDeep(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamelDeep)
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = snakeToCamelDeep(value)
    }
    return result
  }
  return obj
}

function camelToSnakeDeep(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(camelToSnakeDeep)
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = camelToSnakeDeep(value)
    }
    return result
  }
  return obj
}
