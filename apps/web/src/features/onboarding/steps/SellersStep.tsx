import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { SellerLocationType } from '@/api/endpoints/sellers'
import type { AllowedTag } from '@/api/endpoints/onboarding'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/cn'
import { OnboardingFooter } from '../OnboardingPage'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const DURATIONS = [15, 30, 45, 60]
const BUFFERS = [0, 15, 30]
const LOCATIONS: { key: SellerLocationType; label: string }[] = [
  { key: 'online', label: 'Meeting online' },
  { key: 'whatsapp', label: 'Ligacao WhatsApp' },
  { key: 'presencial', label: 'Visita presencial' },
]
const TAGS: { key: AllowedTag; label: string; desc: string }[] = [
  { key: 'diamond', label: 'Diamond', desc: 'Lead premium' },
  { key: 'gold', label: 'Gold', desc: 'Lead quente' },
  { key: 'silver', label: 'Silver', desc: 'Lead morno' },
  { key: 'bronze', label: 'Bronze', desc: 'Lead frio' },
]

export interface SellerForm {
  name: string
  duration: number
  buffer: number
  location: SellerLocationType
  allowedTags: AllowedTag[]
  rules: { enabled: boolean; startTime: string; endTime: string }[]
  isOwner: boolean
}

export function emptySellerForm(): SellerForm {
  return {
    name: '',
    duration: 30,
    buffer: 15,
    location: 'online',
    allowedTags: ['diamond', 'gold', 'silver', 'bronze'],
    rules: [
      { enabled: false, startTime: '09:00', endTime: '18:00' },
      { enabled: true, startTime: '09:00', endTime: '18:00' },
      { enabled: true, startTime: '09:00', endTime: '18:00' },
      { enabled: true, startTime: '09:00', endTime: '18:00' },
      { enabled: true, startTime: '09:00', endTime: '18:00' },
      { enabled: true, startTime: '09:00', endTime: '18:00' },
      { enabled: false, startTime: '09:00', endTime: '18:00' },
    ],
    isOwner: false,
  }
}

export function SellersStep({
  sellers,
  onChange,
  onNext,
  onBack,
}: {
  sellers: SellerForm[]
  onChange: (next: SellerForm[]) => void
  onNext: () => void
  onBack: () => void
}) {
  const [openIdx, setOpenIdx] = useState<number>(0)

  function patchSeller(idx: number, patch: Partial<SellerForm>) {
    onChange(sellers.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  function addSeller() {
    onChange([...sellers, emptySellerForm()])
    setOpenIdx(sellers.length)
  }

  function removeSeller(idx: number) {
    if (sellers[idx]?.isOwner) return
    const next = sellers.filter((_, i) => i !== idx)
    onChange(next)
    setOpenIdx(Math.min(openIdx, next.length - 1))
  }

  const everyValid = sellers.every(
    (s) =>
      s.name.trim().length > 0 &&
      s.allowedTags.length > 0 &&
      s.rules.some((r) => r.enabled),
  )

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Vendedores</h2>
        <p className="text-sm text-muted-foreground">
          Configure agenda e ranks que cada vendedor atende. Rodizio entre eles e automatico por rank.
        </p>
      </div>

      <div className="space-y-3">
        {sellers.map((seller, idx) => (
          <SellerCard
            key={idx}
            seller={seller}
            isOpen={openIdx === idx}
            onToggle={() => setOpenIdx(openIdx === idx ? -1 : idx)}
            onPatch={(p) => patchSeller(idx, p)}
            onRemove={() => removeSeller(idx)}
            canRemove={!seller.isOwner && sellers.length > 1}
          />
        ))}

        <button
          onClick={addSeller}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar vendedor
        </button>
      </div>

      <OnboardingFooter onBack={onBack} onNext={onNext} nextDisabled={!everyValid} />
    </div>
  )
}

function SellerCard({
  seller,
  isOpen,
  onToggle,
  onPatch,
  onRemove,
  canRemove,
}: {
  seller: SellerForm
  isOpen: boolean
  onToggle: () => void
  onPatch: (p: Partial<SellerForm>) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const summary = [
    seller.allowedTags.length > 0 ? `${seller.allowedTags.length} ranks` : 'sem ranks',
    `${seller.duration}min`,
    seller.rules.filter((r) => r.enabled).length + ' dias',
  ].join(' · ')

  function patchDay(idx: number, patch: Partial<SellerForm['rules'][number]>) {
    const next = seller.rules.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    onPatch({ rules: next })
  }

  function toggleTag(tag: AllowedTag) {
    const has = seller.allowedTags.includes(tag)
    const next = has
      ? seller.allowedTags.filter((t) => t !== tag)
      : [...seller.allowedTags, tag]
    onPatch({ allowedTags: next })
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/30"
      >
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{seller.name || 'Sem nome'}</p>
            {seller.isOwner && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                Voce
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
        {canRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </button>

      {isOpen && (
        <div className="space-y-6 border-t border-border bg-background/50 p-5">
          <div className="space-y-2">
            <Label htmlFor={`name-${seller.name}`}>Nome do vendedor</Label>
            <Input
              id={`name-${seller.name}`}
              value={seller.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              placeholder="Ex: Maria Silva"
            />
          </div>

          <Section title="Ranks que atende">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TAGS.map((tag) => {
                const checked = seller.allowedTags.includes(tag.key)
                return (
                  <label
                    key={tag.key}
                    className={cn(
                      'flex cursor-pointer flex-col gap-0.5 rounded-md border px-3 py-2 transition-colors',
                      checked
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border hover:border-primary/20',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTag(tag.key)}
                        className="h-3.5 w-3.5 rounded accent-primary"
                      />
                      <span className="text-xs font-medium">{tag.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{tag.desc}</span>
                  </label>
                )
              })}
            </div>
          </Section>

          <Section title="Tipo de reuniao">
            <div className="grid grid-cols-3 gap-2">
              {LOCATIONS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => onPatch({ location: l.key })}
                  className={cn(
                    'rounded-md border px-3 py-2 text-xs transition-colors',
                    seller.location === l.key
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Duracao / Buffer">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Duracao</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => onPatch({ duration: d })}
                      className={cn(
                        'rounded-md border py-1.5 text-xs transition-colors',
                        seller.duration === d
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-border text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Buffer</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {BUFFERS.map((b) => (
                    <button
                      key={b}
                      onClick={() => onPatch({ buffer: b })}
                      className={cn(
                        'rounded-md border py-1.5 text-xs transition-colors',
                        seller.buffer === b
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-border text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      {b === 0 ? '0' : `${b}m`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Horarios">
            <div className="space-y-1.5">
              {DAYS.map((day, idx) => {
                const rule = seller.rules[idx]!
                return (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-center gap-3 rounded-md border px-3 py-1.5 transition-colors',
                      rule.enabled ? 'border-border' : 'border-border/50 bg-muted/20',
                    )}
                  >
                    <label className="flex w-20 cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => patchDay(idx, { enabled: e.target.checked })}
                        className="h-3.5 w-3.5 rounded accent-primary"
                      />
                      <span className={rule.enabled ? 'font-medium' : 'text-muted-foreground'}>{day}</span>
                    </label>
                    {rule.enabled && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <input
                          type="time"
                          value={rule.startTime}
                          onChange={(e) => patchDay(idx, { startTime: e.target.value })}
                          className="rounded-md border border-border bg-background px-2 py-1"
                        />
                        <span className="text-muted-foreground">ate</span>
                        <input
                          type="time"
                          value={rule.endTime}
                          onChange={(e) => patchDay(idx, { endTime: e.target.value })}
                          className="rounded-md border border-border bg-background px-2 py-1"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}
