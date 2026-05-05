import { describe, it, expect } from 'vitest'
import { mdToBbcode } from '../app/utils/md-to-bbcode'

describe('mdToBbcode — basic', () => {
  it('bold', () => {
    expect(mdToBbcode('**Hello**')).toBe('[b]Hello[/b]')
  })

  it('italic', () => {
    expect(mdToBbcode('*Hi*')).toBe('[i]Hi[/i]')
  })

  it('strikethrough', () => {
    expect(mdToBbcode('~~old~~')).toBe('[s]old[/s]')
  })

  it('underline via <u>', () => {
    expect(mdToBbcode('<u>u</u>')).toBe('[u]u[/u]')
  })

  it('link with text', () => {
    expect(mdToBbcode('[X](https://x.com)')).toBe('[url=https://x.com]X[/url]')
  })

  it('autolink', () => {
    expect(mdToBbcode('<https://x.com>')).toBe('[url]https://x.com[/url]')
  })

  it('image', () => {
    expect(mdToBbcode('![](https://x.com/a.png)')).toBe('[img]https://x.com/a.png[/img]')
  })

  it('inline code', () => {
    expect(mdToBbcode('`x`')).toBe('[code]x[/code]')
  })

  it('fenced code with lang', () => {
    expect(mdToBbcode('```js\nconst a=1;\nconst b=2;\n```'))
      .toBe('[code lang=js]const a=1;\nconst b=2;[/code]')
  })

  it('fenced code without lang', () => {
    expect(mdToBbcode('```\nplain\n```'))
      .toBe('[code]plain[/code]')
  })

  it('blockquote', () => {
    expect(mdToBbcode('> hi')).toBe('[quote]hi[/quote]')
  })

  it('blockquote multiline', () => {
    expect(mdToBbcode('> a\n> b')).toBe('[quote]a\nb[/quote]')
  })

  it('unordered list', () => {
    expect(mdToBbcode('- a\n- b')).toBe('[list]\n[*]a\n[*]b\n[/list]')
  })

  it('ordered list', () => {
    expect(mdToBbcode('1. a\n2. b')).toBe('[list=1]\n[*]a\n[*]b\n[/list]')
  })

  it('headings h1-h6', () => {
    expect(mdToBbcode('# T')).toBe('[h1]T[/h1]')
    expect(mdToBbcode('## T')).toBe('[h2]T[/h2]')
    expect(mdToBbcode('### T')).toBe('[h3]T[/h3]')
    expect(mdToBbcode('#### T')).toBe('[h4]T[/h4]')
    expect(mdToBbcode('##### T')).toBe('[h5]T[/h5]')
    expect(mdToBbcode('###### T')).toBe('[h6]T[/h6]')
  })

  it('hr', () => {
    expect(mdToBbcode('---')).toBe('[hr]')
  })

  it('nested bold+italic (markdown-it parses *** as em>strong)', () => {
    expect(mdToBbcode('***x***')).toBe('[i][b]x[/b][/i]')
  })

  it('list with formatted items', () => {
    expect(mdToBbcode('- **a**\n- *b*')).toBe('[list]\n[*][b]a[/b]\n[*][i]b[/i]\n[/list]')
  })

  it('empty input', () => {
    expect(mdToBbcode('')).toBe('')
  })

  it('plain text', () => {
    expect(mdToBbcode('just text')).toBe('just text')
  })
})
