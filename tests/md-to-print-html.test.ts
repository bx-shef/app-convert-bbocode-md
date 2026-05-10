import { describe, it, expect } from 'vitest'
import { mdToPrintHtml } from '../app/utils/md-to-print-html'

describe('mdToPrintHtml', () => {
  it('wraps output in a full HTML document', () => {
    const html = mdToPrintHtml('hi')
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('</html>')
  })

  it('embeds print CSS with @page A4', () => {
    const html = mdToPrintHtml('x')
    expect(html).toMatch(/<style>[\s\S]*@page[\s\S]*size: A4[\s\S]*<\/style>/)
  })

  it('uses provided title (escaped)', () => {
    const html = mdToPrintHtml('x', { title: 'My <Doc> & "stuff"' })
    expect(html).toContain('<title>My &lt;Doc&gt; &amp; &quot;stuff&quot;</title>')
  })

  it('falls back to "Document" title when not provided', () => {
    expect(mdToPrintHtml('x')).toContain('<title>Document</title>')
  })

  it('renders headings', () => {
    const html = mdToPrintHtml('# Title\n## Sub')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<h2>Sub</h2>')
  })

  it('renders inline and fenced code', () => {
    const html = mdToPrintHtml('Use `npm` to install\n\n```js\nconst x = 1\n```')
    expect(html).toContain('<code>npm</code>')
    expect(html).toMatch(/<pre><code[^>]*>const x = 1\n<\/code><\/pre>/)
  })

  it('renders tables', () => {
    const html = mdToPrintHtml('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table>')
    expect(html).toContain('<th>a</th>')
    expect(html).toContain('<td>1</td>')
  })

  it('renders bullet and ordered lists', () => {
    const html = mdToPrintHtml('- one\n- two\n\n1. a\n2. b')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>one</li>')
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>a</li>')
  })

  it('renders links', () => {
    const html = mdToPrintHtml('[X](https://x.com)')
    expect(html).toContain('<a href="https://x.com">X</a>')
  })

  it('preserves Cyrillic content', () => {
    const html = mdToPrintHtml('# Привет\n\nМир и **жирный** текст.')
    expect(html).toContain('<h1>Привет</h1>')
    expect(html).toContain('<strong>жирный</strong>')
  })

  it('escapes raw HTML in input (html: false)', () => {
    const html = mdToPrintHtml('<script>alert(1)</script>')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('handles empty input gracefully', () => {
    const html = mdToPrintHtml('')
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toMatch(/<body>\s*<\/body>/)
  })
})
