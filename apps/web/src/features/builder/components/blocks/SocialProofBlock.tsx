import { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import type { SocialProofNodeData } from '@typecall/flow-engine'

import { uploadFormAsset } from '@/api/endpoints/assets'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

const MAX_MEDIA = 2
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']

interface SocialProofBlockProps {
  formId: string
  data: SocialProofNodeData
  onChange: (next: SocialProofNodeData) => void
}

export function SocialProofBlock({ formId, data, onChange }: SocialProofBlockProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const mediaUrls = data.mediaUrls ?? []

  const mutation = useMutation({
    mutationFn: (file: File) => uploadFormAsset(formId, file),
    onSuccess: (asset) => {
      onChange({ ...data, mediaUrls: [...mediaUrls, asset.url].slice(0, MAX_MEDIA) })
    },
  })

  function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) return
    if (file.size > MAX_BYTES) return
    if (mediaUrls.length >= MAX_MEDIA) return
    mutation.mutate(file)
  }

  function removeAt(idx: number) {
    onChange({ ...data, mediaUrls: mediaUrls.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground">Midias ({mediaUrls.length}/{MAX_MEDIA})</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {mediaUrls.map((url, idx) => (
            <div key={url + idx} className="group relative overflow-hidden rounded-md border border-border">
              {/\.(mp4|webm)$/i.test(url) ? (
                <video src={url} className="h-24 w-full object-cover" />
              ) : (
                <img src={url} alt="" className="h-24 w-full object-cover" />
              )}
              <button
                onClick={() => removeAt(idx)}
                className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {mediaUrls.length < MAX_MEDIA && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={mutation.isPending}
              className={cn(
                'flex h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs',
                'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="h-4 w-4" />
                  Adicionar
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Texto de diferencial</label>
        <textarea
          rows={4}
          value={data.differentialText ?? ''}
          onChange={(e) => onChange({ ...data, differentialText: e.target.value })}
          placeholder="O que faz o seu produto unico?"
          className={cn(
            'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'resize-none',
          )}
        />
      </div>

      {mutation.isError && (
        <p className="text-xs text-destructive">Falha ao enviar. Tente novamente.</p>
      )}

      {mediaUrls.length === 0 && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => inputRef.current?.click()}>
          Enviar primeira midia
        </Button>
      )}
    </div>
  )
}
