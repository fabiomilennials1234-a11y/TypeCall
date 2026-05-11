import { api } from '@/api/client'

export interface ResponseAnswer {
  id: string
  responseId: string
  nodeId: string
  value: unknown
  answeredAt: string
}

export interface FormResponse {
  id: string
  formId: string
  formVersionId: string
  organizationId: string
  respondentEmail: string | null
  respondentName: string | null
  status: 'in_progress' | 'completed' | 'abandoned'
  metadata: Record<string, unknown>
  startedAt: string
  completedAt: string | null
  createdAt: string
  answers?: ResponseAnswer[]
}

export interface ListResponsesResult {
  responses: FormResponse[]
  nextCursor: string | null
  hasMore: boolean
}

export function listResponses(formId: string, params?: { limit?: number; cursor?: string; status?: string }): Promise<ListResponsesResult> {
  const search = new URLSearchParams()
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.cursor) search.set('cursor', params.cursor)
  if (params?.status) search.set('status', params.status)
  const qs = search.toString()
  return api<ListResponsesResult>(`/api/v1/forms/${formId}/responses${qs ? `?${qs}` : ''}`)
}

export function getResponse(formId: string, responseId: string): Promise<FormResponse> {
  return api<FormResponse>(`/api/v1/forms/${formId}/responses/${responseId}`)
}

export function getResponseById(responseId: string): Promise<FormResponse> {
  return api<FormResponse>(`/api/v1/responses/${responseId}`)
}
