import { toMarkdown, fromMarkdown } from './convert'

/**
 * Bitrix24 entities whose text field this app can load/save over REST. Each
 * stores its body as BBCode (tasks may also be HTML — see the flag below).
 * - `task`       — `tasks.task.*`, DESCRIPTION (+ DESCRIPTION_IN_BBCODE flag)
 * - `crmComment` — `crm.timeline.comment.*`, COMMENT
 * - `feedPost`   — `log.blogpost.*`, DETAIL_TEXT / POST_MESSAGE
 */
export type EntityKind = 'task' | 'crmComment' | 'feedPost'

export const ENTITY_KINDS: EntityKind[] = ['task', 'crmComment', 'feedPost']

export interface EntitySource {
  kind: EntityKind
  id: number
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null
}

/** Normalize a Bitrix flag (`Y`/`N`, `1`/`0`, bool, number) to a boolean. */
export function isBbcodeFlag(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v === 1
  const s = String(v ?? '').trim().toUpperCase()
  return s === 'Y' || s === '1' || s === 'TRUE'
}

/**
 * Pull the task object out of a `tasks.task.get` payload. Tolerant to response
 * shape (`{ result: { task } }`, `{ task }`, `{ result }`) since we cannot
 * pin the exact envelope without a live portal.
 */
export function pickTask(data: unknown): Record<string, unknown> | null {
  const d = asRecord(data)
  if (!d) return null
  const result = asRecord(d.result)
  return asRecord(result?.task) ?? asRecord(d.task) ?? result
}

/** Read a task's description + its format, tolerant to field casing. */
export function readTaskDescription(task: Record<string, unknown>): { text: string, format: 'bb' | 'html' } {
  const text = String(task.description ?? task.DESCRIPTION ?? '')
  const flag = task.descriptionInBbcode ?? task.DESCRIPTION_IN_BBCODE
  return { text, format: isBbcodeFlag(flag) ? 'bb' : 'html' }
}

/** task description (BBCode or HTML) → Markdown for the editor. */
export function taskDescriptionToMarkdown(task: Record<string, unknown>): string {
  const { text, format } = readTaskDescription(task)
  return toMarkdown(format, text)
}

/**
 * Markdown → `tasks.task.update` fields. We persist the description as BBCode
 * (`DESCRIPTION_IN_BBCODE: 'Y'`), which is Bitrix24's native task format.
 */
export function buildTaskUpdateFields(markdown: string): { DESCRIPTION: string, DESCRIPTION_IN_BBCODE: 'Y' } {
  return { DESCRIPTION: fromMarkdown('bb', markdown), DESCRIPTION_IN_BBCODE: 'Y' }
}

// --- CRM timeline comment (crm.timeline.comment.*) — COMMENT is BBCode --------

/** Pull the comment object out of a `crm.timeline.comment.get` payload. */
export function pickComment(data: unknown): Record<string, unknown> | null {
  const d = asRecord(data)
  if (!d) return null
  return asRecord(d.result) ?? d
}

/** CRM comment text (BBCode) → Markdown. */
export function commentToMarkdown(comment: Record<string, unknown>): string {
  return toMarkdown('bb', String(comment.COMMENT ?? comment.comment ?? ''))
}

/** Markdown → `crm.timeline.comment.update` fields (stored as BBCode). */
export function buildCommentUpdateFields(markdown: string): { COMMENT: string } {
  return { COMMENT: fromMarkdown('bb', markdown) }
}

// --- Live Feed post (log.blogpost.*) — DETAIL_TEXT/POST_MESSAGE is BBCode -----

/** Pull a single post out of a `log.blogpost.get` payload (result is an array). */
export function pickPost(data: unknown): Record<string, unknown> | null {
  const d = asRecord(data)
  if (!d) return null
  const result = d.result
  if (Array.isArray(result)) return asRecord(result[0])
  return asRecord(result) ?? d
}

/** Post title — must be re-sent on update or Bitrix24 drops it (EMPTY_TITLE). */
export function readPostTitle(post: Record<string, unknown>): string {
  return String(post.TITLE ?? post.title ?? '')
}

/** Live Feed post body (BBCode) → Markdown. */
export function postToMarkdown(post: Record<string, unknown>): string {
  return toMarkdown('bb', String(post.DETAIL_TEXT ?? post.detailText ?? ''))
}

/** Markdown + preserved title → `log.blogpost.update` fields. */
export function buildPostUpdateFields(markdown: string, title: string): { POST_MESSAGE: string, POST_TITLE: string } {
  return { POST_MESSAGE: fromMarkdown('bb', markdown), POST_TITLE: title }
}
