export type MessageType =
  | 'typecall:init'
  | 'typecall:ready'
  | 'typecall:step-changed'
  | 'typecall:answer'
  | 'typecall:booking-created'
  | 'typecall:completed'
  | 'typecall:resize'
  | 'typecall:close'

export interface InitPayload {
  formId: string
  mode: 'inline' | 'popup' | 'slider' | 'fullpage'
  theme?: {
    primaryColor?: string
    fontFamily?: string
    borderRadius?: number
    mode?: 'dark' | 'light'
  }
  metadata?: Record<string, string>
}

export interface BridgeMessage {
  type: MessageType
  payload: unknown
}

let parentOrigin: string | null = null

export function initBridge() {
  window.addEventListener('message', (event) => {
    const data = event.data as BridgeMessage | undefined
    if (!data?.type?.startsWith('typecall:')) return

    if (data.type === 'typecall:init') {
      parentOrigin = event.origin
      const initData = data.payload as InitPayload
      applyTheme(initData.theme)
      window.dispatchEvent(new CustomEvent('typecall-init', { detail: initData }))
    }
  })
}

export function sendToHost(type: MessageType, payload: unknown = {}) {
  const target = parentOrigin ?? '*'
  window.parent.postMessage({ type, payload }, target)
}

export function notifyReady(formTitle: string, totalSteps: number) {
  sendToHost('typecall:ready', { formTitle, totalSteps })
}

export function notifyStepChanged(stepId: string, stepType: string, index: number, total: number) {
  sendToHost('typecall:step-changed', { stepId, stepType, index, total })
}

export function notifyAnswer(stepId: string, value: unknown) {
  sendToHost('typecall:answer', { stepId, value })
}

export function notifyBookingCreated(bookingId: string, startTime: string, endTime: string) {
  sendToHost('typecall:booking-created', { bookingId, startTime, endTime })
}

export function notifyCompleted(responseId: string, score?: number) {
  sendToHost('typecall:completed', { responseId, score })
}

export function notifyResize(height: number) {
  sendToHost('typecall:resize', { height })
}

export function notifyClose() {
  sendToHost('typecall:close')
}

function applyTheme(theme?: InitPayload['theme']) {
  if (!theme) return
  const root = document.documentElement

  if (theme.mode === 'light') {
    root.classList.add('light')
  }

  if (theme.primaryColor) {
    const hsl = hexToHsl(theme.primaryColor)
    if (hsl) root.style.setProperty('--primary', hsl)
  }

  if (theme.fontFamily) {
    document.body.style.fontFamily = `"${theme.fontFamily}", ui-sans-serif, system-ui, sans-serif`
  }

  if (theme.borderRadius !== undefined) {
    root.style.setProperty('--radius', `${theme.borderRadius}px`)
  }
}

function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null

  let r = parseInt(result[1]!, 16) / 255
  let g = parseInt(result[2]!, 16) / 255
  let b = parseInt(result[3]!, 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}
