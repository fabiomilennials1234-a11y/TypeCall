import { api } from '@/api/client'

export type SellerLocationType = 'online' | 'whatsapp' | 'presencial'

export interface Seller {
  id: string
  userId: string
  organizationId: string
  name: string
  meetingDurationMinutes: number
  bufferAfterMinutes: number
  locationType: SellerLocationType
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface SellerAvailability {
  id: string
  sellerId: string
  organizationId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface SellerGoal {
  id: string
  sellerId: string
  organizationId: string
  periodStart: string
  periodEnd: string
  goalMeetings: number
  goalSales: number
  goalRevenue: string
}

export interface CreateSellerInput {
  userId: string
  name: string
  meetingDurationMinutes: number
  bufferAfterMinutes: number
  locationType: SellerLocationType
}

export interface UpdateSellerInput {
  name?: string
  meetingDurationMinutes?: number
  bufferAfterMinutes?: number
  locationType?: SellerLocationType
  active?: boolean
}

export interface CreateGoalInput {
  periodStart: string
  periodEnd: string
  goalMeetings: number
  goalSales: number
  goalRevenue: string
}

export function listSellers(activeOnly = false): Promise<{ sellers: Seller[] }> {
  const q = activeOnly ? '?active=true' : ''
  return api<{ sellers: Seller[] }>(`/api/v1/sellers${q}`)
}

export function getSeller(id: string): Promise<Seller> {
  return api<Seller>(`/api/v1/sellers/${id}`)
}

export function createSeller(input: CreateSellerInput): Promise<Seller> {
  return api<Seller>('/api/v1/sellers', { method: 'POST', body: input })
}

export function updateSeller(id: string, input: UpdateSellerInput): Promise<Seller> {
  return api<Seller>(`/api/v1/sellers/${id}`, { method: 'PATCH', body: input })
}

export function getAvailability(id: string): Promise<{ slots: SellerAvailability[] }> {
  return api<{ slots: SellerAvailability[] }>(`/api/v1/sellers/${id}/availability`)
}

export function setAvailability(id: string, slots: { dayOfWeek: number; startTime: string; endTime: string }[]): Promise<{ slots: SellerAvailability[] }> {
  return api<{ slots: SellerAvailability[] }>(`/api/v1/sellers/${id}/availability`, {
    method: 'PUT',
    body: { slots },
  })
}

export function listGoals(id: string): Promise<{ goals: SellerGoal[] }> {
  return api<{ goals: SellerGoal[] }>(`/api/v1/sellers/${id}/goals`)
}

export function createGoal(id: string, input: CreateGoalInput): Promise<SellerGoal> {
  return api<SellerGoal>(`/api/v1/sellers/${id}/goals`, { method: 'POST', body: input })
}
