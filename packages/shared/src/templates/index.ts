import { buildQuizDefaultFlow, DEFAULT_CONTACT_FIELDS } from './quiz-default.js'
import type { QuizDefaultOpts, ContactField } from './quiz-default.js'

export type TemplateKey = 'quiz_default'

export const TEMPLATE_REGISTRY = {
  quiz_default: buildQuizDefaultFlow,
} as const

export { buildQuizDefaultFlow, DEFAULT_CONTACT_FIELDS }
export type { QuizDefaultOpts, ContactField }
