<script setup lang="ts">
import type { B24Frame } from '@bitrix24/b24jssdk'
import { computed, onMounted } from 'vue'
import { useClipboard } from '@vueuse/core'
import { useB24 } from '~/composables/useB24'
import { useConverter } from '~/composables/useConverter'
import BroomIcon from '@bitrix24/b24icons-vue/outline/BroomIcon'
import CopyIcon from '@bitrix24/b24icons-vue/outline/CopyIcon'
import CheckLIcon from '@bitrix24/b24icons-vue/outline/CheckLIcon'

definePageMeta({ layout: 'clear' })

const { t } = useI18n()
const toast = useToast()
const b24Instance = useB24()
const isUseB24 = computed<boolean>(() => b24Instance.isInit())

const { bbcode, markdown, settings, setBb, setMd, clear } = useConverter()

const { copy, copied, isSupported: clipboardSupported } = useClipboard({ legacy: true, copiedDuring: 1500 })

useHead({ title: t('page.index.seo.title') })

onMounted(() => {
  if (isUseB24.value) {
    const $b24 = b24Instance.get() as B24Frame
    $b24.parent.setTitle(t('page.index.seo.title'))
  }
})

async function copyText(value: string) {
  if (!value) return
  try {
    await copy(value)
    toast.add({
      title: t('page.index.ui.copied'),
      color: 'air-primary-success',
      icon: CheckLIcon,
      duration: 1500
    })
  } catch {
    toast.add({
      title: t('page.index.ui.copyFailed'),
      color: 'air-primary-alert',
      duration: 2500
    })
  }
}
</script>

<template>
  <B24DashboardPanel id="converter" :b24ui="{ body: 'p-4 sm:pt-4 scrollbar-transparent' }">
    <template #header>
      <B24DashboardNavbar :title="t('page.index.ui.title')">
        <template #right>
          <B24Button
            size="sm"
            color="air-secondary"
            :icon="BroomIcon"
            :label="t('page.index.ui.clear')"
            @click="clear"
          />
        </template>
      </B24DashboardNavbar>

      <B24DashboardToolbar class="scrollbar-thin scrollbar-transparent">
        <template #left>
          <B24Checkbox
            v-model="settings.chatMode"
            :label="t('page.index.ui.chatMode')"
            :description="t('page.index.ui.chatModeHint')"
          />
        </template>
      </B24DashboardToolbar>
    </template>

    <template #body>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
        <div class="flex flex-col gap-2 min-h-0">
          <div class="flex items-center justify-between">
            <label class="font-semibold text-(--ui-color-base-1)">Markdown</label>
            <B24Button
              size="xs"
              color="air-tertiary-no-accent"
              :icon="copied ? CheckLIcon : CopyIcon"
              :label="t('page.index.ui.copy')"
              :disabled="!markdown || !clipboardSupported"
              @click="copyText(markdown)"
            />
          </div>
          <B24Textarea
            :model-value="markdown"
            class="flex-1 font-mono text-sm [&_textarea]:h-full [&_textarea]:resize-none"
            :rows="20"
            :placeholder="t('page.index.ui.markdownPlaceholder')"
            @update:model-value="(v: string | number) => setMd(String(v))"
          />
        </div>
        <div class="flex flex-col gap-2 min-h-0">
          <div class="flex items-center justify-between">
            <label class="font-semibold text-(--ui-color-base-1)">BBCode</label>
            <B24Button
              size="xs"
              color="air-tertiary-no-accent"
              :icon="copied ? CheckLIcon : CopyIcon"
              :label="t('page.index.ui.copy')"
              :disabled="!bbcode || !clipboardSupported"
              @click="copyText(bbcode)"
            />
          </div>
          <B24Textarea
            :model-value="bbcode"
            class="flex-1 font-mono text-sm [&_textarea]:h-full [&_textarea]:resize-none"
            :rows="20"
            :placeholder="t('page.index.ui.bbcodePlaceholder')"
            @update:model-value="(v: string | number) => setBb(String(v))"
          />
        </div>
      </div>
    </template>
  </B24DashboardPanel>
</template>
