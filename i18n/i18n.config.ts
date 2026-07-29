export default defineI18nConfig(() => ({
  legacy: false,
  // Without this, @nuxtjs/i18n defaults `fallbackLocale` to `false` and a key
  // missing from the active locale renders as the raw key path
  // ("page.index.ui.title") — 17 of our 19 locales ship 4 of 87 keys, so the UI
  // looked broken in them. English is the fully-translated default.
  fallbackLocale: 'en',
  // Falling back is the expected path for those 17 locales, not an error —
  // keep the console clean instead of warning on every key.
  silentFallbackWarn: true,
  silentTranslationWarn: true,
  missingWarn: false,
  fallbackWarn: false
}))
