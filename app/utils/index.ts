/**
 * Pause for the given number of milliseconds.
 * Used by the install flow to pace the progress animation.
 */
export async function sleepAction(timeout: number = 1000): Promise<void> {
  return new Promise<void>(resolve => setTimeout(resolve, timeout))
}
