import { api } from '@/api/client'
import type { LeadTag } from '@typecall/flow-engine'

export interface QualificationRule {
  id: string
  formId: string
  blockId: string
  organizationId: string
  answerValue: string
  tag: LeadTag
  priority: number
  createdAt: string
  updatedAt: string
}

export interface CreateQualificationRuleInput {
  blockId: string
  answerValue: string
  tag: LeadTag
  priority?: number
}

export function listRules(formId: string): Promise<{ rules: QualificationRule[] }> {
  return api<{ rules: QualificationRule[] }>(`/api/v1/forms/${formId}/qualification-rules`)
}

export function createRule(formId: string, input: CreateQualificationRuleInput): Promise<QualificationRule> {
  return api<QualificationRule>(`/api/v1/forms/${formId}/qualification-rules`, {
    method: 'POST',
    body: input,
  })
}

export function deleteRule(formId: string, ruleId: string): Promise<void> {
  return api<void>(`/api/v1/forms/${formId}/qualification-rules/${ruleId}`, { method: 'DELETE' })
}
