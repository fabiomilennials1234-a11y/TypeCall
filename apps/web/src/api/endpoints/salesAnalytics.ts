import { api } from '@/api/client'

export type LeadTagKey = 'diamond' | 'gold' | 'silver' | 'bronze' | 'disqualified'

export interface SalesBySellerRow {
  sellerId: string
  name: string
  bookings: number
  sales: number
  revenue: string
  conversionRate: number
}

export interface FunnelDropoffRow {
  stepIndex: number
  stepTitle: string
  entered: number
  exited: number
}

export interface SalesOverview {
  totalBookings: number
  noShowRate: number
  rescheduleRate: number
  totalSales: number
  revenue: string
  avgTicket: string
  byTag: Partial<Record<LeadTagKey, number>>
  bySeller: SalesBySellerRow[]
  funnelDropoff: FunnelDropoffRow[]
}

export interface ABTestForm {
  formId: string
  name: string
  starts: number
  completions: number
  bookings: number
  conversionRate: number
}

export interface ABTestResult {
  forms: ABTestForm[]
}

export function getSalesOverview(period: '7d' | '30d' | '90d' = '30d'): Promise<SalesOverview> {
  return api<SalesOverview>(`/api/v1/analytics/sales-overview?period=${period}`)
}

export function getABTest(funnelId: string): Promise<ABTestResult> {
  return api<ABTestResult>(`/api/v1/analytics/ab-test?funnel_id=${funnelId}`)
}

export function createABTest(name: string, formIds: string[]): Promise<{ id: string }> {
  return api<{ id: string }>('/api/v1/funnels/ab-test', {
    method: 'POST',
    body: { name, formIds },
  })
}
