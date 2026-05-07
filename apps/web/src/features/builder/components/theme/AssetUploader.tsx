import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ImagePlus, Loader2, X } from 'lucide-react'

import { uploadFormAsset, type FormAsset } from '@/api/endpoints/assets'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface AssetUploaderProps {
  formId: string
  currentUrl?: string
  onUploaded: (asset: FormAsset) => void
  onClear: () => void
}

export function AssetUploader({ formId, currentUrl, onUploaded, onClear }: AssetUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const mutation = useMutation({
    mutationFn: (file: File) => uploadFormAsset(formId, file),
    onSuccess: (asset) => {
      setError(null)
      onUploaded(asset)
    },
    onError: (err: Error) => setError(err.message),
  })

  function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      setError('Formato nao suportado. Use JPG, PNG, WebP ou GIF.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Arquivo maior que 5MB.')
      return
    }
    setError(null)
    mutation.mutate(file)
  }

  return (
    <div className="space-y-2">
      {currentUrl ? (
        <div className="relative overflow-hidden rounded-md border border-border">
          <img src={currentUrl} alt="Background atual" className="h-32 w-full object-cover" />
          <button
            onClick={onClear}
            className="absolute right-1.5 top-1.5 rounded-md bg-black/60 p-1 text-white hover:bg-black/80"
            title="Remover imagem"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
          disabled={mutation.isPending}
          className={cn(
            'flex h-32 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-xs transition-colors',
            dragOver ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
          )}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <ImagePlus className="h-5 w-5" />
              Clique ou arraste uma imagem
              <span className="text-[10px] opacity-60">JPG, PNG, WebP, GIF — ate 5MB</span>
            </>
          )}
        </button>
      )}

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

      {currentUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={mutation.isPending}
          className="w-full"
        >
          Trocar imagem
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
