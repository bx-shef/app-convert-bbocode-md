import { describe, it, expect } from 'vitest'
// @ts-expect-error — plain .mjs build script, no type declarations.
import { scriptHashes, injectHashes, TOKEN } from '../scripts/csp-hashes.mjs'

describe('csp-hashes — scriptHashes (what needs a CSP hash)', () => {
  it('hashes an inline <script> with no type', () => {
    const h = scriptHashes(['<script>window.x=1</script>'])
    expect(h).toHaveLength(1)
    expect(h[0]).toMatch(/^'sha256-[A-Za-z0-9+/]+='$/)
  })

  it('hashes module and importmap scripts (both governed by script-src)', () => {
    expect(scriptHashes(['<script type="module">1</script>'])).toHaveLength(1)
    expect(scriptHashes(['<script type="importmap">{}</script>'])).toHaveLength(1)
  })

  it('skips external src="…" scripts (allow-listed by origin, not hash)', () => {
    expect(scriptHashes(['<script src="/a.js"></script>'])).toHaveLength(0)
  })

  it('skips non-executable data blocks (Nuxt __NUXT_DATA__ = application/json)', () => {
    expect(scriptHashes(['<script type="application/json" id="__NUXT_DATA__">[1]</script>'])).toHaveLength(0)
  })

  it('dedupes identical inline scripts across pages', () => {
    expect(scriptHashes(['<script>a=1</script>', '<b></b><script>a=1</script>'])).toHaveLength(1)
  })
})

describe('csp-hashes — injectHashes (only CSP header lines, not comments)', () => {
  const HEADER = `  add_header Content-Security-Policy-Report-Only "script-src 'self' ${TOKEN} https://x;" always;`
  const COMMENT = `  # the placeholder \`${TOKEN}\` is replaced at build time`

  it('replaces the token on the CSP header line', () => {
    const [out, n] = injectHashes(HEADER, ['\'sha256-abc=\''])
    expect(n).toBe(1)
    expect(out).toContain('script-src \'self\' \'sha256-abc=\' https://x;')
    expect(out).not.toContain(TOKEN)
  })

  it('leaves the token intact inside a prose comment', () => {
    const [out, n] = injectHashes(`${COMMENT}\n${HEADER}`, ['\'sha256-abc=\''])
    expect(n).toBe(1)
    const [commentLine, headerLine] = out.split('\n')
    expect(commentLine).toContain(TOKEN) // comment untouched
    expect(headerLine).not.toContain(TOKEN) // header replaced
  })

  it('reports zero replacements when no CSP line carries the token', () => {
    const [, n] = injectHashes(COMMENT, ['\'sha256-abc=\''])
    expect(n).toBe(0)
  })
})
