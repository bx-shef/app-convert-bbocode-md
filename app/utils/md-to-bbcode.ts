import MarkdownIt from 'markdown-it'
import { htmlToMd } from './html-to-md'

/**
 * Common inline raw-HTML tags users paste into Markdown, mapped to BBCode so
 * they do not leak through untranslated. `<u>` is the underline fallback this
 * converter itself emits; the rest are convenience.
 */
const INLINE_HTML_MAP: Record<string, string> = {
  '<u>': '[u]', '</u>': '[/u]',
  '<b>': '[b]', '</b>': '[/b]', '<strong>': '[b]', '</strong>': '[/b]',
  '<i>': '[i]', '</i>': '[/i]', '<em>': '[i]', '</em>': '[/i]',
  '<s>': '[s]', '</s>': '[/s]', '<del>': '[s]', '</del>': '[/s]', '<strike>': '[s]', '</strike>': '[/s]',
  '<br>': '\n', '<br/>': '\n', '<br />': '\n'
}

function mapInlineHtml(raw: string): string {
  const key = raw.trim().toLowerCase()
  return key in INLINE_HTML_MAP ? INLINE_HTML_MAP[key]! : raw
}

/** CSS property → Bitrix styling tag (`[color]`/`[size]`/`[font]`). */
const STYLE_TO_BB: Record<string, 'color' | 'size' | 'font'> = {
  'color': 'color',
  'font-size': 'size',
  'font-family': 'font'
}

/** Extract `[color]/[size]/[font]` tags from a `<span style="…">` opening tag. */
function parseSpanStyle(openTag: string): { name: 'color' | 'size' | 'font', primary: string }[] {
  const m = openTag.match(/style\s*=\s*("([^"]*)"|'([^']*)')/i)
  const style = m?.[2] ?? m?.[3] ?? ''
  const tags: { name: 'color' | 'size' | 'font', primary: string }[] = []
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':')
    if (idx < 0) continue
    const prop = decl.slice(0, idx).trim().toLowerCase()
    const name = STYLE_TO_BB[prop]
    if (!name) continue
    let val = decl.slice(idx + 1).trim()
    if (name === 'size') val = val.replace(/px$/i, '').trim()
    if (val) tags.push({ name, primary: val })
  }
  return tags
}

function quoteIfNeeded(v: string): string {
  return /\s/.test(v) ? `"${v}"` : v
}

/**
 * Map inline raw HTML to BBCode. `<span style="…">` carries the Bitrix styling
 * tags (`[color]/[size]/[font]`); a per-inline `spanStack` records which tags
 * each span opened so the matching `</span>` closes them in reverse.
 */
function renderInlineHtml(raw: string, spanStack: string[][]): string {
  const lower = raw.trim().toLowerCase()
  if (lower.startsWith('<span')) {
    const tags = parseSpanStyle(raw)
    spanStack.push(tags.map(t => t.name))
    return tags.map(t => `[${t.name}=${quoteIfNeeded(t.primary)}]`).join('')
  }
  if (lower === '</span>') {
    const tags = spanStack.pop() || []
    return tags.slice().reverse().map(n => `[/${n}]`).join('')
  }
  return mapInlineHtml(raw)
}

type Token = ReturnType<MarkdownIt['parse']>[number]

export interface MdToBBCodeOptions {
  /**
   * Chat mode: render Markdown tables as a bullet list (cells joined by ` | `)
   * because Bitrix24 chat does not support `[table]`. Default: false.
   */
  chatMode?: boolean
}

const md = new MarkdownIt({ html: true, linkify: false, breaks: false })

export function mdToBbcode(input: string, options: MdToBBCodeOptions = {}): string {
  if (!input) return ''
  const tokens = md.parse(input, {})
  const ctx: RenderCtx = { chatMode: options.chatMode === true }
  let out = ''
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i]!
    if (tk.type === 'table_open') {
      const end = findMatchingClose(tokens, i, 'table_open', 'table_close')
      out += renderTable(tokens.slice(i + 1, end), ctx)
      i = end
      continue
    }
    out += renderToken(tk)
  }
  out = out
    .replace(/\n{2,}\[\/quote\]/g, '[/quote]')
    .replace(/\[quote\]\n+/g, '[quote]')
    .replace(/\n{2,}\[\/list\]/g, '\n[/list]')
    .replace(/\n{3,}/g, '\n\n')
  return out.trim()
}

interface RenderCtx {
  chatMode: boolean
}

function findMatchingClose(tokens: Token[], start: number, openType: string, closeType: string): number {
  let depth = 1
  for (let i = start + 1; i < tokens.length; i++) {
    if (tokens[i]!.type === openType) depth++
    else if (tokens[i]!.type === closeType) {
      depth--
      if (depth === 0) return i
    }
  }
  return tokens.length - 1
}

function renderToken(tk: Token): string {
  switch (tk.type) {
    case 'paragraph_open':
      return ''
    case 'paragraph_close':
      return tk.hidden ? '' : '\n\n'
    case 'inline':
      return renderInline(tk.children || [])
    case 'heading_open':
      return `[${tk.tag.toLowerCase()}]`
    case 'heading_close':
      return `[/${tk.tag.toLowerCase()}]\n\n`
    case 'bullet_list_open':
      return '[list]\n'
    case 'ordered_list_open':
      return '[list=1]\n'
    case 'bullet_list_close':
    case 'ordered_list_close':
      return '[/list]\n'
    case 'list_item_open':
      return '[*]'
    case 'list_item_close':
      return '\n'
    case 'fence': {
      const lang = (tk.info || '').trim().split(/\s+/)[0] || ''
      const content = tk.content.replace(/\n+$/, '')
      return `[code${lang ? ` lang=${lang}` : ''}]${content}[/code]\n`
    }
    case 'code_block': {
      const content = tk.content.replace(/\n+$/, '')
      return `[code]${content}[/code]\n`
    }
    case 'hr':
      return '[hr]\n'
    case 'blockquote_open':
      return '[quote]'
    case 'blockquote_close':
      return '[/quote]\n'
    case 'html_block':
      // Block-level raw HTML (pasted <ul>, <table>, <div>…): route it through
      // the HTML→MD→BBCode pipeline instead of leaking the markup. (chatMode is
      // not propagated here — block HTML tables are a rare edge.)
      return tk.content.trim() ? mdToBbcode(htmlToMd(tk.content)) : ''
    default:
      return ''
  }
}

function renderInline(children: Token[]): string {
  let out = ''
  const spanStack: string[][] = []
  for (const c of children) {
    if (c.type === 'html_inline') out += renderInlineHtml(c.content, spanStack)
    else out += renderInlineToken(c)
  }
  return out
}

function renderInlineToken(tk: Token): string {
  switch (tk.type) {
    case 'text':
      return tk.content
    case 'softbreak':
    case 'hardbreak':
      return '\n'
    case 'strong_open':
      return '[b]'
    case 'strong_close':
      return '[/b]'
    case 'em_open':
      return '[i]'
    case 'em_close':
      return '[/i]'
    case 's_open':
      return '[s]'
    case 's_close':
      return '[/s]'
    case 'code_inline':
      return `[code]${tk.content}[/code]`
    case 'link_open': {
      if (tk.markup === 'autolink') return '[url]'
      const href = tk.attrGet('href') || ''
      return `[url=${href}]`
    }
    case 'link_close':
      return '[/url]'
    case 'image': {
      const src = tk.attrGet('src') || ''
      return `[img]${src}[/img]`
    }
    case 'html_inline':
      return mapInlineHtml(tk.content)
    default:
      return ''
  }
}

function renderTable(inner: Token[], ctx: RenderCtx): string {
  const rows: { cells: string[], isHeader: boolean }[] = []
  let curRow: { cells: string[], isHeader: boolean } | null = null
  let curCellTokens: Token[] | null = null
  let curCellIsHeader = false

  for (const tk of inner) {
    if (tk.type === 'tr_open') {
      curRow = { cells: [], isHeader: false }
    } else if (tk.type === 'tr_close') {
      if (curRow) {
        rows.push(curRow)
        curRow = null
      }
    } else if (tk.type === 'th_open') {
      curCellTokens = []
      curCellIsHeader = true
      if (curRow) curRow.isHeader = true
    } else if (tk.type === 'td_open') {
      curCellTokens = []
      curCellIsHeader = false
    } else if (tk.type === 'th_close' || tk.type === 'td_close') {
      if (curRow && curCellTokens) {
        const text = renderInlineSeq(curCellTokens).trim()
        curRow.cells.push(text)
      }
      curCellTokens = null
      void curCellIsHeader
    } else if (curCellTokens) {
      curCellTokens.push(tk)
    }
  }

  if (rows.length === 0) return ''

  if (ctx.chatMode) {
    const lines = rows.map((r) => {
      const joined = r.cells.join(' | ')
      return r.isHeader ? `[*][b]${joined}[/b]` : `[*]${joined}`
    })
    return '[list]\n' + lines.join('\n') + '\n[/list]\n'
  }

  const out: string[] = ['[table]']
  for (const r of rows) {
    const tag = r.isHeader ? 'th' : 'td'
    const cells = r.cells.map(c => `[${tag}]${c}[/${tag}]`).join('')
    out.push(`[tr]${cells}[/tr]`)
  }
  out.push('[/table]')
  return out.join('\n') + '\n'
}

function renderInlineSeq(tokens: Token[]): string {
  let out = ''
  for (const tk of tokens) {
    if (tk.type === 'inline') {
      out += renderInline(tk.children || [])
    } else {
      out += renderToken(tk)
    }
  }
  return out
}
