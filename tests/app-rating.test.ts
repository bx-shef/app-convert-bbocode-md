import { describe, it, expect } from 'vitest'
import {
  DEFAULT_RATING_STATE, DEFAULT_RATING_POLICY, shouldPromptRating, marketplacePath,
  isRatingConfigured, registerUse, markPromptShown, markSnoozed, markRated,
  markDismissed, parseRatingState, type RatingState
} from '../app/utils/app-rating'

const NOW = 1_700_000_000_000
const DAY = 86_400_000
const ready: RatingState = { uses: 3, lastPromptAt: 0, snoozes: 0, rated: false, dismissed: false }

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

  it('respects the snooze cooldown, then prompts again', () => {
    const snoozedNow = markSnoozed(ready, NOW)
    // within the cooldown window
    expect(shouldPromptRating(snoozedNow, NOW + DAY)).toBe(false)
    // after the cooldown window
    expect(shouldPromptRating(snoozedNow, NOW + (DEFAULT_RATING_POLICY.snoozeDays + 1) * DAY)).toBe(true)
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
})
