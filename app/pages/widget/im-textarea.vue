<script setup lang="ts">
import type { B24Frame } from '@bitrix24/b24jssdk'
import { Text } from '@bitrix24/b24jssdk'
import { ref, computed, onMounted, watch } from 'vue'
import { useB24 } from '~/composables/useB24'
import { usePrint } from '~/composables/usePrint'
import { bbcodeToMd } from '~/utils/bbcode-to-md'
import { mdToBbcode } from '~/utils/md-to-bbcode'
import SendIcon from '@bitrix24/b24icons-vue/outline/SendIcon'
import DownloadIcon from '@bitrix24/b24icons-vue/outline/DownloadIcon'
import PrinterIcon from '@bitrix24/b24icons-vue/outline/PrinterIcon'

definePageMeta({ layout: 'widget' })

const { t } = useI18n()
const toast = useToast()
const b24Instance = useB24()
const isReady = computed<boolean>(() => b24Instance.isInit())

const markdown = ref('')
const isBusy = ref(false)

const { printMarkdown } = usePrint()

useHead({ title: t('page.widget.im.seo.title') })

async function logPlacementInterface() {
  if (!isReady.value) return
  try {
    const $b24 = b24Instance.get() as B24Frame
    const iface = await $b24.placement.getInterface()
    console.info('[widget] placement.getInterface() ←', iface)
    const info = $b24.placement
    console.info('[widget] placement.title =', info.title, '| options =', info.options)
  } catch (e) {
    console.error('[widget] getInterface failed', e)
  }
}

onMounted(() => {
  if (isReady.value) {
    logPlacementInterface()
  } else {
    const stop = watch(isReady, (v) => {
      if (v) {
        stop()
        logPlacementInterface()
      }
    })
  }
})

async function readFromChat() {
  if (!isReady.value) {
    toast.add({ title: t('page.widget.im.notInFrame'), color: 'air-primary-warning' })
    return
  }
  isBusy.value = true
  try {
    const $b24 = b24Instance.get() as B24Frame
    const requestId = Text.getUuidRfc4122()
    console.info('[widget] im:getImTextareaContent →', { requestId })
    const response = await $b24.parent.message.send('im:getImTextareaContent', {
      requestId,
      isSafely: true,
      safelyTime: 1500
    })
    console.info('[widget] im:getImTextareaContent ←', response)
    const text = typeof response === 'string' ? response : (response as { text?: string })?.text || ''
    // Chat content is BBCode → convert to MD for editing
    markdown.value = bbcodeToMd(text)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    toast.add({ title: t('page.widget.im.readFailed'), description: msg, color: 'air-primary-alert' })
  } finally {
    isBusy.value = false
  }
}

async function printText() {
  if (!markdown.value.trim()) return
  try {
    await printMarkdown(markdown.value)
  } catch {
    toast.add({ title: t('page.widget.im.printFailed'), color: 'air-primary-alert', duration: 2500 })
  }
}

async function sendToChat() {
  if (!isReady.value) {
    toast.add({ title: t('page.widget.im.notInFrame'), color: 'air-primary-warning' })
    return
  }
  if (!markdown.value.trim()) return
  isBusy.value = true
  try {
    const $b24 = b24Instance.get() as B24Frame
    const bb = mdToBbcode(markdown.value, { chatMode: true })
    // Direct parent.message.send is the documented postMessage path; placement.call
    // is a thin wrapper around it. For `setValue` the value must be sent raw
    // (no JSON.stringify) — that's what `isRawValue: true` controls.
    console.info('[widget] parent.message.send(setValue) →', {
      targetOrigin: b24Instance.targetOrigin?.(),
      bbPreview: bb.slice(0, 200)
    })
    const response = await $b24.parent.message.send('setValue', {
      value: bb,
      isRawValue: true,
      isSafely: true
    })
    console.info('[widget] parent.message.send(setValue) ←', response)
    toast.add({ title: t('page.widget.im.inserted'), color: 'air-primary-success', duration: 1500 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[widget] parent.message.send(setValue) failed', e)
    toast.add({ title: t('page.widget.im.insertFailed'), description: msg, color: 'air-primary-alert' })
  } finally {
    isBusy.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-2 h-full">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs text-(--ui-color-base-3)">{{ t('page.widget.im.hint') }}</span>
      <div class="flex gap-2">
        <B24Button
          size="xs"
          color="air-secondary"
          :icon="DownloadIcon"
          :label="t('page.widget.im.read')"
          :disabled="isBusy || !isReady"
          @click="readFromChat"
        />
        <B24Button
          size="xs"
          color="air-secondary"
          :icon="PrinterIcon"
          :label="t('page.widget.im.print')"
          :disabled="isBusy || !markdown.trim()"
          @click="printText"
        />
        <B24Button
          size="xs"
          color="air-primary"
          :icon="SendIcon"
          :label="t('page.widget.im.send')"
          :disabled="isBusy || !isReady || !markdown.trim()"
          @click="sendToChat"
        />
      </div>
    </div>
    <B24Textarea
      v-model="markdown"
      class="flex-1 font-mono text-sm [&_textarea]:h-full [&_textarea]:resize-none"
      :rows="10"
      :placeholder="t('page.widget.im.placeholder')"
    />
  </div>
</template>
