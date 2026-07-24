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

  it('drops other dangerous URL schemes on href (data/vbscript/file)', () => {
    expect(sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')).toBe('<a>x</a>')
    expect(sanitizeHtml('<a href="vbscript:msgbox(1)">x</a>')).toBe('<a>x</a>')
    expect(sanitizeHtml('<a href="file:///etc/passwd">x</a>')).toBe('<a>x</a>')
  })

  it('catches a scheme hidden by control chars (java\\tscript:)', () => {
    expect(sanitizeHtml('<a href="java\tscript:alert(1)">x</a>')).toBe('<a>x</a>')
  })

  it('applies the URL-scheme guard to img src too', () => {
    expect(sanitizeHtml('<img src="javascript:alert(1)">')).toBe('<img>')
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

  it('keeps span with safe style (color/size/font)', () => {
    expect(sanitizeHtml('<span style="color:red">x</span>')).toBe('<span style="color:red">x</span>')
    expect(sanitizeHtml('<span style="font-size:14px">x</span>')).toBe('<span style="font-size:14px">x</span>')
  })

  it('drops disallowed style props, keeps allowed ones', () => {
    expect(sanitizeHtml('<span style="color:red;position:fixed">x</span>'))
      .toBe('<span style="color:red">x</span>')
  })

  it('drops dangerous style values (url/expression) → span unwrapped', () => {
    expect(sanitizeHtml('<span style="background-color:url(javascript:alert(1))">x</span>'))
      .toBe('x')
  })

  it('keeps entity-mention data attributes on span', () => {
    expect(sanitizeHtml('<span data-bb-user="123">John</span>')).toBe('<span data-bb-user="123">John</span>')
    expect(sanitizeHtml('<span data-bb-dept="5">Sales</span>')).toBe('<span data-bb-dept="5">Sales</span>')
    expect(sanitizeHtml('<span data-bb-send="/help">Go</span>')).toBe('<span data-bb-send="/help">Go</span>')
    expect(sanitizeHtml('<span data-bb-put="/x">P</span>')).toBe('<span data-bb-put="/x">P</span>')
    expect(sanitizeHtml('<span data-bb-call="+7911">Call</span>')).toBe('<span data-bb-call="+7911">Call</span>')
  })
  it('drops event handlers on interactive-tag spans (allow-list is the barrier)', () => {
    expect(sanitizeHtml('<span data-bb-send="/x" onmouseover="alert(1)">t</span>')).toBe('<span data-bb-send="/x">t</span>')
  })
})
