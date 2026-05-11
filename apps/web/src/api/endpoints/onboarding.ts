import { api } from '@/api/client'
import type { FlowDefinition } from '@typecall/flow-engine'
import type { SellerLocationType } from '@/api/endpoints/sellers'

export interface OnboardingState {
  onboardedAt: string | null
  templateFormId: string | null
  hasSeller: boolean
  hasPixel: boolean
  hasTemplateForm: boolean
}

export type AllowedTag = 'diamond' | 'gold' | 'silver' | 'bronze' | 'disqualified'

export interface SellerInput {
  name: string
  meetingDurationMinutes: number
  bufferAfterMinutes: number
  locationType: SellerLocationType
  allowedTags: AllowedTag[]
  availability: { dayOfWeek: number; startTime: string; endTime: string }[]
  isOwner: boolean
}

export interface CompleteInput {
  sellers: SellerInput[]
  pixel: {
    metaPixelId: string
    fireOnStart: boolean
    fireOnBooking: boolean
  }
  form: {
    title: string
    flowDefinition: FlowDefinition
  }
}

export interface CompleteOutput {
  alreadyOnboarded: boolean
  formId: string
  sellerIds: string[]
}

export function getOnboardingState(): Promise<OnboardingState> {
  return api<OnboardingState>('/api/v1/onboarding/state')
}

export function skipOnboarding(): Promise<void> {
  return api<void>('/api/v1/onboarding/skip', { method: 'POST' })
}

export function completeOnboarding(input: CompleteInput): Promise<CompleteOutput> {
  return api<CompleteOutput>('/api/v1/onboarding/complete', { method: 'POST', body: input })
}
