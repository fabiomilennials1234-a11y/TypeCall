import { useState } from 'react'

import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/layout/PageHeader'
import { IntegrationsPage } from './IntegrationsPage'
import { PixelSettingsTab } from './PixelSettingsTab'

type Section = 'general' | 'integrations' | 'pixel'

const NAV: Array<{ key: Section; label: string; desc: string }> = [
  { key: 'general', label: 'Geral', desc: 'Workspace, branding e idioma' },
  { key: 'integrations', label: 'Integracoes', desc: 'Calendario, CRM e canais' },
  { key: 'pixel', label: 'Meta Pixel', desc: 'Eventos Lead e Schedule' },
]

export function SettingsPage() {
  const [section, setSection] = useState<Section>('integrations')

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Configuracoes"
        subtitle="Pixel, integracoes e ajustes da organizacao."
      />

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="border-b border-line bg-paper-2 px-4 py-5 lg:w-[240px] lg:shrink-0 lg:border-b-0 lg:border-r lg:px-5">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mid">
            Workspace
          </p>
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
            {NAV.map((item) => {
              const active = section === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className={cn(
                    'group flex shrink-0 flex-col rounded-sm px-3 py-2 text-left transition-colors lg:shrink',
                    active
                      ? 'bg-ink text-paper'
                      : 'text-ink-soft hover:bg-paper-3/60 hover:text-ink',
                  )}
                >
                  <span className="text-[13px] font-medium">{item.label}</span>
                  <span
                    className={cn(
                      'mt-0.5 hidden font-mono text-[10px] uppercase tracking-wider lg:block',
                      active ? 'text-paper-3' : 'text-ink-low group-hover:text-ink-mid',
                    )}
                  >
                    {item.desc}
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="flex-1 bg-paper">
          {section === 'integrations' && <IntegrationsPage />}
          {section === 'pixel' && (
            <div className="px-6 py-8 lg:px-10">
              <h2 className="font-display text-2xl tracking-tight text-ink">Meta Pixel</h2>
              <p className="mt-1 font-serif text-[14.5px] text-ink-soft">
                Configure o Pixel da organizacao para disparar eventos Lead/Schedule a partir dos seus
                funis.
              </p>
              <div className="mt-6">
                <PixelSettingsTab />
              </div>
            </div>
          )}
          {section === 'general' && (
            <div className="px-6 py-8 lg:px-10">
              <div className="rounded-sm border border-dashed border-line bg-paper-2 p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mid">
                  em breve
                </p>
                <h2 className="font-display mt-2 text-2xl tracking-tight text-ink">
                  Configuracoes gerais.
                </h2>
                <p className="mt-2 max-w-prose font-serif text-[14.5px] text-ink-soft">
                  Branding, idioma, fuso default e politicas da organizacao. Disponivel em uma sprint
                  futura.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
