import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Link2, Link2Off, Loader2 } from 'lucide-react'

import * as integrationsApi from '@/api/endpoints/integrations'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

export function IntegrationsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

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

  const status = statusQuery.data
  const isConnected = status?.connected === true

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Integracoes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecte servicos externos para automatizar seu workflow
        </p>
      </div>

      {banner && (
        <div
          className={cn(
            'mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
            banner.kind === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500'
              : 'border-destructive/30 bg-destructive/5 text-destructive',
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
            className="text-xs uppercase tracking-wide opacity-70 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <GoogleIcon className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium text-foreground">Google Calendar</h2>
              <ConnectionBadge connected={isConnected} loading={statusQuery.isLoading} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Sincroniza disponibilidade com sua agenda Google e cria eventos com Google Meet automaticamente em cada reuniao agendada.
            </p>

            {isConnected && status && (
              <div className="mt-4 space-y-2 text-sm">
                <Row label="Conta">
                  <span className="text-foreground">{status.googleAccountEmail}</span>
                </Row>
                {status.connectedAt && (
                  <Row label="Conectada em">
                    <span className="text-foreground">
                      {new Date(status.connectedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </span>
                  </Row>
                )}
                {status.syncError && (
                  <Row label="Erro de sync">
                    <span className="text-destructive">{status.syncError}</span>
                  </Row>
                )}
              </div>
            )}
          </div>
          <div className="shrink-0">
            {isConnected ? (
              <Button
                variant="outline"
                size="sm"
                disabled={disconnectMutation.isPending}
                onClick={() => {
                  if (confirm('Desconectar conta Google? Eventos futuros nao serao mais sincronizados.')) {
                    disconnectMutation.mutate()
                  }
                }}
              >
                {disconnectMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Link2Off className="h-3.5 w-3.5" />
                )}
                Desconectar
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={authorizeMutation.isPending || statusQuery.isLoading}
                onClick={() => authorizeMutation.mutate()}
              >
                {authorizeMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
                Conectar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConnectionBadge({ connected, loading }: { connected: boolean; loading: boolean }) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Verificando...
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          connected ? 'bg-emerald-500' : 'bg-muted-foreground',
        )}
      />
      {connected ? 'Conectado' : 'Nao conectado'}
    </span>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
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
