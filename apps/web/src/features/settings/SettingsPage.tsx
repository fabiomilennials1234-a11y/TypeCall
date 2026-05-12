import { useState } from 'react'

import { cn } from '@/lib/cn'
import { IntegrationsPage } from './IntegrationsPage'
import { PixelSettingsTab } from './PixelSettingsTab'

type Tab = 'pixel' | 'integrations'

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('pixel')

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Configuracoes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pixel, integracoes e ajustes da organizacao.</p>
      </div>

      <div className="mb-6 flex border-b border-border">
        <Tab tab="pixel" current={tab} onChange={setTab}>Meta Pixel</Tab>
        <Tab tab="integrations" current={tab} onChange={setTab}>Integracoes (Google)</Tab>
      </div>

      {tab === 'pixel' && <PixelSettingsTab />}
      {tab === 'integrations' && <IntegrationsPage />}
    </div>
  )
}

function Tab({ tab, current, onChange, children }: { tab: Tab; current: Tab; onChange: (t: Tab) => void; children: React.ReactNode }) {
  const active = tab === current
  return (
    <button
      onClick={() => onChange(tab)}
      className={cn(
        'border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px',
        active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
