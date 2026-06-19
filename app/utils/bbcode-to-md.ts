import { parseBBCode, type BBNode, type TagNode } from './bbcode-parser'

export interface BBCodeToMdOptions {
  /**
   * Chat mode: render `[table]` as a bullet list (rows joined by ` | `)
   * because Bitrix24 chat does not support tables. Default: false.
   */
  chatMode?: boolean
}

export function bbcodeToMd(input: string, options: BBCodeToMdOptions = {}): string {
  if (!input) return ''
  const ast = parseBBCode(input)
  const ctx: RenderCtx = { chatMode: options.chatMode === true }
  const out = renderNodes(ast, ctx)
  return collapseBlankLines(out).trim()
}

interface RenderCtx {
  chatMode: boolean
}

function renderNodes(nodes: BBNode[], ctx: RenderCtx): string {
  return nodes.map(n => renderNode(n, ctx)).join('')
}

function renderNode(n: BBNode, ctx: RenderCtx): string {
  if (n.type === 'text') return n.value
  return renderTag(n, ctx)
}

function renderTag(n: TagNode, ctx: RenderCtx): string {
  const inner = () => renderNodes(n.children, ctx)
  switch (n.name) {
    case 'b': return `**${inner()}**`
    case 'i': return `*${inner()}*`
    case 'u': return `<u>${inner()}</u>`
    case 's': return `~~${inner()}~~`
    case 'url': {
      const text = inner()
      if (!n.primary) return `<${text}>`
      return `[${text}](${n.primary})`
    }
    case 'img': {
      const src = inner()
      return `![](${src})`
    }
    case 'code': {
      const content = inner()
      const lang = n.primary || n.attrs.lang || ''
      if (lang || content.includes('\n')) {
        return `\n\`\`\`${lang}\n${content}\n\`\`\`\n`
      }
      return `\`${content}\``
    }
    case 'quote': {
      const text = renderNodes(n.children, ctx).replace(/^\n+|\n+$/g, '')
      const lines = text.split('\n').map(l => `> ${l}`)
      return '\n' + lines.join('\n') + '\n'
    }
    case 'list': {
      const isOrdered = n.primary === '1'
      const items: string[] = []
      let cur: string | null = null
      for (const c of n.children) {
        if (c.type === 'tag' && c.name === '*') {
          if (cur !== null) items.push(cur)
          cur = ''
        } else if (cur !== null) {
          cur += renderNode(c, ctx)
        }
      }
      if (cur !== null) items.push(cur)
      const lines = items.map((it, idx) => {
        const prefix = isOrdered ? `${idx + 1}. ` : '- '
        return prefix + it.trim()
      })
      return '\n' + lines.join('\n') + '\n'
    }
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = Number(n.name[1])
      return '\n' + '#'.repeat(level) + ' ' + inner() + '\n'
    }
    case 'color': return n.primary ? `<span style="color:${styleVal(n.primary)}">${inner()}</span>` : inner()
    case 'font': return n.primary ? `<span style="font-family:${styleVal(n.primary)}">${inner()}</span>` : inner()
    case 'size': {
      const px = parseInt(n.primary || '', 10)
      return Number.isFinite(px) ? `<span style="font-size:${px}px">${inner()}</span>` : inner()
    }
    case 'user': return n.primary ? `<span data-bb-user="${idVal(n.primary)}">${inner()}</span>` : inner()
    case 'department': return n.primary ? `<span data-bb-dept="${idVal(n.primary)}">${inner()}</span>` : inner()
    case 'br': return '\n'
    case 'hr': return '\n---\n'
    case 'p': return '\n\n' + inner() + '\n\n'
    case 'table': return renderTable(n, ctx)
    case 'tr':
    case 'th':
    case 'td': return inner()
    default: return inner()
  }
}

function renderTable(n: TagNode, ctx: RenderCtx): string {
  const rows: { cells: string[], isHeader: boolean }[] = []
  for (const child of n.children) {
    if (child.type !== 'tag' || child.name !== 'tr') continue
    const cells: string[] = []
    let isHeader = false
    for (const cell of child.children) {
      if (cell.type !== 'tag') continue
      if (cell.name === 'th') {
        isHeader = true
        cells.push(renderNodes(cell.children, ctx).trim())
      } else if (cell.name === 'td') {
        cells.push(renderNodes(cell.children, ctx).trim())
      }
    }
    if (cells.length > 0) rows.push({ cells, isHeader })
  }
  if (rows.length === 0) return ''

  if (ctx.chatMode) {
    const lines = rows.map((r) => {
      const joined = r.cells.join(' | ')
      return r.isHeader ? `- **${joined}**` : `- ${joined}`
    })
    return '\n' + lines.join('\n') + '\n'
  }

  const colCount = Math.max(...rows.map(r => r.cells.length))
  const headerIdx = rows.findIndex(r => r.isHeader)
  const headerRow = headerIdx >= 0 ? rows[headerIdx]! : { cells: Array(colCount).fill(''), isHeader: true }
  const bodyRows = headerIdx >= 0 ? rows.filter((_, i) => i !== headerIdx) : rows

  const lines: string[] = []
  lines.push('| ' + padRow(headerRow.cells, colCount).join(' | ') + ' |')
  lines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |')
  for (const r of bodyRows) {
    lines.push('| ' + padRow(r.cells, colCount).join(' | ') + ' |')
  }
  return '\n' + lines.join('\n') + '\n'
}

function padRow(cells: string[], n: number): string[] {
  const out = cells.slice()
  while (out.length < n) out.push('')
  return out
}

/** Strip characters that would break out of a `style="…"` attribute. */
function styleVal(v: string): string {
  return v.replace(/["<>;]/g, '').trim()
}

/** Strip characters that would break out of an HTML attribute value. */
function idVal(v: string): string {
  return v.replace(/["<>]/g, '').trim()
}

function collapseBlankLines(s: string): string {
  return s.replace(/\n{3,}/g, '\n\n')
}
