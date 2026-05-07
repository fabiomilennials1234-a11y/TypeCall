import { api } from '@/api/client'

export interface AnalyticsSummary {
  views: number
  starts: number
  completions: number
  abandons: number
  completionRate: number
}

export interface FormDailyMetric {
  formId: string
  date: string
  views: number
  starts: number
  completions: number
  abandons: number
}

export interface StepDropoff {
  stepId: string
  seen: number
  answered: number
  dropoffPct: number
}

export async function getSummary(formId: string, from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return api<AnalyticsSummary>(`/api/v1/analytics/forms/${formId}/summary${qs ? `?${qs}` : ''}`)
}

export async function getDailyMetrics(formId: string, from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return api<{ metrics: FormDailyMetric[] }>(`/api/v1/analytics/forms/${formId}/daily${qs ? `?${qs}` : ''}`)
}

export async function getStepDropoff(formId: string, from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return api<{ steps: StepDropoff[] }>(`/api/v1/analytics/forms/${formId}/dropoff${qs ? `?${qs}` : ''}`)
}

export function getExportUrl(formId: string, from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return `/api/v1/analytics/forms/${formId}/export${qs ? `?${qs}` : ''}`
}

export async function refreshMetrics() {
  return api<{ status: string }>('/api/v1/analytics/refresh', { method: 'POST' })
}

export async function ingestEvents(events: Array<{
  eventId: string
  formId: string
  responseId?: string
  stepId?: string
  eventType: string
  metadata?: Record<string, unknown>
}>) {
  return api<{ inserted: number }>('/api/v1/public/events', {
    method: 'POST',
    body: { events },
    noAuth: true,
  })
}
