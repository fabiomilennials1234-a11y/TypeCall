import type { AnswerValue, Condition } from './types.js'

export function evaluateCondition(condition: Condition, answers: Record<string, AnswerValue>): boolean {
  const answer: AnswerValue = answers[condition.field] ?? null
  const { operator, value } = condition

  switch (operator) {
    case 'is_empty':
      return isEmpty(answer)

    case 'is_not_empty':
      return !isEmpty(answer)

    case 'equals':
      return String(answer) === String(value)

    case 'not_equals':
      return String(answer) !== String(value)

    case 'contains':
      return typeof answer === 'string' && answer.includes(String(value))

    case 'not_contains':
      return typeof answer === 'string' && !answer.includes(String(value))

    case 'starts_with':
      return typeof answer === 'string' && answer.startsWith(String(value))

    case 'ends_with':
      return typeof answer === 'string' && answer.endsWith(String(value))

    case 'greater_than':
      return toNumber(answer) > toNumber(value)

    case 'less_than':
      return toNumber(answer) < toNumber(value)

    case 'greater_than_or_equals':
      return toNumber(answer) >= toNumber(value)

    case 'less_than_or_equals':
      return toNumber(answer) <= toNumber(value)

    case 'in':
      return Array.isArray(value) && value.includes(String(answer))

    case 'not_in':
      return Array.isArray(value) && !value.includes(String(answer))
  }
}

function isEmpty(value: AnswerValue): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function toNumber(value: AnswerValue): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}
