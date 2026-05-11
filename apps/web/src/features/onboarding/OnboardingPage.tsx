import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Loader2, Zap } from 'lucide-react'

import * as onboardingApi from '@/api/endpoints/onboarding'
import type { CompleteInput, SellerInput } from '@/api/endpoints/onboarding'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { buildQuizDefaultFlow, DEFAULT_CONTACT_FIELDS } from '@typecall/shared/templates'
import type { ContactField } from '@typecall/shared/templates'

import { WelcomeStep } from './steps/WelcomeStep'
import { SellersStep, emptySellerForm } from './steps/SellersStep'
import type { SellerForm } from './steps/SellersStep'
import { PixelStep } from './steps/PixelStep'
import { FunilStep } from './steps/FunilStep'
import { ResumoStep } from './steps/ResumoStep'

const STORAGE_KEY = 'tc:onboarding:draft'
const STEPS = ['Welcome', 'Vendedores', 'Pixel', 'Funil', 'Resumo'] as const
type Step = typeof STEPS[number]

export interface OnboardingDraft {
  step: Step
  sellers: SellerForm[]
  pixel: {
    metaPixelId: string
    fireOnStart: boolean
    fireOnBooking: boolean
  }
  funil: {
    title: string
    contactFields: ContactField[]
  }
}

function buildInitialDraft(ownerName: string): OnboardingDraft {
  return {
    step: 'Welcome',
    sellers: [
      {
        ...emptySellerForm(),
        name: ownerName,
        isOwner: true,
      },
    ],
    pixel: {
      metaPixelId: '',
      fireOnStart: false,
      fireOnBooking: true,
    },
    funil: {
      title: 'Funil principal',
      contactFields: [...DEFAULT_CONTACT_FIELDS],
    },
  }
}

function loadDraft(initial: OnboardingDraft): OnboardingDraft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>
    const merged = { ...initial, ...parsed }
    // Garantir owner sempre presente
    if (!merged.sellers || merged.sellers.length === 0) {
      merged.sellers = initial.sellers
    } else if (!merged.sellers.some((s) => s.isOwner)) {
      merged.sellers[0]!.isOwner = true
    }
    return merged
  } catch {
    return initial
  }
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [draft, setDraft] = useState<OnboardingDraft>(() => loadDraft(buildInitialDraft(user.name)))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // ignore quota
    }
  }, [draft])

  const stepIdx = STEPS.indexOf(draft.step)
  const totalSteps = STEPS.length

  function goTo(step: Step) {
    setDraft((prev) => ({ ...prev, step }))
  }

  function next() {
    if (stepIdx < totalSteps - 1) goTo(STEPS[stepIdx + 1]!)
  }

  function back() {
    if (stepIdx > 0) goTo(STEPS[stepIdx - 1]!)
  }

  const completeMutation = useMutation({
    mutationFn: (input: CompleteInput) => onboardingApi.completeOnboarding(input),
    onSuccess: async (out) => {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {}
      await queryClient.refetchQueries({ queryKey: ['auth', 'me'] })
      navigate(`/forms/${out.formId}/builder`)
    },
  })

  const skipMutation = useMutation({
    mutationFn: () => onboardingApi.skipOnboarding(),
    onSuccess: async () => {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {}
      await queryClient.refetchQueries({ queryKey: ['auth', 'me'] })
      navigate('/')
    },
  })

  const flowDefinition = useMemo(
    () => buildQuizDefaultFlow({ contactFields: draft.funil.contactFields }),
    [draft.funil.contactFields],
  )

  function finalize() {
    const sellersPayload: SellerInput[] = draft.sellers.map((s) => ({
      name: s.name.trim(),
      meetingDurationMinutes: s.duration,
      bufferAfterMinutes: s.buffer,
      locationType: s.location,
      allowedTags: s.allowedTags,
      availability: s.rules
        .map((r, idx) =>
          r.enabled
            ? { dayOfWeek: idx, startTime: `${r.startTime}:00`, endTime: `${r.endTime}:00` }
            : null,
        )
        .filter((r): r is { dayOfWeek: number; startTime: string; endTime: string } => r !== null),
      isOwner: s.isOwner,
    }))

    completeMutation.mutate({
      sellers: sellersPayload,
      pixel: {
        metaPixelId: draft.pixel.metaPixelId.trim(),
        fireOnStart: draft.pixel.fireOnStart,
        fireOnBooking: draft.pixel.fireOnBooking,
      },
      form: {
        title: draft.funil.title.trim() || 'Funil principal',
        flowDefinition,
      },
    })
  }

  const isFinalizing = completeMutation.isPending
  const isSkipping = skipMutation.isPending

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">TypeCall</span>
            <span className="ml-3 text-xs text-muted-foreground">
              Setup inicial · {user.name}
            </span>
          </div>
          <button
            onClick={() => skipMutation.mutate()}
            disabled={isSkipping || isFinalizing}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {isSkipping ? 'Pulando...' : 'Pular por agora'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <Stepper current={stepIdx} total={totalSteps - 1} />

        <div className="mt-10">
          {draft.step === 'Welcome' && <WelcomeStep onNext={next} />}
          {draft.step === 'Vendedores' && (
            <SellersStep
              sellers={draft.sellers}
              onChange={(sellers) => setDraft((p) => ({ ...p, sellers }))}
              onNext={next}
              onBack={back}
            />
          )}
          {draft.step === 'Pixel' && (
            <PixelStep
              value={draft.pixel}
              onChange={(pixel) => setDraft((p) => ({ ...p, pixel }))}
              onNext={next}
              onBack={back}
            />
          )}
          {draft.step === 'Funil' && (
            <FunilStep
              value={draft.funil}
              onChange={(funil) => setDraft((p) => ({ ...p, funil }))}
              onNext={next}
              onBack={back}
            />
          )}
          {draft.step === 'Resumo' && (
            <ResumoStep
              draft={draft}
              flowNodeCount={flowDefinition.nodes.length}
              onBack={back}
              onFinalize={finalize}
              isPending={isFinalizing}
              error={completeMutation.error instanceof Error ? completeMutation.error.message : null}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, idx) => {
        const done = idx < current
        const active = idx === current - 1 || (current === 0 && idx === 0)
        return (
          <div key={idx} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors',
                done
                  ? 'border-primary bg-primary text-primary-foreground'
                  : active
                    ? 'border-primary text-primary'
                    : 'border-border text-muted-foreground',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
            </div>
            {idx < total - 1 && (
              <div
                className={cn(
                  'h-px flex-1 transition-colors',
                  done ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function OnboardingFooter({
  onBack,
  onNext,
  nextLabel = 'Avancar',
  nextDisabled = false,
  showBack = true,
}: {
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  showBack?: boolean
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      {showBack ? (
        <button
          onClick={onBack}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Voltar
        </button>
      ) : (
        <span />
      )}
      <Button onClick={onNext} disabled={nextDisabled} className="gap-2">
        {nextLabel}
        {nextLabel === 'Avancar' && <ArrowRight className="h-3.5 w-3.5" />}
        {nextLabel === 'Finalizando...' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      </Button>
    </div>
  )
}
