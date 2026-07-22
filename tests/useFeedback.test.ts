import { describe, it, expect, vi, afterEach } from 'vitest'
import { useFeedback } from '~/composables/useFeedback'

// useFeedback reads `useRuntimeConfig()` (a Nuxt auto-import global) and `fetch`.
// Both are stubbed here — no Nuxt/DOM harness needed (the composable has no
// top-level side effects; the globals are only touched when it is called).

function stubConfig(feedbackUrl: string) {
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { feedbackUrl } }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useFeedback', () => {
  it('isEnabled reflects the (trimmed) endpoint', () => {
    stubConfig('   ')
    expect(useFeedback().isEnabled.value).toBe(false)
    stubConfig('https://w.example')
    expect(useFeedback().isEnabled.value).toBe(true)
  })

  it('submit() throws when disabled and never calls fetch', async () => {
    stubConfig('')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(useFeedback().submit({ kind: 'general', comment: 'x' })).rejects.toThrow(/disabled/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submit() POSTs the built issue as JSON with an abort signal', async () => {
    stubConfig('https://w.example/fb')
    const fetchMock = vi.fn(async () => ({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const fb = useFeedback()
    await fb.submit({ kind: 'general', comment: 'hi' })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://w.example/fb')
    expect(opts.method).toBe('POST')
    expect((opts.headers as Record<string, string>)['content-type']).toBe('application/json')
    expect(opts.signal).toBeInstanceOf(AbortSignal)
    const payload = JSON.parse(opts.body as string)
    expect(payload.title).toBe('Feedback')
    expect(typeof payload.body).toBe('string')
    expect(fb.isSending.value).toBe(false)
  })

  it('submit() throws on a non-2xx response and resets isSending', async () => {
    stubConfig('https://w.example')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })))
    const fb = useFeedback()
    await expect(fb.submit({ kind: 'general', comment: 'x' })).rejects.toThrow(/HTTP 500/)
    expect(fb.isSending.value).toBe(false)
  })

  it('isSending is true in-flight and false after completion', async () => {
    stubConfig('https://w.example')
    let resolveFetch: (v: { ok: boolean }) => void = () => {}
    vi.stubGlobal('fetch', vi.fn(() => new Promise((r) => {
      resolveFetch = r
    })))
    const fb = useFeedback()
    const p = fb.submit({ kind: 'general', comment: 'x' })
    expect(fb.isSending.value).toBe(true)
    resolveFetch({ ok: true })
    await p
    expect(fb.isSending.value).toBe(false)
  })
})
