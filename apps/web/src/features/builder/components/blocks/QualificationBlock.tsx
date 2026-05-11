import { Plus, Trash2, Award } from 'lucide-react'
import type { LeadTag, QualificationNodeData, QualificationQuestion, QualificationChoice } from '@typecall/flow-engine'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

const TAGS: Array<{ key: LeadTag; label: string; color: string }> = [
  { key: 'diamond',      label: 'Diamond',     color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40' },
  { key: 'gold',         label: 'Gold',        color: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
  { key: 'silver',       label: 'Silver',      color: 'bg-zinc-400/15 text-zinc-300 border-zinc-400/40' },
  { key: 'bronze',       label: 'Bronze',      color: 'bg-orange-700/15 text-orange-400 border-orange-700/40' },
  { key: 'disqualified', label: 'Desqualificado', color: 'bg-destructive/15 text-destructive border-destructive/40' },
]

interface QualificationBlockProps {
  data: QualificationNodeData
  onChange: (next: QualificationNodeData) => void
}

export function QualificationBlock({ data, onChange }: QualificationBlockProps) {
  const questions = data.questions ?? []

  function patchQuestion(qIdx: number, patch: Partial<QualificationQuestion>) {
    const next = questions.map((q, i) => (i === qIdx ? { ...q, ...patch } : q))
    onChange({ ...data, questions: next })
  }

  function addChoice(qIdx: number) {
    const q = questions[qIdx]
    if (!q) return
    const id = `${q.id}c${q.choices.length + 1}`
    const newChoice: QualificationChoice = {
      id,
      label: 'Nova opcao',
      value: `${q.id}_opcao_${q.choices.length + 1}`,
      tag: 'silver',
    }
    patchQuestion(qIdx, { choices: [...q.choices, newChoice] })
  }

  function removeChoice(qIdx: number, cIdx: number) {
    const q = questions[qIdx]
    if (!q) return
    patchQuestion(qIdx, { choices: q.choices.filter((_, i) => i !== cIdx) })
  }

  function patchChoice(qIdx: number, cIdx: number, patch: Partial<QualificationChoice>) {
    const q = questions[qIdx]
    if (!q) return
    const choices = q.choices.map((c, i) => (i === cIdx ? { ...c, ...patch } : c))
    patchQuestion(qIdx, { choices })
  }

  function addQuestion() {
    if (questions.length >= 3) return
    const idx = questions.length + 1
    onChange({
      ...data,
      questions: [
        ...questions,
        {
          id: `q${idx}`,
          label: `Pergunta ${idx}`,
          choices: [
            { id: `q${idx}c1`, label: 'Sim', value: `q${idx}_sim`, tag: 'silver' },
            { id: `q${idx}c2`, label: 'Nao', value: `q${idx}_nao`, tag: 'bronze' },
          ],
        },
      ],
    })
  }

  function removeQuestion(qIdx: number) {
    onChange({ ...data, questions: questions.filter((_, i) => i !== qIdx) })
  }

  return (
    <div className="space-y-4">
      <PriorityHelper />

      {questions.map((q, qIdx) => (
        <div key={q.id} className="rounded-lg border border-border bg-background/40 p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
              {qIdx + 1}
            </span>
            <Input
              className="flex-1 h-8 text-sm"
              value={q.label}
              onChange={(e) => patchQuestion(qIdx, { label: e.target.value })}
              placeholder="Texto da pergunta"
            />
            {questions.length > 1 && (
              <button
                onClick={() => removeQuestion(qIdx)}
                className="rounded-md p-1 text-muted-foreground/60 hover:text-destructive"
                title="Remover pergunta"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mt-3 space-y-1.5">
            {q.choices.map((c, cIdx) => (
              <div key={c.id} className="flex items-center gap-1.5">
                <Input
                  className="h-8 flex-1 text-xs"
                  value={c.label}
                  onChange={(e) => patchChoice(qIdx, cIdx, {
                    label: e.target.value,
                    value: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                  })}
                />
                <TagPicker
                  value={c.tag}
                  onChange={(tag) => patchChoice(qIdx, cIdx, { tag })}
                />
                <button
                  onClick={() => removeChoice(qIdx, cIdx)}
                  className="rounded p-1 text-muted-foreground/40 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => addChoice(qIdx)}>
            <Plus className="h-3 w-3" />
            Adicionar opcao
          </Button>
        </div>
      ))}

      {questions.length < 3 && (
        <Button variant="outline" size="sm" className="w-full" onClick={addQuestion}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar pergunta ({questions.length}/3)
        </Button>
      )}
    </div>
  )
}

function PriorityHelper() {
  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
      <div className="flex items-center gap-1.5 font-medium text-foreground">
        <Award className="h-3.5 w-3.5 text-primary" />
        Regra de prioridade
      </div>
      <p className="mt-1.5 leading-relaxed text-muted-foreground">
        Se um lead bate em multiplas tags, vence a de maior prioridade:
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <PriorityChip color="bg-cyan-500/15 text-cyan-400">Diamond</PriorityChip>
        <span className="text-muted-foreground/40">{'>'}</span>
        <PriorityChip color="bg-amber-500/15 text-amber-400">Gold</PriorityChip>
        <span className="text-muted-foreground/40">{'>'}</span>
        <PriorityChip color="bg-zinc-400/15 text-zinc-300">Silver</PriorityChip>
        <span className="text-muted-foreground/40">{'>'}</span>
        <PriorityChip color="bg-orange-700/15 text-orange-400">Bronze</PriorityChip>
        <span className="text-muted-foreground/40">{'>'}</span>
        <PriorityChip color="bg-destructive/15 text-destructive">Desq.</PriorityChip>
      </div>
    </div>
  )
}

function PriorityChip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', color)}>{children}</span>
  )
}

function TagPicker({ value, onChange }: { value: LeadTag; onChange: (t: LeadTag) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as LeadTag)}
      className="h-8 rounded-md border border-input bg-transparent px-2 text-[11px]"
    >
      {TAGS.map((t) => (
        <option key={t.key} value={t.key}>{t.label}</option>
      ))}
    </select>
  )
}

export { TAGS as LEAD_TAG_OPTIONS }
