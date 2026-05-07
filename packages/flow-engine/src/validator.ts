import type {
  AnswerValue,
  FlowDefinition,
  FlowNode,
  ValidationError,
  ValidationResult,
} from './types.js'

export function validateAnswer(node: FlowNode, value: AnswerValue): ValidationResult {
  const errors: ValidationError[] = []
  const { type, data } = node
  const required = data.props.required ?? false

  if (type === 'welcome' || type === 'ending' || type === 'statement') {
    return { valid: true, errors: [] }
  }

  if (required && isEmpty(value)) {
    errors.push({ field: node.id, message: 'Este campo e obrigatorio' })
    return { valid: false, errors }
  }

  if (!required && isEmpty(value)) {
    return { valid: true, errors: [] }
  }

  switch (type) {
    case 'short_text':
    case 'long_text': {
      const str = String(value)
      const props = data.props as { maxLength?: number; minLength?: number }
      if (props.maxLength && str.length > props.maxLength) {
        errors.push({ field: node.id, message: `Maximo de ${props.maxLength} caracteres` })
      }
      if (props.minLength && str.length < props.minLength) {
        errors.push({ field: node.id, message: `Minimo de ${props.minLength} caracteres` })
      }
      break
    }

    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (typeof value !== 'string' || !emailRegex.test(value)) {
        errors.push({ field: node.id, message: 'Email invalido' })
      }
      break
    }

    case 'phone': {
      const digitsOnly = typeof value === 'string' ? value.replace(/\D/g, '') : ''
      if (typeof value !== 'string' || digitsOnly.length < 8 || digitsOnly.length > 15) {
        errors.push({ field: node.id, message: 'Telefone invalido' })
      }
      break
    }

    case 'number': {
      const num = Number(value)
      if (Number.isNaN(num)) {
        errors.push({ field: node.id, message: 'Valor numerico invalido' })
        break
      }
      const numProps = data.props as { min?: number; max?: number }
      if (numProps.min !== undefined && num < numProps.min) {
        errors.push({ field: node.id, message: `Valor minimo: ${numProps.min}` })
      }
      if (numProps.max !== undefined && num > numProps.max) {
        errors.push({ field: node.id, message: `Valor maximo: ${numProps.max}` })
      }
      break
    }

    case 'multiple_choice':
    case 'dropdown': {
      const props = data.props as { choices: { value: string }[] }
      const validValues = props.choices.map((c) => c.value)
      if (typeof value === 'string' && !validValues.includes(value)) {
        const allowOther = (data.props as { allowOther?: boolean }).allowOther
        if (!allowOther) {
          errors.push({ field: node.id, message: 'Opcao invalida' })
        }
      }
      break
    }

    case 'checkboxes': {
      const props = data.props as {
        choices: { value: string }[]
        minSelections?: number
        maxSelections?: number
      }
      if (!Array.isArray(value)) {
        errors.push({ field: node.id, message: 'Selecione pelo menos uma opcao' })
        break
      }
      if (props.minSelections && value.length < props.minSelections) {
        errors.push({ field: node.id, message: `Selecione no minimo ${props.minSelections}` })
      }
      if (props.maxSelections && value.length > props.maxSelections) {
        errors.push({ field: node.id, message: `Selecione no maximo ${props.maxSelections}` })
      }
      break
    }

    case 'rating': {
      const num = Number(value)
      const steps = (data.props as { steps: number }).steps
      if (Number.isNaN(num) || num < 1 || num > steps) {
        errors.push({ field: node.id, message: `Selecione entre 1 e ${steps}` })
      }
      break
    }

    case 'nps': {
      const num = Number(value)
      if (Number.isNaN(num) || num < 0 || num > 10) {
        errors.push({ field: node.id, message: 'Selecione entre 0 e 10' })
      }
      break
    }

    case 'date': {
      if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
        errors.push({ field: node.id, message: 'Data invalida' })
      }
      break
    }
  }

  return { valid: errors.length === 0, errors }
}

export function validateFlow(flow: FlowDefinition): ValidationResult {
  const errors: ValidationError[] = []

  if (flow.nodes.length === 0) {
    errors.push({ field: 'flow', message: 'Flow deve ter pelo menos um step' })
    return { valid: false, errors }
  }

  const contentNodes = flow.nodes.filter(
    (n) => n.type !== 'welcome' && n.type !== 'ending' && n.type !== 'statement'
  )
  if (contentNodes.length === 0) {
    errors.push({ field: 'flow', message: 'Flow deve ter pelo menos uma pergunta' })
  }

  const hasEnding = flow.nodes.some((n) => n.type === 'ending')
  if (!hasEnding) {
    errors.push({ field: 'flow', message: 'Flow deve ter pelo menos um step de encerramento' })
  }

  const nodeIds = new Set(flow.nodes.map((n) => n.id))

  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push({ field: edge.id, message: `Edge referencia source inexistente: ${edge.source}` })
    }
    if (!nodeIds.has(edge.target)) {
      errors.push({ field: edge.id, message: `Edge referencia target inexistente: ${edge.target}` })
    }
  }

  const reachable = getReachableNodes(flow)
  for (const node of flow.nodes) {
    if (!reachable.has(node.id)) {
      errors.push({ field: node.id, message: `Step "${node.data.props.label}" nao e alcancavel` })
    }
  }

  if (hasCycle(flow)) {
    errors.push({ field: 'flow', message: 'Flow contem ciclo infinito' })
  }

  return { valid: errors.length === 0, errors }
}

function isEmpty(value: AnswerValue): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function getReachableNodes(flow: FlowDefinition): Set<string> {
  const targetIds = new Set(flow.edges.map((e) => e.target))
  const roots = flow.nodes.filter((n) => !targetIds.has(n.id))
  const startId = roots[0]?.id ?? flow.nodes[0]?.id

  if (!startId) return new Set()

  const visited = new Set<string>()
  const queue = [startId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)

    const outgoing = flow.edges.filter((e) => e.source === current)
    for (const edge of outgoing) {
      if (!visited.has(edge.target)) {
        queue.push(edge.target)
      }
    }
  }

  return visited
}

function hasCycle(flow: FlowDefinition): boolean {
  const adjacency = new Map<string, string[]>()
  for (const edge of flow.edges) {
    const existing = adjacency.get(edge.source) ?? []
    existing.push(edge.target)
    adjacency.set(edge.source, existing)
  }

  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Map<string, number>()

  for (const node of flow.nodes) {
    color.set(node.id, WHITE)
  }

  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY)
    const neighbors = adjacency.get(nodeId) ?? []

    for (const neighbor of neighbors) {
      const c = color.get(neighbor) ?? WHITE
      if (c === GRAY) return true
      if (c === WHITE && dfs(neighbor)) return true
    }

    color.set(nodeId, BLACK)
    return false
  }

  for (const node of flow.nodes) {
    if (color.get(node.id) === WHITE) {
      if (dfs(node.id)) return true
    }
  }

  return false
}
