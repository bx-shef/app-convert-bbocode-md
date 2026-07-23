import { describe, it, expect } from 'vitest'
import {
  DEFAULT_RATING_STATE, DEFAULT_RATING_POLICY, shouldPromptRating, marketplacePath,
  isRatingConfigured, registerUse, markPromptShown, markSnoozed, markRated,
  markDismissed, parseRatingState, type RatingState
} from '../app/utils/app-rating'

const NOW = 1_700_000_000_000
const DAY = 86_400_000
// Frozen so any transition that mutates its input in-place throws (strict mode)
// instead of silently corrupting a shared fixture.
const ready: RatingState = Object.freeze({ uses: 3, lastPromptAt: 0, snoozes: 0, rated: false, dismissed: false })

describe('shouldPromptRating', () => {
  it('prompts once the use threshold is met and nothing blocks it', () => {
    expect(shouldPromptRating(ready, NOW)).toBe(true)
  })

  it('never prompts after rated or dismissed', () => {
    expect(shouldPromptRating({ ...ready, rated: true }, NOW)).toBe(false)
    expect(shouldPromptRating({ ...ready, dismissed: true }, NOW)).toBe(false)
  })

  it('does not prompt below the use threshold', () => {
    expect(shouldPromptRating({ ...ready, uses: DEFAULT_RATING_POLICY.minUses - 1 }, NOW)).toBe(false)
  })

  it('gives up after maxSnoozes', () => {
    expect(shouldPromptRating({ ...ready, snoozes: DEFAULT_RATING_POLICY.maxSnoozes }, NOW)).toBe(false)
  })

  it('respects the snooze cooldown, then prompts again (incl. exact boundary)', () => {
    const snoozedNow = markSnoozed(ready, NOW)
    // within the cooldown window
    expect(shouldPromptRating(snoozedNow, NOW + DAY)).toBe(false)
    // exactly at the boundary — cooldown has elapsed (guards `<` vs `<=`)
    expect(shouldPromptRating(snoozedNow, NOW + DEFAULT_RATING_POLICY.snoozeDays * DAY)).toBe(true)
    // after the cooldown window
    expect(shouldPromptRating(snoozedNow, NOW + (DEFAULT_RATING_POLICY.snoozeDays + 1) * DAY)).toBe(true)
  })

  it('honours a custom policy', () => {
    const policy = { minUses: 1, snoozeDays: 1, maxSnoozes: 1 }
    expect(shouldPromptRating({ ...ready, uses: 1 }, NOW, policy)).toBe(true)
    // maxSnoozes=1 → one snooze already gives up
    expect(shouldPromptRating({ ...ready, uses: 1, snoozes: 1 }, NOW + 5 * DAY, policy)).toBe(false)
  })
})

describe('marketplacePath / isRatingConfigured', () => {
  it('builds the detail path', () => {
    expect(marketplacePath('shef.bbcodemd')).toBe('/marketplace/detail/shef.bbcodemd/')
  })
  it('gates on a non-blank slug', () => {
    expect(isRatingConfigured('shef.bbcodemd')).toBe(true)
    expect(isRatingConfigured('')).toBe(false)
    expect(isRatingConfigured('   ')).toBe(false)
    expect(isRatingConfigured(undefined)).toBe(false)
    expect(isRatingConfigured(null)).toBe(false)
  })
  it('rejects a malformed slug (fail-fast on typos / stray path chars)', () => {
    expect(isRatingConfigured('shef/evil')).toBe(false)
    expect(isRatingConfigured('a b')).toBe(false)
    expect(isRatingConfigured('../x')).toBe(false)
  })
})

describe('state transitions', () => {
  it('registerUse increments uses (immutably)', () => {
    const next = registerUse(DEFAULT_RATING_STATE)
    expect(next.uses).toBe(1)
    expect(DEFAULT_RATING_STATE.uses).toBe(0)
  })
  it('markSnoozed bumps snoozes and stamps the time', () => {
    const next = markSnoozed(ready, NOW)
    expect(next.snoozes).toBe(1)
    expect(next.lastPromptAt).toBe(NOW)
  })
  it('markPromptShown stamps the time only', () => {
    expect(markPromptShown(ready, NOW).lastPromptAt).toBe(NOW)
  })
  it('markRated / markDismissed set their flags', () => {
    expect(markRated(ready).rated).toBe(true)
    expect(markDismissed(ready).dismissed).toBe(true)
  })
})

describe('parseRatingState', () => {
  it('returns defaults for null or garbage', () => {
    expect(parseRatingState(null)).toEqual(DEFAULT_RATING_STATE)
    expect(parseRatingState('{not json')).toEqual(DEFAULT_RATING_STATE)
  })
  it('fills missing fields and coerces types', () => {
    expect(parseRatingState('{"uses":5,"rated":true}')).toEqual({
      uses: 5, lastPromptAt: 0, snoozes: 0, rated: true, dismissed: false
    })
  })
  it('round-trips a full state', () => {
    const s: RatingState = { uses: 7, lastPromptAt: NOW, snoozes: 2, rated: false, dismissed: false }
    expect(parseRatingState(JSON.stringify(s))).toEqual(s)
  })
  it('coerces booleans strictly and clamps negative numbers', () => {
    // a tampered "false" string must NOT read as rated (Boolean("false") is true)
    expect(parseRatingState('{"rated":"false","dismissed":"false"}')).toMatchObject({ rated: false, dismissed: false })
    expect(parseRatingState('{"rated":true}').rated).toBe(true)
    expect(parseRatingState('{"uses":-5,"snoozes":-3}')).toMatchObject({ uses: 0, snoozes: 0 })
  })
})
