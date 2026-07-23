import { describe, it, expect } from 'vitest'
import { bbcodeToMd } from '../app/utils/bbcode-to-md'

describe('bbcodeToMd — basic tags', () => {
  it('bold', () => {
    expect(bbcodeToMd('[b]Hello[/b]')).toBe('**Hello**')
  })

  it('italic', () => {
    expect(bbcodeToMd('[i]Hi[/i]')).toBe('*Hi*')
  })

  it('strikethrough', () => {
    expect(bbcodeToMd('[s]old[/s]')).toBe('~~old~~')
  })

  it('underline → <u>', () => {
    expect(bbcodeToMd('[u]u[/u]')).toBe('<u>u</u>')
  })

  it('url with text', () => {
    expect(bbcodeToMd('[url=https://x.com]X[/url]')).toBe('[X](https://x.com)')
  })

  it('url plain (autolink)', () => {
    expect(bbcodeToMd('[url]https://x.com[/url]')).toBe('<https://x.com>')
  })

  it('img', () => {
    expect(bbcodeToMd('[img]https://x.com/a.png[/img]')).toBe('![](https://x.com/a.png)')
  })

  it('inline code', () => {
    expect(bbcodeToMd('[code]x[/code]')).toBe('`x`')
  })

  it('fenced code with lang', () => {
    expect(bbcodeToMd('[code lang=js]const a=1;\nconst b=2;[/code]'))
      .toBe('```js\nconst a=1;\nconst b=2;\n```')
  })

  it('fenced code with primary lang attr', () => {
    expect(bbcodeToMd('[code=ts]const x: number = 1[/code]'))
      .toBe('```ts\nconst x: number = 1\n```')
  })

  it('quote', () => {
    expect(bbcodeToMd('[quote]hi[/quote]')).toBe('> hi')
  })

  it('quote multiline', () => {
    expect(bbcodeToMd('[quote]a\nb[/quote]')).toBe('> a\n> b')
  })

  it('unordered list', () => {
    expect(bbcodeToMd('[list][*]a[*]b[/list]')).toBe('- a\n- b')
  })

  it('ordered list', () => {
    expect(bbcodeToMd('[list=1][*]a[*]b[/list]')).toBe('1. a\n2. b')
  })

  it('headings h1-h6', () => {
    expect(bbcodeToMd('[h1]T[/h1]')).toBe('# T')
    expect(bbcodeToMd('[h2]T[/h2]')).toBe('## T')
    expect(bbcodeToMd('[h3]T[/h3]')).toBe('### T')
    expect(bbcodeToMd('[h4]T[/h4]')).toBe('#### T')
    expect(bbcodeToMd('[h5]T[/h5]')).toBe('##### T')
    expect(bbcodeToMd('[h6]T[/h6]')).toBe('###### T')
  })

  it('hr', () => {
    expect(bbcodeToMd('[hr]')).toBe('---')
  })

  it('nested bold+italic', () => {
    expect(bbcodeToMd('[b][i]x[/i][/b]')).toBe('***x***')
  })

  it('list with formatted items', () => {
    expect(bbcodeToMd('[list][*][b]a[/b][*][i]b[/i][/list]')).toBe('- **a**\n- *b*')
  })

  it('empty input', () => {
    expect(bbcodeToMd('')).toBe('')
  })

  it('plain text passthrough', () => {
    expect(bbcodeToMd('just text')).toBe('just text')
  })

  it('unknown tag emits as text', () => {
    expect(bbcodeToMd('[unknown]x[/unknown]')).toBe('[unknown]x[/unknown]')
  })

  it('unclosed tag — graceful', () => {
    expect(bbcodeToMd('[b]hi')).toBe('**hi**')
  })
})

describe('bbcodeToMd — color / size / font (→ <span style>)', () => {
  it('color', () => {
    expect(bbcodeToMd('[color=red]x[/color]')).toBe('<span style="color:red">x</span>')
  })
  it('color hex', () => {
    expect(bbcodeToMd('[color=#ff0000]x[/color]')).toBe('<span style="color:#ff0000">x</span>')
  })
  it('size → px', () => {
    expect(bbcodeToMd('[size=14]x[/size]')).toBe('<span style="font-size:14px">x</span>')
  })
  it('size non-numeric → unwrapped', () => {
    expect(bbcodeToMd('[size=big]x[/size]')).toBe('x')
  })
  it('font', () => {
    expect(bbcodeToMd('[font=Arial]x[/font]')).toBe('<span style="font-family:Arial">x</span>')
  })
  it('font with spaces (quoted)', () => {
    expect(bbcodeToMd('[font="Times New Roman"]x[/font]')).toBe('<span style="font-family:Times New Roman">x</span>')
  })
  it('nested formatting inside color', () => {
    expect(bbcodeToMd('[color=red][b]x[/b][/color]')).toBe('<span style="color:red">**x**</span>')
  })
})

describe('bbcodeToMd — entity mentions (→ <span data-bb-*>)', () => {
  it('user', () => {
    expect(bbcodeToMd('[USER=123]John[/USER]')).toBe('<span data-bb-user="123">John</span>')
  })
  it('department', () => {
    expect(bbcodeToMd('[DEPARTMENT=5]Sales[/DEPARTMENT]')).toBe('<span data-bb-dept="5">Sales</span>')
  })
  it('interactive IM-bot tags send/put/call → data-bb spans', () => {
    expect(bbcodeToMd('[SEND=/help]Помощь[/SEND]')).toBe('<span data-bb-send="/help">Помощь</span>')
    expect(bbcodeToMd('[PUT=/search]Поиск[/PUT]')).toBe('<span data-bb-put="/search">Поиск</span>')
    expect(bbcodeToMd('[CALL=+79161234567]Позвонить[/CALL]')).toBe('<span data-bb-call="+79161234567">Позвонить</span>')
  })
  it('quoted interactive value preserves spaces', () => {
    expect(bbcodeToMd('[PUT="/search "]Поиск[/PUT]')).toBe('<span data-bb-put="/search ">Поиск</span>')
  })
  it('user without id → unwrapped', () => {
    expect(bbcodeToMd('[USER]John[/USER]')).toBe('John')
  })
})
