/**
 * One step of the Bitrix24 placement install flow (`app/pages/install.vue`):
 * an async action plus an optional caption and the data it collected.
 */
export interface IStep {
  action: () => Promise<void>
  caption?: string
  data?: Record<string, unknown>
}
