<script setup lang="ts">
/** Shell for one converter pane: a label row with action buttons + content. */
defineProps<{ label: string }>()
</script>

<template>
  <div class="flex flex-col gap-2 min-h-0">
    <div class="flex items-center justify-between gap-2">
      <label class="font-semibold text-(--ui-color-base-1)">{{ label }}</label>
      <div class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</template>
