export type TextNode = { type: 'text', value: string }
export type TagNode = {
  type: 'tag'
  name: string
  primary?: string
  attrs: Record<string, string>
  children: BBNode[]
}
export type BBNode = TextNode | TagNode

const SELF_CLOSING = new Set(['br', 'hr', '*'])
const LITERAL_CONTENT = new Set(['code'])
const KNOWN_TAGS = new Set([
  'b', 'i', 'u', 's',
  'url', 'img',
  'list', '*',
  'code', 'quote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'br', 'hr', 'p',
  'table', 'tr', 'th', 'td',
  'color', 'size', 'font',
  'user', 'department',
  'send', 'put', 'call'
])

// An unquoted primary value runs to the closing `]` — spaces included — so real
// Bitrix24 bot markup like `[PUT=/search ]` / `[CALL=+7 916 123]` (unquoted,
// spaces) parses intact. Named attrs (`[code lang=js]`) still work: they only
// appear when NO `=value` immediately follows the tag name (the `(\s+…)?` group).
const TAG_OPEN_RE = /^([a-zA-Z*][a-zA-Z0-9_*]*)(=("[^"]*"|'[^']*'|[^\]]+))?(\s+([^\]]+))?\/?$/
const ATTR_RE = /(\w+)=("[^"]*"|'[^']*'|\S+)/g

// Hard input cap (defense-in-depth). Real Bitrix24 task/comment/feed content is
// far smaller; anything larger keeps its tail as a literal text node so nothing
// is silently dropped, while bounding worst-case work on pathological input.
const MAX_INPUT = 1_000_000

export function parseBBCode(input: string): BBNode[] {
  const result: BBNode[] = []
  let overflow = ''
  if (input.length > MAX_INPUT) {
    overflow = input.slice(MAX_INPUT)
    input = input.slice(0, MAX_INPUT)
  }
  const stack: TagNode[] = []
  let i = 0
  let textBuf = ''
  // Memoized index of the next ']' at/after the cursor. Reused while it stays
  // ahead of `i`, so a '['-heavy input does not rescan to the same ']' on every
  // char — that rescan made parsing O(n²) (a DoS vector on externally-authored
  // task/comment content loaded via REST).
  let nextClose = -1

  const target = (): BBNode[] => stack.length ? stack[stack.length - 1]!.children : result

  const flushText = () => {
    if (textBuf) {
      target().push({ type: 'text', value: textBuf })
      textBuf = ''
    }
  }

  while (i < input.length) {
    if (input[i] !== '[') {
      textBuf += input[i]
      i++
      continue
    }
    if (nextClose < i + 1) nextClose = input.indexOf(']', i + 1)
    const close = nextClose
    if (close === -1) {
      // No ']' ahead — the remainder cannot form a tag; emit it verbatim.
      textBuf += input.slice(i)
      break
    }
    const inner = input.slice(i + 1, close)

    if (inner.startsWith('/')) {
      const closeName = inner.slice(1).trim().toLowerCase()
      if (!KNOWN_TAGS.has(closeName)) {
        textBuf += input.slice(i, close + 1)
        i = close + 1
        continue
      }
      let foundIdx = -1
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k]!.name === closeName) {
          foundIdx = k
          break
        }
      }
      if (foundIdx === -1) {
        textBuf += input.slice(i, close + 1)
        i = close + 1
        continue
      }
      flushText()
      while (stack.length > foundIdx) stack.pop()
      i = close + 1
      continue
    }

    const m = inner.match(TAG_OPEN_RE)
    if (!m) {
      textBuf += input[i]
      i++
      continue
    }
    const name = m[1]!.toLowerCase()
    if (!KNOWN_TAGS.has(name)) {
      textBuf += input[i]
      i++
      continue
    }
    const primaryRaw = m[3]
    const primary = primaryRaw !== undefined ? stripQuotes(primaryRaw) : undefined
    const attrStr = m[5] || ''
    const attrs: Record<string, string> = {}
    let am: RegExpExecArray | null
    ATTR_RE.lastIndex = 0
    while ((am = ATTR_RE.exec(attrStr)) !== null) {
      attrs[am[1]!.toLowerCase()] = stripQuotes(am[2]!)
    }

    flushText()
    const node: TagNode = { type: 'tag', name, primary, attrs, children: [] }

    if (LITERAL_CONTENT.has(name)) {
      const closeTag = `[/${name}]`
      const lower = input.toLowerCase()
      const endIdx = lower.indexOf(closeTag, close + 1)
      if (endIdx === -1) {
        target().push(node)
        stack.push(node)
        i = close + 1
        continue
      }
      const content = input.slice(close + 1, endIdx)
      node.children.push({ type: 'text', value: content })
      target().push(node)
      i = endIdx + closeTag.length
      continue
    }

    if (SELF_CLOSING.has(name)) {
      target().push(node)
      i = close + 1
      continue
    }

    target().push(node)
    stack.push(node)
    i = close + 1
  }
  flushText()
  if (overflow) result.push({ type: 'text', value: overflow })
  return result
}

function stripQuotes(v: string): string {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) {
    return v.slice(1, -1)
  }
  return v
}
