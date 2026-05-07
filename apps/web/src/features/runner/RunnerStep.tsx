import type { FlowNode, AnswerValue, Choice, ScheduleNodeData } from '@typecall/flow-engine'
import { ScheduleStep } from '@/features/runner/ScheduleStep'
import { cn } from '@/lib/cn'
import { getFontStack, type FontKey } from '@/features/builder/lib/fonts'

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
  const blockFont = (data.props.font as FontKey | undefined) ?? 'inter'
  const fontStack = getFontStack(blockFont)

  return (
    <div className="space-y-6" style={{ fontFamily: fontStack }}>
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: fontStack, color: 'var(--form-text)' }}>{data.props.label}</h2>
        {'description' in data.props && data.props.description && (
          <p className="mt-2 text-base opacity-70" style={{ fontFamily: fontStack }}>{data.props.description as string}</p>
        )}
      </div>

      {type === 'welcome' && (
        <button
          onClick={onSubmit}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {(data.props as { buttonText?: string }).buttonText ?? 'Comecar'}
        </button>
      )}

      {type === 'short_text' && (
        <TextInput
          value={String(value ?? '')}
          placeholder={(data.props as { placeholder?: string }).placeholder ?? 'Digite aqui...'}
          error={error}
          onChange={(v) => onChange(v)}
          onEnter={onSubmit}
        />
      )}

      {type === 'email' && (
        <TextInput
          type="email"
          value={String(value ?? '')}
          placeholder={(data.props as { placeholder?: string }).placeholder ?? 'email@exemplo.com'}
          error={error}
          onChange={(v) => onChange(v)}
          onEnter={onSubmit}
        />
      )}

      {type === 'multiple_choice' && (
        <ChoiceInput
          choices={(data.props as { choices: Choice[] }).choices}
          value={String(value ?? '')}
          error={error}
          onChange={onChange}
        />
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
          className="rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {(data.props as { buttonText?: string }).buttonText ?? 'Continuar'}
        </button>
      )}

      {type === 'ending' && null}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

function TextInput({
  type = 'text',
  value,
  placeholder,
  error,
  onChange,
  onEnter,
}: {
  type?: string
  value: string
  placeholder: string
  error: string
  onChange: (value: string) => void
  onEnter: () => void
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter() } }}
      autoFocus
      className={cn(
        'w-full border-b-2 bg-transparent py-3 text-xl text-foreground outline-none transition-colors',
        'placeholder:text-muted-foreground/40',
        error ? 'border-destructive' : 'border-border focus:border-primary'
      )}
    />
  )
}

function ChoiceInput({
  choices,
  value,
  error,
  onChange,
}: {
  choices: Choice[]
  value: string
  error: string
  onChange: (value: AnswerValue) => void
}) {
  return (
    <div className="space-y-2">
      {choices.map((choice, index) => (
        <button
          key={choice.id}
          onClick={() => onChange(choice.value)}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border-2 px-5 py-3.5 text-left transition-all',
            value === choice.value
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-border text-foreground/80 hover:border-primary/40'
          )}
        >
          <span className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold',
            value === choice.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}>
            {String.fromCharCode(65 + index)}
          </span>
          <span className="text-base">{choice.label}</span>
        </button>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
