import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const LOCALES_DIR = join(import.meta.dirname, '../i18n/locales')

function keys(obj: Record<string, unknown>, prefix = ''): Set<string> {
  const out = new Set<string>()
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') for (const nested of keys(v as Record<string, unknown>, path)) out.add(nested)
    else out.add(path)
  }
  return out
}

const read = (file: string) => JSON.parse(readFileSync(join(LOCALES_DIR, file), 'utf8')) as Record<string, unknown>

describe('i18n — English fallback must stay wired', () => {
  // Regression guard: `@nuxtjs/i18n` defaults `fallbackLocale` to false, and then
  // a key missing from the active locale renders as its raw path
  // ("page.index.ui.title"). Most locales are only partially translated, so
  // losing this config silently breaks the UI for them.
  it('nuxt.config points at the i18n config file', () => {
    const cfg = readFileSync(join(import.meta.dirname, '../nuxt.config.ts'), 'utf8')
    expect(cfg).toMatch(/vueI18n:\s*'\.\/i18n\.config\.ts'/)
  })

  it('the i18n config falls back to English', () => {
    const cfg = readFileSync(join(import.meta.dirname, '../i18n/i18n.config.ts'), 'utf8')
    expect(cfg).toMatch(/fallbackLocale:\s*'en'/)
  })

  it('English is complete relative to Russian (it is what every locale falls back to)', () => {
    expect([...keys(read('ru.json'))].filter(k => !keys(read('en.json')).has(k))).toEqual([])
  })

  it('every locale file is valid JSON and a subset of English', () => {
    const en = keys(read('en.json'))
    for (const file of readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'))) {
      const extra = [...keys(read(file))].filter(k => !en.has(k))
      // Extra keys can never render — English has nothing to fall back to.
      expect(extra, `${file} has keys missing from en.json`).toEqual([])
    }
  })
})
