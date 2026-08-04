import { describe, it, expect, vi, beforeEach } from 'vitest'
import { snapshotConstraintValue, restoreConstraintValue } from '../constraintValueSnapshot'

describe('constraintValueSnapshot', () => {
  let dispatch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    dispatch = vi.fn().mockResolvedValue(undefined)
  })

  it('round-trips a value-only constraint', async () => {
    const constraint = { id: 'con1', props: { value: [{ op: '>=', value: 65 }] } }

    await restoreConstraintValue(dispatch, snapshotConstraintValue(constraint))

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith('updateConstraintValue', {
      constraintId: 'con1',
      value: [{ op: '>=', value: 65 }],
    })
  })

  // A date constraint keeps no props.value at all, so a snapshot of `value` alone
  // restores nothing and the edited range silently stays on the cohort.
  it('round-trips the date slot a date constraint keeps instead of a value', async () => {
    const from = new Date('2019-01-01')
    const to = new Date('2019-12-31')
    const constraint = { id: 'con2', props: { fromDate: { value: from }, toDate: { value: to } } }

    const snapshot = snapshotConstraintValue(constraint)
    expect(snapshot).toEqual({ constraintId: 'con2', value: undefined, dates: { from, to } })

    await restoreConstraintValue(dispatch, snapshot)

    // isUTC:true is the pass-through branch; isUTC:false would shift the restored
    // range by the timezone offset on every revert.
    expect(dispatch).toHaveBeenCalledWith('updateDateConstraintValue', {
      constraintId: 'con2',
      fromDateValue: from,
      toDateValue: to,
      isUTC: true,
    })
    // No value dispatch: the constraint had no value slot to put back.
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  // The cleared state of an optional text/conceptSet filter. Bookkeeping that
  // restores only truthy values leaves the edit in place instead of clearing it.
  it('restores a value that was legitimately empty', async () => {
    await restoreConstraintValue(dispatch, snapshotConstraintValue({ id: 'con3', props: { value: [] } }))

    expect(dispatch).toHaveBeenCalledWith('updateConstraintValue', { constraintId: 'con3', value: [] })
  })

  it('restores each slot independently when the other one fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    dispatch.mockImplementation((action: string) =>
      action === 'updateDateConstraintValue' ? Promise.reject(new Error('nope')) : Promise.resolve(undefined)
    )

    await restoreConstraintValue(dispatch, {
      constraintId: 'con4',
      value: ['x'],
      dates: { from: '', to: '' },
    })

    // The failed date restore must not swallow the value restore, and must not throw:
    // the caller is already unwinding a failed edit.
    expect(dispatch).toHaveBeenCalledWith('updateConstraintValue', { constraintId: 'con4', value: ['x'] })
  })
})
