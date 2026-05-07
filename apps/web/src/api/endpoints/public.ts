import { api } from '@/api/client'
import type { FlowDefinition } from '@typecall/flow-engine'

export interface PublicForm {
  id: string
  title: string
  slug: string
  description: string | null
  formVersionId: string
  versionNumber: number
  flowDefinition: FlowDefinition
  theme: Record<string, unknown>
  settings: Record<string, unknown>
}

export interface SubmitAnswer {
  nodeId: string
  value: unknown
}

export interface SubmitResponseInput {
  answers: SubmitAnswer[]
  respondentEmail?: string
  respondentName?: string
  metadata?: Record<string, unknown>
}

export interface SubmitResponseResult {
  id: string
  formId: string
  status: string
}

export function getPublicForm(slug: string): Promise<PublicForm> {
  return api<PublicForm>(`/api/v1/public/forms/${slug}`, { noAuth: true })
}

export function submitResponse(slug: string, input: SubmitResponseInput): Promise<SubmitResponseResult> {
  return api<SubmitResponseResult>(`/api/v1/public/forms/${slug}/responses`, {
    method: 'POST',
    body: input,
    noAuth: true,
  })
}
