import type { ContactField } from '@typecall/shared/templates'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/cn'
import { OnboardingFooter } from '../OnboardingPage'

export interface FunilValue {
  title: string
  contactFields: ContactField[]
}

const FIELDS: { key: ContactField; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Nome', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'whatsapp', label: 'WhatsApp', required: true },
  { key: 'company', label: 'Empresa' },
  { key: 'instagram', label: 'Instagram da empresa' },
]

export function FunilStep({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: FunilValue
  onChange: (next: FunilValue) => void
  onNext: () => void
  onBack: () => void
}) {
  function toggleField(field: ContactField) {
    const has = value.contactFields.includes(field)
    const next = has
      ? value.contactFields.filter((f) => f !== field)
      : [...value.contactFields, field]
    onChange({ ...value, contactFields: next })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Seu funil</h2>
        <p className="text-sm text-muted-foreground">
          Quiz com 7 etapas: contato, dor, produto, qualificacao, prova social, agendamento, alinhamento.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="title">Titulo do funil</Label>
        <Input
          id="title"
          placeholder="Ex: Qualificacao Q2"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Etapa 0 — Quais informacoes coletar?
        </h3>
        <div className="space-y-1.5">
          {FIELDS.map((f) => {
            const checked = value.contactFields.includes(f.key)
            return (
              <label
                key={f.key}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                  checked ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:border-primary/20',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleField(f.key)}
                  className="h-3.5 w-3.5 rounded accent-primary"
                />
                <span className="flex-1 text-sm">{f.label}</span>
                {f.required && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    sugerido
                  </span>
                )}
              </label>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Estrutura pre-montada</p>
        <ol className="space-y-0.5">
          <li>0. Contato (campos selecionados acima)</li>
          <li>1. Dor — pergunta aberta sobre desafio principal</li>
          <li>2. Produto — multi-select de interesse</li>
          <li>3. Qualificacao — 3 perguntas com etiquetas</li>
          <li>4. Consciencia — 2 provas sociais + diferenciais</li>
          <li>5. Agendamento — lead escolhe horario</li>
          <li>6. Alinhamento — video pos-agendamento</li>
        </ol>
        <p className="mt-3 text-[11px]">Edite cada etapa no builder apos criar.</p>
      </div>

      <OnboardingFooter
        onBack={onBack}
        onNext={onNext}
        nextDisabled={value.contactFields.length === 0}
      />
    </div>
  )
}
