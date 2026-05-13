import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  Mail,
  MessageCircle,
  Megaphone,
  CreditCard,
  Database,
  X,
} from 'lucide-react'

import * as integrationsApi from '@/api/endpoints/integrations'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/layout/PageHeader'

type Status = 'connected' | 'available' | 'beta' | 'soon'
type Category = 'Calendario' | 'CRM' | 'Comunicacao' | 'Marketing' | 'Pagamento'

interface IntegrationDef {
  key: string
  name: string
  category: Category
  status: Status
  icon: typeof Calendar
  description: string
  detail?: string
}

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'connected', label: 'Conectadas' },
  { key: 'Calendario', label: 'Calendario' },
  { key: 'CRM', label: 'CRM' },
  { key: 'Comunicacao', label: 'Comunicacao' },
  { key: 'Marketing', label: 'Marketing' },
] as const

export function IntegrationsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === 'google') {
      setBanner({ kind: 'success', text: 'Conta Google conectada com sucesso.' })
      queryClient.invalidateQueries({ queryKey: ['integrations', 'google'] })
    } else if (error) {
      setBanner({ kind: 'error', text: errorMessage(error) })
    }
    if (connected || error) {
      const next = new URLSearchParams(searchParams)
      next.delete('connected')
      next.delete('error')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, queryClient])

  const statusQuery = useQuery({
    queryKey: ['integrations', 'google'],
    queryFn: () => integrationsApi.getGoogleStatus(),
  })

  const authorizeMutation = useMutation({
    mutationFn: () => integrationsApi.getGoogleAuthorizeURL(),
    onSuccess: (data) => {
      window.location.href = data.authorizeUrl
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: () => integrationsApi.disconnectGoogle(),
    onSuccess: () => {
      setBanner({ kind: 'success', text: 'Conta Google desconectada.' })
      queryClient.invalidateQueries({ queryKey: ['integrations', 'google'] })
    },
  })

  const isGoogleConnected = statusQuery.data?.connected === true
  const googleEmail = statusQuery.data?.googleAccountEmail

  const integrations = useMemo<IntegrationDef[]>(
    () => [
      {
        key: 'google-calendar',
        name: 'Google Calendar',
        category: 'Calendario',
        status: isGoogleConnected ? 'connected' : 'available',
        icon: Calendar,
        description: 'Sincronizar agenda + Google Meet automatico em cada reuniao.',
        detail: isGoogleConnected ? googleEmail ?? 'conectado' : undefined,
      },
      {
        key: 'outlook',
        name: 'Microsoft Outlook',
        category: 'Calendario',
        status: 'soon',
        icon: Calendar,
        description: 'Sincronizar Outlook + Microsoft Teams meetings.',
      },
      {
        key: 'icloud',
        name: 'Apple iCloud',
        category: 'Calendario',
        status: 'beta',
        icon: Calendar,
        description: 'CalDAV bidirecional com iCloud.',
      },
      {
        key: 'salesforce',
        name: 'Salesforce',
        category: 'CRM',
        status: 'soon',
        icon: Database,
        description: 'Push de leads e bookings pra Salesforce Lead/Opportunity.',
      },
      {
        key: 'hubspot',
        name: 'HubSpot',
        category: 'CRM',
        status: 'soon',
        icon: Database,
        description: 'Sync de contatos, deals e activity timeline.',
      },
      {
        key: 'pipedrive',
        name: 'Pipedrive',
        category: 'CRM',
        status: 'soon',
        icon: Database,
        description: 'Webhook nativo pra Deal stage.',
      },
      {
        key: 'slack',
        name: 'Slack',
        category: 'Comunicacao',
        status: 'soon',
        icon: MessageCircle,
        description: 'Notificacoes em canais por reuniao Diamond/Gold.',
      },
      {
        key: 'whatsapp',
        name: 'WhatsApp Business',
        category: 'Comunicacao',
        status: 'beta',
        icon: MessageCircle,
        description: 'Confirmacoes e lembretes via WhatsApp.',
      },
      {
        key: 'resend',
        name: 'Resend',
        category: 'Comunicacao',
        status: 'soon',
        icon: Mail,
        description: 'Email transacional white-labeled.',
      },
      {
        key: 'meta-pixel',
        name: 'Meta / Facebook Pixel',
        category: 'Marketing',
        status: 'available',
        icon: Megaphone,
        description: 'Eventos Lead e Schedule no Pixel da org.',
        detail: 'configure em Onboarding',
      },
      {
        key: 'google-ads',
        name: 'Google Ads',
        category: 'Marketing',
        status: 'soon',
        icon: Megaphone,
        description: 'Offline conversions enviadas direto pro Ads.',
      },
      {
        key: 'asaas',
        name: 'Asaas',
        category: 'Pagamento',
        status: 'soon',
        icon: CreditCard,
        description: 'Cobranca automatica pos-reuniao high-ticket.',
      },
    ],
    [isGoogleConnected, googleEmail],
  )

  const filtered = integrations.filter((it) => {
    if (filter === 'all') return true
    if (filter === 'connected') return it.status === 'connected'
    return it.category === filter
  })

  const connectedCount = integrations.filter((it) => it.status === 'connected').length

  function handleConnect(key: string) {
    if (key === 'google-calendar') {
      authorizeMutation.mutate()
    }
  }

  function handleDisconnect(key: string) {
    if (key === 'google-calendar') {
      if (confirm('Desconectar conta Google? Eventos futuros nao serao mais sincronizados.')) {
        disconnectMutation.mutate()
      }
    }
  }

  return (
    <div>
      <PageHeader
        crumbs={['Configuracoes', 'Integracoes']}
        title="Integracoes"
        subtitle="Conecte TypeCall ao stack que voce ja usa. Toda integracao e configurada uma vez e funciona para todos os funis."
      />

      <div className="px-6 py-8 lg:px-10">
        {banner && (
          <div
            className={cn(
              'mb-6 flex items-start gap-3 rounded-sm border px-4 py-3 text-sm',
              banner.kind === 'success'
                ? 'border-good/30 bg-good/5 text-good'
                : 'border-bad/30 bg-bad/5 text-bad',
            )}
          >
            {banner.kind === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="flex-1">{banner.text}</span>
            <button
              onClick={() => setBanner(null)}
              className="text-ink-mid transition-colors hover:text-ink"
              aria-label="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key
            const count = f.key === 'connected' ? connectedCount : null
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors',
                  active
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line bg-paper text-ink hover:bg-paper-2',
                )}
              >
                {f.label}
                {count !== null && count > 0 && (
                  <span className={cn('font-mono text-[10px]', active ? 'text-paper-3' : 'text-ink-mid')}>
                    · {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((it) => (
            <IntegrationCard
              key={it.key}
              def={it}
              busy={
                (it.key === 'google-calendar' &&
                  (authorizeMutation.isPending || disconnectMutation.isPending)) ||
                (it.key === 'google-calendar' && statusQuery.isLoading)
              }
              onConnect={() => handleConnect(it.key)}
              onDisconnect={() => handleDisconnect(it.key)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex h-32 items-center justify-center rounded-sm border border-dashed border-line text-xs text-ink-mid">
            Nenhuma integracao nesse filtro.
          </div>
        )}
      </div>
    </div>
  )
}

function IntegrationCard({
  def,
  busy,
  onConnect,
  onDisconnect,
}: {
  def: IntegrationDef
  busy: boolean
  onConnect: () => void
  onDisconnect: () => void
}) {
  const Icon = def.icon
  return (
    <article className="flex flex-col rounded-sm border border-line bg-paper p-4 transition-colors hover:border-ink/60">
      <header className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-line bg-paper-2 text-ink">
          <Icon className="h-4 w-4" />
        </div>
        <StatusPill status={def.status} />
      </header>

      <div className="mt-3">
        <h3 className="font-display text-[18px] tracking-tight text-ink">{def.name}</h3>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mid">
          {def.category}
        </p>
      </div>

      <p className="mt-2 font-serif text-[13.5px] leading-snug text-ink-soft">
        {def.description}
      </p>

      {def.detail && (
        <div className="mt-3 rounded-sm border border-line-soft bg-paper-2 px-2.5 py-1.5">
          <p className="truncate font-mono text-[10px] uppercase tracking-wider text-ink-mid">
            {def.detail}
          </p>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        {busy ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-mid">
            <Loader2 className="h-3 w-3 animate-spin" />
            ...
          </span>
        ) : def.status === 'connected' ? (
          <Button variant="outline" size="sm" onClick={onDisconnect}>
            Desconectar
          </Button>
        ) : def.status === 'available' ? (
          <Button size="sm" onClick={onConnect}>
            Conectar →
          </Button>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-low">
            {def.status === 'beta' ? 'em breve · beta' : 'em breve'}
          </span>
        )}
      </div>
    </article>
  )
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    connected: { label: '● conectado', cls: 'border-good/40 bg-good/10 text-good' },
    available: { label: 'disponivel', cls: 'border-ink/30 bg-paper-2 text-ink' },
    beta: { label: 'beta', cls: 'border-gold/50 bg-gold-bg/40 text-gold-dk' },
    soon: { label: 'em breve', cls: 'border-line bg-paper-2 text-ink-low' },
  }
  const m = map[status]
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
        m.cls,
      )}
    >
      {m.label}
    </span>
  )
}

function errorMessage(code: string): string {
  switch (code) {
    case 'oauth_denied':
      return 'Autorizacao cancelada. Tente novamente.'
    case 'invalid_state':
      return 'Sessao OAuth expirou. Tente conectar novamente.'
    case 'missing_params':
      return 'Resposta do Google esta incompleta. Tente novamente.'
    case 'callback_failed':
      return 'Falha ao concluir conexao com Google. Tente novamente.'
    default:
      return `Erro ao conectar (${code}).`
  }
}
