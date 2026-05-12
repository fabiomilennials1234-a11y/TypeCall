import { api } from '@/api/client'

export interface PixelConfig {
  id?: string
  organizationId?: string
  metaPixelId: string | null
  fireOnStart: boolean
  fireOnBooking: boolean
  createdAt?: string
  updatedAt?: string
}

export function getPixel(): Promise<PixelConfig> {
  return api<PixelConfig>('/api/v1/settings/pixel')
}

export function upsertPixel(input: { metaPixelId: string | null; fireOnStart: boolean; fireOnBooking: boolean }): Promise<PixelConfig> {
  return api<PixelConfig>('/api/v1/settings/pixel', { method: 'PUT', body: input })
}
