import type { FlowDefinition, QualificationNodeData, Answers } from '@typecall/flow-engine'

export type LeadTag = 'diamond' | 'gold' | 'silver' | 'bronze' | 'disqualified'

const TAG_RANK: Record<LeadTag, number> = {
  disqualified: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 4,
}

// deriveTagFromAnswers calcula a tag mais restritiva (menor rank) entre
// todas as choices selecionadas em qualification nodes. Sem qualification
// ou sem resposta, retorna 'silver' (default neutro).
export function deriveTagFromAnswers(flow: FlowDefinition, answers: Answers): LeadTag {
  const qualNodes = flow.nodes.filter((n) => n.type === 'qualification')
  if (qualNodes.length === 0) return 'silver'

  let lowest: LeadTag | null = null
  for (const node of qualNodes) {
    const data = node.data.props as QualificationNodeData
    const ans = answers[node.id]
    if (!ans || typeof ans !== 'object') continue

    const map = ans as unknown as Record<string, string>
    for (const question of data.questions) {
      const choiceID = map[question.id]
      if (!choiceID) continue
      const choice = question.choices.find((c) => c.id === choiceID)
      if (!choice) continue
      if (lowest === null || TAG_RANK[choice.tag] < TAG_RANK[lowest]) {
        lowest = choice.tag
      }
    }
  }

  return lowest ?? 'silver'
}
