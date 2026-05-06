import { describe, it, expect } from 'vitest'
import { evaluateCondition } from '../evaluator.js'
import type { Condition } from '../types.js'

describe('evaluateCondition', () => {
  const answers = {
    name: 'Marcelo',
    email: 'test@example.com',
    team_size: '4-10',
    score: 8,
    empty_field: '',
    null_field: null,
    tags: ['a', 'b', 'c'],
  }

  it('equals — string match', () => {
    const condition: Condition = { field: 'team_size', operator: 'equals', value: '4-10' }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('equals — no match', () => {
    const condition: Condition = { field: 'team_size', operator: 'equals', value: '1-3' }
    expect(evaluateCondition(condition, answers)).toBe(false)
  })

  it('not_equals', () => {
    const condition: Condition = { field: 'team_size', operator: 'not_equals', value: '1-3' }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('contains', () => {
    const condition: Condition = { field: 'name', operator: 'contains', value: 'arc' }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('not_contains', () => {
    const condition: Condition = { field: 'name', operator: 'not_contains', value: 'xyz' }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('starts_with', () => {
    const condition: Condition = { field: 'name', operator: 'starts_with', value: 'Mar' }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('ends_with', () => {
    const condition: Condition = { field: 'name', operator: 'ends_with', value: 'elo' }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('greater_than — number', () => {
    const condition: Condition = { field: 'score', operator: 'greater_than', value: 5 }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('less_than', () => {
    const condition: Condition = { field: 'score', operator: 'less_than', value: 10 }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('greater_than_or_equals', () => {
    const condition: Condition = { field: 'score', operator: 'greater_than_or_equals', value: 8 }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('less_than_or_equals', () => {
    const condition: Condition = { field: 'score', operator: 'less_than_or_equals', value: 8 }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('is_empty — empty string', () => {
    const condition: Condition = { field: 'empty_field', operator: 'is_empty', value: '' }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('is_empty — null', () => {
    const condition: Condition = { field: 'null_field', operator: 'is_empty', value: '' }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('is_not_empty', () => {
    const condition: Condition = { field: 'name', operator: 'is_not_empty', value: '' }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('in — value in array', () => {
    const condition: Condition = { field: 'team_size', operator: 'in', value: ['1-3', '4-10', '11-50'] }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('not_in', () => {
    const condition: Condition = { field: 'team_size', operator: 'not_in', value: ['1-3', '50+'] }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })

  it('handles undefined answer as empty', () => {
    const condition: Condition = { field: 'nonexistent', operator: 'is_empty', value: '' }
    expect(evaluateCondition(condition, answers)).toBe(true)
  })
})
