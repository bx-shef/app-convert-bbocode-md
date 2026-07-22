import { describe, it, expect } from 'vitest'
import { sanitizeReportText, buildFeedbackIssue, MAX_ATTACH_LEN } from '../app/utils/feedback'

// Construct the dangerous invisibles from code points so no literal invisible
// character lives in this test file.
const RLO = String.fromCharCode(0x202e) // right-to-left override (Trojan-Source)
const ZWSP = String.fromCharCode(0x200b) // zero-width space
const BOM = String.fromCharCode(0xfeff) // BOM / ZWNBSP
const NUL = String.fromCharCode(0x00) // C0 control

describe('sanitizeReportText', () => {
  it('strips Trojan-Source bidi, zero-width, BOM and control chars', () => {
    expect(sanitizeReportText(`a${RLO}b${ZWSP}c${BOM}d${NUL}e`)).toBe('abcde')
  })

  it('keeps tab, newline and carriage return', () => {
    expect(sanitizeReportText('a\tb\nc\rd')).toBe('a\tb\nc\rd')
  })

  it('leaves ordinary text and astral emoji intact', () => {
    expect(sanitizeReportText('привет 🌍 [b]x[/b]')).toBe('привет 🌍 [b]x[/b]')
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

  it('uses a longer fence so backticks in the source cannot break out', () => {
    const { body } = buildFeedbackIssue({
      kind: 'wrong-conversion',
      includeSource: true,
      context: { source: '```js\nalert(1)\n```', sourceFormat: 'markdown' }
    })
    // source has a run of 3 backticks → fence must be >= 4 backticks
    expect(body).toContain('````markdown\n```js\nalert(1)\n```\n````')
  })

  it('sanitizes embedded comment and source', () => {
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

  it('truncates over-long attachments', () => {
    const { body } = buildFeedbackIssue({
      kind: 'wrong-conversion',
      includeSource: true,
      context: { source: 'a'.repeat(MAX_ATTACH_LEN + 100) }
    })
    expect(body).toContain('Source (truncated)')
    expect(body).not.toContain('a'.repeat(MAX_ATTACH_LEN + 1))
  })

  it('renders safe meta lines', () => {
    const { body } = buildFeedbackIssue({
      kind: 'general',
      meta: { locale: 'ru', mode: 'standalone' }
    })
    expect(body).toContain('- locale: ru')
    expect(body).toContain('- mode: standalone')
  })
})
