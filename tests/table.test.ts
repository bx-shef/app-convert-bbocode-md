import { describe, it, expect } from 'vitest'
import { bbcodeToMd } from '../app/utils/bbcode-to-md'
import { mdToBbcode } from '../app/utils/md-to-bbcode'

describe('bbcodeToMd — table (default = GFM)', () => {
  it('header + row', () => {
    const bb = '[table][tr][th]A[/th][th]B[/th][/tr][tr][td]1[/td][td]2[/td][/tr][/table]'
    expect(bbcodeToMd(bb)).toBe('| A | B |\n| --- | --- |\n| 1 | 2 |')
  })

  it('no header → empty header row', () => {
    const bb = '[table][tr][td]1[/td][td]2[/td][/tr][/table]'
    expect(bbcodeToMd(bb)).toBe('|  |  |\n| --- | --- |\n| 1 | 2 |')
  })
})

describe('bbcodeToMd — table chatMode', () => {
  it('table → bullet list', () => {
    const bb = '[table][tr][th]A[/th][th]B[/th][/tr][tr][td]1[/td][td]2[/td][/tr][/table]'
    expect(bbcodeToMd(bb, { chatMode: true })).toBe('- **A | B**\n- 1 | 2')
  })
})

describe('mdToBbcode — table (default)', () => {
  it('GFM table → [table]', () => {
    const md = '| A | B |\n| --- | --- |\n| 1 | 2 |'
    expect(mdToBbcode(md)).toBe(
      '[table]\n[tr][th]A[/th][th]B[/th][/tr]\n[tr][td]1[/td][td]2[/td][/tr]\n[/table]'
    )
  })
})

describe('mdToBbcode — table chatMode', () => {
  it('GFM table → bullet list', () => {
    const md = '| A | B |\n| --- | --- |\n| 1 | 2 |'
    expect(mdToBbcode(md, { chatMode: true })).toBe(
      '[list]\n[*][b]A | B[/b]\n[*]1 | 2\n[/list]'
    )
  })
})

describe('roundtrip table (default)', () => {
  it('BBCode → MD → BBCode', () => {
    const bb = '[table]\n[tr][th]A[/th][th]B[/th][/tr]\n[tr][td]1[/td][td]2[/td][/tr]\n[/table]'
    expect(mdToBbcode(bbcodeToMd(bb))).toBe(bb)
  })
})
