import { describe, expect, it } from 'vitest'
import Bookmarks from '../Bookmarks.vue'

// openDataQualityDialog is an Options API method, so it can be invoked against
// a stand-in `this` without mounting the whole bookmarks panel.
const openDataQualityDialog = (Bookmarks as any).methods.openDataQualityDialog

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })
  return { promise, resolve }
}

const createContext = (fetchImpl: () => Promise<unknown>) => {
  const calls = { fetch: 0, generate: 0 }
  return {
    calls,
    context: {
      getSelectedDataset: { id: 'dataset-1' },
      getText: (key: string) => key,
      fetchDataQualityFlowRun: () => {
        calls.fetch++
        return fetchImpl()
      },
      generateDataQualityFlowRun: () => {
        calls.generate++
        return Promise.resolve({})
      },
      openDataQualityResultsDialog: () => undefined,
      showDqdSnackbar: () => undefined,
    },
  }
}

describe('openDataQualityDialog', () => {
  it('starts one job per cohort when clicked twice before the fetch resolves', async () => {
    // The reported repro. Both clicks would otherwise read "no flow run yet"
    // and each POST a new data quality job.
    const latestFlowRun = deferred<unknown>()
    const { calls, context } = createContext(() => latestFlowRun.promise)

    const firstClick = openDataQualityDialog.call(context, { id: 42 })
    const secondClick = openDataQualityDialog.call(context, { id: 42 })

    expect(calls.fetch).toBe(1)

    latestFlowRun.resolve(null) // no existing run -> the first click creates one
    await Promise.all([firstClick, secondClick])

    expect(calls.generate).toBe(1)
  })

  it('does not block a second cohort', async () => {
    const { calls, context } = createContext(() => Promise.resolve(null))

    await openDataQualityDialog.call(context, { id: 42 })
    await openDataQualityDialog.call(context, { id: 43 })

    expect(calls.generate).toBe(2)
  })

  it('allows a retry once the previous click has settled', async () => {
    const { calls, context } = createContext(() => Promise.resolve(null))

    await openDataQualityDialog.call(context, { id: 42 })
    await openDataQualityDialog.call(context, { id: 42 })

    expect(calls.generate).toBe(2)
  })

  it('ignores a cohort definition with no id', async () => {
    const { calls, context } = createContext(() => Promise.resolve(null))

    await openDataQualityDialog.call(context, {})
    await openDataQualityDialog.call(context, null)

    expect(calls.fetch).toBe(0)
  })
})
