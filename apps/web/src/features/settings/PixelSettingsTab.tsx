import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Loader2 } from 'lucide-react'

import * as pixelsApi from '@/api/endpoints/pixels'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'

export function PixelSettingsTab() {
  const queryClient = useQueryClient()
  const pixelQ = useQuery({ queryKey: ['pixel'], queryFn: () => pixelsApi.getPixel() })

  const [pixelId, setPixelId] = useState('')
  const [fireOnStart, setFireOnStart] = useState(false)
  const [fireOnBooking, setFireOnBooking] = useState(true)

  useEffect(() => {
    if (!pixelQ.data) return
    setPixelId(pixelQ.data.metaPixelId ?? '')
    setFireOnStart(pixelQ.data.fireOnStart)
    setFireOnBooking(pixelQ.data.fireOnBooking)
  }, [pixelQ.data])

  const save = useMutation({
    mutationFn: () => pixelsApi.upsertPixel({
      metaPixelId: pixelId.trim() ? pixelId.trim() : null,
      fireOnStart,
      fireOnBooking,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pixel'] }),
  })

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-base font-semibold">Meta Pixel</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure rastreamento do Meta Pixel no quiz publico. Necessario para campanhas de Facebook/Instagram Ads.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Meta Pixel ID</label>
        <Input
          value={pixelId}
          onChange={(e) => setPixelId(e.target.value)}
          placeholder="123456789012345"
        />
        <p className="text-xs text-muted-foreground">Numero exibido no Events Manager do Meta.</p>
      </div>

      <ToggleRow
        label="Disparar Lead ao iniciar quiz"
        description="Evento Lead disparado na primeira resposta com UTM tracking"
        value={fireOnStart}
        onChange={setFireOnStart}
      />
      <ToggleRow
        label="Disparar Schedule ao concluir agendamento"
        description="Evento Schedule disparado quando lead completa o booking"
        value={fireOnBooking}
        onChange={setFireOnBooking}
      />

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>

      {save.isSuccess && (
        <p className="text-xs text-emerald-500">Configuracao salva.</p>
      )}
    </div>
  )
}

function ToggleRow({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          value ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
          value ? 'translate-x-4' : 'translate-x-0.5',
        )} />
      </button>
    </div>
  )
}
