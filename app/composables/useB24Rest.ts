import type { B24Frame } from '@bitrix24/b24jssdk'
import { Text } from '@bitrix24/b24jssdk'
import { useB24 } from './useB24'
import { withTimeout } from '~/utils/with-timeout'
import {
  type EntityKind,
  pickTask, taskDescriptionToMarkdown, buildTaskUpdateFields,
  pickComment, commentToMarkdown, buildCommentUpdateFields,
  pickPost, postToMarkdown, readPostTitle, buildPostUpdateFields
} from '~/utils/b24-entity'

/** Thrown when a REST action is attempted outside a Bitrix24 frame. */
export class B24NotReadyError extends Error {
  constructor() {
    super('Bitrix24 frame is not initialized')
    this.name = 'B24NotReadyError'
  }
}

/**
 * REST wrappers over the (non-deprecated) `actions.v2.call.make` API for the
 * three supported entities (task / CRM comment / Feed post). Each loads the
 * entity's text field into editor Markdown and saves it back as BBCode.
 *
 * Pure parsing/building lives in `app/utils/b24-entity.ts` (unit-tested); this
 * composable only does the call + error mapping. Call shapes are verified
 * against the documented REST API, but live behaviour needs hands-on portal QA.
 */
export function useB24Rest() {
  const b24 = useB24()

  function frame(): B24Frame {
    if (!b24.isInit()) throw new B24NotReadyError()
    return b24.get() as B24Frame
  }

  // Transient-failure retries live in the SDK's HTTP layer, NOT here.
  // `actions.v2.call.make` goes through its RestrictionManager, which — as of
  // @bitrix24/b24jssdk 2.x (re-verify on a major/minor bump) — retries network
  // errors (`retryOnNetworkError` defaults to true), 408, 429/OPERATION_TIME_LIMIT
  // and 503/QUERY_LIMIT_EXCEEDED with exponential backoff + jitter (maxRetries 3,
  // retryDelay 1000ms); only genuine 4xx throw straight up.
  // Do NOT wrap an outer retry around this: it resets the SDK's per-call attempt
  // counter and runs blind to its backoff/limit state, piling load onto an
  // already-throttled method. The `*.update` saves are idempotent on the field
  // value, but a blind retry can still double server-side side effects (edit
  // history, notifications) when a write applied but its response was lost.
  //
  // Upper bound on how long the UI waits for one REST call — a deliberate
  // fail-fast, NOT "only trips on a real stall". The SDK's own retries stay
  // intact underneath, but they can legitimately sleep a long time: an
  // OPERATION_TIME_LIMIT retry waits >=10s each (up to maxRetries), and a hard
  // rate-limit defers to the reset of a ~10-min window. We cap at 60s anyway —
  // a minute-plus wait is worse UX than a timeout the user can retry — so a
  // genuinely rate-limited call IS aborted here by design (we can't cover the
  // full retry budget without reintroducing the multi-minute hang we're killing).
  //
  // Two caveats, both bounded by the SDK lacking cancellation (no AbortSignal in
  // @bitrix24/b24jssdk 2.x — Promise.race can't cancel the real request):
  //   1. A timed-out *write* may still apply server-side later. Field writes are
  //      idempotent on the value, so an identical re-save is safe.
  //   2. Re-triggering after a timeout can race two in-flight calls for one
  //      entity (the button re-enables while the old call may still run). See
  //      docs/project-map.md § «Что дальше» — residual, gated on SDK cancel support.
  const CALL_TIMEOUT_MS = 60_000
  async function call(method: string, params: Record<string, unknown>): Promise<unknown> {
    const $b24 = frame()
    const res = await withTimeout(
      $b24.actions.v2.call.make({ method, params, requestId: Text.getUuidRfc4122() }),
      CALL_TIMEOUT_MS
    )
    if (!res.isSuccess) throw new Error(res.getErrorMessages().join('; '))
    return res.getData()
  }

  // --- task ------------------------------------------------------------------
  async function loadTask(id: number): Promise<string> {
    const task = pickTask(await call('tasks.task.get', { taskId: id }))
    if (!task) throw new Error(`Task #${id} not found`)
    return taskDescriptionToMarkdown(task)
  }
  async function saveTask(id: number, markdown: string): Promise<void> {
    await call('tasks.task.update', { taskId: id, fields: buildTaskUpdateFields(markdown) })
  }

  // --- CRM timeline comment --------------------------------------------------
  async function loadComment(id: number): Promise<string> {
    const comment = pickComment(await call('crm.timeline.comment.get', { id }))
    if (!comment) throw new Error(`Comment #${id} not found`)
    return commentToMarkdown(comment)
  }
  async function saveComment(id: number, markdown: string): Promise<void> {
    await call('crm.timeline.comment.update', { id, fields: buildCommentUpdateFields(markdown) })
  }

  // --- Live Feed post --------------------------------------------------------
  async function loadPost(id: number): Promise<string> {
    const post = pickPost(await call('log.blogpost.get', { POST_ID: id }))
    if (!post) throw new Error(`Post #${id} not found`)
    return postToMarkdown(post)
  }
  async function savePost(id: number, markdown: string): Promise<void> {
    // Re-send the original title, or Bitrix24 drops it (EMPTY_TITLE).
    const post = pickPost(await call('log.blogpost.get', { POST_ID: id }))
    const title = post ? readPostTitle(post) : ''
    await call('log.blogpost.update', { POST_ID: id, ...buildPostUpdateFields(markdown, title) })
  }

  /** Load an entity's text field as Markdown. */
  function loadMarkdown(kind: EntityKind, id: number): Promise<string> {
    switch (kind) {
      case 'task': return loadTask(id)
      case 'crmComment': return loadComment(id)
      case 'feedPost': return loadPost(id)
    }
  }

  /** Save Markdown back to an entity's text field (as BBCode). */
  function saveMarkdown(kind: EntityKind, id: number, markdown: string): Promise<void> {
    switch (kind) {
      case 'task': return saveTask(id, markdown)
      case 'crmComment': return saveComment(id, markdown)
      case 'feedPost': return savePost(id, markdown)
    }
  }

  return { loadMarkdown, saveMarkdown }
}
