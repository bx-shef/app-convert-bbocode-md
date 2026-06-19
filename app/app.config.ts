export default defineAppConfig({
  // b24ui reads colorMode from the TOP LEVEL of appConfig — without these keys
  // `useColorMode()` is a no-op stub and the theme toggle does nothing.
  // `auto` follows the OS / portal on first visit; the choice persists under
  // `colorModeStorageKey`.
  colorMode: true,
  colorModeInitialValue: 'auto',
  colorModeStorageKey: 'app-convert-bbocode-md'
})
