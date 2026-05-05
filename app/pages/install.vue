<script setup lang="ts">
import type { IStep } from '../types'
import type { ProgressProps } from '@bitrix24/b24ui-nuxt'
import type { B24Frame } from '@bitrix24/b24jssdk'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useB24 } from '../composables/useB24'
import { sleepAction } from '../utils'
import { withoutTrailingSlash } from 'ufo'
import Market1Icon from '@bitrix24/b24icons-vue/main/Market1Icon'

definePageMeta({ layout: 'clear' })

const config = useRuntimeConfig()
const appUrl = withoutTrailingSlash((config.public.siteUrl as string) || '')

const { t } = useI18n()
useHead({ title: t('page.install.seo.title') })

const router = useRouter()
const toast = useToast()
const confetti = useConfetti()
const b24Instance = useB24()

const isUseB24 = computed<boolean>(() => b24Instance.isInit())

const isShowDebug = ref(false)
const progressColor = ref<ProgressProps['color']>('air-primary')
const progressValue = ref<null | number>(null)

const steps = ref<Record<string, IStep>>({
  init: {
    caption: t('page.install.step.init.caption'),
    action: makeInit
  },
  placement: {
    caption: t('page.install.step.placement.caption'),
    action: makePlacement
  },
  finish: {
    caption: t('page.install.step.finish.caption'),
    action: makeFinish
  }
})
const stepCode = ref<string>('init' as const)

async function makeInit(): Promise<void> {
  if (!isUseB24.value) return
  const $b24 = b24Instance.get() as B24Frame

  $b24.parent.setTitle(t('page.install.seo.title'))

  if (!steps.value.init) return
  const response = await $b24.callBatch({
    appInfo: { method: 'app.info' },
    profile: { method: 'profile' },
    placementList: { method: 'placement.get' }
  })

  steps.value.init.data = response.getData() as {
    appInfo: {
      ID: number
      CODE: string
      VERSION: string
      STATUS: string
      LICENSE: string
      LICENSE_FAMILY: string
      INSTALLED: boolean
    }
    profile: {
      ID: number
      ADMIN: boolean
      LAST_NAME?: string
      NAME?: string
    }
    placementList: {
      placement: string
      userId: number
      handler: string
      options: unknown
      title: string
      description: string
    }[]
  }
}

async function makePlacement(): Promise<void> {
  if (!isUseB24.value) return
  const $b24 = b24Instance.get() as B24Frame

  const PLACEMENT = 'IM_TEXTAREA'
  const HANDLER = `${appUrl}/widget/im-textarea`

  const placementList = (steps.value.init?.data?.placementList as { placement: string, handler: string }[] | undefined) || []
  const exists = placementList.some(item => item.placement === PLACEMENT && item.handler === HANDLER)

  const bindParams = {
    PLACEMENT,
    HANDLER,
    LANG_ALL: {
      ru: { TITLE: 'BBCode ↔ MD' },
      en: { TITLE: 'BBCode ↔ MD' }
    },
    OPTIONS: {
      iconName: 'fa-cube',
      context: 'USER;CHAT',
      role: 'USER',
      color: 'AZURE',
      width: '480',
      height: '320',
      extranet: 'N'
    }
  }

  if (exists) {
    await $b24.callBatch([
      { method: 'placement.unbind', params: { PLACEMENT, HANDLER } },
      { method: 'placement.bind', params: bindParams }
    ], false)
    return
  }

  await $b24.callBatch([
    { method: 'placement.bind', params: bindParams }
  ], false)
}

async function makeFinish(): Promise<void> {
  if (!isUseB24.value) return
  const $b24 = b24Instance.get() as B24Frame

  progressColor.value = 'air-primary-success'
  progressValue.value = 100

  confetti.fire()
  await sleepAction(3000)

  await $b24.installFinish()
}

const stepsData = computed(() => {
  return Object.entries(steps.value).map(([index, row]) => ({
    step: index,
    data: row?.data
  }))
})

async function waitForB24(timeoutMs = 10000): Promise<boolean> {
  const start = Date.now()
  while (!isUseB24.value && (Date.now() - start) < timeoutMs) {
    await sleepAction(100)
  }
  return isUseB24.value
}

onMounted(async () => {
  try {
    const ready = await waitForB24()

    if (!ready) {
      toast.add({
        id: 'install-warning-mock',
        title: t('mock.toast.title'),
        description: t('mock.toast.description'),
        icon: Market1Icon,
        color: 'air-primary-warning',
        duration: 0,
        close: false
      })

      for (const key of Object.keys(steps.value)) {
        stepCode.value = key
        await sleepAction(600)
      }

      progressColor.value = 'air-primary-warning'
      progressValue.value = 99

      confetti.fire()
      await sleepAction(3000)

      toast.remove('install-warning-mock')
      return router.replace('/')
    }

    const $b24 = b24Instance.get() as B24Frame
    await $b24.parent.setTitle(t('page.install.seo.title'))

    for (const [key, step] of Object.entries(steps.value)) {
      stepCode.value = key
      await step.action()
    }
  } catch (error: unknown) {
    console.error(error)
    throw error
  }
})
</script>

<template>
  <B24DashboardPanel
    id="install"
    :b24ui="{ body: 'p-4 sm:pt-4 items-center justify-center gap-1 sm:gap-1 scrollbar-transparent' }"
  >
    <template #body>
      <AppLogo
        class="size-[208px]"
        :class="[stepCode === 'finish' ? 'text-(--ui-color-accent-main-success)' : 'text-(--ui-color-accent-soft-green-1)']"
      />
      <B24Progress
        v-model="progressValue"
        size="xs"
        animation="elastic"
        :color="progressColor"
        class="w-1/2 sm:w-1/3"
      />
      <div class="mt-6 flex flex-col items-center justify-center gap-2">
        <ProseH1 class="text-nowrap mb-0">
          {{ $t('page.install.ui.title') }}
        </ProseH1>
        <ProseP small accent="less">
          {{ steps[stepCode]?.caption || '...' }}
        </ProseP>
      </div>

      <ProsePre v-if="isShowDebug">
        {{ stepsData }}
      </ProsePre>
    </template>
  </B24DashboardPanel>
</template>
