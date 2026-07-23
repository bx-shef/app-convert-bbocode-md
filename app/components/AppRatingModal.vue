<script setup lang="ts">
import { useAppRating } from '~/composables/useAppRating'

// Self-contained: state comes from the useAppRating singleton, so index.vue only
// has to render <AppRatingModal /> once. Opens only inside the portal when the
// engagement policy allows (see useAppRating.maybePrompt).
const { t } = useI18n()
const { isEnabled, open, rate, snooze, dismiss } = useAppRating()
</script>

<template>
  <B24Modal
    v-if="isEnabled"
    v-model:open="open"
    :title="t('page.index.rating.title')"
    :b24ui="{ footer: 'justify-between gap-2' }"
  >
    <template #body>
      <p class="text-sm text-(--ui-color-base-3)">
        {{ t('page.index.rating.body') }}
      </p>
    </template>

    <template #footer>
      <B24Button
        color="air-tertiary-no-accent"
        :label="t('page.index.rating.dismiss')"
        @click="dismiss"
      />
      <div class="flex gap-2">
        <B24Button
          color="air-tertiary"
          :label="t('page.index.rating.later')"
          @click="snooze"
        />
        <B24Button
          color="air-primary-success"
          :label="t('page.index.rating.rate')"
          @click="rate"
        />
      </div>
    </template>
  </B24Modal>
</template>
