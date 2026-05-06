import { describe, it, expect } from 'vitest'
import { validateAnswer, validateFlow } from '../validator.js'
import type { FlowDefinition, FlowNode } from '../types.js'

function makeNode(id: string, type: FlowNode['type'], props: Record<string, unknown> = {}): FlowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { type, props: { label: 'Test', ...props } } as FlowNode['data'],
  }
}

describe('validateAnswer', () => {
  it('passes for optional empty field', () => {
    const node = makeNode('q1', 'short_text', { required: false })
    const result = validateAnswer(node, '')
    expect(result.valid).toBe(true)
  })

  it('fails for required empty field', () => {
    const node = makeNode('q1', 'short_text', { required: true })
    const result = validateAnswer(node, '')
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.message).toContain('obrigatorio')
  })

  it('validates email format', () => {
    const node = makeNode('q1', 'email', { required: true })
    expect(validateAnswer(node, 'bad').valid).toBe(false)
    expect(validateAnswer(node, 'test@test.com').valid).toBe(true)
  })

  it('validates maxLength', () => {
    const node = makeNode('q1', 'short_text', { required: true, maxLength: 5 })
    expect(validateAnswer(node, 'abcdef').valid).toBe(false)
    expect(validateAnswer(node, 'abc').valid).toBe(true)
  })

  it('validates number range', () => {
    const node = makeNode('q1', 'number', { required: true, min: 1, max: 10 })
    expect(validateAnswer(node, 0).valid).toBe(false)
    expect(validateAnswer(node, 11).valid).toBe(false)
    expect(validateAnswer(node, 5).valid).toBe(true)
  })

  it('skips validation for statement/welcome/ending', () => {
    const node = makeNode('q1', 'statement', { required: true })
    expect(validateAnswer(node, null).valid).toBe(true)
  })

  it('validates phone format', () => {
    const node = makeNode('q1', 'phone', { required: true })
    expect(validateAnswer(node, '123').valid).toBe(false)
    expect(validateAnswer(node, '+55 11 99999-9999').valid).toBe(true)
  })
})

describe('validateFlow', () => {
  it('passes valid linear flow', () => {
    const flow: FlowDefinition = {
      nodes: [
        makeNode('q1', 'short_text', { required: true }),
        makeNode('end', 'ending'),
      ],
      edges: [{ id: 'e1', source: 'q1', target: 'end' }],
    }
    expect(validateFlow(flow).valid).toBe(true)
  })

  it('fails empty flow', () => {
    const flow: FlowDefinition = { nodes: [], edges: [] }
    const result = validateFlow(flow)
    expect(result.valid).toBe(false)
  })

  it('fails flow without ending', () => {
    const flow: FlowDefinition = {
      nodes: [makeNode('q1', 'short_text')],
      edges: [],
    }
    const result = validateFlow(flow)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('encerramento'))).toBe(true)
  })

  it('fails flow with only structural nodes', () => {
    const flow: FlowDefinition = {
      nodes: [
        makeNode('w', 'welcome'),
        makeNode('e', 'ending'),
      ],
      edges: [{ id: 'e1', source: 'w', target: 'e' }],
    }
    const result = validateFlow(flow)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('pergunta'))).toBe(true)
  })

  it('detects invalid edge references', () => {
    const flow: FlowDefinition = {
      nodes: [makeNode('q1', 'short_text'), makeNode('end', 'ending')],
      edges: [{ id: 'e1', source: 'q1', target: 'nonexistent' }],
    }
    const result = validateFlow(flow)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('inexistente'))).toBe(true)
  })

  it('detects cycles', () => {
    const flow: FlowDefinition = {
      nodes: [
        makeNode('a', 'short_text'),
        makeNode('b', 'short_text'),
        makeNode('end', 'ending'),
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'a' },
        { id: 'e3', source: 'b', target: 'end' },
      ],
    }
    const result = validateFlow(flow)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('ciclo'))).toBe(true)
  })
})
