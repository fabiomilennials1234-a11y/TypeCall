import { useEffect, useRef } from 'react'

import { api } from '@/api/client'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const
const UTM_STORAGE_KEY = 'sd_utm'

declare global {
  interface Window {
    fbq?: (cmd: string, event: string, params?: Record<string, unknown>) => void
    _fbq?: unknown
  }
}

interface PixelConfig {
  metaPixelId?: string | null
  fireOnStart?: boolean
  fireOnBooking?: boolean
}

export interface UTMs {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
}

export function captureUTMs(): UTMs {
  if (typeof window === 'undefined') return {}
  const url = new URL(window.location.href)
  const captured: UTMs = {}
  let any = false
  for (const k of UTM_KEYS) {
    const v = url.searchParams.get(k)
    if (v) {
      captured[k] = v
      any = true
    }
  }
  try {
    if (any) {
      window.localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(captured))
      return captured
    }
    const stored = window.localStorage.getItem(UTM_STORAGE_KEY)
    if (stored) return JSON.parse(stored) as UTMs
  } catch {
    // localStorage unavailable
  }
  return captured
}

function injectPixel(pixelId: string) {
  if (typeof window === 'undefined' || window.fbq) return
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)

  const queue: unknown[][] = []
  const fbq = function (...args: unknown[]) { queue.push(args) }
  ;(window as unknown as { fbq: typeof fbq }).fbq = fbq as never
  ;(window as unknown as { _fbq: typeof fbq })._fbq = fbq as never

  script.onload = () => {
    if (!window.fbq) return
    window.fbq('init', pixelId as never)
    while (queue.length) {
      const args = queue.shift()!
      ;(window.fbq as unknown as (...a: unknown[]) => void)(...args)
    }
  }
}

export function useMetaPixel(slug?: string) {
  const cfgRef = useRef<PixelConfig | null>(null)
  const utmsRef = useRef<UTMs>({})

  useEffect(() => {
    utmsRef.current = captureUTMs()
    if (!slug) return
    let cancelled = false
    api<PixelConfig>(`/api/v1/public/settings/pixel?slug=${encodeURIComponent(slug)}`, { noAuth: true })
      .then((cfg) => {
        if (cancelled) return
        cfgRef.current = cfg
        if (cfg?.metaPixelId) injectPixel(cfg.metaPixelId)
      })
      .catch(() => {
        // pixel desabilitado: ignora silencioso
      })
    return () => { cancelled = true }
  }, [slug])

  function trackLead(extra?: Record<string, unknown>) {
    if (!cfgRef.current?.fireOnStart) return
    if (typeof window === 'undefined' || !window.fbq) return
    window.fbq('track', 'Lead', { ...utmsRef.current, ...(extra ?? {}) })
  }

  function trackSchedule(extra?: Record<string, unknown>) {
    if (!cfgRef.current?.fireOnBooking) return
    if (typeof window === 'undefined' || !window.fbq) return
    window.fbq('track', 'Schedule', { ...utmsRef.current, ...(extra ?? {}) })
  }

  function getUTMs(): UTMs {
    return utmsRef.current
  }

  return { trackLead, trackSchedule, getUTMs }
}
