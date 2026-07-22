/**
 * Pure core for Yandex.Metrika goal reporting — no Vue/Nuxt, no DOM globals,
 * so it is unit-testable in the node vitest environment.
 *
 * Analytics policy (see CLAUDE.md § Conventions → Analytics/telemetry):
 * this reports **shape/counters only, never content** — the goal name is a
 * fixed string chosen in code, never user text. It is a no-op unless a valid
 * counter is configured AND the Metrika runtime (`ym`) is actually loaded, so
 * with analytics off (empty counter) or inside the muted B24 iframe it does
 * nothing.
 *
 * @param ym         The global `window.ym` function injected by metrika.js
 *                   (unknown-typed: it may be absent when analytics is off or
 *                   the beacon is muted in the portal iframe).
 * @param counterId  Numeric Metrika counter id (string or number). Blank,
 *                   non-numeric, or ≤ 0 → tracking is treated as disabled.
 * @param goal       Fixed goal identifier (e.g. `'copy'`, `'print'`).
 * @returns `true` if the goal was actually reported, `false` on any no-op.
 */
export function reachMetrikaGoal(
  ym: unknown,
  counterId: string | number | undefined | null,
  goal: string
): boolean {
  const id = Number(counterId)
  if (!Number.isFinite(id) || id <= 0) return false
  if (typeof ym !== 'function') return false
  ;(ym as (...args: unknown[]) => void)(id, 'reachGoal', goal)
  return true
}
