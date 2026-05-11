import type { FlowDefinition, FlowNode, FlowEdge } from '@typecall/flow-engine'
import { nanoid } from 'nanoid'

export type ContactField = 'name' | 'email' | 'company' | 'instagram' | 'whatsapp'

export interface QuizDefaultOpts {
  contactFields: ContactField[]
  scheduleEventTypeId?: string
}

export const DEFAULT_CONTACT_FIELDS: ContactField[] = ['name', 'email', 'whatsapp']

const Y_STEP = 200

export function buildQuizDefaultFlow(opts: QuizDefaultOpts): FlowDefinition {
  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []
  let y = 0

  function addNode(node: FlowNode) {
    nodes.push(node)
    if (nodes.length > 1) {
      const prev = nodes[nodes.length - 2]
      if (prev) {
        edges.push({
          id: `e_${prev.id}_${node.id}`,
          source: prev.id,
          target: node.id,
        })
      }
    }
  }

  // Etapa 0 — Contato (toggleavel)
  if (opts.contactFields.includes('name')) {
    y += Y_STEP
    addNode({
      id: nanoid(8),
      type: 'short_text',
      position: { x: 0, y },
      data: {
        type: 'short_text',
        props: {
          label: 'Como podemos te chamar?',
          placeholder: 'Seu nome',
          required: true,
          maxLength: 100,
        },
      },
    })
  }
  if (opts.contactFields.includes('email')) {
    y += Y_STEP
    addNode({
      id: nanoid(8),
      type: 'email',
      position: { x: 0, y },
      data: {
        type: 'email',
        props: {
          label: 'Qual seu melhor email?',
          placeholder: 'voce@empresa.com',
          required: true,
        },
      },
    })
  }
  if (opts.contactFields.includes('company')) {
    y += Y_STEP
    addNode({
      id: nanoid(8),
      type: 'short_text',
      position: { x: 0, y },
      data: {
        type: 'short_text',
        props: {
          label: 'Nome da empresa',
          placeholder: 'Empresa SA',
          required: false,
          maxLength: 120,
        },
      },
    })
  }
  if (opts.contactFields.includes('instagram')) {
    y += Y_STEP
    addNode({
      id: nanoid(8),
      type: 'short_text',
      position: { x: 0, y },
      data: {
        type: 'short_text',
        props: {
          label: 'Instagram da empresa',
          placeholder: '@empresa',
          required: false,
          maxLength: 60,
        },
      },
    })
  }
  if (opts.contactFields.includes('whatsapp')) {
    y += Y_STEP
    addNode({
      id: nanoid(8),
      type: 'phone',
      position: { x: 0, y },
      data: {
        type: 'phone',
        props: {
          label: 'Qual seu WhatsApp?',
          placeholder: '+55 11 99999-9999',
          required: true,
          countryCode: 'BR',
        },
      },
    })
  }

  // Etapa 1 — Dor
  y += Y_STEP
  addNode({
    id: nanoid(8),
    type: 'long_text',
    position: { x: 0, y },
    data: {
      type: 'long_text',
      props: {
        label: 'Qual e o maior desafio que voce enfrenta hoje?',
        description: 'Conta um pouco do contexto pra entendermos melhor.',
        placeholder: 'Descreva sua dor principal...',
        required: true,
        minLength: 20,
      },
    },
  })

  // Etapa 2 — Produto
  y += Y_STEP
  addNode({
    id: nanoid(8),
    type: 'checkboxes',
    position: { x: 0, y },
    data: {
      type: 'checkboxes',
      props: {
        label: 'Quais produtos te interessam?',
        description: 'Selecione um ou mais.',
        required: true,
        minSelections: 1,
        choices: [
          { id: nanoid(6), label: 'Produto A', value: 'produto_a' },
          { id: nanoid(6), label: 'Produto B', value: 'produto_b' },
          { id: nanoid(6), label: 'Produto C', value: 'produto_c' },
        ],
      },
    },
  })

  // Etapa 3 — Qualificacao
  y += Y_STEP
  addNode({
    id: nanoid(8),
    type: 'qualification',
    position: { x: 0, y },
    data: {
      type: 'qualification',
      props: {
        label: 'Vamos entender melhor seu momento',
        required: true,
        questions: [
          {
            id: nanoid(6),
            label: 'Qual o tamanho da sua operacao hoje?',
            choices: [
              { id: nanoid(6), label: '1-5 pessoas', value: 'small', tag: 'bronze' },
              { id: nanoid(6), label: '6-20 pessoas', value: 'mid', tag: 'silver' },
              { id: nanoid(6), label: '21-100 pessoas', value: 'large', tag: 'gold' },
              { id: nanoid(6), label: '100+ pessoas', value: 'xlarge', tag: 'diamond' },
            ],
          },
          {
            id: nanoid(6),
            label: 'Quao urgente e resolver isso?',
            choices: [
              { id: nanoid(6), label: 'Daqui a alguns meses', value: 'low', tag: 'bronze' },
              { id: nanoid(6), label: 'Nas proximas semanas', value: 'medium', tag: 'silver' },
              { id: nanoid(6), label: 'Imediato', value: 'high', tag: 'gold' },
            ],
          },
          {
            id: nanoid(6),
            label: 'Voce e quem decide a contratacao?',
            choices: [
              { id: nanoid(6), label: 'Sim, decisao minha', value: 'decision_maker', tag: 'gold' },
              { id: nanoid(6), label: 'Decido com time', value: 'team', tag: 'silver' },
              { id: nanoid(6), label: 'Apenas pesquisando', value: 'research', tag: 'bronze' },
            ],
          },
        ],
      },
    },
  })

  // Etapa 4 — Aumento de consciencia
  y += Y_STEP
  addNode({
    id: nanoid(8),
    type: 'social_proof',
    position: { x: 0, y },
    data: {
      type: 'social_proof',
      props: {
        label: 'Resultados de quem ja confiou',
        mediaUrls: [],
        differentialText: 'Adicione um video ou imagem com depoimento real.',
      },
    },
  })
  y += Y_STEP
  addNode({
    id: nanoid(8),
    type: 'social_proof',
    position: { x: 0, y },
    data: {
      type: 'social_proof',
      props: {
        label: 'Mais um caso de sucesso',
        mediaUrls: [],
        differentialText: 'Adicione um segundo depoimento.',
      },
    },
  })
  y += Y_STEP
  addNode({
    id: nanoid(8),
    type: 'statement',
    position: { x: 0, y },
    data: {
      type: 'statement',
      props: {
        label: 'Por que nos somos diferentes',
        description: 'Liste 3-5 diferenciais que so voce tem. Edite no builder.',
        buttonText: 'Continuar',
      },
    },
  })

  // Etapa 5 — Agendamento
  y += Y_STEP
  addNode({
    id: nanoid(8),
    type: 'schedule',
    position: { x: 0, y },
    data: {
      type: 'schedule',
      props: {
        label: 'Escolha o melhor horario',
        required: true,
        eventTypeId: opts.scheduleEventTypeId ?? '',
      },
    },
  })

  // Etapa 6 — Alinhamento
  y += Y_STEP
  addNode({
    id: nanoid(8),
    type: 'alignment_video',
    position: { x: 0, y },
    data: {
      type: 'alignment_video',
      props: {
        label: 'Antes da nossa conversa',
        videoUrl: '',
        supportText:
          'Grave um video curto explicando o que vai acontecer e contando mais sobre a empresa.',
      },
    },
  })

  return { nodes, edges }
}
