import { Parser } from 'htmlparser2'

/**
 * Allow-list HTML sanitizer built on htmlparser2 (node + browser, no DOM needed).
 *
 * Used before any HTML reaches the DOM (live preview, print document). It keeps
 * only the small tag/attribute set this converter understands, drops everything
 * else (tags are unwrapped to their text, `<script>`/`<style>` are removed
 * whole), and blocks dangerous URL schemes (`javascript:`, `data:`, …).
 *
 * It is intentionally narrow: chat/comment text the IM widget loads can come
 * from other users, so rendering it must never execute their markup.
 */

/** Tag → set of allowed attributes (empty set = tag kept, all attrs dropped). */
const ALLOWED: Record<string, Set<string>> = {
  a: new Set(['href', 'title']),
  img: new Set(['src', 'alt', 'title']),
  b: new Set(), strong: new Set(),
  i: new Set(), em: new Set(),
  u: new Set(),
  s: new Set(), del: new Set(), strike: new Set(),
  code: new Set(), pre: new Set(),
  blockquote: new Set(),
  ul: new Set(), ol: new Set(), li: new Set(),
  h1: new Set(), h2: new Set(), h3: new Set(), h4: new Set(), h5: new Set(), h6: new Set(),
  br: new Set(), hr: new Set(), p: new Set(),
  table: new Set(), thead: new Set(), tbody: new Set(),
  tr: new Set(), th: new Set(), td: new Set(),
  span: new Set(['style', 'data-bb-user', 'data-bb-dept'])
}

/** CSS properties allowed in a sanitized `style` attribute (Bitrix [color]/[size]/[font]). */
const STYLE_PROPS = new Set([
  'color', 'background-color', 'font-size', 'font-family', 'font-weight', 'font-style', 'text-align', 'text-decoration'
])

/** Keep only allow-listed, value-safe CSS declarations; drop the rest. */
function sanitizeStyle(value: string): string {
  return value
    .split(';')
    .map((decl) => {
      const idx = decl.indexOf(':')
      if (idx < 0) return ''
      const prop = decl.slice(0, idx).trim().toLowerCase()
      const val = decl.slice(idx + 1).trim()
      if (!STYLE_PROPS.has(prop) || !val) return ''
      if (/url\(|expression|[<>"]|[a-z]+:/i.test(val)) return '' // no url()/scheme/expression/markup
      return `${prop}:${val}`
    })
    .filter(Boolean)
    .join('; ')
}

/** Elements that never have a closing tag. */
const VOID = new Set(['br', 'hr', 'img'])

/** Content of these is dropped entirely (not just unwrapped). */
const DROP_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript'])

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function isSafeUrl(value: string): boolean {
  const v = value.trim().toLowerCase()
  // Strip control chars / whitespace that can hide a scheme (browsers ignore
  // them, so "java\tscript:" must be caught too). Char-by-char to avoid a
  // control-character regex.
  let cleaned = ''
  for (const ch of v) {
    if (ch.charCodeAt(0) > 0x20) cleaned += ch
  }
  return !/^(?:javascript|vbscript|data|file):/i.test(cleaned)
}

export function sanitizeHtml(input: string): string {
  if (!input) return ''
  let out = ''
  // Number of currently-open ancestors whose whole content must be dropped.
  let dropDepth = 0
  // Per-open-<span> flag: true = unwrapped (no surviving style), skip its close.
  const spanStack: boolean[] = []

  const parser = new Parser({
    onopentag(name, attribs) {
      const tag = name.toLowerCase()
      if (DROP_CONTENT.has(tag)) {
        dropDepth++
        return
      }
      if (dropDepth > 0) return
      const allowedAttrs = ALLOWED[tag]
      if (!allowedAttrs) return // unknown tag: unwrap (keep children/text)

      let attrStr = ''
      for (const [rawKey, rawVal] of Object.entries(attribs)) {
        const key = rawKey.toLowerCase()
        if (!allowedAttrs.has(key)) continue
        if ((key === 'href' || key === 'src') && !isSafeUrl(rawVal)) continue
        if (key === 'style') {
          const safe = sanitizeStyle(rawVal)
          if (safe) attrStr += ` style="${escapeAttr(safe)}"`
          continue
        }
        attrStr += ` ${key}="${escapeAttr(rawVal)}"`
      }
      // A <span> with no surviving style is noise — unwrap it (keep its text).
      if (tag === 'span') {
        spanStack.push(!attrStr)
        if (!attrStr) return
      }
      out += `<${tag}${attrStr}>`
    },
    ontext(text) {
      if (dropDepth > 0) return
      out += escapeText(text)
    },
    onclosetag(name) {
      const tag = name.toLowerCase()
      if (DROP_CONTENT.has(tag)) {
        if (dropDepth > 0) dropDepth--
        return
      }
      if (dropDepth > 0) return
      if (tag === 'span') {
        if (spanStack.pop()) return // was unwrapped at open
        out += '</span>'
        return
      }
      if (!ALLOWED[tag] || VOID.has(tag)) return
      out += `</${tag}>`
    }
  }, { decodeEntities: true })

  parser.write(input)
  parser.end()
  return out
}
