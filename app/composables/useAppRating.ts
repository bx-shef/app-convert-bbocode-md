import { ref, computed, watch } from 'vue'
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
// Outcome chosen by a footer button before the modal closes. `null` means the
// modal was closed some other way (X / Esc / backdrop) → treated as a snooze, so
// the give-up-after-N-snoozes policy is reached even without clicking "Later".
let outcome: 'rated' | 'dismissed' | 'snoozed' | null = null
let closeWatchBound = false

function loadStateFromStorage(): void {
  if (hydrated || !import.meta.client) return
  hydrated = true
  try {
    state.value = parseRatingState(localStorage.getItem(STORAGE_KEY))
  } catch { /* ignore */ }
}

function persist(): void {
  if (!import.meta.client) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
  } catch { /* private mode / quota — ignore */ }
}

// Apply the outcome whenever the modal closes, by button OR by X/Esc/backdrop.
function onClosed(): void {
  const kind = outcome ?? 'snoozed'
  outcome = null
  if (kind === 'rated') state.value = markRated(state.value)
  else if (kind === 'dismissed') state.value = markDismissed(state.value)
  else state.value = markSnoozed(state.value, Date.now())
  persist()
}

/**
 * Marketplace rating prompt. Portal-only and gated on a configured slug
 * (`NUXT_PUBLIC_MARKETPLACE_SLUG`, empty/invalid = never prompts). Engagement is
 * counted via {@link registerUse} (in-portal only); {@link maybePrompt} shows the
 * modal when the pure {@link shouldPromptRating} policy allows.
 */
export function useAppRating() {
  const config = useRuntimeConfig()
  const b24 = useB24()
  const slug = computed(() => String(config.public.marketplaceSlug ?? '').trim())
  const isEnabled = computed(() => isRatingConfigured(slug.value))

  loadStateFromStorage()

  // Bind once (first caller — index.vue, whose setup runs before the child modal).
  if (!closeWatchBound) {
    closeWatchBound = true
    watch(open, (v, prev) => {
      if (prev && !v) onClosed()
    })
  }

  /** Count a meaningful action (copy / save) — in the portal only. */
  function registerUse(): void {
    if (!isEnabled.value || !b24.isInit()) return
    state.value = applyUse(state.value)
    persist()
  }

  /** Show the prompt if the policy allows. Call once the frame is initialised. */
  function maybePrompt(): void {
    if (!isEnabled.value || !import.meta.client || !b24.isInit()) return
    const now = Date.now()
    if (shouldPromptRating(state.value, now)) {
      // Stamp now so the cooldown holds even if the tab is closed while open.
      state.value = markPromptShown(state.value, now)
      persist()
      outcome = null
      open.value = true
    }
  }

  /** Open the Marketplace listing in a B24 slider; record "rated" (never ask again). */
  async function rate(): Promise<void> {
    outcome = 'rated'
    open.value = false // triggers the close watcher → markRated
    try {
      const $b24 = b24.get() as B24Frame
      await $b24.slider.openPath($b24.slider.getUrl(marketplacePath(slug.value)))
    } catch { /* slider unavailable — the choice is already recorded */ }
  }

  /** "Later" — snooze; the policy waits out the cooldown before re-prompting. */
  function snooze(): void {
    outcome = 'snoozed'
    open.value = false
  }

  /** "Don't ask again" — never prompt on this device. */
  function dismiss(): void {
    outcome = 'dismissed'
    open.value = false
  }

  return { isEnabled, open, registerUse, maybePrompt, rate, snooze, dismiss }
}
