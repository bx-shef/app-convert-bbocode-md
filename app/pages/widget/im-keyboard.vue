<script setup lang="ts">
import type { B24Frame } from '@bitrix24/b24jssdk'
import { Text } from '@bitrix24/b24jssdk'
import { computed, onMounted, ref, watch } from 'vue'
import { useB24 } from '~/composables/useB24'

definePageMeta({ layout: 'widget' })

const { t } = useI18n()
const toast = useToast()
const b24Instance = useB24()
const isReady = computed<boolean>(() => b24Instance.isInit())

const isBusy = ref(false)

useHead({ title: t('page.widget.keyboard.seo.title') })

const commands: { key: string, command: string }[] = [
  { key: 'cmd1', command: '/command1' },
  { key: 'cmd2', command: '/command2' },
  { key: 'cmd3', command: '/command3' },
  { key: 'cmd4', command: '/command4' }
]

async function logPlacementInterface() {
  if (!isReady.value) return
  try {
    const $b24 = b24Instance.get() as B24Frame
    const iface = await $b24.placement.getInterface()
    console.info('[widget:keyboard] placement.getInterface() ←', iface)
  } catch (e) {
    console.error('[widget:keyboard] getInterface failed', e)
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

async function sendCommand(command: string) {
  if (!isReady.value) {
    toast.add({ title: t('page.widget.keyboard.notInFrame'), color: 'air-primary-warning' })
    return
  }
  isBusy.value = true
  try {
    const $b24 = b24Instance.get() as B24Frame
    // `im:setImTextareaContent` is the IM_TEXTAREA-specific message that actually
    // mutates the chat input. `setValue` previously fired a non-existent message —
    // postMessage went out, no answer, the safely-timer resolved as success, and
    // the chat input stayed empty.
    const requestId = Text.getUuidRfc4122()
    console.info('[widget:keyboard] im:setImTextareaContent →', { requestId, command })
    const response = await $b24.parent.message.send('im:setImTextareaContent', {
      text: command,
      requestId,
      withNewLine: false,
      replace: true,
      isSafely: true,
      safelyTime: 1500
    })
    console.info('[widget:keyboard] im:setImTextareaContent ←', response)
    toast.add({ title: t('page.widget.keyboard.inserted'), color: 'air-primary-success', duration: 1200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[widget:keyboard] im:setImTextareaContent failed', e)
    toast.add({ title: t('page.widget.keyboard.insertFailed'), description: msg, color: 'air-primary-alert' })
  } finally {
    isBusy.value = false
  }
}
</script>

<template>
  <div class="-m-2 h-full flex flex-col gap-2 p-3 bg-slate-900 text-white rounded-lg">
    <div class="flex items-center gap-2">
      <AiSaleLogo class="size-8 shrink-0" />
      <div class="flex flex-col leading-tight">
        <span class="text-xs font-semibold">{{ t('page.widget.keyboard.greeting') }}</span>
        <span class="text-[10px] text-slate-400">{{ t('page.widget.keyboard.hint') }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <B24Button
        v-for="c in commands"
        :key="c.key"
        block
        size="xs"
        color="air-secondary-accent"
        :label="t(`page.widget.keyboard.commands.${c.key}`)"
        :disabled="isBusy || !isReady"
        @click="sendCommand(c.command)"
      />
    </div>
  </div>
</template>
