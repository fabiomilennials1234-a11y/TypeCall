type RequestOptions = {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

function transformKeys<T>(obj: unknown, transform: (key: string) => string): T {
  if (obj === null || obj === undefined) return obj as T
  if (Array.isArray(obj)) return obj.map((item) => transformKeys(item, transform)) as T
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[transform(key)] = transformKeys(value, transform)
    }
    return result as T
  }
  return obj as T
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]!) : null
}

let isRefreshing = false
let refreshPromise: Promise<void> | null = null

async function refreshTokens(): Promise<void> {
  if (isRefreshing && refreshPromise) return refreshPromise

  isRefreshing = true
  refreshPromise = fetch('/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  }).then((res) => {
    if (!res.ok) throw new ApiError(401, 'REFRESH_FAILED', 'Token refresh failed')
  }).finally(() => {
    isRefreshing = false
    refreshPromise = null
  })

  return refreshPromise
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = getCsrfToken()
    if (csrf) requestHeaders['X-CSRF-Token'] = csrf
  }

  let response = await fetch(path, {
    method,
    headers: requestHeaders,
    credentials: 'include',
    body: body ? JSON.stringify(transformKeys(body, camelToSnake)) : undefined,
  })

  if (response.status === 401 && !path.includes('/auth/refresh') && !path.includes('/auth/login')) {
    try {
      await refreshTokens()
      const retryHeaders = { ...requestHeaders }
      const newCsrf = getCsrfToken()
      if (newCsrf && method !== 'GET') retryHeaders['X-CSRF-Token'] = newCsrf

      response = await fetch(path, {
        method,
        headers: retryHeaders,
        credentials: 'include',
        body: body ? JSON.stringify(transformKeys(body, camelToSnake)) : undefined,
      })
    } catch {
      throw new ApiError(401, 'UNAUTHORIZED', 'Session expired')
    }
  }

  if (response.status === 204) return undefined as T

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(response.status, data.code ?? 'UNKNOWN', data.error ?? 'Request failed', data.details)
  }

  return transformKeys<T>(data, snakeToCamel)
}

export { ApiError }
