import type { FlowNode } from '@typecall/flow-engine'

interface PreviewStepProps {
  node: FlowNode
}

export function PreviewStep({ node }: PreviewStepProps) {
  const { data, type } = node
  const props = data.props as unknown as Record<string, unknown>
  const label = (props.label as string) || ''
  const description = (props.description as string) || ''
  const placeholder = (props.placeholder as string) || ''

  return (
    <div className="w-full max-w-md space-y-5 text-left">
      {label && (
        <h3
          className="text-2xl font-semibold leading-tight"
          style={{ fontFamily: 'var(--form-heading-font, inherit)' }}
        >
          {label}
        </h3>
      )}

      {description && (
        <p
          className="text-sm opacity-70"
          style={{ fontFamily: 'var(--form-body-font, inherit)' }}
        >
          {description}
        </p>
      )}

      {type === 'welcome' && (
        <PreviewButton label={(props.buttonLabel as string) || 'Comecar'} />
      )}

      {type === 'short_text' && (
        <PreviewInput type="text" placeholder={placeholder || 'Digite aqui...'} />
      )}

      {type === 'long_text' && (
        <PreviewTextarea placeholder={placeholder || 'Escreva sua resposta...'} />
      )}

      {type === 'email' && (
        <PreviewInput type="email" placeholder={placeholder || 'email@exemplo.com'} />
      )}

      {type === 'phone' && (
        <PreviewInput type="tel" placeholder={placeholder || '(11) 99999-9999'} />
      )}

      {type === 'number' && (
        <PreviewInput type="number" placeholder={placeholder || '0'} />
      )}

      {type === 'multiple_choice' && (
        <ChoiceList
          choices={(props.choices as { id: string; label: string }[]) ?? []}
          shape="radio"
        />
      )}

      {type === 'checkboxes' && (
        <ChoiceList
          choices={(props.choices as { id: string; label: string }[]) ?? []}
          shape="square"
        />
      )}

      {type === 'dropdown' && (
        <div
          className="w-full rounded-[var(--form-radius)] border px-4 py-3 text-sm opacity-80"
          style={{ borderColor: 'currentColor', background: 'transparent' }}
        >
          {placeholder || 'Selecione...'}
        </div>
      )}

      {type === 'rating' && <RatingPreview count={(props.max as number) || 5} />}

      {type === 'nps' && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 11 }).map((_, i) => (
            <div
              key={i}
              className="flex h-8 w-8 items-center justify-center rounded-md border text-xs"
              style={{ borderColor: 'currentColor', opacity: 0.7 }}
            >
              {i}
            </div>
          ))}
        </div>
      )}

      {type === 'date' && <PreviewInput type="date" placeholder="" />}

      {type === 'statement' && null}

      {type === 'schedule' && <SchedulePlaceholder />}

      {type === 'ending' && (
        <div className="flex items-center justify-center pt-6">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: 'var(--form-primary)', opacity: 0.15 }}
          >
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="var(--form-primary)">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

function PreviewInput({ type, placeholder }: { type: string; placeholder: string }) {
  return (
    <input
      type={type}
      disabled
      placeholder={placeholder}
      className="w-full rounded-[var(--form-radius)] border bg-transparent px-4 py-3 text-sm placeholder:opacity-40"
      style={{ borderColor: 'currentColor' }}
    />
  )
}

function PreviewTextarea({ placeholder }: { placeholder: string }) {
  return (
    <textarea
      disabled
      rows={4}
      placeholder={placeholder}
      className="w-full resize-none rounded-[var(--form-radius)] border bg-transparent px-4 py-3 text-sm placeholder:opacity-40"
      style={{ borderColor: 'currentColor' }}
    />
  )
}

function PreviewButton({ label }: { label: string }) {
  return (
    <button
      disabled
      className="rounded-[var(--form-radius)] px-5 py-2.5 text-sm font-medium"
      style={{ background: 'var(--form-primary)', color: '#fff' }}
    >
      {label}
    </button>
  )
}

function ChoiceList({
  choices,
  shape,
}: {
  choices: { id: string; label: string }[]
  shape: 'radio' | 'square'
}) {
  return (
    <div className="space-y-2">
      {choices.map((choice) => (
        <div
          key={choice.id}
          className="flex items-center gap-3 rounded-[var(--form-radius)] border px-4 py-2.5 text-sm"
          style={{ borderColor: 'currentColor' }}
        >
          <span
            className={`h-4 w-4 shrink-0 ${shape === 'radio' ? 'rounded-full' : 'rounded-sm'} border`}
            style={{ borderColor: 'currentColor' }}
          />
          {choice.label}
        </div>
      ))}
    </div>
  )
}

function RatingPreview({ count }: { count: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg
          key={i}
          className="h-7 w-7 opacity-30"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.5L6 22l1.5-7.2L2 10l7.1-1.1L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function SchedulePlaceholder() {
  return (
    <div
      className="grid grid-cols-7 gap-1 rounded-[var(--form-radius)] border p-3"
      style={{ borderColor: 'currentColor' }}
    >
      {Array.from({ length: 28 }).map((_, i) => (
        <div
          key={i}
          className="flex h-7 items-center justify-center rounded-md text-xs"
          style={{
            background: i === 12 ? 'var(--form-primary)' : 'transparent',
            color: i === 12 ? '#fff' : 'currentColor',
            opacity: i === 12 ? 1 : 0.6,
          }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  )
}
