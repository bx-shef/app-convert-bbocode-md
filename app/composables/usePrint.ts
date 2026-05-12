import { mdToPrintHtml, type MdToPrintHtmlOptions } from '~/utils/md-to-print-html'

export function usePrint() {
  async function printMarkdown(markdown: string, options: MdToPrintHtmlOptions = {}): Promise<void> {
    if (!markdown || !markdown.trim()) return
    if (typeof window === 'undefined') return

    const html = mdToPrintHtml(markdown, options)

    // Chrome / Edge / Firefox use the *parent* document.title as the default
    // PDF filename when printing an iframe — the iframe's own <title> is
    // ignored. Override the parent title for the duration of the print dialog
    // and restore it during cleanup.
    const requestedTitle = options.title
    const originalParentTitle = document.title
    if (requestedTitle) {
      document.title = requestedTitle
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    const win = iframe.contentWindow
    if (!doc || !win) {
      iframe.remove()
      if (requestedTitle) document.title = originalParentTitle
      throw new Error('Print iframe not available')
    }

    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      window.removeEventListener('focus', onFocus)
      if (requestedTitle) document.title = originalParentTitle
      try {
        iframe.remove()
      } catch {
        // iframe already gone
      }
    }
    const onFocus = () => setTimeout(cleanup, 100)

    win.addEventListener('afterprint', cleanup)
    window.addEventListener('focus', onFocus)

    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => {
        try {
          win.focus()
          win.print()
          resolve()
        } catch (e) {
          cleanup()
          reject(e instanceof Error ? e : new Error(String(e)))
        }
      }
      doc.open()
      doc.write(html)
      doc.close()
    })

    setTimeout(cleanup, 5000)
  }

  return { printMarkdown }
}
