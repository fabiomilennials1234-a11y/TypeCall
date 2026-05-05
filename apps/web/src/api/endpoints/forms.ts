import { api } from '@/api/client'

export interface Form {
  id: string
  organizationId: string
  title: string
  slug: string
  description: string | null
  status: 'draft' | 'published' | 'archived' | 'closed'
  version: number
  draftDefinition?: Record<string, unknown>
  theme: Record<string, unknown>
  settings: Record<string, unknown>
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface FormVersion {
  id: string
  formId: string
  organizationId: string
  versionNumber: number
  flowDefinition: Record<string, unknown>
  publishedBy: string | null
  createdAt: string
}

export interface ListFormsResult {
  forms: Form[]
  nextCursor: string | null
  hasMore: boolean
}

export interface CreateFormInput {
  title: string
  description?: string
  slug?: string
}

export interface UpdateFormInput {
  title?: string
  description?: string
  slug?: string
  theme?: Record<string, unknown>
  settings?: Record<string, unknown>
}

export function listForms(params?: { limit?: number; cursor?: string; status?: string }): Promise<ListFormsResult> {
  const search = new URLSearchParams()
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.cursor) search.set('cursor', params.cursor)
  if (params?.status) search.set('status', params.status)
  const qs = search.toString()
  return api<ListFormsResult>(`/api/v1/forms${qs ? `?${qs}` : ''}`)
}

export function getForm(id: string): Promise<Form> {
  return api<Form>(`/api/v1/forms/${id}`)
}

export function createForm(input: CreateFormInput): Promise<Form> {
  return api<Form>('/api/v1/forms', { method: 'POST', body: input })
}

export function updateForm(id: string, input: UpdateFormInput): Promise<Form> {
  return api<Form>(`/api/v1/forms/${id}`, { method: 'PATCH', body: input })
}

export function deleteForm(id: string): Promise<void> {
  return api<void>(`/api/v1/forms/${id}`, { method: 'DELETE' })
}

export function saveDraft(id: string, definition: Record<string, unknown>): Promise<void> {
  return api<void>(`/api/v1/forms/${id}/draft`, { method: 'PATCH', body: { definition } })
}

export function publishForm(id: string): Promise<FormVersion> {
  return api<FormVersion>(`/api/v1/forms/${id}/publish`, { method: 'POST' })
}
