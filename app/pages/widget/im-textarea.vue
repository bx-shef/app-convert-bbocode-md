<script setup lang="ts">
import type { B24Frame } from '@bitrix24/b24jssdk'
import { Text } from '@bitrix24/b24jssdk'
import { ref, computed } from 'vue'
import { useB24 } from '~/composables/useB24'
import { bbcodeToMd } from '~/utils/bbcode-to-md'
import { mdToBbcode } from '~/utils/md-to-bbcode'
import SendIcon from '@bitrix24/b24icons-vue/outline/SendIcon'
import DownloadIcon from '@bitrix24/b24icons-vue/outline/DownloadIcon'

definePageMeta({ layout: 'widget' })

const { t } = useI18n()
const toast = useToast()
const b24Instance = useB24()
const isReady = computed<boolean>(() => b24Instance.isInit())

const markdown = ref('')
const isBusy = ref(false)

useHead({ title: t('page.widget.im.seo.title') })

async function readFromChat() {
  if (!isReady.value) {
    toast.add({ title: t('page.widget.im.notInFrame'), color: 'air-primary-warning' })
    return
  }
  isBusy.value = true
  try {
    const $b24 = b24Instance.get() as B24Frame
    const response = await $b24.parent.message.send('im:getImTextareaContent', {
      requestId: Text.getUuidRfc4122(),
      isSafely: true,
      safelyTime: 1500
    })
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
    await $b24.parent.message.send('im:setImTextareaContent', {
      text: bb,
      requestId: Text.getUuidRfc4122(),
      withNewLine: false,
      replace: true,
      isSafely: true,
      safelyTime: 1500
    })
    toast.add({ title: t('page.widget.im.inserted'), color: 'air-primary-success', duration: 1500 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
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
