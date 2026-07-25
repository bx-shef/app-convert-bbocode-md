import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TimeoutError } from '../app/utils/with-timeout'

// `useB24Rest` calls through the SDK's `actions.v2.call.make`, which already
// retries transient failures (see the comment in useB24Rest.ts). This guards the
// decision NOT to add our own retry: each save must issue exactly one REST call,
// and a failure must throw without a second attempt. We mock `useB24` so the real
// useB24.ts (which relies on Nuxt's auto-imported `ref`) never loads in node.
const { make } = vi.hoisted(() => ({ make: vi.fn() }))
vi.mock('~/composables/useB24', () => ({
  useB24: () => ({
    isInit: () => true,
    get: () => ({ actions: { v2: { call: { make } } } })
  })
}))

const { useB24Rest } = await import('../app/composables/useB24Rest')

describe('useB24Rest — no app-level retry (the SDK owns retries)', () => {
  beforeEach(() => make.mockReset())

  it('a save issues exactly one REST call — no outer retry loop', async () => {
    make.mockResolvedValue({ isSuccess: true, getData: () => ({}) })
    await useB24Rest().saveMarkdown('task', 42, '# hi')
    expect(make).toHaveBeenCalledTimes(1)
  })

  it('a failed REST call throws immediately, without retrying', async () => {
    make.mockResolvedValue({ isSuccess: false, getErrorMessages: () => ['boom'] })
    await expect(useB24Rest().saveMarkdown('crmComment', 7, 'x')).rejects.toThrow('boom')
    expect(make).toHaveBeenCalledTimes(1)
  })
})

describe('useB24Rest — call is bounded by a timeout', () => {
  it('a hung REST call rejects with TimeoutError once the deadline passes', async () => {
    make.mockReset()
    vi.useFakeTimers()
    make.mockReturnValue(new Promise(() => {})) // a call that never settles
    const p = useB24Rest().saveMarkdown('task', 1, 'x')
    const assertion = expect(p).rejects.toBeInstanceOf(TimeoutError)
    // Let the async chain (saveMarkdown → saveTask → call) reach the
    // `await withTimeout` suspension before advancing fake time, then trip the
    // 60s bound. useRealTimers is restored inline (not in afterEach: the never-
    // settling mock leaves a pending promise that would stall an afterEach hook).
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(60_001)
    await assertion
    vi.useRealTimers()
  })
})
