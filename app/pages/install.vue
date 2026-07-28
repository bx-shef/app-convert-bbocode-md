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
const configuredSiteUrl = withoutTrailingSlash((config.public.siteUrl as string) || '')

// In dev we don't know the public URL ahead of time (ngrok rotates, local IPs
// vary). Derive it from the browser address by stripping the trailing `/install`
// off the install handler URL. In prod, use the configured site URL.
const isDev = import.meta.env.DEV
const appUrl = isDev && typeof window !== 'undefined'
  ? withoutTrailingSlash(`${window.location.origin}${window.location.pathname.replace(/\/install\/?$/, '')}`)
  : configuredSiteUrl

// Stamp dev builds so the chip in the chat panel is distinguishable from prod
// when both run in the same portal. Prod has no prefix — production placements
// show their clean name. Keep it Latin/space/hyphen-only — `iconName` enforces that.
const TITLE_PREFIX = isDev ? 'dev ' : ''

const { t } = useI18n()
useHead({ title: t('page.install.seo.title') })

const router = useRouter()
const toast = useToast()
const confetti = useConfetti()
const b24Instance = useB24()

const isUseB24 = computed<boolean>(() => b24Instance.isInit())

const progressColor = ref<ProgressProps['color']>('air-primary')
const progressValue = ref<null | number>(null)

const requiredScopes = b24Instance.getRequiredRights()

const PLACEMENT = 'IM_TEXTAREA'

type PlacementBinding = {
  handlerPath: string
  title: string
  iconName: string
  width: string
  height: string
}

const ourPlacements = computed<PlacementBinding[]>(() => [
  {
    handlerPath: '/widget/im-textarea',
    title: `${TITLE_PREFIX}BBCode`,
    iconName: `${TITLE_PREFIX}BBCode`,
    width: '480',
    height: '320'
  }
])

const handlerUrl = computed(() => `${appUrl}${ourPlacements.value[0]!.handlerPath}`)
const handlerUrls = computed(() => ourPlacements.value.map(p => `${appUrl}${p.handlerPath}`))

const diagnostics = computed(() => {
  const initData = steps.value.init?.data as undefined | {
    appInfo?: { ID?: number, CODE?: string, VERSION?: string, STATUS?: string }
    profile?: { ID?: number, NAME?: string, LAST_NAME?: string, ADMIN?: boolean }
    scope?: string[]
    placementList?: { placement: string, handler: string }[]
  }
  const granted = initData?.scope ?? []
  const missing = requiredScopes.filter(s => !granted.includes(s))
  let domain = ''
  if (isUseB24.value) {
    const auth = (b24Instance.get() as B24Frame).auth.getAuthData()
    domain = auth === false ? '' : auth.domain
  }
  return {
    mode: isUseB24.value ? 'B24 frame' : 'Standalone (mock)',
    isMock: !isUseB24.value,
    domain,
    targetOrigin: isUseB24.value ? b24Instance.targetOrigin() : '—',
    handler: handlerUrl.value || '—',
    handlers: handlerUrls.value,
    appInfo: initData?.appInfo,
    profile: initData?.profile,
    granted,
    missing,
    placements: initData?.placementList ?? []
  }
})

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
  const response = await $b24.actions.v2.batch.make({
    calls: {
      appInfo: { method: 'app.info' },
      profile: { method: 'profile' },
      placementList: { method: 'placement.get' },
      scope: { method: 'scope' }
    }
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
      SCOPE?: string[]
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
    scope: string[]
  }

  const authData = $b24.auth.getAuthData()
  console.info('[install] mode=B24 frame, domain=%s, targetOrigin=%s, handlers=%o',
    authData === false ? '?' : authData.domain,
    b24Instance.targetOrigin(),
    handlerUrls.value)
  console.info('[install] app scope:', steps.value.init.data.scope)
  console.info('[install] existing placements:', steps.value.init.data.placementList)
}

async function makePlacement(): Promise<void> {
  if (!isUseB24.value) return
  const $b24 = b24Instance.get() as B24Frame

  const placementList = (steps.value.init?.data?.placementList as { placement: string, handler: string }[] | undefined) || []
  // Collect every existing IM_TEXTAREA binding from this app (any handler) — we may have stale
  // bindings from a previous deploy under a different domain or with broken OPTIONS. Clear them
  // all before re-binding so we end up with exactly one clean registration per handler we want.
  const stale = placementList.filter(item => item.placement === PLACEMENT)

  const calls: { method: string, params: Record<string, unknown> }[] = []
  for (const s of stale) {
    calls.push({ method: 'placement.unbind', params: { PLACEMENT, HANDLER: s.handler } })
  }

  for (const p of ourPlacements.value) {
    const HANDLER = `${appUrl}${p.handlerPath}`
    const TITLE = p.title
    calls.push({
      method: 'placement.bind',
      params: {
        PLACEMENT,
        HANDLER,
        TITLE,
        LANG_ALL: {
          ru: { TITLE },
          en: { TITLE }
        },
        OPTIONS: {
          // iconName here is the visible LABEL on the chip in the chat panel — not an icon class.
          // Constraints (per apidocs): ≤50 chars, Latin letters / space / hyphen only.
          iconName: p.iconName,
          // ALL = USER + CHAT + LINES + CRM (per B24 docs: when ALL is passed
          // together with other contexts, only ALL takes effect).
          context: 'ALL',
          role: 'USER',
          color: 'AZURE',
          // width/height: integer percentages of the popup container (per B24 docs:
          // `width >= 0`, default 100). Big values (480 / 320) open the popup at
          // its max size; small values like 80 made it tiny. Per-placement
          // sizing lives on the binding above.
          width: p.width,
          height: p.height,
          extranet: 'N'
        }
      }
    })
  }

  const result = await $b24.actions.v2.batch.make({ calls, options: { isHaltOnError: false } })
  console.info('[install] placement.bind result:', result.getData())

  // Refresh placement list so the diagnostic panel reflects the new state.
  const after = await $b24.actions.v2.call.make({ method: 'placement.get' })
  if (steps.value.init?.data) {
    steps.value.init.data.placementList = ((after.getData() as { result?: unknown })?.result ?? []) as never
  }
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
        description: t('page.install.mock.description'),
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
      <div class="self-end">
        <B24Badge
          :label="diagnostics.mode"
          :color="diagnostics.isMock ? 'air-primary-warning' : 'air-primary-success'"
          variant="soft"
        />
      </div>

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

      <div class="w-full max-w-2xl mt-6">
        <B24Accordion
          :items="[{ label: t('page.install.diagnostics.title'), value: 'diag', slot: 'diag' }]"
          type="multiple"
        >
          <template #diag>
            <div class="flex flex-col gap-3 text-sm font-mono p-2">
              <div class="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
                <span class="text-(--ui-color-base-3)">{{ t('page.install.diagnostics.mode') }}:</span>
                <span>{{ diagnostics.mode }}</span>
                <span class="text-(--ui-color-base-3)">{{ t('page.install.diagnostics.domain') }}:</span>
                <span>{{ diagnostics.domain || '—' }}</span>
                <span class="text-(--ui-color-base-3)">{{ t('page.install.diagnostics.targetOrigin') }}:</span>
                <span class="break-all">{{ diagnostics.targetOrigin }}</span>
                <span class="text-(--ui-color-base-3)">{{ t('page.install.diagnostics.handler') }}:</span>
                <span class="break-all">
                  <span v-for="(h, hi) in diagnostics.handlers" :key="hi" class="block">{{ h }}</span>
                </span>
                <template v-if="diagnostics.appInfo">
                  <span class="text-(--ui-color-base-3)">{{ t('page.install.diagnostics.appCode') }}:</span>
                  <span>{{ diagnostics.appInfo.CODE }} (id {{ diagnostics.appInfo.ID }}, v{{ diagnostics.appInfo.VERSION }})</span>
                </template>
              </div>

              <div v-if="diagnostics.granted.length || diagnostics.missing.length" class="flex flex-col gap-1">
                <span class="text-(--ui-color-base-3)">{{ t('page.install.diagnostics.scopes') }}:</span>
                <div class="flex flex-wrap gap-1">
                  <B24Badge
                    v-for="s in diagnostics.granted"
                    :key="`g-${s}`"
                    :label="s"
                    color="air-primary-success"
                    variant="soft"
                    size="sm"
                  />
                  <B24Badge
                    v-for="s in diagnostics.missing"
                    :key="`m-${s}`"
                    :label="`${s} (missing)`"
                    color="air-primary-alert"
                    variant="soft"
                    size="sm"
                  />
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-(--ui-color-base-3)">{{ t('page.install.diagnostics.placements') }}:</span>
                <div v-if="diagnostics.placements.length === 0" class="text-(--ui-color-base-3) italic">
                  {{ t('page.install.diagnostics.noPlacements') }}
                </div>
                <ul v-else class="list-none m-0 p-0 flex flex-col gap-1">
                  <li v-for="(p, i) in diagnostics.placements" :key="i" class="break-all">
                    <strong>{{ p.placement }}</strong> → {{ p.handler }}
                  </li>
                </ul>
              </div>
            </div>
          </template>
        </B24Accordion>
      </div>
    </template>
  </B24DashboardPanel>
</template>
