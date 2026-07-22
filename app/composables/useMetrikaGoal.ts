import { reachMetrikaGoal } from '~/utils/metrika'

/**
 * Thin Vue/Nuxt wrapper over the pure {@link reachMetrikaGoal} core.
 *
 * Reads the counter id from `runtimeConfig.public.yandexCounterId` (baked from
 * `NUXT_PUBLIC_YANDEX_COUNTER_ID` at build time) and the live `window.ym`
 * injected by `public/metrika.js`. Every call is a safe no-op when:
 *  - not on the client (SSG/prerender),
 *  - the counter is unset/invalid (analytics off), or
 *  - Metrika never loaded — which is the case inside the Bitrix24 iframe, where
 *    metrika.js self-mutes (`window.self !== window.top`). Portal users are
 *    therefore never tracked (analytics principle #4).
 *
 * @returns `{ reachGoal }` — call `reachGoal('copy')` from an action handler.
 */
export function useMetrikaGoal() {
  const config = useRuntimeConfig()
  function reachGoal(goal: string) {
    if (!import.meta.client) return
    const w = window as Window & { ym?: unknown }
    reachMetrikaGoal(w.ym, String(config.public.yandexCounterId ?? ''), goal)
  }
  return { reachGoal }
}
