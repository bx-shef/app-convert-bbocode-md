import { ref, computed } from 'vue'
import type { B24Frame } from '@bitrix24/b24jssdk'
import { useB24 } from '~/composables/useB24'
import {
  DEFAULT_RATING_STATE, parseRatingState, shouldPromptRating, marketplacePath,
  isRatingConfigured, registerUse as applyUse, markSnoozed, markRated,
  markDismissed, markPromptShown, type RatingState
} from '~/utils/app-rating'

const STORAGE_KEY = 'bbcode_app_rating_v1'

// Module-level singletons so index.vue (which counts uses and triggers the
// prompt) and AppRatingModal (which renders it) share one reactive state — the
// same singleton pattern as useB24's module-level `$b24`.
const open = ref(false)
const state = ref<RatingState>({ ...DEFAULT_RATING_STATE })
let hydrated = false

function persist(): void {
  if (!import.meta.client) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
  } catch { /* private mode / quota — ignore */ }
}

function hydrate(): void {
  if (hydrated || !import.meta.client) return
  hydrated = true
  try {
    state.value = parseRatingState(localStorage.getItem(STORAGE_KEY))
  } catch { /* ignore */ }
}

/**
 * Marketplace rating prompt. Portal-only and gated on a configured slug
 * (`NUXT_PUBLIC_MARKETPLACE_SLUG`, empty = never prompts). Engagement is counted
 * via {@link registerUse}; {@link maybePrompt} shows the modal when the pure
 * {@link shouldPromptRating} policy allows.
 */
export function useAppRating() {
  const config = useRuntimeConfig()
  const b24 = useB24()
  const slug = computed(() => String(config.public.marketplaceSlug ?? '').trim())
  const isEnabled = computed(() => isRatingConfigured(slug.value))

  hydrate()

  /** Count a meaningful action (copy / save). No-op when the feature is off. */
  function registerUse(): void {
    if (!isEnabled.value) return
    state.value = applyUse(state.value)
    persist()
  }

  /** Show the prompt if the policy allows. Call on mount inside the portal. */
  function maybePrompt(): void {
    if (!isEnabled.value || !import.meta.client) return
    if (!b24.isInit()) return // Marketplace slider only exists inside the frame
    const now = Date.now()
    if (shouldPromptRating(state.value, now)) {
      state.value = markPromptShown(state.value, now)
      persist()
      open.value = true
    }
  }

  /** Open the Marketplace listing in a B24 slider; mark rated (never ask again). */
  async function rate(): Promise<void> {
    try {
      const $b24 = b24.get() as B24Frame
      await $b24.slider.openPath($b24.slider.getUrl(marketplacePath(slug.value)))
    } catch { /* slider unavailable — still record the choice */ }
    state.value = markRated(state.value)
    persist()
    open.value = false
  }

  /** "Later" — snooze; the policy waits out the cooldown before re-prompting. */
  function snooze(): void {
    state.value = markSnoozed(state.value, Date.now())
    persist()
    open.value = false
  }

  /** "Don't ask again" — never prompt on this device. */
  function dismiss(): void {
    state.value = markDismissed(state.value)
    persist()
    open.value = false
  }

  return { isEnabled, open, registerUse, maybePrompt, rate, snooze, dismiss }
}
