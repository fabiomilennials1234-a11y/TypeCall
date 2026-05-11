import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Pencil, X, Loader2 } from 'lucide-react'

import * as sellersApi from '@/api/endpoints/sellers'
import type { Seller } from '@/api/endpoints/sellers'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { AvailabilitySettings } from './AvailabilitySettings'
import { SellerRanking } from './SellerRanking'

export function SellersPage() {
  const [editingId, setEditingId] = useState<string | null>(null)

  const sellersQ = useQuery({
    queryKey: ['sellers', 'all'],
    queryFn: () => sellersApi.listSellers(false),
  })

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendedores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie equipe, disponibilidade, metas e veja o ranking.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Novo vendedor
        </Button>
      </div>

      {sellersQ.isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {sellersQ.data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Equipe</h2>
            {(sellersQ.data.sellers ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Nenhum vendedor cadastrado
              </div>
            ) : (
              <ul className="space-y-2">
                {sellersQ.data.sellers.map((s) => (
                  <SellerRow key={s.id} seller={s} onEdit={() => setEditingId(s.id)} />
                ))}
              </ul>
            )}
          </div>

          <div>
            <SellerRanking />
          </div>
        </div>
      )}

      {editingId && (
        <EditSellerModal sellerId={editingId} onClose={() => setEditingId(null)} />
      )}
    </div>
  )
}

function SellerRow({ seller, onEdit }: { seller: Seller; onEdit: () => void }) {
  return (
    <li className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{seller.name}</p>
        <p className="text-xs text-muted-foreground">
          {seller.meetingDurationMinutes}min · buffer {seller.bufferAfterMinutes}min · {locationLabel(seller.locationType)}
        </p>
      </div>
      <span className={cn(
        'mr-3 rounded px-2 py-0.5 text-xs font-medium',
        seller.active ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground',
      )}>
        {seller.active ? 'Ativo' : 'Inativo'}
      </span>
      <button
        onClick={onEdit}
        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        title="Editar"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </li>
  )
}

function EditSellerModal({ sellerId, onClose }: { sellerId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Editar vendedor</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <AvailabilitySettings sellerId={sellerId} />
      </div>
    </div>
  )
}

function locationLabel(t: string): string {
  switch (t) {
    case 'online': return 'Online'
    case 'whatsapp': return 'WhatsApp'
    case 'presencial': return 'Presencial'
    default: return t
  }
}
