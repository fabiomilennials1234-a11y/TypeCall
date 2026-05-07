import type { FlowNode, AnswerValue, Choice, ScheduleNodeData } from '@typecall/flow-engine'
import { ScheduleStep } from '@/components/ScheduleStep'

interface RunnerStepProps {
  node: FlowNode
  value: AnswerValue
  error: string
  onChange: (value: AnswerValue) => void
  onSubmit: () => void
  prefillName?: string
  prefillEmail?: string
}

export function RunnerStep({ node, value, error, onChange, onSubmit, prefillName, prefillEmail }: RunnerStepProps) {
  const { type, data } = node

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{data.props.label as string}</h2>
        {'description' in data.props && data.props.description && (
          <p className="mt-2 text-base text-muted-foreground">{data.props.description as string}</p>
        )}
      </div>

      {type === 'welcome' && (
        <button
          onClick={onSubmit}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {(data.props as { buttonText?: string }).buttonText ?? 'Comecar'}
        </button>
      )}

      {type === 'short_text' && (
        <input
          type="text"
          value={String(value ?? '')}
          placeholder={(data.props as { placeholder?: string }).placeholder ?? 'Digite aqui...'}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit() } }}
          autoFocus
          className="w-full border-b-2 border-border bg-transparent py-3 text-xl text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary"
        />
      )}

      {type === 'email' && (
        <input
          type="email"
          value={String(value ?? '')}
          placeholder={(data.props as { placeholder?: string }).placeholder ?? 'email@exemplo.com'}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit() } }}
          autoFocus
          className="w-full border-b-2 border-border bg-transparent py-3 text-xl text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary"
        />
      )}

      {type === 'multiple_choice' && (
        <div className="space-y-2">
          {((data.props as { choices: Choice[] }).choices).map((choice, index) => (
            <button
              key={choice.id}
              onClick={() => onChange(choice.value)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-5 py-3.5 text-left transition-all ${
                value === choice.value
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border text-foreground/80 hover:border-primary/40'
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                value === choice.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-base">{choice.label}</span>
            </button>
          ))}
        </div>
      )}

      {type === 'schedule' && (
        <ScheduleStep
          eventTypeId={(data.props as ScheduleNodeData).eventTypeId}
          prefillName={prefillName}
          prefillEmail={prefillEmail}
          onBooked={(bookingId) => {
            onChange(bookingId)
            onSubmit()
          }}
        />
      )}

      {type === 'statement' && (
        <button
          onClick={onSubmit}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {(data.props as { buttonText?: string }).buttonText ?? 'Continuar'}
        </button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
