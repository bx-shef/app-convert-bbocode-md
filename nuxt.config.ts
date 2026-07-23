import { contentLocales } from './i18n/i18n'

const extraAllowedHosts = (process?.env.NUXT_ALLOWED_HOSTS?.split(',').map((s: string) => s.trim()).filter(Boolean)) ?? []

const prodUrl = process?.env.NUXT_PUBLIC_SITE_URL ?? ''

const cfAnalyticsToken = process?.env.NUXT_PUBLIC_CF_ANALYTICS_TOKEN ?? ''
const headScripts = cfAnalyticsToken
  ? [{
      'src': 'https://static.cloudflareinsights.com/beacon.min.js',
      'defer': true,
      'data-cf-beacon': JSON.stringify({ token: cfAnalyticsToken })
    }]
  : []

export default defineNuxtConfig({

  modules: [
    '@nuxt/eslint',
    '@bitrix24/b24ui-nuxt',
    '@bitrix24/b24jssdk-nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/i18n'
  ], devtools: { enabled: false },

  app: {
    rootAttrs: { 'data-vaul-drawer-wrapper': '' },
    head: {
      script: headScripts
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    /**
     * @memo this will be overwritten from .env or Docker_*
     * @see https://nuxt.com/docs/guide/going-further/runtime-config#example
     */
    public: {
      siteUrl: prodUrl,
      // Yandex.Metrika counter id (digits). Empty = analytics disabled. Baked at
      // BUILD time from NUXT_PUBLIC_YANDEX_COUNTER_ID; read by useMetrikaGoal and
      // rendered into a <meta> tag on the standalone converter page (index.vue),
      // which public/metrika.js reads. Loads only outside the B24 iframe.
      yandexCounterId: '',
      // Feedback worker endpoint (public URL of an external worker that opens a
      // GitHub issue in a PRIVATE bucket repo; the token lives in the worker, not
      // here). Empty = feedback feature disabled (button hidden). Baked at BUILD
      // time from NUXT_PUBLIC_FEEDBACK_URL. See useFeedback / app/utils/feedback.ts.
      feedbackUrl: '',
      // Bitrix24 Marketplace app slug/code (e.g. `shef.bbcodemd`) for the "rate
      // this app" prompt. Empty = prompt disabled. Baked at BUILD time from
      // NUXT_PUBLIC_MARKETPLACE_SLUG. See useAppRating / app/utils/app-rating.ts.
      marketplaceSlug: ''
    }
  },

  compatibilityDate: '2024-07-11',

  vite: {
    plugins: [],
    server: {
      // Fix: "Blocked request. This host is not allowed" when using tunnels like ngrok
      allowedHosts: [...extraAllowedHosts]
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
  i18n: {
    detectBrowserLanguage: false,
    strategy: 'no_prefix',
    langDir: 'locales',
    locales: contentLocales,
    defaultLocale: 'en'
  }
})
