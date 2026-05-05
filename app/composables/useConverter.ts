import { ref, watch } from 'vue'
import { useDebounceFn, useLocalStorage } from '@vueuse/core'
import { bbcodeToMd } from '~/utils/bbcode-to-md'
import { mdToBbcode } from '~/utils/md-to-bbcode'

const SETTINGS_KEY = 'app-convert-bbocode-md.settings'

interface PersistedSettings {
  chatMode: boolean
}

export function useConverter() {
  const bbcode = ref('')
  const markdown = ref('')
  const lastEdited = ref<'bb' | 'md' | null>(null)

  const settings = useLocalStorage<PersistedSettings>(SETTINGS_KEY, { chatMode: false }, { mergeDefaults: true })

  const syncFromBb = useDebounceFn(() => {
    if (lastEdited.value !== 'bb') return
    markdown.value = bbcodeToMd(bbcode.value, { chatMode: settings.value.chatMode })
  }, 150)

  const syncFromMd = useDebounceFn(() => {
    if (lastEdited.value !== 'md') return
    bbcode.value = mdToBbcode(markdown.value, { chatMode: settings.value.chatMode })
  }, 150)

  watch(bbcode, () => {
    if (lastEdited.value === 'bb') syncFromBb()
  })
  watch(markdown, () => {
    if (lastEdited.value === 'md') syncFromMd()
  })

  watch(() => settings.value.chatMode, () => {
    if (lastEdited.value === 'bb') syncFromBb()
    else if (lastEdited.value === 'md') syncFromMd()
  })

  function setBb(v: string) {
    lastEdited.value = 'bb'
    bbcode.value = v
  }

  function setMd(v: string) {
    lastEdited.value = 'md'
    markdown.value = v
  }

  function clear() {
    lastEdited.value = null
    bbcode.value = ''
    markdown.value = ''
  }

  return { bbcode, markdown, settings, setBb, setMd, clear }
}
