#!/usr/bin/env node
/*
 * Injects sha256 CSP hashes for the inline <script> blocks Nuxt emits into the
 * production nginx config, so the served CSP can drop `script-src 'unsafe-inline'`.
 *
 * Why at build time: one inline script is `window.__NUXT__.config`, whose content
 * embeds a per-build `buildId`, so its hash changes every build and cannot be
 * hard-coded. Hashes are computed from the exact bytes nginx will serve (the
 * prerendered *.html under dist/), guaranteeing they match what the browser checks.
 *
 * Ported from currency-converter/scripts/csp-hashes.mjs (same Nuxt SSG setup).
 *
 * Usage: node scripts/csp-hashes.mjs [htmlDir] [inConf] [outConf]
 *   htmlDir  prerendered output dir            (default: dist)
 *   inConf   nginx config with the placeholder (default: docker/nginx.conf)
 *   outConf  where to write the result         (default: same as inConf, in place)
 *
 * The placeholder token `__CSP_SCRIPT_HASHES__` on the `add_header … CSP …` lines
 * of inConf is replaced with the space-separated list of 'sha256-...' sources
 * (occurrences in prose comments are left intact). Runs in the Docker build stage
 * (see Dockerfile) so the committed nginx.conf keeps the placeholder.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

export const TOKEN = '__CSP_SCRIPT_HASHES__'

// Inline <script> = a script tag without a `src` attribute. Capture its opening
// attributes (group 1) and body (group 2).
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g

// Only these <script type> values are executed (or, for importmap, governed) by
// `script-src` and therefore need a hash. Everything else — notably Nuxt's
// `type="application/json"` __NUXT_DATA__ island — is inert data and is skipped.
const EXECUTABLE_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript', 'importmap'])

function scriptType(attrs) {
  const m = attrs.match(/\btype\s*=\s*["']?([^"'\s>]*)/i)
  return (m ? m[1] : '').toLowerCase()
}

/** sha256-base64 CSP sources for the executable inline scripts in `htmls`. */
export function scriptHashes(htmls) {
  const hashes = new Set()
  for (const html of htmls) {
    for (const [, attrs, body] of html.matchAll(INLINE_SCRIPT)) {
      if (!EXECUTABLE_TYPES.has(scriptType(attrs))) continue
      hashes.add(createHash('sha256').update(body, 'utf8').digest('base64'))
    }
  }
  return [...hashes].map(h => `'sha256-${h}'`)
}

/** Recursively yields every *.html file under `dir` (pages live in subfolders). */
function htmlFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...htmlFiles(full))
    else if (entry.name.endsWith('.html')) out.push(full)
  }
  return out
}

/**
 * Replace TOKEN only on `add_header … Content-Security-Policy …` lines, so the
 * hashes never leak into the explanatory comments that also name the token.
 * Returns [newConf, replacedCount].
 */
export function injectHashes(conf, sources) {
  let replaced = 0
  const joined = sources.join(' ')
  const out = conf.replace(/^.*add_header\s+Content-Security-Policy[^\n]*$/gm, (line) => {
    if (!line.includes(TOKEN)) return line
    replaced++
    return line.replaceAll(TOKEN, joined)
  })
  return [out, replaced]
}

function main() {
  const htmlDir = process.argv[2] || 'dist'
  const inConf = process.argv[3] || 'docker/nginx.conf'
  const outConf = process.argv[4] || inConf

  const sources = scriptHashes(htmlFiles(htmlDir).map(f => readFileSync(f, 'utf8')))
  if (!sources.length) {
    console.error(`csp-hashes: no inline scripts found in ${htmlDir} — refusing to write an empty allow-list`)
    process.exit(1)
  }

  const [out, replaced] = injectHashes(readFileSync(inConf, 'utf8'), sources)
  if (!replaced) {
    console.error(`csp-hashes: placeholder ${TOKEN} not found on any add_header Content-Security-Policy line of ${inConf}`)
    process.exit(1)
  }

  writeFileSync(outConf, out)
  console.log(`csp-hashes: injected ${sources.length} hash(es) into ${replaced} CSP header(s) of ${outConf}:`)
  for (const s of sources) console.log(`  ${s}`)
}

// Run the CLI only when invoked directly (not when imported by a test).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
