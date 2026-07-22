/**
 * Pure builder for a feedback GitHub-issue payload — no Vue/Nuxt/DOM, so it is
 * unit-testable in the node vitest environment. Channel-agnostic: the returned
 * `{ title, body }` is POSTed by `useFeedback` to an external worker that opens
 * the issue in a PRIVATE bucket repo. The GitHub token lives in that worker,
 * NEVER in this SPA bundle (the bundle is world-readable).
 *
 * Privacy (feedback principles, see CLAUDE.md § Conventions): the user's source
 * markup is attached ONLY when they explicitly consent (`includeSource`). Every
 * embedded string is run through {@link sanitizeReportText} to neutralise
 * Trojan-Source bidi overrides, zero-width characters and control codes before
 * it lands in an issue a maintainer or triage agent will read.
 */

/** `wrong-conversion` = the bbcode-specific "report a bad conversion" flow. */
export type FeedbackKind = 'wrong-conversion' | 'general'

export interface FeedbackContext {
  /** Human label of the conversion path, e.g. `'bb->md'`. */
  direction?: string
  /** Exact source markup that produced a wrong result (attached only on consent). */
  source?: string
  /** Fenced-block language hint for the source, e.g. `'bbcode'`. */
  sourceFormat?: string
  /** The (wrong) produced output, optional. */
  output?: string
  /** Fenced-block language hint for the output. */
  outputFormat?: string
  /** Extra labelled snapshots (e.g. all editor panes), attached only on consent. */
  attachments?: ReadonlyArray<{ label: string, format?: string, content: string }>
}

export interface FeedbackInput {
  kind: FeedbackKind
  /** Free-text user comment (optional). Never placed in the issue title. */
  comment?: string
  /** Whether the user consented to attach the source/output markup. */
  includeSource?: boolean
  context?: FeedbackContext
  /** Safe, non-PII meta only (locale, mode, app version). */
  meta?: Record<string, string>
}

export interface FeedbackIssue {
  title: string
  body: string
}

/** Max characters of attached source/output kept in the issue (guard huge pastes). */
export const MAX_ATTACH_LEN = 20000

// Code-point ranges stripped from any user text embedded in the report. Kept as
// numeric ranges (not literal chars / regex escapes) so no invisible character
// ever lives in this source file. Covers the Trojan-Source / hidden-text set:
//   bidi embeddings & overrides  U+202A..U+202E
//   bidi isolates                U+2066..U+2069
//   zero-width + LRM/RLM         U+200B..U+200F
//   Arabic letter mark           U+061C
//   BOM / ZWNBSP                 U+FEFF
// plus C0/C1 control codes except tab (U+0009), LF (U+000A), CR (U+000D).
const STRIP_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x0008], [0x000b, 0x000c], [0x000e, 0x001f], [0x007f, 0x009f],
  [0x061c, 0x061c], [0x200b, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069],
  [0xfeff, 0xfeff]
]

function isStripped(code: number): boolean {
  return STRIP_RANGES.some(([lo, hi]) => code >= lo && code <= hi)
}

/**
 * Neutralise Trojan-Source bidi overrides, zero-width characters and control
 * codes from text that will be embedded in a Markdown issue body.
 */
export function sanitizeReportText(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)
    if (code !== undefined && isStripped(code)) continue
    out += ch
  }
  return out
}

/** Longest run of consecutive backticks in `s` (0 if none). */
function longestBacktickRun(s: string): number {
  const runs = s.match(/`+/g)
  return runs ? Math.max(...runs.map(r => r.length)) : 0
}

/**
 * Wrap `content` in a fenced code block whose fence is longer than any backtick
 * run inside it, so pasted markup cannot break out of the fence (CommonMark).
 */
function fencedBlock(content: string, lang = ''): string {
  const fence = '`'.repeat(Math.max(3, longestBacktickRun(content) + 1))
  return `${fence}${lang}\n${content}\n${fence}`
}

function truncate(text: string): { text: string, truncated: boolean } {
  if (text.length <= MAX_ATTACH_LEN) return { text, truncated: false }
  return { text: text.slice(0, MAX_ATTACH_LEN), truncated: true }
}

/**
 * Build a GitHub-issue `{ title, body }` from a feedback submission.
 * Deterministic and side-effect-free. User free-text never goes in the title
 * (safety/PII); the source markup is embedded only when `includeSource` is set.
 */
export function buildFeedbackIssue(input: FeedbackInput): FeedbackIssue {
  const { kind, comment, includeSource, context, meta } = input
  const direction = context?.direction ? sanitizeReportText(context.direction) : ''

  const titleBase = kind === 'wrong-conversion' ? 'Wrong conversion' : 'Feedback'
  const title = direction ? `${titleBase}: ${direction}` : titleBase

  const lines: string[] = []
  lines.push(`**Kind:** ${kind}`)
  if (direction) lines.push(`**Direction:** ${direction}`)

  const cleanComment = comment ? sanitizeReportText(comment).trim() : ''
  lines.push('', '**Comment:**', cleanComment || '_(none)_')

  const hasPayload = Boolean(includeSource && (context?.source || context?.attachments?.length || context?.output))
  if (hasPayload && context) {
    if (context.source) {
      const src = truncate(sanitizeReportText(context.source))
      lines.push('', `**Source${src.truncated ? ' (truncated)' : ''}:**`, fencedBlock(src.text, context.sourceFormat ?? ''))
    }
    for (const a of context.attachments ?? []) {
      const at = truncate(sanitizeReportText(a.content))
      lines.push('', `**${sanitizeReportText(a.label)}${at.truncated ? ' (truncated)' : ''}:**`, fencedBlock(at.text, a.format ?? ''))
    }
    if (context.output) {
      const out = truncate(sanitizeReportText(context.output))
      lines.push('', `**Produced output${out.truncated ? ' (truncated)' : ''}:**`, fencedBlock(out.text, context.outputFormat ?? ''))
    }
  } else {
    lines.push('', '_Source markup not attached (no consent)._')
  }

  if (meta && Object.keys(meta).length) {
    lines.push('', '**Meta:**')
    for (const [k, v] of Object.entries(meta)) {
      lines.push(`- ${sanitizeReportText(k)}: ${sanitizeReportText(String(v))}`)
    }
  }

  return { title, body: lines.join('\n') }
}
