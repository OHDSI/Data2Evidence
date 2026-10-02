/**
 * Per-key "one at a time" guard for user-triggered async actions.
 *
 * Kicking off a flow run is a read-then-create sequence, so two clicks landing
 * before the read resolves both see "nothing running" and both create a run.
 * Cancelling the second HTTP request does not help: the backend may already
 * have accepted the first one. The only fix on the client is to not make the
 * second call at all.
 *
 * The key check and claim are synchronous, so calls racing within one tick are
 * deduplicated. The key is released once the task settles, so a later click
 * works normally -- including after a failure.
 */
export const createInFlightGuard = () => {
  const inFlight = new Set<string>()

  return async <T>(key: string, task: () => T | Promise<T>): Promise<T | undefined> => {
    if (inFlight.has(key)) {
      return undefined
    }

    inFlight.add(key)
    try {
      return await task()
    } finally {
      inFlight.delete(key)
    }
  }
}
