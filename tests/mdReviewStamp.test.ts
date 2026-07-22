import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Review-stamp convention (see CLAUDE.md): every tracked .md in the repo root and
// docs/ carries `> Last reviewed: YYYY-MM-DD` (ISO date) as a blockquote under its
// H1, so staleness is visible and greppable. This test enforces it.
const STAMP_RE = /^> Last reviewed: \d{4}-\d{2}-\d{2}$/m

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

// Excluded from the convention:
// - `docs/reports/` + `.claude/` — the reporting-kit bundle (vendored from
//   bx-shef/ai-agent with its own conventions/CI; kept verbatim to stay syncable).
// - `tests/` — fixtures/data, not documentation.
const EXCLUDED_PREFIXES = ['docs/reports/', '.claude/', 'tests/'] as const

/** .md files tracked by git — naturally excludes node_modules/ and .nuxt/. */
function trackedMdFiles(): string[] {
  return execSync('git ls-files "*.md"', { cwd: repoRoot })
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean)
    .filter(f => !EXCLUDED_PREFIXES.some(prefix => f.startsWith(prefix)))
}

describe('Markdown review stamp convention', () => {
  it('every tracked root/docs .md carries a "> Last reviewed: YYYY-MM-DD" stamp', () => {
    const files = trackedMdFiles()
    expect(files.length).toBeGreaterThan(0) // sanity: git returned something

    const missing = files.filter(
      f => !STAMP_RE.test(readFileSync(join(repoRoot, f), 'utf-8'))
    )
    expect(missing, `Missing review stamp in:\n${missing.join('\n')}`).toEqual([])
  })
})
