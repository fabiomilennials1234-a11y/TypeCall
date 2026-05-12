import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'

import * as sellersApi from '@/api/endpoints/sellers'
import type { Seller, SellerGoal } from '@/api/endpoints/sellers'
import { cn } from '@/lib/cn'

type Period = 'week' | 'month' | 'quarter'

interface RankRow {
  seller: Seller
  goal?: SellerGoal
  meetingsDone: number
  salesCount: number
  pct: number
}

export function SellerRanking() {
  const [period, setPeriod] = useState<Period>('month')
  const sellersQ = useQuery({
    queryKey: ['sellers', 'all'],
    queryFn: () => sellersApi.listSellers(false),
  })

  // Goals fetched per seller; in MVP backend nao tem aggregated metrics endpoint —
  // pdfreshore: ranks sao por meta cadastrada e meetingsDone permanece 0
  // ate haver endpoint de seller_metrics_daily no futuro.
  const rows: RankRow[] = useMemo(() => {
    const sellers = sellersQ.data?.sellers ?? []
    return sellers.map((s) => ({
      seller: s,
      meetingsDone: 0,
      salesCount: 0,
      pct: 0,
    }))
  }, [sellersQ.data])

  const top3 = rows.slice(0, 3)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Ranking de vendedores</h2>
        <div className="flex rounded-lg border border-border">
          {(['week', 'month', 'quarter'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Trimestre'}
            </button>
          ))}
        </div>
      </div>

      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {top3.map((r, idx) => (
            <PodiumCard key={r.seller.id} row={r} place={idx + 1} />
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2">#</th>
              <th className="px-3 py-2 font-medium">Vendedor</th>
              <th className="px-3 py-2 font-medium tabular-nums">Reunioes</th>
              <th className="px-3 py-2 font-medium tabular-nums">Vendas</th>
              <th className="px-3 py-2 font-medium">% meta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.seller.id} className="border-t border-border">
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{idx + 1}</td>
                <td className="px-3 py-2 font-medium text-foreground">{r.seller.name}</td>
                <td className="px-3 py-2 tabular-nums">{r.meetingsDone}</td>
                <td className="px-3 py-2 tabular-nums">{r.salesCount}</td>
                <td className="px-3 py-2">
                  <ProgressBar pct={r.pct} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  Nenhum vendedor cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PodiumCard({ row, place }: { row: RankRow; place: number }) {
  const heights = ['h-32', 'h-24', 'h-20']
  const colors = ['bg-amber-500/20 border-amber-500/50', 'bg-zinc-400/20 border-zinc-400/50', 'bg-orange-700/20 border-orange-700/50']
  return (
    <div className={cn('flex flex-col items-center justify-end rounded-xl border p-3', heights[place - 1], colors[place - 1])}>
      <Trophy className={cn('h-5 w-5', place === 1 ? 'text-amber-400' : place === 2 ? 'text-zinc-300' : 'text-orange-400')} />
      <p className="mt-1 truncate text-xs font-medium text-foreground">{row.seller.name}</p>
      <p className="text-[10px] tabular-nums text-muted-foreground">{row.meetingsDone} reunioes</p>
    </div>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
    </div>
  )
}
