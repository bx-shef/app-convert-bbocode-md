import { describe, it, expect } from 'vitest'
import { parseBBCode } from '../app/utils/bbcode-parser'

describe('parseBBCode — AST basics', () => {
  it('parses a known tag into a tag node', () => {
    expect(parseBBCode('[b]hi[/b]')).toEqual([
      { type: 'tag', name: 'b', attrs: {}, children: [{ type: 'text', value: 'hi' }] }
    ])
  })

  it('lowercases tag names (case-insensitive tags)', () => {
    expect(parseBBCode('[B]x[/B]')).toEqual([
      { type: 'tag', name: 'b', attrs: {}, children: [{ type: 'text', value: 'x' }] }
    ])
  })

  it('passes an unknown tag through as literal text', () => {
    expect(parseBBCode('[xyz]hi')).toEqual([{ type: 'text', value: '[xyz]hi' }])
  })

  it('keeps an unterminated "[" run as literal text (no ] ahead)', () => {
    // Behaviour must match the pre-optimisation parser: the whole tail is text.
    expect(parseBBCode('[[[abc')).toEqual([{ type: 'text', value: '[[[abc' }])
    expect(parseBBCode('a[b')).toEqual([{ type: 'text', value: 'a[b' }])
  })

  it('reads a named attribute', () => {
    expect(parseBBCode('[code lang=js]x[/code]')).toEqual([
      {
        type: 'tag',
        name: 'code',
        attrs: { lang: 'js' },
        children: [{ type: 'text', value: 'x' }]
      }
    ])
  })
})

describe('parseBBCode — pathological input is not O(n²) (DoS guard)', () => {
  // Before the memoized-close fix these ran in seconds (indexOf(']') rescanned
  // forward on every '['). Linear now — a generous 1s ceiling still separates
  // O(n) from any O(n²) regression while tolerating slow CI runners.
  it('handles a long run of "[" with no closing "]" quickly', () => {
    const input = '['.repeat(700_000)
    const start = performance.now()
    const out = parseBBCode(input)
    const elapsed = performance.now() - start
    expect(out).toEqual([{ type: 'text', value: input }])
    expect(elapsed).toBeLessThan(1000)
  })

  it('handles many "[" before a single distant "]" quickly', () => {
    const input = '['.repeat(500_000) + ']'
    const start = performance.now()
    parseBBCode(input)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(1000)
  })
})

describe('parseBBCode — input cap (defense-in-depth)', () => {
  it('keeps the tail beyond the 1MB cap as a trailing literal text node', () => {
    const head = '[b]x[/b]'
    const tail = 'y'.repeat(1_000_001 - head.length)
    const out = parseBBCode(head + tail)
    // Head still parses; the overflow tail survives verbatim as literal text.
    expect(out[0]).toEqual({
      type: 'tag',
      name: 'b',
      attrs: {},
      children: [{ type: 'text', value: 'x' }]
    })
    const joined = out
      .filter((n): n is { type: 'text', value: string } => n.type === 'text')
      .map(n => n.value)
      .join('')
    expect(joined.length).toBe(tail.length)
    expect(joined.endsWith('y')).toBe(true)
  })
})
