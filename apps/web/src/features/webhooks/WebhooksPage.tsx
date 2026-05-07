import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Webhook, RefreshCw, Trash2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as webhooksApi from '@/api/endpoints/webhooks'
import { cn } from '@/lib/cn'

const deliveryStatusConfig = {
  pending: { label: 'Pendente', icon: Clock, className: 'bg-amber-500/10 text-amber-500' },
  delivered: { label: 'Entregue', icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-500' },
  failed: { label: 'Falhou', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
  dead_letter: { label: 'Dead Letter', icon: AlertTriangle, className: 'bg-orange-500/10 text-orange-500' },
} as const

export function WebhooksPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: 'Torque CRM', url: '', secret: '' })

  const { data: configData, isLoading: configLoading, isError: configError } = useQuery({
    queryKey: ['webhook-config'],
    queryFn: webhooksApi.getWebhookConfig,
  })

  const { data: deliveriesData } = useQuery({
    queryKey: ['webhook-deliveries'],
    queryFn: () => webhooksApi.listDeliveries(50),
    enabled: !!configData?.config,
  })

  const createMutation = useMutation({
    mutationFn: webhooksApi.createWebhookConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-config'] })
      setShowForm(false)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => webhooksApi.updateWebhookConfig({ isActive: active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhook-config'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: webhooksApi.deleteWebhookConfig,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhook-config'] }),
  })

  const retryMutation = useMutation({
    mutationFn: webhooksApi.retryDelivery,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhook-deliveries'] }),
  })

  const config = configData?.config

  if (configLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (configError) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <h2 className="mt-4 text-lg font-medium">Erro ao carregar webhook</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tente recarregar a página.</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Webhook</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Integração com Torque CRM via webhook push
        </p>
      </div>

      {!config && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Webhook className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-medium">Nenhum webhook configurado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure um webhook para enviar dados de bookings e respostas para o Torque CRM.
          </p>
          <Button className="mt-6" onClick={() => setShowForm(true)}>
            Configurar Webhook
          </Button>
        </div>
      )}

      {showForm && !config && (
        <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Configurar Webhook</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate(formData)
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="url">URL do Endpoint</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://api.torquecrm.com/webhooks/typecall"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="secret">Secret (HMAC-SHA256)</Label>
              <Input
                id="secret"
                type="password"
                placeholder="whsec_..."
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Usado para assinar payloads com HMAC-SHA256. Header: X-TypeCall-Signature
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {config && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{config.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground font-mono">{config.url}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={config.isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleMutation.mutate(!config.isActive)}
                >
                  {config.isActive ? 'Ativo' : 'Inativo'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Remover webhook? Entregas pendentes serão perdidas.')) {
                      deleteMutation.mutate()
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {config.events.map((event) => (
                <span key={event} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                  {event}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Entregas recentes</h3>
            {deliveriesData?.deliveries.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma entrega ainda.</p>
            )}
            <div className="space-y-2">
              {deliveriesData?.deliveries.map((d) => {
                const statusCfg = deliveryStatusConfig[d.status]
                const Icon = statusCfg.icon
                return (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', statusCfg.className)}>
                        <Icon className="h-3 w-3" />
                        {statusCfg.label}
                      </span>
                      <span className="text-sm font-medium">{d.event}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.responseStatus && (
                        <span className="text-xs text-muted-foreground">HTTP {d.responseStatus}</span>
                      )}
                      {d.attempts > 0 && (
                        <span className="text-xs text-muted-foreground">{d.attempts}/5 tentativas</span>
                      )}
                      {(d.status === 'failed' || d.status === 'dead_letter') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryMutation.mutate(d.id)}
                          disabled={retryMutation.isPending}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
