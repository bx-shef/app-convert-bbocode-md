import { TimeoutError } from '~/utils/with-timeout'
import { B24NotReadyError } from '~/composables/useB24Rest'

/**
 * Maps known REST failure types to a localized, actionable toast description,
 * so a timeout/not-ready error doesn't surface as a raw English message that
 * contradicts the toast title's advice. Anything else falls back to its own
 * message (Bitrix24 REST errors already arrive in the portal user's language).
 */
export function useB24ErrorText() {
  const { t } = useI18n()
  return (e: unknown): string => {
    if (e instanceof TimeoutError) return t('error.timeout')
    if (e instanceof B24NotReadyError) return t('error.notReady')
    return e instanceof Error ? e.message : String(e)
  }
}
