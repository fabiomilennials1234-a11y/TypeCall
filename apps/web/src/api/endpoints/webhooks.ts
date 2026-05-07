import { api } from '@/api/client'

export interface WebhookConfig {
  id: string
  organizationId: string
  name: string
  url: string
  isActive: boolean
  events: string[]
  createdAt: string
  updatedAt: string
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  organizationId: string
  event: string
  payload: unknown
  status: 'pending' | 'delivered' | 'failed' | 'dead_letter'
  attempts: number
  lastAttemptAt: string | null
  lastError: string | null
  responseStatus: number | null
  createdAt: string
}

export interface CreateWebhookInput {
  name: string
  url: string
  secret: string
  events?: string[]
}

export interface UpdateWebhookInput {
  name?: string
  url?: string
  secret?: string
  isActive?: boolean
  events?: string[]
}

export async function getWebhookConfig() {
  return api<{ config: WebhookConfig | null }>('/api/v1/webhooks/config')
}

export async function createWebhookConfig(input: CreateWebhookInput) {
  return api<WebhookConfig>('/api/v1/webhooks/config', { method: 'POST', body: input })
}

export async function updateWebhookConfig(input: UpdateWebhookInput) {
  return api<WebhookConfig>('/api/v1/webhooks/config', { method: 'PATCH', body: input })
}

export async function deleteWebhookConfig() {
  return api<{ status: string }>('/api/v1/webhooks/config', { method: 'DELETE' })
}

export async function listDeliveries(limit?: number) {
  const params = limit ? `?limit=${limit}` : ''
  return api<{ deliveries: WebhookDelivery[] }>(`/api/v1/webhooks/deliveries${params}`)
}

export async function retryDelivery(deliveryId: string) {
  return api<{ status: string }>(`/api/v1/webhooks/deliveries/${deliveryId}/retry`, { method: 'POST' })
}
