import { vi, describe, expect, it, beforeEach } from 'vitest'

vi.mock('axios', () => ({
  default: {
    CancelToken: function CancelToken(executor: (cancel: () => void) => void) {
      executor(() => {})
    },
  },
}))

import dqdModule from '../dqd'

type Dispatch = ReturnType<typeof vi.fn>
const { actions } = dqdModule as unknown as {
  actions: Record<
    string,
    (ctx: { dispatch: Dispatch; rootGetters: Record<string, unknown> }, p: unknown) => Promise<any>
  >
}

let dispatch: Dispatch
const rootGetters = { getSelectedDataset: { id: 'store-ds' } }

beforeEach(() => {
  dispatch = vi.fn()
})

describe('store - dqd startDataQualityFlowRun', () => {
  it('POSTs the run with a string cohort id and returns the flow run id', async () => {
    dispatch.mockResolvedValue({ data: { flowRunId: 'run-9' } })
    const result = await actions.startDataQualityFlowRun(
      { dispatch, rootGetters },
      { datasetId: 'ds-1', cohortDefinitionId: 42 }
    )
    expect(result).toEqual({ flowRunId: 'run-9' })
    expect(dispatch).toHaveBeenCalledWith('ajaxAuth', {
      url: '/jobplugins/dqd/data-quality/flow-run',
      method: 'POST',
      params: { datasetId: 'ds-1', comment: '', cohortDefinitionId: '42', releaseId: '', vocabSchemaName: '' },
    })
  })

  it('does not cancel an earlier start, unlike generateDataQualityFlowRun', async () => {
    dispatch.mockResolvedValue({ data: { flowRunId: 'run' } })
    await Promise.all([
      actions.startDataQualityFlowRun({ dispatch, rootGetters }, { datasetId: 'ds-1', cohortDefinitionId: '1' }),
      actions.startDataQualityFlowRun({ dispatch, rootGetters }, { datasetId: 'ds-1', cohortDefinitionId: '2' }),
    ])
    for (const call of dispatch.mock.calls) {
      expect(call[1]).not.toHaveProperty('cancelToken')
    }
  })

  it('throws a short message when the POST fails', async () => {
    dispatch.mockRejectedValue(new Error('500'))
    await expect(
      actions.startDataQualityFlowRun({ dispatch, rootGetters }, { datasetId: 'ds-1', cohortDefinitionId: '1' })
    ).rejects.toThrow('Failed to start data quality')
  })
})

describe('store - dqd fetchDataQualityFlowRun', () => {
  it('uses the datasetId it is given over the store selection', async () => {
    dispatch.mockResolvedValue({ data: { id: 'run-1' } })
    await actions.fetchDataQualityFlowRun({ dispatch, rootGetters }, { cohortDefinitionId: '7', datasetId: 'ds-1' })
    expect(dispatch.mock.calls[0][1].url).toBe('/jobplugins/dqd/data-quality/cohort/7/flow-run/latest?datasetId=ds-1')
  })

  it('falls back to the selected dataset', async () => {
    dispatch.mockResolvedValue({ data: { id: 'run-1' } })
    await actions.fetchDataQualityFlowRun({ dispatch, rootGetters }, { cohortDefinitionId: '7' })
    expect(dispatch.mock.calls[0][1].url).toContain('datasetId=store-ds')
  })

  it('reads a 404 as no run, and a response-less failure as an error', async () => {
    dispatch.mockRejectedValueOnce({ response: { status: 404 } })
    await expect(
      actions.fetchDataQualityFlowRun({ dispatch, rootGetters }, { cohortDefinitionId: '7' })
    ).resolves.toBeNull()
    dispatch.mockRejectedValueOnce(new Error('network'))
    await expect(
      actions.fetchDataQualityFlowRun({ dispatch, rootGetters }, { cohortDefinitionId: '7' })
    ).rejects.toBeTruthy()
  })
})
