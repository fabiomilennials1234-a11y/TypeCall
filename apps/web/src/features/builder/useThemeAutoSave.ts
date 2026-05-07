import { useEffect, useRef, useCallback } from 'react'

import * as formsApi from '@/api/endpoints/forms'
import type { FormTheme } from './lib/theme'

const AUTO_SAVE_DELAY = 1500

export function useThemeAutoSave(
  formId: string,
  theme: FormTheme,
  isDirty: boolean,
  onSaved: () => void,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)

  const save = useCallback(async () => {
    if (isSavingRef.current) return
    isSavingRef.current = true
    try {
      await formsApi.updateForm(formId, { theme: theme as unknown as Record<string, unknown> })
      onSaved()
    } catch {
      // surfaced via mutation states elsewhere; auto-save retries on next dirty cycle
    } finally {
      isSavingRef.current = false
    }
  }, [formId, theme, onSaved])

  useEffect(() => {
    if (!isDirty) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void save(), AUTO_SAVE_DELAY)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isDirty, save])
}
