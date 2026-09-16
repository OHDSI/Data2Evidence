import { describe, expect, it } from 'vitest'
import { createInFlightGuard } from '../InFlightGuard'

// Hand back a promise we can settle from the test, so a task can be held
// "in flight" while a second call races it.
const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('createInFlightGuard', () => {
  it('runs the task and returns its result', async () => {
    const runExclusive = createInFlightGuard()

    await expect(runExclusive('cohort-1', async () => 'done')).resolves.toBe('done')
  })

  it('skips a second call for the same key while the first is still in flight', async () => {
    // The reported repro: double-clicking the DQD button on one cohort. Both
    // clicks read "no flow run yet" and both POST a new run.
    const runExclusive = createInFlightGuard()
    const first = deferred<string>()
    let runs = 0

    const firstCall = runExclusive('cohort-1', () => {
      runs++
      return first.promise
    })
    const secondCall = runExclusive('cohort-1', () => {
      runs++
      return first.promise
    })

    // Assert before awaiting: an unguarded second call never settles on its
    // own here, and a hung test is a worse failure signal than a bad count.
    expect(runs).toBe(1)
    await expect(secondCall).resolves.toBeUndefined()

    first.resolve('done')
    await expect(firstCall).resolves.toBe('done')
  })

  it('does not block a different key', async () => {
    const runExclusive = createInFlightGuard()
    const held = deferred<string>()
    let otherRuns = 0

    runExclusive('cohort-1', () => held.promise)
    await runExclusive('cohort-2', async () => {
      otherRuns++
    })

    expect(otherRuns).toBe(1)
    held.resolve('done')
  })

  it('releases the key once the task resolves', async () => {
    const runExclusive = createInFlightGuard()
    let runs = 0
    const task = async () => {
      runs++
    }

    await runExclusive('cohort-1', task)
    await runExclusive('cohort-1', task)

    expect(runs).toBe(2)
  })

  it('releases the key when the task rejects', async () => {
    // A failed POST must not wedge the button for the rest of the session.
    const runExclusive = createInFlightGuard()
    let runs = 0
    const failing = async () => {
      runs++
      throw new Error('boom')
    }

    await expect(runExclusive('cohort-1', failing)).rejects.toThrow('boom')
    await expect(runExclusive('cohort-1', failing)).rejects.toThrow('boom')

    expect(runs).toBe(2)
  })

  it('releases the key when the task throws synchronously', async () => {
    const runExclusive = createInFlightGuard()
    const throwing = () => {
      throw new Error('sync boom')
    }

    await expect(runExclusive('cohort-1', throwing)).rejects.toThrow('sync boom')
    await expect(runExclusive('cohort-1', throwing)).rejects.toThrow('sync boom')
  })
})
