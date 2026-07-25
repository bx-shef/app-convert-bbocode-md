import { describe, it, expect, vi, afterEach } from 'vitest'
import { withTimeout, TimeoutError } from '../app/utils/with-timeout'

describe('withTimeout', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves with the value when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok')
  })

  it('propagates a rejection that happens in time (not a timeout)', async () => {
    const boom = new Error('boom')
    await expect(withTimeout(Promise.reject(boom), 1000)).rejects.toBe(boom)
  })

  it('rejects with TimeoutError when the promise outlives the deadline', async () => {
    vi.useFakeTimers()
    // A promise that never settles on its own.
    const pending = new Promise<string>(() => {})
    const raced = withTimeout(pending, 5000)
    const assertion = expect(raced).rejects.toBeInstanceOf(TimeoutError)
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
  })

  it('clears the timer once the promise wins the race', async () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    await withTimeout(Promise.resolve('done'), 5000)
    expect(clearSpy).toHaveBeenCalled()
  })
})
