import { toMarkdown, fromMarkdown } from './convert'

/**
 * Bitrix24 entities whose text field this app can load/save over REST.
 * Tasks first (the canonical BBCode field); CRM comments / Feed posts are the
 * next slice (they need extra owner context, so they are intentionally absent).
 */
export type EntityKind = 'task'

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
