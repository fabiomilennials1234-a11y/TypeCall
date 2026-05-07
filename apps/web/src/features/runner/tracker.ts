import * as analyticsApi from '@/api/endpoints/analytics'

let queue: Parameters<typeof analyticsApi.ingestEvents>[0] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function generateEventId(): string {
  return crypto.randomUUID()
}

function enqueue(event: (typeof queue)[number]) {
  queue.push(event)
  if (queue.length >= 5) {
    flush()
  } else if (!flushTimer) {
    flushTimer = setTimeout(flush, 2000)
  }
}

function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (queue.length === 0) return

  const batch = queue.splice(0, 10)
  analyticsApi.ingestEvents(batch).catch(() => {})
}

export function trackView(formId: string) {
  enqueue({ eventId: generateEventId(), formId, eventType: 'view' })
}

export function trackStart(formId: string, responseId?: string) {
  enqueue({ eventId: generateEventId(), formId, responseId, eventType: 'start' })
}

export function trackQuestionSeen(formId: string, stepId: string) {
  enqueue({ eventId: generateEventId(), formId, stepId, eventType: 'question_seen' })
}

export function trackQuestionAnswered(formId: string, stepId: string) {
  enqueue({ eventId: generateEventId(), formId, stepId, eventType: 'question_answered' })
}

export function trackSubmit(formId: string, responseId?: string) {
  const batch = [{ eventId: generateEventId(), formId, responseId, eventType: 'submit' }, ...queue.splice(0)]
  analyticsApi.ingestEvents(batch).catch(() => {})
}

export function trackAbandon(formId: string) {
  const batch = [{ eventId: generateEventId(), formId, eventType: 'abandon' }, ...queue.splice(0)]
  if (navigator.sendBeacon) {
    const body = JSON.stringify({ events: batch.map(e => ({ event_id: e.eventId, form_id: e.formId, response_id: e.responseId, step_id: e.stepId, event_type: e.eventType })) })
    navigator.sendBeacon('/api/v1/public/events', new Blob([body], { type: 'application/json' }))
  } else {
    analyticsApi.ingestEvents(batch).catch(() => {})
  }
}
