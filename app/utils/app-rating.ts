/**
 * Pure policy + state transitions for the "rate this app in the Bitrix24
 * Marketplace" prompt — no Vue/Nuxt/DOM, unit-testable in node. The composable
 * (`useAppRating`) persists {@link RatingState} in localStorage and opens the
 * Marketplace slider; this module only decides *whether* to prompt and how the
 * state evolves.
 *
 * Portal-only + opt-in by config: the prompt is shown only inside the Bitrix24
 * frame and only when a Marketplace slug is configured (empty = never prompt).
 */

export interface RatingState {
  /** Count of meaningful actions (copy / save) — the engagement signal. */
  uses: number
  /** Epoch ms of the last time the prompt was shown (0 = never). */
  lastPromptAt: number
  /** How many times the user chose "later" (snoozed). */
  snoozes: number
  /** User rated → never prompt again. */
  rated: boolean
  /** User chose "don't ask again". */
  dismissed: boolean
}

export const DEFAULT_RATING_STATE: RatingState = {
  uses: 0, lastPromptAt: 0, snoozes: 0, rated: false, dismissed: false
}

export interface RatingPolicy {
  /** Minimum uses before the first prompt. */
  minUses: number
  /** Days to wait after a snooze before prompting again. */
  snoozeDays: number
  /** Give up after this many snoozes. */
  maxSnoozes: number
}

export const DEFAULT_RATING_POLICY: RatingPolicy = {
  minUses: 3, snoozeDays: 14, maxSnoozes: 3
}

const DAY_MS = 86_400_000

/**
 * Decide whether to show the rating prompt. Pure — `now` (epoch ms) is passed in
 * so the decision is deterministic and testable.
 */
export function shouldPromptRating(
  state: RatingState,
  now: number,
  policy: RatingPolicy = DEFAULT_RATING_POLICY
): boolean {
  if (state.rated || state.dismissed) return false
  if (state.snoozes >= policy.maxSnoozes) return false
  if (state.uses < policy.minUses) return false
  if (state.lastPromptAt > 0 && now - state.lastPromptAt < policy.snoozeDays * DAY_MS) return false
  return true
}

/** Marketplace detail page path for a given app slug/code (e.g. `shef.bbcodemd`). */
export function marketplacePath(slug: string): string {
  return `/marketplace/detail/${slug}/`
}

/** Whether a Marketplace slug is configured (feature gate). */
export function isRatingConfigured(slug: string | undefined | null): boolean {
  return Boolean(slug && String(slug).trim().length > 0)
}

// Pure state transitions — the composable persists the returned value.
export function registerUse(s: RatingState): RatingState {
  return { ...s, uses: s.uses + 1 }
}
export function markPromptShown(s: RatingState, now: number): RatingState {
  return { ...s, lastPromptAt: now }
}
export function markSnoozed(s: RatingState, now: number): RatingState {
  return { ...s, snoozes: s.snoozes + 1, lastPromptAt: now }
}
export function markRated(s: RatingState): RatingState {
  return { ...s, rated: true }
}
export function markDismissed(s: RatingState): RatingState {
  return { ...s, dismissed: true }
}

/** Parse persisted JSON into a RatingState, tolerating missing/garbage fields. */
export function parseRatingState(raw: string | null): RatingState {
  if (!raw) return { ...DEFAULT_RATING_STATE }
  try {
    const o = JSON.parse(raw) as Partial<RatingState>
    return {
      uses: Number(o.uses) || 0,
      lastPromptAt: Number(o.lastPromptAt) || 0,
      snoozes: Number(o.snoozes) || 0,
      rated: Boolean(o.rated),
      dismissed: Boolean(o.dismissed)
    }
  } catch {
    return { ...DEFAULT_RATING_STATE }
  }
}
