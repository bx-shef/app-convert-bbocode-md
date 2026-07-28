<script setup lang="ts">
import type { B24Frame, Result } from '@bitrix24/b24jssdk'
import type { ToasterProps } from '@bitrix24/b24ui-nuxt'
import { ref, provide, readonly } from 'vue'
import * as locales from '@bitrix24/b24ui-nuxt/locale'
import { sleepAction } from './utils'
import CloudErrorIcon from '@bitrix24/b24icons-vue/main/CloudErrorIcon'

const config = useRuntimeConfig()

const toast = useToast()
const { t, locale, defaultLocale, locales: localesI18n, setLocale } = useI18n()
const b24Instance = useB24()
const { isBitrixMobile } = useDevice()

const isLoading = ref(true)
const toaster: ToasterProps = { position: isBitrixMobile.value ? 'bottom-center' : 'top-right' }

const lang = computed(() => locales[locale.value]?.code || defaultLocale)
const dir = computed(() => locales[locale.value]?.dir || 'ltr')

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: `${config.app.baseURL}favicon.ico?v=2` }
  ],
  htmlAttrs: {
    lang,
    dir
  }
})

const title = 'BBCode ↔ Markdown'
const description = 'Конвертер BBCode Bitrix24 в Markdown и обратно'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})

provide('isLoading', readonly(isLoading))

onMounted(async () => {
  const result: Result = await b24Instance.init()
  if (!result.isSuccess) {
    toast.add({
      title: t('error.title'),
      description: result.getErrorMessages().join('\n'),
      color: 'air-primary-alert',
      icon: CloudErrorIcon
    })
  } else {
    if (b24Instance.isInit()) {
      const targetCode = String((b24Instance.get() as B24Frame).getLang())
      const available = localesI18n.value.map(i => String(i.code))
      const exact = available.includes(targetCode)
      const fuzzy = !exact ? available.find(c => targetCode.startsWith(c)) : undefined
      const pick = exact ? targetCode : fuzzy
      console.info('[i18n] B24 lang =', targetCode, '| picked =', pick ?? '(none, keep default)')
      if (pick) {
        await setLocale(pick as never)
      }
    }
  }

  // Used to display the connection loading indicator
  await sleepAction(1000)
  isLoading.value = false
})
</script>

<template>
  <B24App :toaster="toaster" :locale="locales[locale]">
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </B24App>
</template>
