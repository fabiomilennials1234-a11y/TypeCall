import { useCallback, useReducer } from 'react'
import type { FlowDefinition, FlowNode, FlowEdge, StepType, QuestionData } from '@typecall/flow-engine'

function generateId(): string {
  return `node_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function generateEdgeId(): string {
  return `edge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function defaultDataForType(type: StepType): QuestionData {
  switch (type) {
    case 'welcome':
      return { type: 'welcome', props: { label: 'Bem-vindo!', description: '', buttonText: 'Comecar' } }
    case 'short_text':
      return { type: 'short_text', props: { label: 'Pergunta de texto', required: false, placeholder: '' } }
    case 'long_text':
      return { type: 'long_text', props: { label: 'Texto longo', required: false, placeholder: '' } }
    case 'email':
      return { type: 'email', props: { label: 'Seu email', required: true, placeholder: 'email@exemplo.com' } }
    case 'phone':
      return { type: 'phone', props: { label: 'Seu telefone', required: false, placeholder: '(11) 99999-9999' } }
    case 'number':
      return { type: 'number', props: { label: 'Numero', required: false, placeholder: '' } }
    case 'multiple_choice':
      return {
        type: 'multiple_choice',
        props: {
          label: 'Escolha uma opcao',
          required: false,
          choices: [
            { id: 'c1', label: 'Opcao 1', value: 'opcao_1' },
            { id: 'c2', label: 'Opcao 2', value: 'opcao_2' },
          ],
        },
      }
    case 'checkboxes':
      return {
        type: 'checkboxes',
        props: {
          label: 'Selecione opcoes',
          required: false,
          choices: [
            { id: 'c1', label: 'Opcao 1', value: 'opcao_1' },
            { id: 'c2', label: 'Opcao 2', value: 'opcao_2' },
          ],
        },
      }
    case 'dropdown':
      return {
        type: 'dropdown',
        props: {
          label: 'Selecione',
          required: false,
          placeholder: 'Escolha...',
          choices: [
            { id: 'c1', label: 'Opcao 1', value: 'opcao_1' },
            { id: 'c2', label: 'Opcao 2', value: 'opcao_2' },
          ],
        },
      }
    case 'rating':
      return { type: 'rating', props: { label: 'Avaliacao', required: false, steps: 5 } }
    case 'nps':
      return { type: 'nps', props: { label: 'Recomendaria?', required: false } }
    case 'date':
      return { type: 'date', props: { label: 'Data', required: false } }
    case 'file_upload':
      return { type: 'file_upload', props: { label: 'Upload', required: false } }
    case 'schedule':
      return { type: 'schedule', props: { label: 'Agende um horario', required: true, eventTypeId: '' } }
    case 'payment':
      return { type: 'payment', props: { label: 'Pagamento', required: true } }
    case 'statement':
      return { type: 'statement', props: { label: 'Informacao', description: '', buttonText: 'Continuar' } }
    case 'ending':
      return { type: 'ending', props: { label: 'Obrigado!', description: 'Suas respostas foram enviadas.' } }
    default:
      return { type: 'short_text', props: { label: 'Pergunta', required: false } }
  }
}

function rebuildLinearEdges(nodes: FlowNode[]): FlowEdge[] {
  const edges: FlowEdge[] = []
  for (let i = 0; i < nodes.length - 1; i++) {
    const source = nodes[i]
    const target = nodes[i + 1]
    if (source && target) {
      edges.push({ id: generateEdgeId(), source: source.id, target: target.id })
    }
  }
  return edges
}

interface BuilderState {
  flow: FlowDefinition
  selectedNodeId: string | null
  isDirty: boolean
}

type BuilderAction =
  | { type: 'SET_FLOW'; flow: FlowDefinition }
  | { type: 'ADD_NODE'; stepType: StepType; atIndex?: number }
  | { type: 'REMOVE_NODE'; nodeId: string }
  | { type: 'UPDATE_NODE'; nodeId: string; data: QuestionData }
  | { type: 'REORDER_NODES'; fromIndex: number; toIndex: number }
  | { type: 'SELECT_NODE'; nodeId: string | null }
  | { type: 'MARK_CLEAN' }

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_FLOW':
      return { ...state, flow: action.flow, isDirty: false, selectedNodeId: null }

    case 'ADD_NODE': {
      const newNode: FlowNode = {
        id: generateId(),
        type: action.stepType,
        position: { x: 0, y: 0 },
        data: defaultDataForType(action.stepType),
      }
      const nodes = [...state.flow.nodes]
      const insertAt = action.atIndex ?? nodes.length
      nodes.splice(insertAt, 0, newNode)
      const edges = rebuildLinearEdges(nodes)
      return {
        ...state,
        flow: { nodes, edges },
        selectedNodeId: newNode.id,
        isDirty: true,
      }
    }

    case 'REMOVE_NODE': {
      const nodes = state.flow.nodes.filter((n) => n.id !== action.nodeId)
      const edges = rebuildLinearEdges(nodes)
      return {
        ...state,
        flow: { nodes, edges },
        selectedNodeId: state.selectedNodeId === action.nodeId ? null : state.selectedNodeId,
        isDirty: true,
      }
    }

    case 'UPDATE_NODE': {
      const nodes = state.flow.nodes.map((n) =>
        n.id === action.nodeId ? { ...n, data: action.data, type: action.data.type } : n
      )
      return { ...state, flow: { ...state.flow, nodes }, isDirty: true }
    }

    case 'REORDER_NODES': {
      const nodes = [...state.flow.nodes]
      const [moved] = nodes.splice(action.fromIndex, 1)
      if (moved) {
        nodes.splice(action.toIndex, 0, moved)
      }
      const edges = rebuildLinearEdges(nodes)
      return { ...state, flow: { nodes, edges }, isDirty: true }
    }

    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.nodeId }

    case 'MARK_CLEAN':
      return { ...state, isDirty: false }
  }
}

const emptyFlow: FlowDefinition = { nodes: [], edges: [] }

export function useBuilder(initialFlow?: FlowDefinition) {
  const [state, dispatch] = useReducer(builderReducer, {
    flow: initialFlow ?? emptyFlow,
    selectedNodeId: null,
    isDirty: false,
  })

  const setFlow = useCallback((flow: FlowDefinition) => {
    dispatch({ type: 'SET_FLOW', flow })
  }, [])

  const addNode = useCallback((stepType: StepType, atIndex?: number) => {
    dispatch({ type: 'ADD_NODE', stepType, atIndex })
  }, [])

  const removeNode = useCallback((nodeId: string) => {
    dispatch({ type: 'REMOVE_NODE', nodeId })
  }, [])

  const updateNode = useCallback((nodeId: string, data: QuestionData) => {
    dispatch({ type: 'UPDATE_NODE', nodeId, data })
  }, [])

  const reorderNodes = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_NODES', fromIndex, toIndex })
  }, [])

  const selectNode = useCallback((nodeId: string | null) => {
    dispatch({ type: 'SELECT_NODE', nodeId })
  }, [])

  const markClean = useCallback(() => {
    dispatch({ type: 'MARK_CLEAN' })
  }, [])

  const selectedNode = state.selectedNodeId
    ? state.flow.nodes.find((n) => n.id === state.selectedNodeId) ?? null
    : null

  return {
    flow: state.flow,
    nodes: state.flow.nodes,
    edges: state.flow.edges,
    selectedNodeId: state.selectedNodeId,
    selectedNode,
    isDirty: state.isDirty,
    setFlow,
    addNode,
    removeNode,
    updateNode,
    reorderNodes,
    selectNode,
    markClean,
  }
}
