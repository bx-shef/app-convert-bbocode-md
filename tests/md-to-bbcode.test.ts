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

describe('mdToBbcode — raw HTML does not leak', () => {
  it('inline b/strong → [b]', () => {
    expect(mdToBbcode('<b>x</b>')).toBe('[b]x[/b]')
    expect(mdToBbcode('<strong>x</strong>')).toBe('[b]x[/b]')
  })
  it('inline i/em → [i]', () => {
    expect(mdToBbcode('<em>x</em>')).toBe('[i]x[/i]')
  })
  it('inline s/del → [s]', () => {
    expect(mdToBbcode('<del>x</del>')).toBe('[s]x[/s]')
  })
  it('inline <br> → newline', () => {
    expect(mdToBbcode('a<br>b')).toBe('a\nb')
  })
  it('block <ul> → [list]', () => {
    expect(mdToBbcode('<ul>\n<li>a</li>\n<li>b</li>\n</ul>'))
      .toBe('[list]\n[*]a\n[*]b\n[/list]')
  })
  it('block <table> → [table]', () => {
    expect(mdToBbcode('<table><tr><th>A</th></tr><tr><td>1</td></tr></table>'))
      .toBe('[table]\n[tr][th]A[/th][/tr]\n[tr][td]1[/td][/tr]\n[/table]')
  })
})

describe('mdToBbcode — span style → color/size/font', () => {
  it('color', () => {
    expect(mdToBbcode('<span style="color:red">x</span>')).toBe('[color=red]x[/color]')
  })
  it('font-size → [size]', () => {
    expect(mdToBbcode('<span style="font-size:14px">x</span>')).toBe('[size=14]x[/size]')
  })
  it('font-family → [font]', () => {
    expect(mdToBbcode('<span style="font-family:Arial">x</span>')).toBe('[font=Arial]x[/font]')
  })
  it('font-family with spaces → quoted', () => {
    expect(mdToBbcode('<span style="font-family:Times New Roman">x</span>'))
      .toBe('[font="Times New Roman"]x[/font]')
  })
  it('multiple styles nest, close in reverse', () => {
    expect(mdToBbcode('<span style="color:red;font-size:14px">x</span>'))
      .toBe('[color=red][size=14]x[/size][/color]')
  })
  it('span without recognized style is dropped (inner kept)', () => {
    expect(mdToBbcode('<span style="position:fixed">x</span>')).toBe('x')
  })
})
