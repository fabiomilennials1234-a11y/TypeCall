import type { Answers, FlowDefinition, FlowEdge, TraversalResult } from './types.js'
import { evaluateCondition } from './evaluator.js'

export function getNextNode(
  currentNodeId: string,
  answers: Answers,
  flow: FlowDefinition
): TraversalResult {
  const outgoingEdges = flow.edges.filter((e) => e.source === currentNodeId)

  if (outgoingEdges.length === 0) {
    return { nextNodeId: null, isEnd: true }
  }

  const conditionalEdges: FlowEdge[] = []
  let defaultEdge: FlowEdge | null = null

  for (const edge of outgoingEdges) {
    if (edge.condition) {
      conditionalEdges.push(edge)
    } else {
      defaultEdge = edge
    }
  }

  for (const edge of conditionalEdges) {
    if (edge.condition && evaluateCondition(edge.condition, answers)) {
      return { nextNodeId: edge.target, isEnd: isEndingNode(edge.target, flow) }
    }
  }

  if (defaultEdge) {
    return { nextNodeId: defaultEdge.target, isEnd: isEndingNode(defaultEdge.target, flow) }
  }

  return { nextNodeId: null, isEnd: true }
}

export function getPreviousNode(
  _currentNodeId: string,
  history: string[]
): string | null {
  if (history.length < 2) return null
  return history[history.length - 2] ?? null
}

export function getProgress(
  currentNodeId: string,
  flow: FlowDefinition
): number {
  const totalNodes = flow.nodes.filter(
    (n) => n.type !== 'welcome' && n.type !== 'ending' && n.type !== 'statement'
  ).length

  if (totalNodes === 0) return 100

  const visited = getReachableBeforeNode(currentNodeId, flow)
  const answerable = visited.filter((id) => {
    const node = flow.nodes.find((n) => n.id === id)
    return node && node.type !== 'welcome' && node.type !== 'ending' && node.type !== 'statement'
  })

  return Math.min(100, Math.round((answerable.length / totalNodes) * 100))
}

export function getFirstNode(flow: FlowDefinition): string | null {
  const targetIds = new Set(flow.edges.map((e) => e.target))
  const roots = flow.nodes.filter((n) => !targetIds.has(n.id))

  const welcome = roots.find((n) => n.type === 'welcome')
  if (welcome) return welcome.id

  return roots[0]?.id ?? flow.nodes[0]?.id ?? null
}

function isEndingNode(nodeId: string, flow: FlowDefinition): boolean {
  const node = flow.nodes.find((n) => n.id === nodeId)
  return node?.type === 'ending'
}

function getReachableBeforeNode(targetId: string, flow: FlowDefinition): string[] {
  const incomingMap = new Map<string, string[]>()

  for (const edge of flow.edges) {
    const existing = incomingMap.get(edge.target) ?? []
    existing.push(edge.source)
    incomingMap.set(edge.target, existing)
  }

  const visited = new Set<string>()
  const queue = [targetId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)

    const parents = incomingMap.get(current) ?? []
    for (const parent of parents) {
      if (!visited.has(parent)) {
        queue.push(parent)
      }
    }
  }

  visited.delete(targetId)
  return [...visited]
}
