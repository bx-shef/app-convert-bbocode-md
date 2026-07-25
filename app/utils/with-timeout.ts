/** Rejected by `withTimeout` when a promise outlives its deadline. */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Operation timed out after ${ms} ms`)
    this.name = 'TimeoutError'
  }
}

/**
 * Reject with {@link TimeoutError} if `promise` has not settled within `ms`.
 *
 * This is an upper bound on how long a caller waits — NOT a retry (the SDK's
 * own transient-failure retries stay intact underneath) and NOT a cancel: the
 * wrapped work keeps running in the background and simply loses the race. Use
 * it so the UI can't hang indefinitely on a stuck REST call (e.g. a server-side
 * OPERATION_TIME_LIMIT storm). The timer is always cleared, win or lose.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
