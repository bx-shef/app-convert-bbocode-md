<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFeedback } from '~/composables/useFeedback'
import CheckLIcon from '@bitrix24/b24icons-vue/outline/CheckLIcon'

// Current editor state, passed from index.vue. Attached to the report only if
// the user opts in (consent checkbox) — the deterministic converter means any
// pane is a full repro, so we attach all three.
const props = defineProps<{
  markdown: string
  bbcode: string
  html: string
  isB24: boolean
  locale: string
}>()

const { t } = useI18n()
const toast = useToast()
const { isEnabled, isSending, submit } = useFeedback()

const open = ref(false)
const comment = ref('')
// Opt-in by default (privacy): the source markup is the user's content and only
// leaves the browser on an explicit, affirmative choice.
const includeSource = ref(false)

// Something to send: a comment, or consent to attach the markup (or both).
const canSend = computed(() => !isSending.value && (comment.value.trim().length > 0 || includeSource.value))

async function send() {
  if (!canSend.value) return
  try {
    await submit({
      kind: 'wrong-conversion',
      comment: comment.value,
      includeSource: includeSource.value,
      context: {
        attachments: [
          { label: 'Markdown', format: 'markdown', content: props.markdown },
          { label: 'BBCode', format: 'bbcode', content: props.bbcode },
          { label: 'HTML', format: 'html', content: props.html }
        ]
      },
      meta: { locale: props.locale, mode: props.isB24 ? 'portal' : 'standalone' }
    })
    toast.add({ title: t('page.index.feedback.sent'), color: 'air-primary-success', icon: CheckLIcon, duration: 2000 })
    open.value = false
    comment.value = ''
    includeSource.value = false
  } catch {
    toast.add({ title: t('page.index.feedback.failed'), color: 'air-primary-alert', duration: 3000 })
  }
}
</script>

<template>
  <!-- Hidden entirely when no feedback endpoint is configured (fail-safe). -->
  <B24Modal
    v-if="isEnabled"
    v-model:open="open"
    :title="t('page.index.feedback.title')"
    :dismissible="!isSending"
    :b24ui="{ footer: 'justify-end gap-2' }"
  >
    <B24Button
      size="xs"
      color="air-tertiary-no-accent"
      :label="t('page.index.feedback.button')"
    />

    <template #body>
      <div class="flex flex-col gap-3 text-sm">
        <p class="text-(--ui-color-base-3)">
          {{ t('page.index.feedback.intro') }}
        </p>
        <B24Textarea
          v-model="comment"
          :rows="4"
          class="[&_textarea]:resize-none"
          :placeholder="t('page.index.feedback.commentPlaceholder')"
        />
        <B24Checkbox
          v-model="includeSource"
          :label="t('page.index.feedback.attach')"
          :description="t('page.index.feedback.attachHint')"
        />
      </div>
    </template>

    <template #footer="{ close }">
      <B24Button
        color="air-tertiary"
        :label="t('page.index.feedback.cancel')"
        :disabled="isSending"
        @click="close"
      />
      <B24Button
        color="air-primary-success"
        :label="t('page.index.feedback.send')"
        :loading="isSending"
        :disabled="!canSend"
        @click="send"
      />
    </template>
  </B24Modal>
</template>
