import { useCallback } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { FlowNode, QuestionData, Choice } from '@typecall/flow-engine'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import * as eventTypesApi from '@/api/endpoints/eventTypes'
import { cn } from '@/lib/cn'

interface PropertyPanelProps {
  node: FlowNode | null
  onUpdate: (nodeId: string, data: QuestionData) => void
  onClose: () => void
}

export function PropertyPanel({ node, onUpdate, onClose }: PropertyPanelProps) {
  if (!node) {
    return (
      <div className="flex h-full w-72 items-center justify-center border-l border-border bg-card">
        <p className="text-sm text-muted-foreground">Selecione um bloco para editar</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-72 flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Propriedades</h2>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <PropertyFields node={node} onUpdate={onUpdate} />
      </div>
    </div>
  )
}

interface PropertyFieldsProps {
  node: FlowNode
  onUpdate: (nodeId: string, data: QuestionData) => void
}

function PropertyFields({ node, onUpdate }: PropertyFieldsProps) {
  const { data } = node

  const updateProp = useCallback(
    (key: string, value: unknown) => {
      const updated = {
        ...data,
        props: { ...data.props, [key]: value },
      } as QuestionData
      onUpdate(node.id, updated)
    },
    [data, node.id, onUpdate]
  )

  return (
    <div className="space-y-4">
      <FieldGroup label="Titulo">
        <Input
          value={data.props.label}
          onChange={(e) => updateProp('label', e.target.value)}
          placeholder="Titulo do bloco"
        />
      </FieldGroup>

      {'description' in data.props && (
        <FieldGroup label="Descricao">
          <textarea
            value={(data.props.description as string) ?? ''}
            onChange={(e) => updateProp('description', e.target.value)}
            placeholder="Descricao opcional"
            rows={2}
            className={cn(
              'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'resize-none'
            )}
          />
        </FieldGroup>
      )}

      {'required' in data.props && (
        <FieldGroup label="Obrigatorio">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(data.props.required as boolean) ?? false}
              onChange={(e) => updateProp('required', e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-muted-foreground">Campo obrigatorio</span>
          </label>
        </FieldGroup>
      )}

      {'placeholder' in data.props && (
        <FieldGroup label="Placeholder">
          <Input
            value={(data.props.placeholder as string) ?? ''}
            onChange={(e) => updateProp('placeholder', e.target.value)}
            placeholder="Texto do placeholder"
          />
        </FieldGroup>
      )}

      {'maxLength' in data.props && (
        <FieldGroup label="Max. caracteres">
          <Input
            type="number"
            value={(data.props.maxLength as number) ?? ''}
            onChange={(e) => updateProp('maxLength', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Sem limite"
          />
        </FieldGroup>
      )}

      {'buttonText' in data.props && (
        <FieldGroup label="Texto do botao">
          <Input
            value={(data.props.buttonText as string) ?? ''}
            onChange={(e) => updateProp('buttonText', e.target.value)}
            placeholder="Continuar"
          />
        </FieldGroup>
      )}

      {'choices' in data.props && (
        <ChoicesEditor
          choices={(data.props as { choices: Choice[] }).choices}
          onChange={(choices) => updateProp('choices', choices)}
        />
      )}

      {'eventTypeId' in data.props && (
        <EventTypeSelector
          value={(data.props as { eventTypeId: string }).eventTypeId}
          onChange={(id) => updateProp('eventTypeId', id)}
        />
      )}
    </div>
  )
}

interface ChoicesEditorProps {
  choices: Choice[]
  onChange: (choices: Choice[]) => void
}

function ChoicesEditor({ choices, onChange }: ChoicesEditorProps) {
  function addChoice() {
    const id = `c_${Date.now().toString(36)}`
    onChange([...choices, { id, label: `Opcao ${choices.length + 1}`, value: `opcao_${choices.length + 1}` }])
  }

  function removeChoice(id: string) {
    onChange(choices.filter((c) => c.id !== id))
  }

  function updateChoice(id: string, label: string) {
    onChange(
      choices.map((c) =>
        c.id === id ? { ...c, label, value: label.toLowerCase().replace(/\s+/g, '_') } : c
      )
    )
  }

  return (
    <FieldGroup label="Opcoes">
      <div className="space-y-1.5">
        {choices.map((choice) => (
          <div key={choice.id} className="flex items-center gap-1.5">
            <Input
              value={choice.label}
              onChange={(e) => updateChoice(choice.id, e.target.value)}
              className="h-8 text-xs"
            />
            <button
              onClick={() => removeChoice(choice.id)}
              className="rounded p-1 text-muted-foreground/40 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={addChoice} className="mt-2 w-full">
        <Plus className="h-3.5 w-3.5" />
        Adicionar opcao
      </Button>
    </FieldGroup>
  )
}

function EventTypeSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { data } = useQuery({
    queryKey: ['event-types'],
    queryFn: () => eventTypesApi.listEventTypes(),
  })

  return (
    <FieldGroup label="Tipo de reuniao">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
        )}
      >
        <option value="">Selecione um tipo...</option>
        {data?.eventTypes.map((et) => (
          <option key={et.id} value={et.id}>
            {et.title} ({et.durationMinutes}min)
          </option>
        ))}
      </select>
      {!value && (
        <p className="text-xs text-destructive">Selecione um tipo de reuniao para o agendamento funcionar</p>
      )}
    </FieldGroup>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
