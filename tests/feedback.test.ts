import { describe, it, expect } from 'vitest'
import { sanitizeReportText, buildFeedbackIssue, isFeedbackEnabled, MAX_ATTACH_LEN } from '../app/utils/feedback'

// Construct dangerous invisibles from code points so no literal invisible
// character lives in this test file.
const RLO = String.fromCharCode(0x202e) // right-to-left override (Trojan-Source)
const ISOLATE = String.fromCharCode(0x2066) // bidi isolate
const ZWSP = String.fromCharCode(0x200b) // zero-width space
const BOM = String.fromCharCode(0xfeff) // BOM / ZWNBSP
const ALM = String.fromCharCode(0x061c) // Arabic letter mark
const NUL = String.fromCharCode(0x00) // C0 control
const NEL = String.fromCharCode(0x0085) // C1 control
const LSEP = String.fromCharCode(0x2028) // line separator
const BACK08 = String.fromCharCode(0x08) // C0 boundary (stripped)
const ZWJ = String.fromCharCode(0x200d) // zero-width joiner (legit)
const ZWNJ = String.fromCharCode(0x200c) // zero-width non-joiner (legit)
const TAG_A = String.fromCodePoint(0xe0041) // Unicode Tag 'A' (smuggling)
const VS = String.fromCodePoint(0xe0100) // Variation Selector supplement (smuggling)

describe('sanitizeReportText', () => {
  it('strips bidi overrides/isolates, zero-width, BOM, ALM, control and line separators', () => {
    expect(sanitizeReportText(`a${RLO}b${ISOLATE}c${ZWSP}d${BOM}e${ALM}f${NUL}g${NEL}h${LSEP}i`)).toBe('abcdefghi')
  })

  it('strips invisible ASCII-smuggling ranges (Unicode Tags, Variation Selectors)', () => {
    expect(sanitizeReportText(`hi${TAG_A}${VS}there`)).toBe('hithere')
  })

  it('preserves ZWJ/ZWNJ (legit emoji sequences and Persian/Arabic orthography)', () => {
    expect(sanitizeReportText(`a${ZWJ}b`)).toBe(`a${ZWJ}b`)
    expect(sanitizeReportText(`x${ZWNJ}y`)).toBe(`x${ZWNJ}y`)
  })

  it('keeps tab/newline/CR, ordinary text and astral emoji', () => {
    expect(sanitizeReportText('a\tb\nc\rd')).toBe('a\tb\nc\rd')
    expect(sanitizeReportText('привет 🌍 [b]x[/b]')).toBe('привет 🌍 [b]x[/b]')
  })

  it('strips 0x08 but keeps 0x09 tab (range boundary)', () => {
    expect(sanitizeReportText(`a${BACK08}b`)).toBe('ab')
    expect(sanitizeReportText('a\tb')).toBe('a\tb')
  })
})

describe('isFeedbackEnabled', () => {
  it('is true only for a non-blank endpoint', () => {
    expect(isFeedbackEnabled('https://w.example')).toBe(true)
    expect(isFeedbackEnabled('')).toBe(false)
    expect(isFeedbackEnabled('   ')).toBe(false)
    expect(isFeedbackEnabled(undefined)).toBe(false)
    expect(isFeedbackEnabled(null)).toBe(false)
  })
})

describe('buildFeedbackIssue', () => {
  it('never puts the comment in the title; title carries kind + direction', () => {
    const { title } = buildFeedbackIssue({
      kind: 'wrong-conversion',
      comment: 'secret text',
      context: { direction: 'bb->md' }
    })
    expect(title).toBe('Wrong conversion: bb->md')
    expect(title).not.toContain('secret')
  })

  it('collapses line breaks in single-line fields (direction, label, meta)', () => {
    const { title, body } = buildFeedbackIssue({
      kind: 'wrong-conversion',
      includeSource: true,
      context: { direction: 'bb\n# fake', attachments: [{ label: 'A\nB', content: 'x' }] },
      meta: { note: 'one\ntwo' }
    })
    expect(title).toBe('Wrong conversion: bb # fake')
    expect(body).toContain('**A B:**')
    expect(body).toContain('- note: one two')
  })

  it('fences the comment so it cannot inject live Markdown (@mentions/links/headings)', () => {
    const { body } = buildFeedbackIssue({
      kind: 'general',
      comment: '[x](https://evil) @team # Heading'
    })
    expect(body).toContain('```\n[x](https://evil) @team # Heading\n```')
  })

  it('omits the source when consent is not given', () => {
    const { body } = buildFeedbackIssue({
      kind: 'wrong-conversion',
      includeSource: false,
      context: { source: '[b]x[/b]', sourceFormat: 'bbcode' }
    })
    expect(body).toContain('not attached (no consent)')
    expect(body).not.toContain('[b]x[/b]')
  })

  it('embeds source and output in fenced blocks when consent is given', () => {
    const { body } = buildFeedbackIssue({
      kind: 'wrong-conversion',
      includeSource: true,
      context: { source: '[b]x[/b]', sourceFormat: 'bbcode', output: '**x**', outputFormat: 'markdown' }
    })
    expect(body).toContain('```bbcode\n[b]x[/b]\n```')
    expect(body).toContain('```markdown\n**x**\n```')
  })

  it('renders output even when there is no source (output-only)', () => {
    const { body } = buildFeedbackIssue({
      kind: 'wrong-conversion',
      includeSource: true,
      context: { output: '<b>x</b>', outputFormat: 'html' }
    })
    expect(body).toContain('**Produced output:**')
    expect(body).toContain('```html\n<b>x</b>\n```')
  })

  it('uses a longer fence so backticks in the source cannot break out', () => {
    const { body } = buildFeedbackIssue({
      kind: 'wrong-conversion',
      includeSource: true,
      context: { source: '```js\nalert(1)\n```', sourceFormat: 'markdown' }
    })
    expect(body).toContain('````markdown\n```js\nalert(1)\n```\n````')
  })

  it('allow-lists the fence language tag (no newline/backtick fence break)', () => {
    const { body } = buildFeedbackIssue({
      kind: 'wrong-conversion',
      includeSource: true,
      context: { source: 'hi', sourceFormat: 'md`\n# x' }
    })
    expect(body).toContain('```mdx\nhi\n```')
    expect(body).not.toContain('md`')
  })

  it('sanitizes embedded comment and source (invisibles stripped)', () => {
    const { body } = buildFeedbackIssue({
      kind: 'general',
      comment: `hi${RLO}there`,
      includeSource: true,
      context: { source: `x${ZWSP}y` }
    })
    expect(body).toContain('hithere')
    expect(body).toContain('xy')
    expect(body).not.toContain(RLO)
    expect(body).not.toContain(ZWSP)
  })

  it('renders labelled attachments (all editor panes) when consent is given', () => {
    const { body } = buildFeedbackIssue({
      kind: 'wrong-conversion',
      includeSource: true,
      context: {
        attachments: [
          { label: 'Markdown', format: 'markdown', content: '**x**' },
          { label: 'BBCode', format: 'bbcode', content: '[b]x[/b]' },
          { label: 'HTML', format: 'html', content: '<b>x</b>' }
        ]
      }
    })
    expect(body).toContain('**Markdown:**')
    expect(body).toContain('```markdown\n**x**\n```')
    expect(body).toContain('**BBCode:**')
    expect(body).toContain('**HTML:**')
  })

  it('shows the no-consent note when attachments exist but consent is withheld', () => {
    const { body } = buildFeedbackIssue({
      kind: 'wrong-conversion',
      includeSource: false,
      context: { attachments: [{ label: 'Markdown', content: '**x**' }] }
    })
    expect(body).toContain('not attached (no consent)')
    expect(body).not.toContain('**x**')
  })

  it('does not crash and titles "Feedback" on fully empty input', () => {
    const { title, body } = buildFeedbackIssue({ kind: 'general' })
    expect(title).toBe('Feedback')
    expect(body).toContain('**Comment:**')
    expect(body).toContain('_(none)_')
  })

  it('does not truncate at exactly MAX_ATTACH_LEN, truncates past it', () => {
    const exact = 'a'.repeat(MAX_ATTACH_LEN)
    const b1 = buildFeedbackIssue({ kind: 'wrong-conversion', includeSource: true, context: { source: exact } })
    expect(b1.body).not.toContain('(truncated)')
    expect(b1.body).toContain(exact)

    const over = 'a'.repeat(MAX_ATTACH_LEN + 1)
    const b2 = buildFeedbackIssue({ kind: 'wrong-conversion', includeSource: true, context: { source: over } })
    expect(b2.body).toContain('Source (truncated)')
    expect(b2.body).toContain('a'.repeat(MAX_ATTACH_LEN))
    expect(b2.body).not.toContain('a'.repeat(MAX_ATTACH_LEN + 1))
  })

  it('truncates by code points — never splits a surrogate pair', () => {
    // MAX 'a's + one astral emoji = MAX+1 code points → emoji dropped whole.
    const src = 'a'.repeat(MAX_ATTACH_LEN) + '🌍'
    const { body } = buildFeedbackIssue({ kind: 'wrong-conversion', includeSource: true, context: { source: src } })
    expect(body).toContain('(truncated)')
    expect(body).not.toContain('🌍')
    expect(body).not.toContain('�') // no replacement char from a split surrogate
  })

  it('sanitizes meta keys and values', () => {
    const { body } = buildFeedbackIssue({
      kind: 'general',
      meta: { locale: 'ru', [`mo${ZWSP}de`]: `stand${RLO}alone` }
    })
    expect(body).toContain('- locale: ru')
    expect(body).toContain('- mode: standalone')
  })
})
