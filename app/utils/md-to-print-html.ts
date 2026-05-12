import MarkdownIt from 'markdown-it'

export interface MdToPrintHtmlOptions {
  title?: string
}

const md = new MarkdownIt({ html: false, linkify: true, breaks: false, typographer: false })

const PRINT_CSS = `
  *,*::before,*::after { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html,body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.4;
    color: #111;
    background: #fff;
    padding: 10mm;
  }
  h1,h2,h3,h4,h5,h6 { line-height: 1.2; margin: 0.9em 0 0.35em; page-break-after: avoid; }
  h1 { font-size: 1.6em; border-bottom: 1px solid #ddd; padding-bottom: 0.15em; }
  h2 { font-size: 1.35em; border-bottom: 1px solid #eee; padding-bottom: 0.1em; }
  h3 { font-size: 1.15em; }
  h4 { font-size: 1.05em; }
  p { margin: 0.4em 0; orphans: 3; widows: 3; }
  a { color: #0b5cad; text-decoration: underline; word-break: break-word; }
  strong { font-weight: 600; }
  ul,ol { margin: 0.4em 0; padding-left: 1.8em; }
  li { margin: 0.1em 0; }
  li > ul, li > ol { margin: 0.1em 0; padding-left: 1.6em; }
  blockquote {
    margin: 0.6em 0;
    padding: 0.15em 0.8em;
    border-left: 3px solid #cbd5e1;
    color: #475569;
    page-break-inside: avoid;
  }
  hr { border: 0; border-top: 1px solid #ddd; margin: 0.9em 0; }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 0.92em;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 3px;
  }
  pre {
    background: #f1f5f9;
    padding: 0.6em 0.8em;
    border-radius: 4px;
    overflow: auto;
    page-break-inside: avoid;
    white-space: pre-wrap;
    word-break: break-word;
  }
  pre code { background: transparent; padding: 0; border-radius: 0; font-size: 0.9em; }
  table { border-collapse: collapse; width: 100%; margin: 0.5em 0; font-size: 0.95em; }
  th,td { border: 1px solid #cbd5e1; padding: 3px 6px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; }
  img { max-width: 100%; height: auto; }
  @page { size: A4; margin: 12mm; }
  @media print {
    body { padding: 0; }
  }
`

export function mdToPrintHtml(input: string, options: MdToPrintHtmlOptions = {}): string {
  const normalized = input ? normalizeListIndent(input) : ''
  const body = normalized ? md.render(normalized) : ''
  const title = escapeHtml(options.title ?? 'Document')
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
${body}
</body>
</html>`
}

/**
 * CommonMark requires 3-space indent for nesting under an ordered-list item
 * like `1. `, but many users intuitively use 2. Promote 2-space indent on list
 * markers to 3 so nested lists render as expected.
 */
function normalizeListIndent(md: string): string {
  return md.replace(/^( {2})([-*+] |\d+\. )/gm, '   $2')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
