import { parseDocument } from 'htmlparser2'

/**
 * HTML → Markdown. Forgiving (htmlparser2 parses messy, real-world HTML such as
 * Bitrix24 CRM comments) but narrow: it maps the same closed tag set the rest of
 * the converter understands, mirroring `bbcode-to-md`'s Markdown conventions so
 * HTML → MD → BBCode round-trips stay stable. Unknown tags are unwrapped to
 * their text; `<script>`/`<style>` are dropped whole.
 */

interface HNode {
  type: string
  name?: string
  data?: string
  attribs?: Record<string, string>
  children?: HNode[]
}

const DROP = new Set(['script', 'style', 'head', 'noscript', 'template'])

export function htmlToMd(input: string): string {
  if (!input || !input.trim()) return ''
  const doc = parseDocument(input, { decodeEntities: true })
  const out = renderChildren((doc.children as unknown as HNode[]) || [], true)
  return out
    .replace(/[ \t]+\n/g, '\n') // strip trailing spaces
    .replace(/\n{3,}/g, '\n\n') // collapse blank-line runs
    .trim()
}

function isTag(n: HNode): boolean {
  return n.type === 'tag' || n.type === 'script' || n.type === 'style'
}

/**
 * Render a node's children. In `blockFlow` containers (root, blockquote, list,
 * list item) whitespace-only text nodes are the insignificant indentation HTML
 * leaves between block tags — drop them so they don't become stray spaces.
 */
function renderChildren(nodes: HNode[], blockFlow = false): string {
  const visible = blockFlow
    ? nodes.filter(n => !(n.type === 'text' && !(n.data ?? '').trim()))
    : nodes
  return visible.map(renderNode).join('')
}

/** Concatenate all descendant text literally (for `<code>` / `<pre>`). */
function textContent(node: HNode): string {
  if (node.type === 'text') return node.data ?? ''
  if (node.children) return node.children.map(textContent).join('')
  return ''
}

/** Wrap inner emphasis markers tightly, leaving any outer whitespace outside. */
function wrapInline(marker: string, inner: string): string {
  const m = inner.match(/^(\s*)([\s\S]*?)(\s*)$/)
  if (!m || !m[2]) return inner
  return `${m[1]}${marker}${m[2]}${marker}${m[3]}`
}

/** CSS declarations carried on a `<span>` (Bitrix [color]/[size]/[font]). */
const SPAN_STYLE_PROPS = new Set(['color', 'font-size', 'font-family'])
function filterSpanStyle(style: string): string {
  return style
    .split(';')
    .map(d => d.trim().replace(/["<>]/g, ''))
    .filter((d) => {
      const i = d.indexOf(':')
      return i > 0 && SPAN_STYLE_PROPS.has(d.slice(0, i).trim().toLowerCase())
    })
    .join('; ')
}

// NB: these strip attribute-breaking chars for a clean carrier, they are NOT the
// XSS barrier — that is the allow-list in `sanitize-html.ts` (run before any HTML
// reaches the DOM). `idVal` trims (entity ids); `attrVal` does not (interactive
// values can carry a meaningful trailing space, e.g. `[PUT=/search ]`).
function idVal(v: string): string {
  return v.replace(/["<>]/g, '').trim()
}
function attrVal(v: string): string {
  return v.replace(/["<>]/g, '')
}

/** Attributes worth preserving on a `<span>`: safe style + entity carriers. */
function spanCarrier(attribs: Record<string, string>): string {
  const parts: string[] = []
  const style = filterSpanStyle(attribs.style || '')
  if (style) parts.push(`style="${style}"`)
  if (attribs['data-bb-user']) parts.push(`data-bb-user="${idVal(attribs['data-bb-user'])}"`)
  if (attribs['data-bb-dept']) parts.push(`data-bb-dept="${idVal(attribs['data-bb-dept'])}"`)
  if (attribs['data-bb-send']) parts.push(`data-bb-send="${attrVal(attribs['data-bb-send'])}"`)
  if (attribs['data-bb-put']) parts.push(`data-bb-put="${attrVal(attribs['data-bb-put'])}"`)
  if (attribs['data-bb-call']) parts.push(`data-bb-call="${attrVal(attribs['data-bb-call'])}"`)
  return parts.join(' ')
}

function renderNode(node: HNode): string {
  if (node.type === 'text') {
    return (node.data ?? '').replace(/\s+/g, ' ')
  }
  if (!isTag(node)) return '' // comment / directive / cdata
  const name = (node.name || '').toLowerCase()
  if (DROP.has(name)) return ''
  const children = node.children || []
  const inner = () => renderChildren(children)

  switch (name) {
    case 'b':
    case 'strong':
      return wrapInline('**', inner())
    case 'i':
    case 'em':
      return wrapInline('*', inner())
    case 'u': {
      const c = inner()
      return c.trim() ? `<u>${c}</u>` : c
    }
    case 'span': {
      // Preserve color/size/font + entity carriers as raw HTML so MD → BBCode maps them.
      const carrier = spanCarrier(node.attribs || {})
      const c = inner()
      return carrier ? `<span ${carrier}>${c}</span>` : c
    }
    case 's':
    case 'strike':
    case 'del':
      return wrapInline('~~', inner())
    case 'a': {
      const href = node.attribs?.href || ''
      const text = inner().trim()
      if (!href) return text
      if (!text || text === href) return `<${href}>`
      return `[${text}](${href})`
    }
    case 'img': {
      const src = node.attribs?.src || ''
      const alt = node.attribs?.alt || ''
      return src ? `![${alt}](${src})` : ''
    }
    case 'br':
      return '\n'
    case 'hr':
      return '\n\n---\n\n'
    case 'code': {
      const c = textContent(node)
      return c ? `\`${c}\`` : ''
    }
    case 'pre': {
      const codeChild = children.find(c => isTag(c) && (c.name || '').toLowerCase() === 'code')
      const cls = codeChild?.attribs?.class || node.attribs?.class || ''
      const lang = cls.match(/language-(\S+)/)?.[1] || ''
      const content = textContent(node).replace(/\n+$/, '')
      return `\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`
    }
    case 'blockquote': {
      const text = renderChildren(children, true).replace(/^\n+|\n+$/g, '')
      const lines = text.split('\n').map(l => (l.length ? `> ${l}` : '>'))
      return `\n\n${lines.join('\n')}\n\n`
    }
    case 'ul':
      return `\n\n${renderList(children, false)}\n\n`
    case 'ol':
      return `\n\n${renderList(children, true)}\n\n`
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = Number(name[1])
      return `\n\n${'#'.repeat(level)} ${inner().trim()}\n\n`
    }
    case 'p': {
      const c = inner().trim()
      return c ? `\n\n${c}\n\n` : ''
    }
    case 'table':
      return `\n\n${renderTable(node)}\n\n`
    default:
      return inner() // unwrap unknown / wrapper tags (div, span, thead, tr, …)
  }
}

function renderList(children: HNode[], ordered: boolean): string {
  const items = children.filter(c => isTag(c) && (c.name || '').toLowerCase() === 'li')
  const lines = items.map((li, idx) => {
    const prefix = ordered ? `${idx + 1}. ` : '- '
    let content = renderChildren(li.children || [], true).replace(/^\n+|\n+$/g, '').replace(/\n{2,}/g, '\n')
    // Indent continuation / nested lines under the marker.
    content = content.replace(/\n/g, `\n${' '.repeat(prefix.length)}`)
    return prefix + content
  })
  return lines.join('\n')
}

function renderTable(node: HNode): string {
  const rows: { cells: string[], isHeader: boolean }[] = []
  const walk = (n: HNode): void => {
    for (const c of n.children || []) {
      if (!isTag(c)) continue
      const nm = (c.name || '').toLowerCase()
      if (nm === 'tr') {
        const cells: string[] = []
        let isHeader = false
        for (const cell of c.children || []) {
          if (!isTag(cell)) continue
          const cn = (cell.name || '').toLowerCase()
          if (cn === 'th') {
            isHeader = true
            cells.push(renderChildren(cell.children || []).trim())
          } else if (cn === 'td') {
            cells.push(renderChildren(cell.children || []).trim())
          }
        }
        if (cells.length) rows.push({ cells, isHeader })
      } else if (nm === 'thead' || nm === 'tbody' || nm === 'tfoot') {
        walk(c)
      }
    }
  }
  walk(node)
  if (rows.length === 0) return ''

  const colCount = Math.max(...rows.map(r => r.cells.length))
  const headerIdx = rows.findIndex(r => r.isHeader)
  const headerRow = headerIdx >= 0 ? rows[headerIdx]! : { cells: Array(colCount).fill(''), isHeader: true }
  const bodyRows = headerIdx >= 0 ? rows.filter((_, i) => i !== headerIdx) : rows

  const pad = (cells: string[]): string[] => {
    const out = cells.slice()
    while (out.length < colCount) out.push('')
    return out
  }

  const lines: string[] = []
  lines.push(`| ${pad(headerRow.cells).join(' | ')} |`)
  lines.push(`| ${Array(colCount).fill('---').join(' | ')} |`)
  for (const r of bodyRows) lines.push(`| ${pad(r.cells).join(' | ')} |`)
  return lines.join('\n')
}
