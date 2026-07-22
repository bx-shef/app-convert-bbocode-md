import { ref, computed } from 'vue'
import { buildFeedbackIssue, isFeedbackEnabled, type FeedbackInput } from '~/utils/feedback'

/** Abort a hung worker request so `isSending` can't stay stuck (locks the modal). */
const REQUEST_TIMEOUT_MS = 15000

/**
 * Feedback channel — POSTs a built `{ title, body }` issue payload to an external
 * worker (`NUXT_PUBLIC_FEEDBACK_URL`) that opens the issue in a PRIVATE bucket
 * repo. The GitHub token lives in that worker, NEVER in this SPA bundle.
 *
 * `isEnabled` is false when the endpoint is unset → the whole feature (button +
 * modal) stays hidden (fail-safe, analogous to analytics-off). The payload is
 * assembled by the pure {@link buildFeedbackIssue} (content sanitised, source
 * attached only on consent).
 */
export function useFeedback() {
  const config = useRuntimeConfig()
  const endpoint = computed(() => String(config.public.feedbackUrl ?? '').trim())
  const isEnabled = computed(() => isFeedbackEnabled(endpoint.value))
  const isSending = ref(false)

  /** Build + POST the feedback issue. Throws on a disabled endpoint, timeout or non-2xx. */
  async function submit(input: FeedbackInput): Promise<void> {
    if (!isEnabled.value) throw new Error('feedback disabled: NUXT_PUBLIC_FEEDBACK_URL is unset')
    const issue = buildFeedbackIssue(input)
    isSending.value = true
    try {
      const res = await fetch(endpoint.value, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(issue),
        // Guard a hung worker: reject after the timeout instead of hanging.
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
      if (!res.ok) throw new Error(`feedback failed: HTTP ${res.status}`)
    } finally {
      isSending.value = false
    }
  }

  return { isEnabled, isSending, submit }
}
