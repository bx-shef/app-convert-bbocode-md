import { mdToPrintHtml, type MdToPrintHtmlOptions } from '~/utils/md-to-print-html'

export function usePrint() {
  async function printMarkdown(markdown: string, options: MdToPrintHtmlOptions = {}): Promise<void> {
    if (!markdown || !markdown.trim()) return
    if (typeof window === 'undefined') return

    const html = mdToPrintHtml(markdown, options)

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    const win = iframe.contentWindow
    if (!doc || !win) {
      iframe.remove()
      throw new Error('Print iframe not available')
    }

    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      try {
        iframe.remove()
      } catch {
        // iframe already gone
      }
    }

    win.addEventListener('afterprint', () => setTimeout(cleanup, 0))

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

    setTimeout(cleanup, 60_000)
  }

  return { printMarkdown }
}
