import { describe, it, expect } from 'vitest'
import { getNextNode, getPreviousNode, getProgress, getFirstNode } from '../traverser.js'
import type { FlowDefinition, FlowNode } from '../types.js'

function makeNode(id: string, type: FlowNode['type']): FlowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { type, props: { label: id } } as FlowNode['data'],
  }
}

const linearFlow: FlowDefinition = {
  nodes: [
    makeNode('welcome', 'welcome'),
    makeNode('name', 'short_text'),
    makeNode('email', 'email'),
    makeNode('end', 'ending'),
  ],
  edges: [
    { id: 'e1', source: 'welcome', target: 'name' },
    { id: 'e2', source: 'name', target: 'email' },
    { id: 'e3', source: 'email', target: 'end' },
  ],
}

const branchingFlow: FlowDefinition = {
  nodes: [
    makeNode('q1', 'multiple_choice'),
    makeNode('q2_big', 'short_text'),
    makeNode('q2_small', 'statement'),
    makeNode('end', 'ending'),
  ],
  edges: [
    {
      id: 'e1',
      source: 'q1',
      target: 'q2_big',
      condition: { field: 'q1', operator: 'not_equals', value: '1-3' },
    },
    { id: 'e2', source: 'q1', target: 'q2_small' },
    { id: 'e3', source: 'q2_big', target: 'end' },
    { id: 'e4', source: 'q2_small', target: 'end' },
  ],
}

describe('getNextNode', () => {
  it('follows linear flow', () => {
    const result = getNextNode('welcome', {}, linearFlow)
    expect(result.nextNodeId).toBe('name')
    expect(result.isEnd).toBe(false)
  })

  it('reaches ending', () => {
    const result = getNextNode('email', {}, linearFlow)
    expect(result.nextNodeId).toBe('end')
    expect(result.isEnd).toBe(true)
  })

  it('returns null when no outgoing edges', () => {
    const result = getNextNode('end', {}, linearFlow)
    expect(result.nextNodeId).toBeNull()
    expect(result.isEnd).toBe(true)
  })

  it('follows conditional branch when condition met', () => {
    const result = getNextNode('q1', { q1: '4-10' }, branchingFlow)
    expect(result.nextNodeId).toBe('q2_big')
  })

  it('follows default branch when condition not met', () => {
    const result = getNextNode('q1', { q1: '1-3' }, branchingFlow)
    expect(result.nextNodeId).toBe('q2_small')
  })
})

describe('getPreviousNode', () => {
  it('returns previous from history', () => {
    const result = getPreviousNode('email', ['welcome', 'name', 'email'])
    expect(result).toBe('name')
  })

  it('returns null at start', () => {
    const result = getPreviousNode('welcome', ['welcome'])
    expect(result).toBeNull()
  })

  it('returns null with empty history', () => {
    const result = getPreviousNode('welcome', [])
    expect(result).toBeNull()
  })
})

describe('getProgress', () => {
  it('returns 0 at first question', () => {
    const progress = getProgress('welcome', linearFlow)
    expect(progress).toBe(0)
  })

  it('returns progress at midpoint', () => {
    const progress = getProgress('email', linearFlow)
    expect(progress).toBeGreaterThan(0)
    expect(progress).toBeLessThanOrEqual(100)
  })
})

describe('getFirstNode', () => {
  it('returns welcome node as root', () => {
    const first = getFirstNode(linearFlow)
    expect(first).toBe('welcome')
  })

  it('returns first node when no welcome', () => {
    const first = getFirstNode(branchingFlow)
    expect(first).toBe('q1')
  })
})
