import { useCallback, useReducer } from 'react'
import type { FlowDefinition, FlowNode, Answers, AnswerValue } from '@typecall/flow-engine'
import { getNextNode, getFirstNode, validateAnswer } from '@typecall/flow-engine'

interface RunnerState {
  flow: FlowDefinition
  currentNodeId: string | null
  history: string[]
  answers: Answers
  errors: Record<string, string>
  isComplete: boolean
  direction: 'forward' | 'backward'
}

type RunnerAction =
  | { type: 'INIT'; flow: FlowDefinition }
  | { type: 'SET_ANSWER'; nodeId: string; value: AnswerValue }
  | { type: 'NEXT' }
  | { type: 'PREVIOUS' }
  | { type: 'SET_ERROR'; nodeId: string; message: string }
  | { type: 'CLEAR_ERROR'; nodeId: string }
  | { type: 'COMPLETE' }

function runnerReducer(state: RunnerState, action: RunnerAction): RunnerState {
  switch (action.type) {
    case 'INIT': {
      const firstId = getFirstNode(action.flow)
      return {
        ...state,
        flow: action.flow,
        currentNodeId: firstId,
        history: firstId ? [firstId] : [],
        answers: {},
        errors: {},
        isComplete: false,
        direction: 'forward',
      }
    }

    case 'SET_ANSWER':
      return {
        ...state,
        answers: { ...state.answers, [action.nodeId]: action.value },
        errors: { ...state.errors, [action.nodeId]: '' },
      }

    case 'NEXT': {
      if (!state.currentNodeId) return state

      const currentNode = state.flow.nodes.find((n) => n.id === state.currentNodeId)
      if (!currentNode) return state

      if (
        currentNode.type !== 'welcome' &&
        currentNode.type !== 'ending' &&
        currentNode.type !== 'statement' &&
        currentNode.type !== 'schedule' &&
        currentNode.type !== 'qualification' &&
        currentNode.type !== 'social_proof' &&
        currentNode.type !== 'alignment_video'
      ) {
        const result = validateAnswer(currentNode, state.answers[state.currentNodeId] ?? null)
        if (!result.valid) {
          const firstError = result.errors[0]
          return {
            ...state,
            errors: { ...state.errors, [state.currentNodeId]: firstError?.message ?? 'Campo invalido' },
          }
        }
      }

      const traversal = getNextNode(state.currentNodeId, state.answers, state.flow)

      if (traversal.nextNodeId === null) {
        return { ...state, isComplete: true }
      }

      return {
        ...state,
        currentNodeId: traversal.nextNodeId,
        history: [...state.history, traversal.nextNodeId],
        direction: 'forward',
        isComplete: traversal.isEnd,
      }
    }

    case 'PREVIOUS': {
      if (state.history.length < 2) return state
      const newHistory = state.history.slice(0, -1)
      const previousId = newHistory[newHistory.length - 1] ?? null

      return {
        ...state,
        currentNodeId: previousId,
        history: newHistory,
        direction: 'backward',
        isComplete: false,
      }
    }

    case 'SET_ERROR':
      return { ...state, errors: { ...state.errors, [action.nodeId]: action.message } }

    case 'CLEAR_ERROR': {
      const newErrors = { ...state.errors }
      delete newErrors[action.nodeId]
      return { ...state, errors: newErrors }
    }

    case 'COMPLETE':
      return { ...state, isComplete: true }
  }
}

const emptyFlow: FlowDefinition = { nodes: [], edges: [] }

export function useRunner() {
  const [state, dispatch] = useReducer(runnerReducer, {
    flow: emptyFlow,
    currentNodeId: null,
    history: [],
    answers: {},
    errors: {},
    isComplete: false,
    direction: 'forward' as const,
  })

  const init = useCallback((flow: FlowDefinition) => {
    dispatch({ type: 'INIT', flow })
  }, [])

  const setAnswer = useCallback((nodeId: string, value: AnswerValue) => {
    dispatch({ type: 'SET_ANSWER', nodeId, value })
  }, [])

  const next = useCallback(() => {
    dispatch({ type: 'NEXT' })
  }, [])

  const previous = useCallback(() => {
    dispatch({ type: 'PREVIOUS' })
  }, [])

  const currentNode: FlowNode | null = state.currentNodeId
    ? state.flow.nodes.find((n) => n.id === state.currentNodeId) ?? null
    : null

  const progress = state.flow.nodes.length > 0
    ? Math.round((state.history.length / state.flow.nodes.length) * 100)
    : 0

  return {
    ...state,
    currentNode,
    progress: Math.min(100, progress),
    init,
    setAnswer,
    next,
    previous,
  }
}
