import { ref, computed, watch, type Ref } from 'vue'
import { useDebounceFn, useLocalStorage } from '@vueuse/core'
import { toMarkdown, fromMarkdown, type Format } from '~/utils/convert'
import { mdToHtml } from '~/utils/md-to-html'
import { sanitizeHtml } from '~/utils/sanitize-html'

const SETTINGS_KEY = 'app-convert-bbocode-md.settings'

interface PersistedSettings {
  chatMode: boolean
}

/**
 * Reactive three-way converter (BBCode ⇄ Markdown ⇄ HTML).
 *
 * Markdown is the pivot: editing any one format recomputes the other two from
 * it. `lastEdited` guards against the watch loop (we only ever write the formats
 * the user is NOT editing), and writes are debounced 150 ms. `preview` is the
 * sanitized rendered HTML, derived from the Markdown pivot.
 */
export function useConverter() {
  const bbcode = ref('')
  const markdown = ref('')
  const html = ref('')
  const lastEdited = ref<Format | null>(null)

  const settings = useLocalStorage<PersistedSettings>(SETTINGS_KEY, { chatMode: false }, { mergeDefaults: true })

  const refs: Record<Format, Ref<string>> = { bb: bbcode, md: markdown, html }
  const ALL: Format[] = ['bb', 'md', 'html']

  const sync = useDebounceFn(() => {
    const from = lastEdited.value
    if (!from) return
    const opts = { chatMode: settings.value.chatMode }
    const md = toMarkdown(from, refs[from].value, opts)
    for (const f of ALL) {
      if (f === from) continue
      const next = fromMarkdown(f, md, opts)
      if (refs[f].value !== next) refs[f].value = next
    }
  }, 150)

  /** Sanitized rendered HTML for the live preview pane. */
  const preview = computed(() => sanitizeHtml(mdToHtml(markdown.value)))

  watch([bbcode, markdown, html], () => {
    if (lastEdited.value) sync()
  })
  watch(() => settings.value.chatMode, () => {
    if (lastEdited.value) sync()
  })

  function set(format: Format, v: string) {
    lastEdited.value = format
    refs[format].value = v
  }

  function clear() {
    lastEdited.value = null
    bbcode.value = ''
    markdown.value = ''
    html.value = ''
  }

  return {
    bbcode,
    markdown,
    html,
    preview,
    settings,
    setBb: (v: string) => set('bb', v),
    setMd: (v: string) => set('md', v),
    setHtml: (v: string) => set('html', v),
    clear
  }
}
