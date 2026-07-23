import { describe, it, expect } from 'vitest'
import { mdToHtml } from '../app/utils/md-to-html'

describe('mdToHtml', () => {
  it('renders a fragment (no document wrapper)', () => {
    const html = mdToHtml('hi')
    expect(html).toBe('<p>hi</p>')
    expect(html).not.toContain('<!DOCTYPE')
    expect(html).not.toContain('<html')
  })

  it('bold / italic / strike', () => {
    expect(mdToHtml('**b**')).toBe('<p><strong>b</strong></p>')
    expect(mdToHtml('*i*')).toBe('<p><em>i</em></p>')
    expect(mdToHtml('~~s~~')).toBe('<p><s>s</s></p>')
  })

  it('headings and hr', () => {
    expect(mdToHtml('# T')).toBe('<h1>T</h1>')
    expect(mdToHtml('---')).toBe('<hr>')
  })

  it('passes the <u> underline fallback through (html: true)', () => {
    expect(mdToHtml('<u>u</u>')).toBe('<p><u>u</u></p>')
  })

  it('does not auto-link bare URLs (linkify: false)', () => {
    expect(mdToHtml('see https://x.com')).toBe('<p>see https://x.com</p>')
  })

  it('explicit links become anchors', () => {
    expect(mdToHtml('[X](https://x.com)')).toBe('<p><a href="https://x.com">X</a></p>')
  })

  // markdown-it 14.3 (CommonMark 6.7): 2+ trailing spaces OR a backslash before
  // a newline are hard breaks → <br>. Guards this for the preview/print HTML
  // path; md-to-bbcode collapses soft/hard breaks to the same '\n', so the
  // BBCode direction is unaffected.
  it('renders hard line breaks as <br> (markdown-it 14.3 / CommonMark 6.7)', () => {
    expect(mdToHtml('a  \nb')).toBe('<p>a<br>\nb</p>')
    expect(mdToHtml('a\\\nb')).toBe('<p>a<br>\nb</p>')
  })

  it('empty input', () => {
    expect(mdToHtml('')).toBe('')
  })
})
