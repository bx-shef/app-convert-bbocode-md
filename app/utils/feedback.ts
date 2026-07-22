/**
 * Pure builder for a feedback GitHub-issue payload — no Vue/Nuxt/DOM, so it is
 * unit-testable in the node vitest environment. Channel-agnostic: the returned
 * `{ title, body }` is POSTed by `useFeedback` to an external worker that opens
 * the issue in a PRIVATE bucket repo. The GitHub token lives in that worker,
 * NEVER in this SPA bundle (the bundle is world-readable).
 *
 * Privacy & agent-safety (feedback principles, see CLAUDE.md § Conventions):
 * the user's source markup is attached ONLY when they explicitly consent
 * (`includeSource`). The issue is read by a maintainer or an LLM triage agent,
 * so every embedded string is defended:
 *  - {@link sanitizeReportText} strips Trojan-Source bidi overrides, zero-width
 *    spaces, control codes AND invisible "ASCII-smuggling" ranges (Unicode Tag
 *    characters, Variation-Selector supplement) that could hide instructions
 *    from a human but reach an agent.
 *  - free-text (comment) is wrapped in a fenced block so it cannot inject live
 *    Markdown (@mentions, links, images, headings) into the issue.
 *  - single-line fields collapse line breaks; fence language tags are allow-listed.
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

/** Max code points of any single attached/embedded field (guard huge pastes). */
export const MAX_ATTACH_LEN = 20000

// Code-point ranges stripped from any user text embedded in the report. Kept as
// numeric ranges (not literal chars / regex escapes) so no invisible character
// ever lives in this source file.
//   C0/C1 controls except tab(09) LF(0A) CR(0D):  0000-0008, 000B-000C, 000E-001F, 007F-009F
//   Arabic letter mark:                            061C
//   zero-width space + LRM/RLM:                    200B, 200E-200F
//     (NOT ZWNJ U+200C / ZWJ U+200D — legit in emoji sequences & Persian/Arabic)
//   line / paragraph separators:                   2028-2029
//   bidi embeddings & overrides:                   202A-202E
//   bidi isolates:                                 2066-2069
//   BOM / ZWNBSP:                                  FEFF
//   Unicode Tag chars (ASCII smuggling):           E0000-E007F
//   Variation Selector supplement (smuggling):     E0100-E01EF
const STRIP_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x0008], [0x000b, 0x000c], [0x000e, 0x001f], [0x007f, 0x009f],
  [0x061c, 0x061c], [0x200b, 0x200b], [0x200e, 0x200f], [0x2028, 0x2029],
  [0x202a, 0x202e], [0x2066, 0x2069], [0xfeff, 0xfeff],
  [0xe0000, 0xe007f], [0xe0100, 0xe01ef]
]

function isStripped(code: number): boolean {
  return STRIP_RANGES.some(([lo, hi]) => code >= lo && code <= hi)
}

/**
 * Neutralise Trojan-Source bidi overrides, zero-width/smuggling characters and
 * control codes from text embedded in a Markdown issue body. Preserves ordinary
 * text, tab/newline, astral emoji and ZWJ/ZWNJ (legit joiners).
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

/**
 * Sanitise a value used on a single Markdown line (label, direction, meta):
 * also collapse any CR/LF so it cannot fake a new line / heading. (U+2028/2029
 * line separators are already removed by {@link sanitizeReportText}.)
 */
function sanitizeLine(text: string): string {
  return sanitizeReportText(text).replace(/[\r\n]+/g, ' ').trim()
}

/**
 * A fenced-code info string (language tag) must be a bare token — CommonMark
 * forbids backticks in it and a newline would break the fence. Allow-list.
 */
function sanitizeFormat(lang: string): string {
  return String(lang).replace(/[^A-Za-z0-9]/g, '')
}

/** True when a feedback endpoint is configured (non-blank). */
export function isFeedbackEnabled(url: string | undefined | null): boolean {
  return Boolean(url && String(url).trim().length > 0)
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

/** Truncate by CODE POINTS (not UTF-16 units) so a surrogate pair is never split. */
function truncate(text: string): { text: string, truncated: boolean } {
  const cp = [...text]
  if (cp.length <= MAX_ATTACH_LEN) return { text, truncated: false }
  return { text: cp.slice(0, MAX_ATTACH_LEN).join(''), truncated: true }
}

/**
 * Build a GitHub-issue `{ title, body }` from a feedback submission.
 * Deterministic and side-effect-free. User free-text never goes in the title
 * (safety/PII); the source markup is embedded only when `includeSource` is set.
 */
export function buildFeedbackIssue(input: FeedbackInput): FeedbackIssue {
  const { kind, comment, includeSource, context, meta } = input
  const direction = context?.direction ? sanitizeLine(context.direction) : ''

  const titleBase = kind === 'wrong-conversion' ? 'Wrong conversion' : 'Feedback'
  const title = direction ? `${titleBase}: ${direction}` : titleBase

  const lines: string[] = []
  lines.push(`**Kind:** ${kind}`)
  if (direction) lines.push(`**Direction:** ${direction}`)

  // Comment is fenced (not raw) so it cannot inject live Markdown — @mentions,
  // links, images, headings — into an issue a maintainer / triage agent reads.
  const cleanComment = comment ? truncate(sanitizeReportText(comment)).text.trim() : ''
  lines.push('', '**Comment:**', cleanComment ? fencedBlock(cleanComment) : '_(none)_')

  const hasPayload = Boolean(includeSource && (context?.source || context?.attachments?.length || context?.output))
  if (hasPayload && context) {
    if (context.source) {
      const src = truncate(sanitizeReportText(context.source))
      lines.push('', `**Source${src.truncated ? ' (truncated)' : ''}:**`, fencedBlock(src.text, sanitizeFormat(context.sourceFormat ?? '')))
    }
    for (const a of context.attachments ?? []) {
      const at = truncate(sanitizeReportText(a.content))
      lines.push('', `**${sanitizeLine(a.label)}${at.truncated ? ' (truncated)' : ''}:**`, fencedBlock(at.text, sanitizeFormat(a.format ?? '')))
    }
    if (context.output) {
      const out = truncate(sanitizeReportText(context.output))
      lines.push('', `**Produced output${out.truncated ? ' (truncated)' : ''}:**`, fencedBlock(out.text, sanitizeFormat(context.outputFormat ?? '')))
    }
  } else if (!includeSource) {
    lines.push('', '_Source markup not attached (no consent)._')
  }

  if (meta && Object.keys(meta).length) {
    lines.push('', '**Meta:**')
    for (const [k, v] of Object.entries(meta)) {
      lines.push(`- ${sanitizeLine(k)}: ${sanitizeLine(String(v))}`)
    }
  }

  return { title, body: lines.join('\n') }
}
