import { useCallback } from 'react'

import { api } from '@/api/client'
import type { TagDestinationsMap, TagDestination, DestinationKind } from '@/features/builder/components/TagDestinationPanel'
import { DEFAULT_TAG_DESTINATIONS } from '@/features/builder/components/TagDestinationPanel'

export interface ScoreResult {
  finalTag?: 'diamond' | 'gold' | 'silver' | 'bronze' | 'disqualified' | null
}

export interface QualificationOutcome {
  destination: DestinationKind
  redirectUrl?: string
  finalTag?: ScoreResult['finalTag']
}

export function useQualification(formSettings: unknown) {
  const score = useCallback(async (responseId: string): Promise<QualificationOutcome | null> => {
    let result: ScoreResult
    try {
      result = await api<ScoreResult>(`/api/v1/responses/${responseId}/score`, {
        method: 'POST',
        noAuth: true,
      })
    } catch {
      return null
    }

    const tag = result?.finalTag ?? null
    if (!tag) return null

    const destinations = readTagDestinations(formSettings)
    const dest: TagDestination = destinations[tag] ?? DEFAULT_TAG_DESTINATIONS[tag] ?? { kind: 'close' }

    return { destination: dest.kind, redirectUrl: dest.redirectUrl, finalTag: tag }
  }, [formSettings])

  return { score }
}

function readTagDestinations(settings: unknown): TagDestinationsMap {
  if (!settings || typeof settings !== 'object') return DEFAULT_TAG_DESTINATIONS
  const s = settings as Record<string, unknown>
  const td = s.tagDestinations ?? s.tag_destinations
  if (!td || typeof td !== 'object') return DEFAULT_TAG_DESTINATIONS
  return td as TagDestinationsMap
}
