<script setup lang="ts">
import type { B24Frame } from '@bitrix24/b24jssdk'
import type { TabsItem } from '@bitrix24/b24ui-nuxt'
import { computed, onMounted } from 'vue'
import { useClipboard, useEventListener } from '@vueuse/core'
import { useB24 } from '~/composables/useB24'
import { useConverter } from '~/composables/useConverter'
import { usePrint } from '~/composables/usePrint'
import BroomIcon from '@bitrix24/b24icons-vue/outline/BroomIcon'
import CopyIcon from '@bitrix24/b24icons-vue/outline/CopyIcon'
import CheckLIcon from '@bitrix24/b24icons-vue/outline/CheckLIcon'
import PrinterIcon from '@bitrix24/b24icons-vue/outline/PrinterIcon'
import GitHubIcon from '@bitrix24/b24icons-vue/social/GitHubIcon'

definePageMeta({ layout: 'clear' })

const { t, locale, locales: localesI18n, setLocale } = useI18n()
const toast = useToast()
const b24Instance = useB24()
const isUseB24 = computed<boolean>(() => b24Instance.isInit())

const requiredScopes = b24Instance.getRequiredRights()
const localeOptions = computed(() => localesI18n.value.map(l => ({ label: l.name ?? l.code, value: l.code })))

const { bbcode, markdown, html, preview, settings, setBb, setMd, setHtml, clear } = useConverter()

const { copy, copied, isSupported: clipboardSupported } = useClipboard({ legacy: true, copiedDuring: 1500 })
const { printMarkdown } = usePrint()

const currentYear = new Date().getFullYear()

// The three editable formats. Markdown carries the print action (it is the
// canonical document the preview/print are rendered from).
const editablePanes = [
  { key: 'md', label: 'Markdown', model: markdown, set: setMd, placeholderKey: 'markdownPlaceholder', canPrint: true },
  { key: 'bb', label: 'BBCode', model: bbcode, set: setBb, placeholderKey: 'bbcodePlaceholder', canPrint: false },
  { key: 'html', label: 'HTML', model: html, set: setHtml, placeholderKey: 'htmlPlaceholder', canPrint: false }
] as const

const tabItems = computed<TabsItem[]>(() => [
  { label: 'Markdown', value: 'md', slot: 'md' },
  { label: 'BBCode', value: 'bb', slot: 'bb' },
  { label: 'HTML', value: 'html', slot: 'html' },
  { label: t('page.index.ui.preview'), value: 'preview', slot: 'preview' }
])

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

async function printText(value: string) {
  if (!value) return
  try {
    await printMarkdown(value)
  } catch {
    toast.add({
      title: t('page.index.ui.printFailed'),
      color: 'air-primary-alert',
      duration: 2500
    })
  }
}

// Ctrl/Cmd+P → print rendered Markdown (instead of the surrounding B24 portal).
useEventListener('keydown', (e: KeyboardEvent) => {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return
  if (e.key.toLowerCase() !== 'p') return
  if (!markdown.value) return
  e.preventDefault()
  printText(markdown.value)
})
</script>

<template>
  <B24DashboardPanel id="converter" :b24ui="{ body: 'p-4 sm:pt-4 scrollbar-transparent' }">
    <template #header>
      <B24DashboardNavbar :title="t('page.index.ui.title')">
        <template #right>
          <B24Badge
            :label="isUseB24 ? t('page.index.mode.b24') : t('page.index.mode.standalone')"
            :color="isUseB24 ? 'air-primary-success' : 'air-primary-warning'"
            variant="soft"
            size="sm"
          />
          <B24Select
            size="sm"
            :items="localeOptions"
            :model-value="locale"
            :aria-label="t('page.index.ui.language')"
            class="min-w-32"
            @update:model-value="(v) => setLocale(v as never)"
          />
          <!-- Theme toggle only standalone: inside B24 the theme follows the portal. -->
          <B24ColorModeButton v-if="!isUseB24" size="sm" />
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
      <!-- Desktop: 2×2 panes — Markdown / BBCode / HTML / Preview -->
      <div class="hidden md:grid grid-cols-2 gap-4">
        <ConverterPane
          v-for="pane in editablePanes"
          :key="pane.key"
          :label="pane.label"
        >
          <template #actions>
            <B24Button
              v-if="pane.canPrint"
              size="xs"
              color="air-tertiary-no-accent"
              :icon="PrinterIcon"
              :label="t('page.index.ui.print')"
              :disabled="!markdown"
              @click="printText(markdown)"
            />
            <B24Button
              size="xs"
              color="air-tertiary-no-accent"
              :icon="copied ? CheckLIcon : CopyIcon"
              :label="t('page.index.ui.copy')"
              :disabled="!pane.model.value || !clipboardSupported"
              @click="copyText(pane.model.value)"
            />
          </template>
          <B24Textarea
            :model-value="pane.model.value"
            class="font-mono text-sm [&_textarea]:resize-none"
            :rows="12"
            :placeholder="t(`page.index.ui.${pane.placeholderKey}`)"
            @update:model-value="(v: string | number) => pane.set(String(v))"
          />
        </ConverterPane>

        <ConverterPane :label="t('page.index.ui.preview')">
          <template #actions>
            <B24Button
              size="xs"
              color="air-tertiary-no-accent"
              :icon="PrinterIcon"
              :label="t('page.index.ui.print')"
              :disabled="!markdown"
              @click="printText(markdown)"
            />
          </template>
          <!-- preview is sanitized in useConverter → safe to render -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="preview" class="preview-html min-h-[18rem] overflow-auto rounded-md border border-gray-200 p-3 text-sm dark:border-white/10" v-html="preview" />
          <div
            v-else
            class="min-h-[18rem] rounded-md border border-gray-200 p-3 text-sm text-(--ui-color-base-4) dark:border-white/10"
          >
            {{ t('page.index.ui.previewEmpty') }}
          </div>
        </ConverterPane>
      </div>

      <!-- Setup instructions (hidden inside Bitrix24 placement to keep UI clean there) -->
      <div v-if="!isUseB24" class="hidden md:block mt-6">
        <B24Accordion
          :items="[
            { label: t('page.index.setup.installB24'), value: 'install', slot: 'install' },
            { label: t('page.index.setup.selfHost'), value: 'host', slot: 'host' }
          ]"
          type="multiple"
        >
          <template #install>
            <div class="text-sm flex flex-col gap-2 p-2">
              <p>{{ t('page.index.setup.installB24Intro') }}</p>
              <ol class="list-decimal pl-6 flex flex-col gap-1">
                <li>{{ t('page.index.setup.installB24Step1') }}</li>
                <li>
                  {{ t('page.index.setup.installB24Step2') }}
                  <code class="font-mono text-xs">https://convert-bbocode-md.bx-shef.by</code>
                </li>
                <li>
                  {{ t('page.index.setup.installB24Step3') }}
                  <code class="font-mono text-xs">https://convert-bbocode-md.bx-shef.by/install</code>
                </li>
                <li>
                  {{ t('page.index.setup.installB24Step4') }}
                  <code class="font-mono text-xs">{{ requiredScopes.join(', ') }}</code>
                </li>
                <li>{{ t('page.index.setup.installB24Step5') }}</li>
              </ol>
            </div>
          </template>
          <template #host>
            <div class="text-sm flex flex-col gap-2 p-2">
              <p>{{ t('page.index.setup.selfHostIntro') }}</p>
              <p>
                {{ t('page.index.setup.selfHostReadme') }}
                <a
                  href="https://github.com/bx-shef/app-convert-bbocode-md#readme"
                  target="_blank"
                  rel="noopener"
                  class="underline"
                >
                  README
                </a>.
              </p>
              <ul class="list-disc pl-6 flex flex-col gap-1">
                <li>{{ t('page.index.setup.selfHostOption1') }}</li>
                <li>{{ t('page.index.setup.selfHostOption2') }}</li>
              </ul>
            </div>
          </template>
        </B24Accordion>
      </div>

      <!-- Mobile: tabs -->
      <B24Tabs
        :items="tabItems"
        default-value="md"
        class="md:hidden h-full flex flex-col"
        :b24ui="{ root: 'h-full', content: 'flex-1 min-h-0 mt-2' }"
      >
        <template #md>
          <ConverterPane label="Markdown" class="h-full min-h-[60vh]">
            <template #actions>
              <B24Button
                size="xs"
                color="air-tertiary-no-accent"
                :icon="PrinterIcon"
                :label="t('page.index.ui.print')"
                :disabled="!markdown"
                @click="printText(markdown)"
              />
              <B24Button
                size="xs"
                color="air-tertiary-no-accent"
                :icon="copied ? CheckLIcon : CopyIcon"
                :label="t('page.index.ui.copy')"
                :disabled="!markdown || !clipboardSupported"
                @click="copyText(markdown)"
              />
            </template>
            <B24Textarea
              :model-value="markdown"
              class="flex-1 font-mono text-sm [&_textarea]:h-full [&_textarea]:resize-none"
              :rows="14"
              :placeholder="t('page.index.ui.markdownPlaceholder')"
              @update:model-value="(v: string | number) => setMd(String(v))"
            />
          </ConverterPane>
        </template>
        <template #bb>
          <ConverterPane label="BBCode" class="h-full min-h-[60vh]">
            <template #actions>
              <B24Button
                size="xs"
                color="air-tertiary-no-accent"
                :icon="copied ? CheckLIcon : CopyIcon"
                :label="t('page.index.ui.copy')"
                :disabled="!bbcode || !clipboardSupported"
                @click="copyText(bbcode)"
              />
            </template>
            <B24Textarea
              :model-value="bbcode"
              class="flex-1 font-mono text-sm [&_textarea]:h-full [&_textarea]:resize-none"
              :rows="14"
              :placeholder="t('page.index.ui.bbcodePlaceholder')"
              @update:model-value="(v: string | number) => setBb(String(v))"
            />
          </ConverterPane>
        </template>
        <template #html>
          <ConverterPane label="HTML" class="h-full min-h-[60vh]">
            <template #actions>
              <B24Button
                size="xs"
                color="air-tertiary-no-accent"
                :icon="copied ? CheckLIcon : CopyIcon"
                :label="t('page.index.ui.copy')"
                :disabled="!html || !clipboardSupported"
                @click="copyText(html)"
              />
            </template>
            <B24Textarea
              :model-value="html"
              class="flex-1 font-mono text-sm [&_textarea]:h-full [&_textarea]:resize-none"
              :rows="14"
              :placeholder="t('page.index.ui.htmlPlaceholder')"
              @update:model-value="(v: string | number) => setHtml(String(v))"
            />
          </ConverterPane>
        </template>
        <template #preview>
          <ConverterPane :label="t('page.index.ui.preview')" class="h-full min-h-[60vh]">
            <template #actions>
              <B24Button
                size="xs"
                color="air-tertiary-no-accent"
                :icon="PrinterIcon"
                :label="t('page.index.ui.print')"
                :disabled="!markdown"
                @click="printText(markdown)"
              />
            </template>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="preview" class="preview-html flex-1 min-h-0 overflow-auto rounded-md border border-gray-200 p-3 text-sm dark:border-white/10" v-html="preview" />
            <div
              v-else
              class="flex-1 min-h-0 rounded-md border border-gray-200 p-3 text-sm text-(--ui-color-base-4) dark:border-white/10"
            >
              {{ t('page.index.ui.previewEmpty') }}
            </div>
          </ConverterPane>
        </template>
      </B24Tabs>
    </template>

    <!-- Standalone footer — credits + links, unified with the currency-converter sibling app -->
    <template v-if="!isUseB24" #footer>
      <nav class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-(--ui-color-base-4)">
        <span>© {{ currentYear }} ИП Шевчик И. С</span>
        <a
          href="https://offer.bx-shef.by/"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:underline"
        >offer.bx-shef.by</a>
        <a
          href="https://github.com/bx-shef/app-convert-bbocode-md"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 hover:underline"
        >
          <GitHubIcon class="size-3.5" />GitHub
        </a>
      </nav>
    </template>
  </B24DashboardPanel>
</template>
