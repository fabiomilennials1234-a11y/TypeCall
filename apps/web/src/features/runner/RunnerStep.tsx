import type {
  FlowNode,
  AnswerValue,
  Choice,
  ScheduleNodeData,
  QualificationNodeData,
  QualificationChoice,
  SocialProofNodeData,
  AlignmentVideoNodeData,
} from '@typecall/flow-engine'
import { ScheduleStep } from '@/features/runner/ScheduleStep'
import { cn } from '@/lib/cn'
import { getFontStack, type FontKey } from '@/features/builder/lib/fonts'
import { toEmbedUrl } from '@/features/builder/components/blocks/AlignmentVideoBlock'

interface RunnerStepProps {
  node: FlowNode
  value: AnswerValue
  error: string
  onChange: (value: AnswerValue) => void
  onSubmit: () => void
  prefillName?: string
  prefillEmail?: string
  formSlug?: string
  leadTag?: string
}

export function RunnerStep({ node, value, error, onChange, onSubmit, prefillName, prefillEmail, formSlug, leadTag }: RunnerStepProps) {
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

      {type === 'phone' && (
        <TextInput
          type="tel"
          value={String(value ?? '')}
          placeholder={(data.props as { placeholder?: string }).placeholder ?? '+55 11 99999-9999'}
          error={error}
          onChange={(v) => onChange(v)}
          onEnter={onSubmit}
        />
      )}

      {type === 'long_text' && (
        <TextAreaInput
          value={String(value ?? '')}
          placeholder={(data.props as { placeholder?: string }).placeholder ?? 'Escreva aqui...'}
          error={error}
          onChange={(v) => onChange(v)}
        />
      )}

      {type === 'checkboxes' && (
        <CheckboxesInput
          choices={(data.props as { choices: Choice[] }).choices}
          value={(Array.isArray(value) ? value : []) as string[]}
          error={error}
          onChange={(v) => onChange(v as unknown as AnswerValue)}
        />
      )}

      {type === 'multiple_choice' && (
        <ChoiceInput
          choices={(data.props as { choices: Choice[] }).choices}
          value={String(value ?? '')}
          error={error}
          onChange={(v) => {
            onChange(v)
            // Auto-advance no proximo tick para o reducer commitar a resposta antes
            setTimeout(() => onSubmit(), 60)
          }}
        />
      )}

      {type === 'qualification' && (
        <QualificationInput
          data={data.props as QualificationNodeData}
          value={value as Record<string, string> | null}
          error={error}
          onChange={onChange}
          onSubmit={onSubmit}
        />
      )}

      {type === 'social_proof' && (
        <SocialProofView data={data.props as SocialProofNodeData} onContinue={onSubmit} />
      )}

      {type === 'alignment_video' && (
        <AlignmentVideoView data={data.props as AlignmentVideoNodeData} onContinue={onSubmit} />
      )}

      {type === 'schedule' && (
        <ScheduleStep
          eventTypeId={(data.props as ScheduleNodeData).eventTypeId}
          formSlug={formSlug}
          tag={leadTag}
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

function QualificationInput({
  data,
  value,
  error,
  onChange,
  onSubmit,
}: {
  data: QualificationNodeData
  value: Record<string, string> | null
  error: string
  onChange: (value: AnswerValue) => void
  onSubmit: () => void
}) {
  const answers = value ?? {}
  const questions = data.questions ?? []
  const answeredAll = questions.every((q) => Boolean(answers[q.id]))

  function pick(qID: string, choice: QualificationChoice) {
    const next = { ...answers, [qID]: choice.value }
    onChange(next as unknown as AnswerValue)
    if (questions.every((q) => (q.id === qID ? next[qID] : Boolean(next[q.id])))) {
      setTimeout(() => onSubmit(), 100)
    }
  }

  return (
    <div className="space-y-6">
      {questions.map((q, qIdx) => (
        <div key={q.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--form-primary)]/15 text-xs font-semibold text-[color:var(--form-primary)]">
              {qIdx + 1}
            </span>
            <span className="text-base font-medium">{q.label}</span>
          </div>
          <div className="space-y-1.5 pl-8">
            {q.choices.map((choice) => {
              const selected = answers[q.id] === choice.value
              return (
                <button
                  key={choice.id}
                  onClick={() => pick(q.id, choice)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-left transition-all',
                    selected
                      ? 'border-[color:var(--form-primary)] bg-[color:var(--form-primary)]/5'
                      : 'border-border opacity-80 hover:opacity-100 hover:border-[color:var(--form-primary)]/40',
                  )}
                >
                  <span className={cn(
                    'h-2 w-2 rounded-full',
                    selected ? 'bg-[color:var(--form-primary)]' : 'bg-muted-foreground/30',
                  )} />
                  <span className="text-sm">{choice.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {!answeredAll && questions.length > 0 && (
        <p className="text-xs opacity-50">Responda todas para avancar.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function SocialProofView({ data, onContinue }: { data: SocialProofNodeData; onContinue: () => void }) {
  const media = data.mediaUrls ?? []
  return (
    <div className="space-y-5">
      {media.length > 0 && (
        <div className={cn('grid gap-3', media.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
          {media.map((url, idx) => (
            <div key={url + idx} className="overflow-hidden rounded-xl border border-border">
              {/\.(mp4|webm)$/i.test(url) ? (
                <video src={url} controls className="h-48 w-full object-cover" />
              ) : (
                <img src={url} alt="" className="h-48 w-full object-cover" />
              )}
            </div>
          ))}
        </div>
      )}
      {data.differentialText && (
        <p className="text-base leading-relaxed opacity-90">{data.differentialText}</p>
      )}
      <button
        onClick={onContinue}
        className="rounded-lg px-8 py-3 text-sm font-medium text-white"
        style={{ background: 'var(--form-primary)', borderRadius: 'var(--form-radius)' }}
      >
        Continuar
      </button>
    </div>
  )
}

function AlignmentVideoView({ data, onContinue }: { data: AlignmentVideoNodeData; onContinue: () => void }) {
  const embed = toEmbedUrl(data.videoUrl ?? '')
  return (
    <div className="space-y-5">
      {embed ? (
        <div className="overflow-hidden rounded-xl border border-border bg-black">
          <iframe
            src={embed}
            className="aspect-video w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      ) : (
        <p className="text-sm opacity-70">Video nao disponivel.</p>
      )}
      {data.supportText && (
        <p className="text-sm leading-relaxed opacity-80">{data.supportText}</p>
      )}
      <button
        onClick={onContinue}
        className="rounded-lg px-8 py-3 text-sm font-medium text-white"
        style={{ background: 'var(--form-primary)', borderRadius: 'var(--form-radius)' }}
      >
        Continuar
      </button>
    </div>
  )
}

function TextAreaInput({
  value,
  placeholder,
  error,
  onChange,
}: {
  value: string
  placeholder: string
  error: string
  onChange: (value: string) => void
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      autoFocus
      rows={4}
      className={cn(
        'w-full resize-none border-b-2 bg-transparent py-3 text-lg text-foreground outline-none transition-colors',
        'placeholder:text-muted-foreground/40',
        error ? 'border-destructive' : 'border-border focus:border-primary',
      )}
    />
  )
}

function CheckboxesInput({
  choices,
  value,
  error,
  onChange,
}: {
  choices: Choice[]
  value: string[]
  error: string
  onChange: (value: string[]) => void
}) {
  function toggle(v: string) {
    const has = value.includes(v)
    onChange(has ? value.filter((x) => x !== v) : [...value, v])
  }
  return (
    <div className="space-y-2">
      {choices.map((choice, index) => {
        const selected = value.includes(choice.value)
        return (
          <button
            key={choice.id}
            onClick={() => toggle(choice.value)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border-2 px-5 py-3.5 text-left transition-all',
              selected
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border text-foreground/80 hover:border-primary/40',
            )}
          >
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {String.fromCharCode(65 + index)}
            </span>
            <span className="text-base">{choice.label}</span>
          </button>
        )
      })}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
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
