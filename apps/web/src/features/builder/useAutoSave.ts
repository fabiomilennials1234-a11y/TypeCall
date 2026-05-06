import { useEffect, useRef, useCallback } from 'react'
import type { FlowDefinition } from '@typecall/flow-engine'
import * as formsApi from '@/api/endpoints/forms'

const AUTO_SAVE_DELAY = 2000

export function useAutoSave(formId: string, flow: FlowDefinition, isDirty: boolean, onSaved: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)
  const savedRef = useRef(false)

  const save = useCallback(async () => {
    if (isSavingRef.current) return
    isSavingRef.current = true
    savedRef.current = false

    try {
      await formsApi.saveDraft(formId, flow as unknown as Record<string, unknown>)
      savedRef.current = true
      onSaved()
    } catch {
      savedRef.current = false
    } finally {
      isSavingRef.current = false
    }
  }, [formId, flow, onSaved])

  useEffect(() => {
    if (!isDirty) return

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      void save()
    }, AUTO_SAVE_DELAY)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isDirty, save])

  return { isSaving: isSavingRef.current, lastSaved: savedRef.current }
}
