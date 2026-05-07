import { api } from '@/api/client'

export interface IntegrationStatus {
  connected: boolean
  googleAccountEmail?: string
  scope?: string
  accessTokenExpiresAt?: string
  lastSyncedAt?: string
  syncError?: string | null
  connectedAt?: string
}

export function getGoogleStatus(): Promise<IntegrationStatus> {
  return api<IntegrationStatus>('/api/v1/integrations/google')
}

export function getGoogleAuthorizeURL(): Promise<{ authorizeUrl: string }> {
  return api<{ authorizeUrl: string }>('/api/v1/integrations/google/authorize')
}

export function disconnectGoogle(): Promise<void> {
  return api<void>('/api/v1/integrations/google', { method: 'DELETE' })
}

export function getGoogleSigninURL(): Promise<{ authorizeUrl: string }> {
  return api<{ authorizeUrl: string }>('/api/v1/auth/google/authorize', { noAuth: true })
}
