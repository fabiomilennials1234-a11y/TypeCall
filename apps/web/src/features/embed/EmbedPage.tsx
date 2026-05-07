import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Code2, Copy, Check, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as formsApi from '@/api/endpoints/forms'
import { cn } from '@/lib/cn'

type EmbedMode = 'inline' | 'popup' | 'slider' | 'fullpage'

const modes: { id: EmbedMode; label: string; description: string }[] = [
  { id: 'inline', label: 'Inline', description: 'Inserido dentro de um container na pagina' },
  { id: 'popup', label: 'Popup', description: 'Modal centralizado com overlay' },
  { id: 'slider', label: 'Slider', description: 'Painel lateral deslizante' },
  { id: 'fullpage', label: 'Full Page', description: 'Ocupa a pagina inteira' },
]

export function EmbedPage() {
  const [selectedFormId, setSelectedFormId] = useState('')
  const [mode, setMode] = useState<EmbedMode>('inline')
  const [primaryColor, setPrimaryColor] = useState('#6366F1')
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark')
  const [copied, setCopied] = useState(false)

  const { data: formsData } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsApi.listForms(),
  })

  const selectedForm = formsData?.forms.find((f) => f.id === selectedFormId)

  const snippet = useMemo(() => {
    if (!selectedForm) return ''
    const slug = selectedForm.slug

    if (mode === 'fullpage') {
      return `<!-- TypeCall Full Page -->\n<a href="${window.location.origin}/f/${slug}" target="_blank">Abrir formulario</a>`
    }

    if (mode === 'inline') {
      return `<!-- TypeCall Embed -->\n<div data-typecall-form="${slug}" data-typecall-mode="inline"></div>\n<script async src="${window.location.origin}/loader.js"></script>`
    }

    if (mode === 'popup') {
      return `<!-- TypeCall Popup -->\n<button onclick="TypeCall.openPopup({ formId: '${slug}', theme: { primaryColor: '${primaryColor}', mode: '${themeMode}' } })">Abrir formulario</button>\n<script async src="${window.location.origin}/loader.js"></script>`
    }

    return `<!-- TypeCall Slider -->\n<button onclick="TypeCall.openSlider({ formId: '${slug}', theme: { primaryColor: '${primaryColor}', mode: '${themeMode}' } })">Abrir formulario</button>\n<script async src="${window.location.origin}/loader.js"></script>`
  }, [selectedForm, mode, primaryColor, themeMode])

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Embed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gere o codigo para embedar seus formularios em qualquer site
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div>
            <Label>Formulario</Label>
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">Selecione um formulario...</option>
              {formsData?.forms
                .filter((f) => f.status === 'published')
                .map((f) => (
                  <option key={f.id} value={f.id}>{f.title}</option>
                ))}
            </select>
          </div>

          <div>
            <Label>Modo de exibicao</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    'rounded-lg border-2 p-3 text-left transition-all',
                    mode === m.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <span className="text-sm font-medium text-foreground">{m.label}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>
                </button>
              ))}
            </div>
          </div>

          {mode !== 'fullpage' && (
            <div className="space-y-4">
              <div>
                <Label>Cor primaria</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 w-9 cursor-pointer rounded border-none"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label>Tema</Label>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setThemeMode('dark')}
                    className={cn(
                      'flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all',
                      themeMode === 'dark' ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground',
                    )}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setThemeMode('light')}
                    className={cn(
                      'flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all',
                      themeMode === 'light' ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground',
                    )}
                  >
                    Light
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Codigo</Label>
            {selectedForm && (
              <div className="flex items-center gap-2">
                <a
                  href={`/f/${selectedForm.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                  Preview
                </a>
              </div>
            )}
          </div>

          {!selectedForm ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <Code2 className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">Selecione um formulario publicado</p>
            </div>
          ) : (
            <div className="relative">
              <pre className="overflow-x-auto rounded-xl border border-border bg-card p-4 text-sm text-foreground">
                <code>{snippet}</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="absolute right-2 top-2"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {selectedForm && mode !== 'fullpage' && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Instalacao</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li>1. Copie o codigo acima</li>
                <li>2. Cole no HTML da sua pagina onde deseja exibir o formulario</li>
                <li>3. O loader.js sera carregado automaticamente e inicializara o embed</li>
              </ol>
            </div>
          )}

          {selectedForm && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">API JavaScript</h3>
              <pre className="overflow-x-auto text-xs text-muted-foreground">
{`TypeCall.createWidget({
  formId: "${selectedForm.slug}",
  container: "#meu-container",
  mode: "${mode}",
  theme: {
    primaryColor: "${primaryColor}",
    mode: "${themeMode}"
  },
  onCompleted: (data) => {
    console.log("Respostas:", data)
  },
  onBookingCreated: (data) => {
    console.log("Booking:", data)
  }
})`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
