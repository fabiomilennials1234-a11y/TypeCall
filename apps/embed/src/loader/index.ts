interface TypeCallConfig {
  formId: string
  container?: string | HTMLElement
  mode?: 'inline' | 'popup' | 'slider' | 'fullpage'
  theme?: {
    primaryColor?: string
    fontFamily?: string
    borderRadius?: number
    mode?: 'dark' | 'light'
  }
  metadata?: Record<string, string>
  onReady?: () => void
  onStepChanged?: (data: { stepId: string; stepType: string; index: number; total: number }) => void
  onCompleted?: (data: { responseId: string; score?: number }) => void
  onBookingCreated?: (data: { bookingId: string; startTime: string; endTime: string }) => void
  onClose?: () => void
}

interface TypeCallWidget {
  destroy: () => void
}

const RESPONDER_BASE = (window as unknown as Record<string, string>).__TYPECALL_URL__ ?? 'https://embed.typecall.com.br'

const widgets: Map<string, { iframe: HTMLIFrameElement; overlay?: HTMLElement; cleanup: () => void }> = new Map()

function createWidget(config: TypeCallConfig): TypeCallWidget {
  const { formId, mode = 'inline', theme, metadata } = config

  const iframeSrc = `${RESPONDER_BASE}/f/${formId}`
  const iframe = document.createElement('iframe')
  iframe.src = iframeSrc
  iframe.style.border = 'none'
  iframe.style.width = '100%'
  iframe.style.colorScheme = 'normal'
  iframe.setAttribute('allow', 'clipboard-write')

  let overlay: HTMLElement | undefined

  if (mode === 'inline') {
    iframe.style.height = '600px'
    iframe.style.minHeight = '400px'
    const container = resolveContainer(config.container)
    if (container) container.appendChild(iframe)
  } else if (mode === 'popup') {
    overlay = createOverlay()
    const modal = document.createElement('div')
    modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(500px,90vw);height:min(700px,85vh);border-radius:16px;overflow:hidden;z-index:100001;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);'
    iframe.style.height = '100%'
    modal.appendChild(iframe)
    document.body.appendChild(modal)
    overlay.addEventListener('click', () => destroyWidget(formId))
  } else if (mode === 'slider') {
    overlay = createOverlay()
    const panel = document.createElement('div')
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(420px,100vw);height:100vh;z-index:100001;box-shadow:-8px 0 30px rgba(0,0,0,0.3);'
    iframe.style.height = '100%'
    panel.appendChild(iframe)
    document.body.appendChild(panel)
    overlay.addEventListener('click', () => destroyWidget(formId))
  } else if (mode === 'fullpage') {
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:fixed;inset:0;z-index:100000;background:hsl(240 10% 3.9%);'
    iframe.style.height = '100%'
    wrapper.appendChild(iframe)
    document.body.appendChild(wrapper)
  }

  const messageHandler = (event: MessageEvent) => {
    const data = event.data
    if (!data?.type?.startsWith('typecall:')) return

    switch (data.type) {
      case 'typecall:ready':
        iframe.contentWindow?.postMessage({
          type: 'typecall:init',
          payload: { formId, mode, theme, metadata },
        }, '*')
        config.onReady?.()
        break
      case 'typecall:step-changed':
        config.onStepChanged?.(data.payload)
        break
      case 'typecall:completed':
        config.onCompleted?.(data.payload)
        break
      case 'typecall:booking-created':
        config.onBookingCreated?.(data.payload)
        break
      case 'typecall:resize':
        if (mode === 'inline') {
          iframe.style.height = `${data.payload.height}px`
        }
        break
      case 'typecall:close':
        config.onClose?.()
        destroyWidget(formId)
        break
    }
  }

  window.addEventListener('message', messageHandler)

  const cleanup = () => {
    window.removeEventListener('message', messageHandler)
    iframe.remove()
    overlay?.remove()
    iframe.parentElement?.remove()
  }

  widgets.set(formId, { iframe, overlay, cleanup })

  return { destroy: () => destroyWidget(formId) }
}

function destroyWidget(formId: string) {
  const widget = widgets.get(formId)
  if (widget) {
    widget.cleanup()
    widgets.delete(formId)
  }
}

function openPopup(config: Omit<TypeCallConfig, 'mode' | 'container'>) {
  return createWidget({ ...config, mode: 'popup' })
}

function openSlider(config: Omit<TypeCallConfig, 'mode' | 'container'>) {
  return createWidget({ ...config, mode: 'slider' })
}

function resolveContainer(container?: string | HTMLElement): HTMLElement | null {
  if (!container) return null
  if (typeof container === 'string') return document.querySelector(container)
  return container
}

function createOverlay(): HTMLElement {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:100000;backdrop-filter:blur(2px);'
  document.body.appendChild(overlay)
  return overlay
}

function autoInit() {
  document.querySelectorAll<HTMLElement>('[data-typecall-form]').forEach((el) => {
    const formId = el.dataset.typecallForm
    if (!formId) return
    const mode = (el.dataset.typecallMode ?? 'inline') as TypeCallConfig['mode']
    createWidget({ formId, container: el, mode })
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit)
} else {
  autoInit()
}

const TypeCall = { createWidget, openPopup, openSlider, destroy: destroyWidget }

;(window as unknown as Record<string, unknown>).TypeCall = TypeCall

export { TypeCall }
export type { TypeCallConfig, TypeCallWidget }
