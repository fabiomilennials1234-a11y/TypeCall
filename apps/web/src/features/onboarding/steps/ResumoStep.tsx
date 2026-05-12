import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OnboardingDraft } from '../OnboardingPage'

export function ResumoStep({
  draft,
  flowNodeCount,
  onBack,
  onFinalize,
  isPending,
  error,
}: {
  draft: OnboardingDraft
  flowNodeCount: number
  onBack: () => void
  onFinalize: () => void
  isPending: boolean
  error: string | null
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Tudo certo?</h2>
        <p className="text-sm text-muted-foreground">
          Revisao final antes de criar tudo.
        </p>
      </div>

      <div className="space-y-3">
        <SummaryCard title={`Vendedores (${draft.sellers.length})`}>
          {draft.sellers.map((s, idx) => {
            const days = s.rules.filter((r) => r.enabled).length
            return (
              <Row key={idx} label={s.name || 'Sem nome'}>
                {s.allowedTags.length} ranks · {s.duration}min · {days} dias
                {s.isOwner && ' · voce'}
              </Row>
            )
          })}
        </SummaryCard>

        <SummaryCard title="Pixel Meta">
          <Row label="ID">{draft.pixel.metaPixelId.trim() || 'Nao configurado'}</Row>
          <Row label="Quiz start">{draft.pixel.fireOnStart ? 'Ativo' : 'Inativo'}</Row>
          <Row label="Agendamento">{draft.pixel.fireOnBooking ? 'Ativo' : 'Inativo'}</Row>
        </SummaryCard>

        <SummaryCard title="Funil">
          <Row label="Titulo">{draft.funil.title || 'Funil principal'}</Row>
          <Row label="Etapa 0">{draft.funil.contactFields.length} campos</Row>
          <Row label="Total de blocos">{flowNodeCount}</Row>
        </SummaryCard>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={isPending}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          Voltar
        </button>
        <Button onClick={onFinalize} disabled={isPending} size="lg" className="gap-2">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Finalizando...
            </>
          ) : (
            'Finalizar setup'
          )}
        </Button>
      </div>
    </div>
  )
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}
