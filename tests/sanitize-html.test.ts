import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '../app/utils/sanitize-html'

describe('sanitizeHtml', () => {
  it('keeps allow-listed tags', () => {
    expect(sanitizeHtml('<b>x</b>')).toBe('<b>x</b>')
    expect(sanitizeHtml('<u>u</u>')).toBe('<u>u</u>')
    expect(sanitizeHtml('<p>a <em>b</em></p>')).toBe('<p>a <em>b</em></p>')
  })

  it('drops <script> entirely (content too)', () => {
    expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>')
  })

  it('drops <style> entirely', () => {
    expect(sanitizeHtml('<style>body{}</style><b>x</b>')).toBe('<b>x</b>')
  })

  it('unwraps unknown tags but keeps their text', () => {
    expect(sanitizeHtml('<div class="z"><b>y</b></div>')).toBe('<b>y</b>')
    expect(sanitizeHtml('<span>plain</span>')).toBe('plain')
  })

  it('strips event-handler and other non-allowed attributes', () => {
    expect(sanitizeHtml('<p onclick="evil()">hi</p>')).toBe('<p>hi</p>')
  })

  it('drops javascript: URLs but keeps the tag', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>')
  })

  it('keeps safe http(s) links', () => {
    expect(sanitizeHtml('<a href="https://x.com" title="t">x</a>'))
      .toBe('<a href="https://x.com" title="t">x</a>')
  })

  it('handles void img and drops onerror', () => {
    expect(sanitizeHtml('<img src="https://x/a.png" alt="a" onerror="x()">'))
      .toBe('<img src="https://x/a.png" alt="a">')
  })

  it('re-escapes text entities', () => {
    expect(sanitizeHtml('a &amp; b &lt;c&gt;')).toBe('a &amp; b &lt;c&gt;')
  })

  it('empty input', () => {
    expect(sanitizeHtml('')).toBe('')
  })
})
