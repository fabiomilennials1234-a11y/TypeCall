import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OnboardingFooter } from '../OnboardingPage'

export interface PixelValue {
  metaPixelId: string
  fireOnStart: boolean
  fireOnBooking: boolean
}

export function PixelStep({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: PixelValue
  onChange: (next: PixelValue) => void
  onNext: () => void
  onBack: () => void
}) {
  const id = value.metaPixelId.trim()
  const isValid = id === '' || /^\d{15,16}$/.test(id)

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Tracking</h2>
        <p className="text-sm text-muted-foreground">
          Conecte o Meta Pixel pra capturar inicio de quiz e agendamentos.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="pixel">Pixel ID (Meta)</Label>
        <Input
          id="pixel"
          inputMode="numeric"
          placeholder="Ex: 1234567890123456"
          value={value.metaPixelId}
          onChange={(e) => onChange({ ...value, metaPixelId: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Opcional — 15 ou 16 digitos. Pode configurar depois em /settings.
        </p>
        {!isValid && (
          <p className="text-xs text-destructive">
            Pixel ID deve ter 15 ou 16 digitos numericos.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Eventos automaticos
        </h3>
        <ToggleRow
          label="Disparar ao iniciar quiz"
          desc="Evento custom QuizStart na primeira pergunta."
          checked={value.fireOnStart}
          onChange={(v) => onChange({ ...value, fireOnStart: v })}
        />
        <ToggleRow
          label="Disparar ao agendar"
          desc="Evento custom ScheduleConfirmed apos confirmacao."
          checked={value.fireOnBooking}
          onChange={(v) => onChange({ ...value, fireOnBooking: v })}
        />
      </div>

      <OnboardingFooter onBack={onBack} onNext={onNext} nextDisabled={!isValid} />
    </div>
  )
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 rounded accent-primary"
      />
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </label>
  )
}
