import { describe, it, expect } from 'vitest'
import { bbcodeToMd } from '../app/utils/bbcode-to-md'
import { mdToBbcode } from '../app/utils/md-to-bbcode'

describe('roundtrip BBCode → MD → BBCode', () => {
  const cases = [
    '[b]Hello[/b]',
    '[i]Hi[/i]',
    '[s]old[/s]',
    '[u]u[/u]',
    '[url=https://x.com]X[/url]',
    '[img]https://x.com/a.png[/img]',
    '[h1]T[/h1]',
    '[h3]Heading[/h3]',
    '[hr]'
  ]
  for (const c of cases) {
    it(`stable: ${c}`, () => {
      expect(mdToBbcode(bbcodeToMd(c))).toBe(c)
    })
  }
})

describe('roundtrip MD → BBCode → MD', () => {
  const cases = [
    '**Hello**',
    '*Hi*',
    '~~old~~',
    '<u>u</u>',
    '[X](https://x.com)',
    '![](https://x.com/a.png)',
    '# T',
    '#### Heading',
    '---'
  ]
  for (const c of cases) {
    it(`stable: ${c}`, () => {
      expect(bbcodeToMd(mdToBbcode(c))).toBe(c)
    })
  }
})

describe('roundtrip lists', () => {
  it('unordered', () => {
    const bb = '[list]\n[*]a\n[*]b\n[/list]'
    expect(mdToBbcode(bbcodeToMd(bb))).toBe(bb)
  })
  it('ordered', () => {
    const bb = '[list=1]\n[*]a\n[*]b\n[/list]'
    expect(mdToBbcode(bbcodeToMd(bb))).toBe(bb)
  })
})

describe('roundtrip code', () => {
  it('inline', () => {
    expect(mdToBbcode(bbcodeToMd('[code]x[/code]'))).toBe('[code]x[/code]')
  })
  it('fenced with lang', () => {
    const bb = '[code lang=js]const a=1;\nconst b=2;[/code]'
    expect(mdToBbcode(bbcodeToMd(bb))).toBe(bb)
  })
})
