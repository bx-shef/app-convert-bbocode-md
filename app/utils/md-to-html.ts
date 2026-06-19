import MarkdownIt from 'markdown-it'

/**
 * Canonical Markdown → HTML renderer, shared by the HTML editor pane, the live
 * preview and the print document. Options mirror `md-to-bbcode` so the Markdown
 * pivot renders consistently across all three formats:
 * - `html: true`   — raw HTML in the source (e.g. the `<u>` underline fallback)
 *   passes through; everything that reaches the DOM is run through
 *   `sanitizeHtml` first, so this is safe.
 * - `linkify: false` — only explicit links / autolinks become `<a>`, matching
 *   how BBCode `[url]` is handled (no surprise auto-linking of bare URLs).
 * - `breaks: false`  — a lone newline is a soft break, not a `<br>`.
 */
const md = new MarkdownIt({ html: true, linkify: false, breaks: false, typographer: false })

/** Render Markdown to an HTML fragment (no `<html>`/`<body>` wrapper). */
export function mdToHtml(input: string): string {
  if (!input) return ''
  return md.render(normalizeListIndent(input)).trim()
}

/**
 * CommonMark requires a 3-space indent to nest under an ordered-list item like
 * `1. `, but many users intuitively type 2. Promote a 2-space indent on list
 * markers to 3 so nested lists render as expected.
 */
export function normalizeListIndent(src: string): string {
  return src.replace(/^( {2})([-*+] |\d+\. )/gm, '   $2')
}
