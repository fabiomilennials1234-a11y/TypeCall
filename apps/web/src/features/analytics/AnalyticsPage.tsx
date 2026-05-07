import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp, Users, Download, RefreshCw, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import * as analyticsApi from '@/api/endpoints/analytics'
import * as formsApi from '@/api/endpoints/forms'
import { cn } from '@/lib/cn'

type Period = '7d' | '30d' | '90d'

export function AnalyticsPage() {
  const [selectedFormId, setSelectedFormId] = useState('')
  const [period, setPeriod] = useState<Period>('30d')

  const dateRange = useMemo(() => {
    const to = new Date()
    const from = new Date()
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    from.setDate(from.getDate() - days)
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    }
  }, [period])

  const { data: formsData } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsApi.listForms(),
  })

  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useQuery({
    queryKey: ['analytics-summary', selectedFormId, dateRange],
    queryFn: () => analyticsApi.getSummary(selectedFormId, dateRange.from, dateRange.to),
    enabled: !!selectedFormId,
  })

  const { data: dailyData } = useQuery({
    queryKey: ['analytics-daily', selectedFormId, dateRange],
    queryFn: () => analyticsApi.getDailyMetrics(selectedFormId, dateRange.from, dateRange.to),
    enabled: !!selectedFormId,
  })

  const { data: dropoffData } = useQuery({
    queryKey: ['analytics-dropoff', selectedFormId, dateRange],
    queryFn: () => analyticsApi.getStepDropoff(selectedFormId, dateRange.from, dateRange.to),
    enabled: !!selectedFormId,
  })

  const maxViews = useMemo(() => {
    if (!dailyData?.metrics.length) return 1
    return Math.max(...dailyData.metrics.map((m) => m.views), 1)
  }, [dailyData])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Performance e funil de conversao dos formularios
          </p>
        </div>
        {selectedFormId && (
          <a
            href={analyticsApi.getExportUrl(selectedFormId, dateRange.from, dateRange.to)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </a>
        )}
      </div>

      <div className="mb-6 flex items-center gap-4">
        <select
          value={selectedFormId}
          onChange={(e) => setSelectedFormId(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="">Selecione um formulario...</option>
          {formsData?.forms.map((f) => (
            <option key={f.id} value={f.id}>{f.title}</option>
          ))}
        </select>

        <div className="flex rounded-lg border border-border">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
            </button>
          ))}
        </div>
      </div>

      {!selectedFormId && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-medium">Selecione um formulario</h2>
          <p className="mt-1 text-sm text-muted-foreground">Escolha um formulario para ver suas metricas</p>
        </div>
      )}

      {selectedFormId && summaryLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {selectedFormId && summaryError && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-12">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h2 className="mt-4 text-lg font-medium">Erro ao carregar métricas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tente recarregar a página.</p>
        </div>
      )}

      {selectedFormId && summary && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Views" value={summary.views} icon={Users} />
            <MetricCard label="Iniciaram" value={summary.starts} icon={TrendingUp} />
            <MetricCard label="Completaram" value={summary.completions} icon={BarChart3} />
            <MetricCard
              label="Taxa de conclusao"
              value={`${summary.completionRate.toFixed(1)}%`}
              icon={TrendingUp}
              highlight
            />
          </div>

          {dailyData && dailyData.metrics.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-foreground mb-4">Views por dia</h3>
              <div className="flex h-40 items-end gap-1">
                {dailyData.metrics.map((m) => (
                  <div key={m.date} className="group relative flex-1">
                    <div
                      className="w-full rounded-t bg-primary/60 transition-colors group-hover:bg-primary"
                      style={{ height: `${(m.views / maxViews) * 100}%`, minHeight: m.views > 0 ? '4px' : '0' }}
                    />
                    <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-card px-2 py-1 text-xs shadow-lg group-hover:block">
                      {m.views}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dropoffData && dropoffData.steps.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-foreground mb-4">Drop-off por pergunta</h3>
              <div className="space-y-3">
                {dropoffData.steps.map((step) => (
                  <div key={step.stepId} className="flex items-center gap-4">
                    <div className="w-24 truncate text-xs text-muted-foreground font-mono">{step.stepId.slice(0, 8)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all',
                              step.dropoffPct > 40 ? 'bg-destructive' : step.dropoffPct > 20 ? 'bg-amber-500' : 'bg-primary',
                            )}
                            style={{ width: `${100 - step.dropoffPct}%` }}
                          />
                        </div>
                        <span className="w-16 text-right text-xs font-medium text-foreground">
                          {step.dropoffPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {step.answered}/{step.seen}
                    </div>
                    {step.dropoffPct > 40 && (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, icon: Icon, highlight }: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'rounded-xl border border-border p-5',
      highlight ? 'bg-primary/5 border-primary/20' : 'bg-card',
    )}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  )
}
