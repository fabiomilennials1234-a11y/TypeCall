import { ApiError } from '@/api/client'

export interface FormAsset {
  id: string
  formId: string
  organizationId: string
  url: string
  mimeType: string
  sizeBytes: number
  width?: number
  height?: number
  createdAt: string
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]!) : null
}

function snakeToCamel<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T
  if (Array.isArray(obj)) return obj.map((i) => snakeToCamel(i)) as T
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = snakeToCamel(v)
    }
    return out as T
  }
  return obj as T
}

export async function uploadFormAsset(formId: string, file: File): Promise<FormAsset> {
  const fd = new FormData()
  fd.append('file', file)

  const headers: Record<string, string> = {}
  const csrf = getCsrfToken()
  if (csrf) headers['X-CSRF-Token'] = csrf

  const res = await fetch(`/api/v1/forms/${formId}/assets`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: fd,
  })

  const data = await res.json()
  if (!res.ok) {
    throw new ApiError(res.status, data.code ?? 'UPLOAD_FAILED', data.error ?? 'Upload failed', data.details)
  }
  return snakeToCamel<FormAsset>(data)
}
