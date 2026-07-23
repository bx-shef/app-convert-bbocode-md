import { describe, it, expect } from 'vitest'
import { htmlToMd } from '../app/utils/html-to-md'

describe('htmlToMd — inline', () => {
  it('bold (b and strong)', () => {
    expect(htmlToMd('<b>x</b>')).toBe('**x**')
    expect(htmlToMd('<strong>x</strong>')).toBe('**x**')
  })
  it('italic (i and em)', () => {
    expect(htmlToMd('<i>x</i>')).toBe('*x*')
    expect(htmlToMd('<em>x</em>')).toBe('*x*')
  })
  it('underline → <u>', () => {
    expect(htmlToMd('<u>u</u>')).toBe('<u>u</u>')
  })
  it('strikethrough (s, del, strike)', () => {
    expect(htmlToMd('<s>x</s>')).toBe('~~x~~')
    expect(htmlToMd('<del>x</del>')).toBe('~~x~~')
    expect(htmlToMd('<strike>x</strike>')).toBe('~~x~~')
  })
  it('link with text', () => {
    expect(htmlToMd('<a href="https://x.com">X</a>')).toBe('[X](https://x.com)')
  })
  it('link where text equals href → autolink', () => {
    expect(htmlToMd('<a href="https://x.com">https://x.com</a>')).toBe('<https://x.com>')
  })
  it('image with alt', () => {
    expect(htmlToMd('<img src="https://x/a.png" alt="alt">')).toBe('![alt](https://x/a.png)')
  })
  it('inline code', () => {
    expect(htmlToMd('<code>x</code>')).toBe('`x`')
  })
  it('mixed inline in a paragraph', () => {
    expect(htmlToMd('<p>a <b>b</b> c</p>')).toBe('a **b** c')
  })
  it('line break', () => {
    expect(htmlToMd('line<br>break')).toBe('line\nbreak')
  })
})

describe('htmlToMd — blocks', () => {
  it('paragraphs', () => {
    expect(htmlToMd('<p>a</p><p>b</p>')).toBe('a\n\nb')
  })
  it('headings', () => {
    expect(htmlToMd('<h2>Title</h2>')).toBe('## Title')
  })
  it('hr', () => {
    expect(htmlToMd('<hr>')).toBe('---')
  })
  it('unordered list', () => {
    expect(htmlToMd('<ul><li>a</li><li>b</li></ul>')).toBe('- a\n- b')
  })
  it('ordered list', () => {
    expect(htmlToMd('<ol><li>a</li><li>b</li></ol>')).toBe('1. a\n2. b')
  })
  it('blockquote', () => {
    expect(htmlToMd('<blockquote><p>hi</p></blockquote>')).toBe('> hi')
  })
  it('fenced code with language class', () => {
    expect(htmlToMd('<pre><code class="language-js">const a=1\n</code></pre>'))
      .toBe('```js\nconst a=1\n```')
  })
  it('table with header', () => {
    expect(htmlToMd('<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>'))
      .toBe('| A | B |\n| --- | --- |\n| 1 | 2 |')
  })
})

describe('htmlToMd — robustness', () => {
  it('unwraps wrapper tags (div)', () => {
    expect(htmlToMd('<div><p>hi</p></div>')).toBe('hi')
  })
  it('drops <script> content', () => {
    expect(htmlToMd('<p>ok</p><script>bad()</script>')).toBe('ok')
  })
  it('decodes entities', () => {
    expect(htmlToMd('<p>a &amp; b &lt;c&gt;</p>')).toBe('a & b <c>')
  })
  it('collapses insignificant whitespace between block tags', () => {
    expect(htmlToMd('<p>a</p>\n\n   <p>b</p>')).toBe('a\n\nb')
  })
  it('empty / whitespace input', () => {
    expect(htmlToMd('')).toBe('')
    expect(htmlToMd('   ')).toBe('')
  })
  it('preserves span color/size/font style', () => {
    expect(htmlToMd('<span style="color:red">x</span>')).toBe('<span style="color:red">x</span>')
  })
  it('unwraps span without recognized style', () => {
    expect(htmlToMd('<span style="position:fixed">x</span>')).toBe('x')
    expect(htmlToMd('<span>x</span>')).toBe('x')
  })
  it('preserves entity-mention data attributes', () => {
    expect(htmlToMd('<span data-bb-user="123">John</span>')).toBe('<span data-bb-user="123">John</span>')
  })
  it('preserves interactive IM-bot data attributes', () => {
    expect(htmlToMd('<span data-bb-send="/help">Go</span>')).toBe('<span data-bb-send="/help">Go</span>')
    expect(htmlToMd('<span data-bb-call="+7911">Call</span>')).toBe('<span data-bb-call="+7911">Call</span>')
  })
})
