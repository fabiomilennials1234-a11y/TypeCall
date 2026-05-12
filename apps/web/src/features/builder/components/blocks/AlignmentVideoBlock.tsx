import { useMemo } from 'react'
import { Video } from 'lucide-react'
import type { AlignmentVideoNodeData } from '@typecall/flow-engine'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'

interface AlignmentVideoBlockProps {
  data: AlignmentVideoNodeData
  onChange: (next: AlignmentVideoNodeData) => void
}

export function AlignmentVideoBlock({ data, onChange }: AlignmentVideoBlockProps) {
  const embedUrl = useMemo(() => toEmbedUrl(data.videoUrl ?? ''), [data.videoUrl])

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">URL do video (YouTube ou Vimeo)</label>
        <Input
          value={data.videoUrl ?? ''}
          onChange={(e) => onChange({ ...data, videoUrl: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </div>

      {embedUrl ? (
        <div className="overflow-hidden rounded-md border border-border bg-black">
          <iframe
            src={embedUrl}
            className="aspect-video w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
          <div className="flex flex-col items-center gap-1">
            <Video className="h-5 w-5 opacity-50" />
            Cole uma URL para preview
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Texto de apoio (opcional)</label>
        <textarea
          rows={3}
          value={data.supportText ?? ''}
          onChange={(e) => onChange({ ...data, supportText: e.target.value })}
          placeholder="Mensagem que aparece abaixo do video"
          className={cn(
            'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'resize-none',
          )}
        />
      </div>
    </div>
  )
}

// toEmbedUrl converts watch/vimeo URLs to embed URLs. Returns empty string if
// not parseable.
function toEmbedUrl(input: string): string {
  const url = input.trim()
  if (!url) return ''
  // YouTube watch?v=ID or youtu.be/ID
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/)
  if (yt && yt[1]) return `https://www.youtube.com/embed/${yt[1]}`
  // Vimeo vimeo.com/ID
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo && vimeo[1]) return `https://player.vimeo.com/video/${vimeo[1]}`
  return ''
}

export { toEmbedUrl }
