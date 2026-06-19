import { bbcodeToMd } from './bbcode-to-md'
import { mdToBbcode } from './md-to-bbcode'
import { mdToHtml } from './md-to-html'
import { htmlToMd } from './html-to-md'

/** The three editable formats. Markdown is the pivot all conversions go through. */
export type Format = 'bb' | 'md' | 'html'

export interface ConvertOptions {
  /** Chat mode: render tables as bullet lists (Bitrix24 chat has no `[table]`). */
  chatMode?: boolean
}

/** Normalize any supported format to the Markdown pivot. */
export function toMarkdown(format: Format, text: string, opts: ConvertOptions = {}): string {
  switch (format) {
    case 'md': return text
    case 'bb': return bbcodeToMd(text, opts)
    case 'html': return htmlToMd(text)
  }
}

/** Render the Markdown pivot into any supported format. */
export function fromMarkdown(format: Format, md: string, opts: ConvertOptions = {}): string {
  switch (format) {
    case 'md': return md
    case 'bb': return mdToBbcode(md, opts)
    case 'html': return mdToHtml(md)
  }
}

/** Convert directly between any two formats, via the Markdown pivot. */
export function convert(from: Format, to: Format, text: string, opts: ConvertOptions = {}): string {
  if (from === to) return text
  return fromMarkdown(to, toMarkdown(from, text, opts), opts)
}
