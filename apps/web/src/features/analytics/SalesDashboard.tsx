import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Loader2, Sparkles } from 'lucide-react'

import * as salesApi from '@/api/endpoints/salesAnalytics'
import type { LeadTagKey } from '@/api/endpoints/salesAnalytics'
import * as bookingsApi from '@/api/endpoints/bookings'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { cn } from '@/lib/cn'
import { listContainerVariants, listItemVariants } from '@/lib/staggerList'

type Period = '7d' | '30d' | '90d'

const TAG_COLORS: Record<LeadTagKey, string> = {
  diamond: '#7F77DD',
  gold: '#BA7517',
  silver: '#888780',
  bronze: '#D85A30',
  disqualified: '#dc2626',
}

const TAG_LABEL: Record<LeadTagKey, string> = {
  diamond: 'Diamond',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
  disqualified: 'Desq.',
}

const PERIOD_LABEL: Record<Period, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
}

export function SalesDashboard() {
  const [period, setPeriod] = useState<Period>('30d')

  const overviewQ = useQuery({
    queryKey: ['sales-overview', period],
    queryFn: () => salesApi.getSalesOverview(period),
  })

  const todayRange = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return { from: start.toISOString(), to: end.toISOString() }
  }, [])

  const todayBookingsQ = useQuery({
    queryKey: ['bookings', 'today', todayRange],
    queryFn: () =>
      bookingsApi.listBookings({
        from: todayRange.from,
        to: todayRange.to,
        limit: 20,
      }),
  })

  if (overviewQ.isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
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

  const totalTagged =
    (Object.values(data.byTag) as number[]).reduce((a, b) => a + b, 0) || 1

  const todayBookings = (todayBookingsQ.data?.bookings ?? []).filter(
    (b) => b.status === 'confirmed' || b.status === 'pending',
  )

  const unconfirmedGold = todayBookings.filter(
    (b) => b.leadTag === 'gold' && b.status === 'pending',
  )

  return (
    <div className="mx-auto max-w-[1320px] space-y-10 p-6 lg:p-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-ink-mid">
            Sales Dashboard
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-tight text-ink sm:text-5xl">
            Performance do funil.
          </h1>
          <p className="mt-2 max-w-prose font-serif text-[15px] leading-snug text-ink-soft">
            KPIs operacionais do funil de qualificacao e agendamento.
          </p>
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </header>

      <HeroStrip
        bookings={data.totalBookings}
        noShowRate={data.noShowRate}
        revenue={Number(data.revenue) || 0}
        sales={data.totalSales}
        rescheduleRate={data.rescheduleRate}
        avgTicket={Number(data.avgTicket) || 0}
      />

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <FunnelSection rows={data.funnelDropoff} />
          <SellersSection rows={data.bySeller} />
        </div>
        <div className="space-y-6">
          <TagDonut byTag={data.byTag} total={totalTagged} />
          <TodayMeetings
            loading={todayBookingsQ.isLoading}
            bookings={todayBookings}
          />
          {unconfirmedGold.length > 0 && (
            <InsightCard count={unconfirmedGold.length} />
          )}
        </div>
      </div>
    </div>
  )
}

function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="inline-flex self-start rounded-lg border border-border bg-card p-0.5 sm:self-auto">
      {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === p
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {PERIOD_LABEL[p]}
        </button>
      ))}
    </div>
  )
}

interface HeroStripProps {
  bookings: number
  noShowRate: number
  revenue: number
  sales: number
  rescheduleRate: number
  avgTicket: number
}

function HeroStrip({
  bookings,
  noShowRate,
  revenue,
  sales,
  rescheduleRate,
  avgTicket,
}: HeroStripProps) {
  return (
    <motion.div
      className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/30 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      variants={listContainerVariants}
      initial="hidden"
      animate="show"
    >
      <HeroCell
        label="Reunioes agendadas"
        value={bookings}
        format={fmtInt}
        sub={`${sales} vendas · ${fmtBRL(revenue)} receita`}
      />
      <HeroCell
        label="Taxa de no-show"
        value={noShowRate}
        format={fmtPct}
        tone={noShowRate > 20 ? 'bad' : 'neutral'}
        sub={`${fmtPct(rescheduleRate)} de remarcacoes`}
      />
      <HeroCell
        label="Receita atribuida"
        value={revenue}
        format={fmtBRL}
        accent
        sub={`Ticket medio ${fmtBRL(avgTicket)}`}
      />
    </motion.div>
  )
}

function HeroCell({
  label,
  value,
  format,
  sub,
  tone = 'neutral',
  accent = false,
}: {
  label: string
  value: number
  format: (n: number) => string
  sub?: string
  tone?: 'bad' | 'neutral'
  accent?: boolean
}) {
  return (
    <motion.div
      variants={listItemVariants}
      className="flex flex-col gap-3 px-6 py-7 sm:px-8 sm:py-9"
    >
      <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <p
        className={cn(
          'text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl',
          tone === 'bad' && 'text-destructive',
          accent && 'text-primary',
          tone === 'neutral' && !accent && 'text-foreground',
        )}
      >
        <AnimatedNumber value={value} format={format} />
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </motion.div>
  )
}

function FunnelSection({ rows }: { rows: salesApi.FunnelDropoffRow[] }) {
  if (rows.length === 0) {
    return (
      <Section title="Funil" hint="por etapa">
        <Empty text="Sem dados de funil ainda." />
      </Section>
    )
  }
  const max = Math.max(...rows.map((r) => r.entered), 1)
  return (
    <Section title="Funil" hint="por etapa">
      <motion.ol
        className="space-y-3"
        variants={listContainerVariants}
        initial="hidden"
        animate="show"
      >
        {rows.slice(0, 8).map((r, i) => {
          const pct = r.entered > 0 ? r.exited / r.entered : 0
          const width = (r.entered / max) * 100
          return (
            <motion.li
              key={r.stepIndex}
              variants={listItemVariants}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-4"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {String(i + 1).padStart(2, '0')} · {r.stepTitle.slice(0, 24)}
              </span>
              <div className="relative h-7 overflow-hidden rounded-md border border-border bg-muted/40">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    'absolute inset-y-0 left-0 flex items-center justify-end pr-2',
                    i === rows.length - 1 ? 'bg-primary/30' : 'bg-foreground/10',
                  )}
                />
                <span className="absolute inset-0 flex items-center justify-end pr-3 text-xs font-medium tabular-nums text-foreground">
                  {r.entered.toLocaleString('pt-BR')}
                </span>
              </div>
              <span
                className={cn(
                  'min-w-[3.5rem] text-right text-xs tabular-nums',
                  pct > 0.5 ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {pct > 0 ? `-${(pct * 100).toFixed(0)}%` : '0%'}
              </span>
            </motion.li>
          )
        })}
      </motion.ol>
    </Section>
  )
}

function SellersSection({ rows }: { rows: salesApi.SalesBySellerRow[] }) {
  if (rows.length === 0) {
    return (
      <Section title="Conversao por vendedor">
        <Empty text="Sem vendedores ativos no periodo." />
      </Section>
    )
  }
  const max = Math.max(...rows.map((r) => r.conversionRate), 1)
  return (
    <Section title="Conversao por vendedor" hint={`${rows.length} ativos`}>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Vendedor</th>
              <th className="px-4 py-2 font-medium tabular-nums">Reun.</th>
              <th className="px-4 py-2 font-medium tabular-nums">Vendas</th>
              <th className="px-4 py-2 font-medium">Conv.</th>
              <th className="px-4 py-2 font-medium tabular-nums">Ticket</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 8).map((s) => (
              <tr key={s.sellerId} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-medium uppercase text-primary">
                      {s.name.charAt(0)}
                    </span>
                    <span className="truncate font-medium">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{s.bookings}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{s.sales}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-foreground/80"
                        style={{ width: `${(s.conversionRate / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                      {s.conversionRate.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {fmtBRL(Number(s.revenue) || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function TagDonut({
  byTag,
  total,
}: {
  byTag: Partial<Record<LeadTagKey, number>>
  total: number
}) {
  const entries = (Object.keys(TAG_COLORS) as LeadTagKey[])
    .map((k) => ({ key: k, value: byTag[k] ?? 0 }))
    .filter((e) => e.value > 0)

  let acc = 0
  const radius = 36
  const circ = 2 * Math.PI * radius

  return (
    <Section title="Distribuicao de leads" hint="por etiqueta">
      {entries.length === 0 ? (
        <Empty text="Sem leads etiquetados ainda." />
      ) : (
        <div className="flex items-center gap-6">
          <svg
            width="108"
            height="108"
            viewBox="0 0 108 108"
            className="-rotate-90 shrink-0"
          >
            <circle cx="54" cy="54" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
            {entries.map((e) => {
              const dash = (e.value / total) * circ
              const offset = -acc
              acc += dash
              return (
                <motion.circle
                  key={e.key}
                  cx="54"
                  cy="54"
                  r={radius}
                  fill="none"
                  stroke={TAG_COLORS[e.key]}
                  strokeWidth="14"
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={offset}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              )
            })}
          </svg>
          <ul className="flex-1 space-y-1.5 text-xs">
            {entries.map((e) => (
              <li key={e.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: TAG_COLORS[e.key] }}
                  />
                  <span className="text-foreground">{TAG_LABEL[e.key]}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {e.value} · {((e.value / total) * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  )
}

function TodayMeetings({
  loading,
  bookings,
}: {
  loading: boolean
  bookings: bookingsApi.Booking[]
}) {
  return (
    <Section title="Proximas reunioes" hint={`hoje · ${bookings.length}`}>
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : bookings.length === 0 ? (
        <Empty text="Nada agendado para hoje." />
      ) : (
        <motion.ul
          className="divide-y divide-border"
          variants={listContainerVariants}
          initial="hidden"
          animate="show"
        >
          {bookings.slice(0, 6).map((b) => (
            <motion.li
              key={b.id}
              variants={listItemVariants}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5"
            >
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {fmtTime(b.startTime)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {b.attendeeName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {b.attendeeEmail}
                </p>
              </div>
              {b.leadTag ? (
                <TagPill tag={b.leadTag} />
              ) : (
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {b.status === 'pending' ? 'pend.' : ''}
                </span>
              )}
            </motion.li>
          ))}
        </motion.ul>
      )}
    </Section>
  )
}

function TagPill({ tag }: { tag: LeadTagKey }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{
        background: `${TAG_COLORS[tag]}1f`,
        color: TAG_COLORS[tag],
      }}
    >
      {TAG_LABEL[tag]}
    </span>
  )
}

function InsightCard({ count }: { count: number }) {
  return (
    <motion.div
      variants={listItemVariants}
      initial="hidden"
      animate="show"
      className="rounded-2xl border border-primary/30 bg-primary/5 p-5"
    >
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-primary">
        <Sparkles className="h-3 w-3" />
        Insight
      </div>
      <p className="mt-2 text-sm leading-snug text-foreground">
        <span className="font-semibold underline decoration-primary/40 underline-offset-2">
          {count} {count === 1 ? 'lead Gold' : 'leads Gold'}
        </span>{' '}
        de hoje ainda nao confirmou presenca.
      </p>
      <button className="mt-3 text-xs font-medium text-primary hover:underline">
        Enviar lembrete →
      </button>
    </motion.div>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/30 p-5">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {hint && (
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            {hint}
          </span>
        )}
      </header>
      {children}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
      {text}
    </div>
  )
}

function fmtBRL(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR')
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

