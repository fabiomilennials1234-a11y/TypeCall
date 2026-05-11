import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, DollarSign, Calendar, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react'

import * as salesApi from '@/api/endpoints/salesAnalytics'
import type { LeadTagKey } from '@/api/endpoints/salesAnalytics'
import { cn } from '@/lib/cn'

type Period = '7d' | '30d' | '90d'

const TAG_COLORS: Record<LeadTagKey, string> = {
  diamond:      '#7F77DD',
  gold:         '#BA7517',
  silver:       '#888780',
  bronze:       '#D85A30',
  disqualified: '#dc2626',
}

const TAG_LABEL: Record<LeadTagKey, string> = {
  diamond: 'Diamond', gold: 'Gold', silver: 'Silver', bronze: 'Bronze', disqualified: 'Desq.',
}

export function SalesDashboard() {
  const [period, setPeriod] = useState<Period>('30d')
  const overviewQ = useQuery({
    queryKey: ['sales-overview', period],
    queryFn: () => salesApi.getSalesOverview(period),
  })

  if (overviewQ.isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const data = overviewQ.data
  if (!data) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Sem dados.</div>
    )
  }

  const totalTagged = (Object.values(data.byTag) as number[]).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">KPIs operacionais do funil</p>
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      {/* Linha 1 — 4 cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Agendamentos" value={data.totalBookings.toString()} icon={<Calendar className="h-4 w-4" />} />
        <KpiCard label="Taxa no-show" value={`${data.noShowRate.toFixed(1)}%`} icon={<AlertTriangle className="h-4 w-4" />} tone={data.noShowRate > 20 ? 'bad' : 'neutral'} />
        <KpiCard label="Vendas" value={data.totalSales.toString()} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard label="Receita" value={`R$ ${formatBRL(data.revenue)}`} icon={<DollarSign className="h-4 w-4" />} />
      </div>

      {/* Linha 2 — 3 cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Ticket medio" value={`R$ ${formatBRL(data.avgTicket)}`} icon={<DollarSign className="h-4 w-4" />} />
        <KpiCard label="Taxa remarcacao" value={`${data.rescheduleRate.toFixed(1)}%`} icon={<RefreshCw className="h-4 w-4" />} />
        <TagDonut byTag={data.byTag} total={totalTagged} />
      </div>

      {/* Linha 3 — bar charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Conversao por vendedor">
          <BarChartHorizontal
            rows={data.bySeller.map((s) => ({ label: s.name, value: s.conversionRate, sub: `${s.bookings} reun · ${s.sales} vendas` }))}
            unit="%"
          />
        </Section>
        <Section title="Drop-off por etapa do funil">
          {data.funnelDropoff.length === 0 ? (
            <Empty text="Sem dados de funil ainda" />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Etapa</th>
                  <th className="pb-2 font-medium tabular-nums">Entrou</th>
                  <th className="pb-2 font-medium tabular-nums">Saiu</th>
                  <th className="pb-2 font-medium tabular-nums">% drop</th>
                </tr>
              </thead>
              <tbody>
                {data.funnelDropoff.slice(0, 8).map((row) => {
                  const pct = row.entered > 0 ? (row.exited / row.entered) * 100 : 0
                  return (
                    <tr key={row.stepIndex} className="border-t border-border">
                      <td className="py-2 font-mono text-xs">{row.stepTitle.slice(0, 8)}</td>
                      <td className="py-2 tabular-nums">{row.entered}</td>
                      <td className="py-2 tabular-nums">{row.exited}</td>
                      <td className="py-2 tabular-nums">{pct.toFixed(0)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      {/* Linha 4 — distribuicao de tags */}
      <Section title="Distribuicao de etiquetas">
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Tag</th>
                <th className="px-3 py-2 tabular-nums">Quantidade</th>
                <th className="px-3 py-2">% do total</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(TAG_LABEL) as LeadTagKey[]).map((k) => {
                const count = data.byTag[k] ?? 0
                const pct = (count / totalTagged) * 100
                return (
                  <tr key={k} className="border-t border-border">
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center gap-2 rounded px-2 py-0.5 text-xs font-semibold"
                        style={{ background: `${TAG_COLORS[k]}26`, color: TAG_COLORS[k] }}
                      >
                        {TAG_LABEL[k]}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{count}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                          <div className="h-full" style={{ width: `${pct}%`, background: TAG_COLORS[k] }} />
                        </div>
                        <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex rounded-lg border border-border">
      {(['7d', '30d', '90d'] as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-colors',
            value === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
        </button>
      ))}
    </div>
  )
}

function KpiCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone?: 'bad' | 'good' | 'neutral' }) {
  const toneClass = tone === 'bad' ? 'text-destructive' : tone === 'good' ? 'text-emerald-500' : 'text-foreground'
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <p className={cn('mt-2 text-2xl font-semibold tabular-nums', toneClass)}>{value}</p>
    </div>
  )
}

function TagDonut({ byTag, total }: { byTag: Partial<Record<LeadTagKey, number>>; total: number }) {
  const entries = (Object.keys(TAG_COLORS) as LeadTagKey[])
    .map((k) => ({ key: k, value: byTag[k] ?? 0 }))
    .filter((e) => e.value > 0)

  let acc = 0
  const radius = 28
  const circ = 2 * Math.PI * radius

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">Leads por etiqueta</span>
      <div className="mt-3 flex items-center gap-4">
        <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
          {entries.map((e) => {
            const dash = (e.value / total) * circ
            const offset = -acc
            acc += dash
            return (
              <circle
                key={e.key}
                cx="40" cy="40" r={radius}
                fill="none"
                stroke={TAG_COLORS[e.key]}
                strokeWidth="10"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={offset}
              />
            )
          })}
        </svg>
        <div className="flex-1 space-y-1 text-xs">
          {entries.map((e) => (
            <div key={e.key} className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: TAG_COLORS[e.key] }} />
                {TAG_LABEL[e.key]}
              </span>
              <span className="tabular-nums text-muted-foreground">{e.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BarChartHorizontal({ rows, unit }: { rows: { label: string; value: number; sub?: string }[]; unit: string }) {
  if (rows.length === 0) return <Empty text="Sem dados" />
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="space-y-2">
      {rows.slice(0, 8).map((r) => (
        <div key={r.label} className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{r.label}</span>
            <span className="tabular-nums text-muted-foreground">{r.value.toFixed(1)}{unit}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          {r.sub && <p className="text-[10px] text-muted-foreground">{r.sub}</p>}
        </div>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
      {text}
    </div>
  )
}

function formatBRL(s: string): string {
  const n = Number(s)
  if (isNaN(n)) return s
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
