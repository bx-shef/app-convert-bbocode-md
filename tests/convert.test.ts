import { describe, it, expect } from 'vitest'
import { convert, toMarkdown, fromMarkdown } from '../app/utils/convert'

describe('convert — facade across formats (Markdown pivot)', () => {
  it('bb → html', () => {
    expect(convert('bb', 'html', '[b]x[/b]')).toBe('<p><strong>x</strong></p>')
  })
  it('html → bb', () => {
    expect(convert('html', 'bb', '<p><strong>x</strong></p>')).toBe('[b]x[/b]')
  })
  it('bb → md', () => {
    expect(convert('bb', 'md', '[i]x[/i]')).toBe('*x*')
  })
  it('html → md', () => {
    expect(convert('html', 'md', '<em>x</em>')).toBe('*x*')
  })
  it('bb color → html span', () => {
    expect(convert('bb', 'html', '[color=red]x[/color]')).toBe('<p><span style="color:red">x</span></p>')
  })
  it('html span → bb color', () => {
    expect(convert('html', 'bb', '<span style="color:red">x</span>')).toBe('[color=red]x[/color]')
  })
  it('same format is identity', () => {
    expect(convert('md', 'md', '**x**')).toBe('**x**')
  })
  it('chatMode flows through to bb tables', () => {
    const html = '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>'
    expect(convert('html', 'bb', html, { chatMode: true }))
      .toBe('[list]\n[*][b]A | B[/b]\n[*]1 | 2\n[/list]')
  })
  it('toMarkdown / fromMarkdown primitives', () => {
    expect(toMarkdown('bb', '[s]x[/s]')).toBe('~~x~~')
    expect(fromMarkdown('html', '# T')).toBe('<h1>T</h1>')
  })
})

describe('roundtrip MD → HTML → MD', () => {
  const cases = [
    '**Hello**',
    '*Hi*',
    '~~old~~',
    '<u>u</u>',
    '[X](https://x.com)',
    '![alt](https://x.com/a.png)',
    '# T',
    '## Heading',
    '---',
    '`code`',
    '> quote',
    '- a\n- b',
    '1. a\n2. b',
    '| A | B |\n| --- | --- |\n| 1 | 2 |'
  ]
  for (const c of cases) {
    it(`stable: ${JSON.stringify(c)}`, () => {
      expect(htmlRoundtrip(c)).toBe(c)
    })
  }
})

function htmlRoundtrip(md: string): string {
  return convert('html', 'md', convert('md', 'html', md))
}
