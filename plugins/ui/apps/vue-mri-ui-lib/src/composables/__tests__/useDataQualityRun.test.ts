import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDataQualityRun, type DataQualityRunDeps, type LatestFlowRun } from '../useDataQualityRun'

/**
 * No component is mounted. The composable is driven through fake store calls and
 * fake timers, which is the whole of what it does.
 */
const POLL_MS = 10_000
const run = (id: string, type: string): LatestFlowRun => ({ id, state: { type } })

let fetchLatest: ReturnType<typeof vi.fn>
let startRun: ReturnType<typeof vi.fn>
let notify: ReturnType<typeof vi.fn>

const make = (overrides: Partial<DataQualityRunDeps> = {}) =>
  useDataQualityRun({
    datasetId: () => 'ds-1',
    fetchLatest: fetchLatest as DataQualityRunDeps['fetchLatest'],
    startRun: startRun as DataQualityRunDeps['startRun'],
    notify: notify as DataQualityRunDeps['notify'],
    ...overrides,
  })

const tick = async (ms = POLL_MS) => {
  await vi.advanceTimersByTimeAsync(ms)
}

beforeEach(() => {
  vi.useFakeTimers()
  fetchLatest = vi.fn()
  startRun = vi.fn(async () => ({ flowRunId: 'new-run' }))
  notify = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDataQualityRun', () => {
  it('opens when the latest run is complete, without starting another', async () => {
    fetchLatest.mockResolvedValue(run('r1', 'COMPLETED'))
    const dq = make()
    await expect(dq.activate('7', 'SNRI')).resolves.toBe('open')
    expect(dq.phaseOf('7')).toBe('ready')
    expect(startRun).not.toHaveBeenCalled()
    expect(fetchLatest).toHaveBeenCalledWith('7', 'ds-1')
  })

  it('starts a run when there is none, then reports it ready once the poll sees it complete', async () => {
    fetchLatest.mockResolvedValueOnce(null)
    const dq = make()
    await expect(dq.activate('7', 'SNRI')).resolves.toBe('started')
    expect(startRun).toHaveBeenCalledWith('7', 'ds-1')
    expect(dq.phaseOf('7')).toBe('running')

    fetchLatest.mockResolvedValueOnce(run('new-run', 'RUNNING'))
    await tick()
    expect(dq.phaseOf('7')).toBe('running')

    fetchLatest.mockResolvedValueOnce(run('new-run', 'COMPLETED'))
    await tick()
    expect(dq.phaseOf('7')).toBe('ready')
    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledWith({ kind: 'success', key: 'MRI_PA_DATA_QUALITY_READY', name: 'SNRI' })

    await tick()
    expect(fetchLatest).toHaveBeenCalledTimes(3)
  })

  it('starts a new run when the latest one failed', async () => {
    fetchLatest.mockResolvedValue(run('old', 'FAILED'))
    const dq = make()
    await expect(dq.activate('7', 'SNRI')).resolves.toBe('started')
    expect(startRun).toHaveBeenCalledTimes(1)
  })

  it('adopts a run already in progress instead of starting one', async () => {
    fetchLatest.mockResolvedValueOnce(run('elsewhere', 'PENDING'))
    const dq = make()
    await expect(dq.activate('7', 'SNRI')).resolves.toBe('running')
    expect(startRun).not.toHaveBeenCalled()

    fetchLatest.mockResolvedValueOnce(run('elsewhere', 'COMPLETED'))
    await tick()
    expect(dq.phaseOf('7')).toBe('ready')
  })

  it('ignores a second click while busy, so only one run is started', async () => {
    let answer: (value: LatestFlowRun | null) => void = () => {}
    fetchLatest.mockImplementationOnce(() => new Promise(resolve => (answer = resolve)))
    const dq = make()
    const first = dq.activate('7', 'SNRI')
    expect(dq.phaseOf('7')).toBe('checking')
    await expect(dq.activate('7', 'SNRI')).resolves.toBe('busy')
    answer(null)
    await first
    await expect(dq.activate('7', 'SNRI')).resolves.toBe('busy')
    expect(startRun).toHaveBeenCalledTimes(1)
  })

  it('stays running while latest still shows an older run, and gives up after 30 unmatched polls', async () => {
    fetchLatest.mockResolvedValueOnce(null)
    const dq = make()
    await dq.activate('7', 'SNRI')
    fetchLatest.mockResolvedValue(run('older', 'COMPLETED'))
    await tick(POLL_MS * 29)
    expect(dq.phaseOf('7')).toBe('running')
    await tick()
    expect(dq.phaseOf('7')).toBe('idle')
    expect(notify).not.toHaveBeenCalled()
    const polls = fetchLatest.mock.calls.length
    await tick()
    expect(fetchLatest.mock.calls.length).toBe(polls)
  })

  it('tolerates two failed polls, and reports the third', async () => {
    fetchLatest.mockResolvedValueOnce(null)
    const dq = make()
    await dq.activate('7', 'SNRI')
    fetchLatest.mockRejectedValue(new Error('gateway'))
    await tick()
    await tick()
    expect(dq.phaseOf('7')).toBe('running')
    await tick()
    expect(dq.phaseOf('7')).toBe('failed')
    expect(notify).toHaveBeenCalledWith({ kind: 'error', key: 'MRI_PA_DATA_QUALITY_STATUS_FAILED', name: 'SNRI' })
  })

  it('resets the failure count when a poll succeeds', async () => {
    fetchLatest.mockResolvedValueOnce(null)
    const dq = make()
    await dq.activate('7', 'SNRI')
    fetchLatest
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValueOnce(run('new-run', 'RUNNING'))
      .mockRejectedValueOnce(new Error('3'))
    await tick(POLL_MS * 4)
    expect(dq.phaseOf('7')).toBe('running')
  })

  it('reports a failed run when the poll sees it fail', async () => {
    fetchLatest.mockResolvedValueOnce(null)
    const dq = make()
    await dq.activate('7', 'SNRI')
    fetchLatest.mockResolvedValueOnce(run('new-run', 'CRASHED'))
    await tick()
    expect(dq.phaseOf('7')).toBe('failed')
    expect(notify).toHaveBeenCalledWith({ kind: 'error', key: 'MRI_PA_DATA_QUALITY_FAILED', name: 'SNRI' })
  })

  it('goes back to idle, silently, when the run is cancelled', async () => {
    fetchLatest.mockResolvedValueOnce(null)
    const dq = make()
    await dq.activate('7', 'SNRI')
    fetchLatest.mockResolvedValueOnce(run('new-run', 'CANCELLED'))
    await tick()
    expect(dq.phaseOf('7')).toBe('idle')
    expect(notify).not.toHaveBeenCalled()
  })

  it('reports a failed lookup and goes back to idle', async () => {
    fetchLatest.mockRejectedValue(new Error('500'))
    const dq = make()
    await expect(dq.activate('7', 'SNRI')).resolves.toBe('error')
    expect(dq.phaseOf('7')).toBe('idle')
    expect(notify).toHaveBeenCalledWith({ kind: 'error', key: 'MRI_PA_DATA_QUALITY_STATUS_CHECK_FAILED', name: 'SNRI' })
  })

  it('reports a failed start and goes back to idle', async () => {
    fetchLatest.mockResolvedValue(null)
    startRun.mockRejectedValue(new Error('500'))
    const dq = make()
    await expect(dq.activate('7', 'SNRI')).resolves.toBe('error')
    expect(dq.phaseOf('7')).toBe('idle')
    expect(notify).toHaveBeenCalledWith({ kind: 'error', key: 'MRI_PA_DATA_QUALITY_START_FAILED', name: 'SNRI' })
  })

  it('keeps each cohort apart', async () => {
    fetchLatest.mockResolvedValueOnce(run('a', 'COMPLETED')).mockResolvedValueOnce(null)
    const dq = make()
    await dq.activate('1', 'A')
    await dq.activate('2', 'B')
    expect(dq.phaseOf('1')).toBe('ready')
    expect(dq.phaseOf('2')).toBe('running')
    expect(dq.phaseOf('3')).toBe('idle')
    expect(dq.phaseOf(null)).toBe('idle')
  })

  it('stops polling on dispose, and a late answer writes nothing', async () => {
    fetchLatest.mockResolvedValueOnce(null)
    const dq = make()
    await dq.activate('7', 'SNRI')
    let answer: (value: LatestFlowRun | null) => void = () => {}
    fetchLatest.mockImplementationOnce(() => new Promise(resolve => (answer = resolve)))
    await tick()
    dq.dispose()
    answer(run('new-run', 'COMPLETED'))
    await tick(POLL_MS * 3)
    expect(dq.phaseOf('7')).toBe('running')
    expect(notify).not.toHaveBeenCalled()
    expect(fetchLatest).toHaveBeenCalledTimes(2)
  })
})
