import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Award, Trash2, Loader2 } from 'lucide-react'

import * as qualificationApi from '@/api/endpoints/qualification'
import { useFormQuery } from '@/hooks/useForms'
import { cn } from '@/lib/cn'
import type { FlowDefinition, QualificationNodeData, QualificationQuestion } from '@typecall/flow-engine'

const TAG_STYLES: Record<string, string> = {
  diamond:      'bg-cyan-500/15 text-cyan-400 border-cyan-500/40',
  gold:         'bg-amber-500/15 text-amber-400 border-amber-500/40',
  silver:       'bg-zinc-400/15 text-zinc-300 border-zinc-400/40',
  bronze:       'bg-orange-700/15 text-orange-400 border-orange-700/40',
  disqualified: 'bg-destructive/15 text-destructive border-destructive/40',
}

const TAG_LABEL: Record<string, string> = {
  diamond: 'Diamond', gold: 'Gold', silver: 'Silver', bronze: 'Bronze', disqualified: 'Desqualificado',
}

export function QualificationRulesPage() {
  const { id: formId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const formQ = useFormQuery(formId!)

  const rulesQ = useQuery({
    queryKey: ['qualification-rules', formId],
    queryFn: () => qualificationApi.listRules(formId!),
    enabled: !!formId,
  })

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => qualificationApi.deleteRule(formId!, ruleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qualification-rules', formId] }),
  })

  const blockMap = useMemo(() => {
    const map = new Map<string, { question: QualificationQuestion; nodeLabel: string }>()
    const flow = formQ.data?.draftDefinition as unknown as FlowDefinition | undefined
    if (!flow?.nodes) return map
    for (const node of flow.nodes) {
      if (node.type !== 'qualification') continue
      const props = node.data.props as QualificationNodeData
      for (const q of props.questions ?? []) {
        map.set(`${node.id}:${q.id}`, { question: q, nodeLabel: props.label ?? 'Qualificacao' })
      }
    }
    return map
  }, [formQ.data])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center gap-3">
        <Award className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Regras de qualificacao</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mapeamento de respostas para etiquetas. Editar via builder no bloco de qualificacao.
          </p>
        </div>
      </div>

      {rulesQ.isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!rulesQ.isLoading && (rulesQ.data?.rules.length ?? 0) === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Award className="h-10 w-10 text-muted-foreground/40" />
          <h2 className="mt-4 text-lg font-medium">Nenhuma regra cadastrada</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Adicione um bloco de qualificacao no builder e configure as etiquetas.
          </p>
        </div>
      )}

      {(rulesQ.data?.rules.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Pergunta</th>
                <th className="px-4 py-3 font-medium">Resposta</th>
                <th className="px-4 py-3 font-medium">Etiqueta</th>
                <th className="px-4 py-3 font-medium">Prio.</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {(rulesQ.data?.rules ?? []).map((rule) => {
                const meta = blockMap.get(rule.blockId)
                return (
                  <tr key={rule.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {meta?.question.label ?? <span className="opacity-50">(bloco removido)</span>}
                      </div>
                      {meta && (
                        <div className="text-xs text-muted-foreground">{meta.nodeLabel}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">{rule.answerValue}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded px-2 py-0.5 text-xs font-medium border', TAG_STYLES[rule.tag] ?? '')}>
                        {TAG_LABEL[rule.tag] ?? rule.tag}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{rule.priority}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(rule.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-md p-1.5 text-muted-foreground/60 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
