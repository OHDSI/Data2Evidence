/**
 * The exploration card's Data quality action (#3119): find out, on click, where
 * a cohort's data quality run stands, start one when there is none to show, and
 * follow it until it ends.
 *
 * The state is learned on click only. There is no fetch per card on page load,
 * so before the first click the button offers "Display/Generate". After it, the
 * phase for that cohort is kept here for as long as the page lives.
 *
 * When a followed run ends, the user hears about it through `notify` and the
 * button changes; the dialog does not open by itself, because the user may be
 * somewhere else on the page by then.
 *
 * The store calls are passed in rather than imported, so this runs, and is
 * tested, without a store or a mounted component.
 */
import { reactive } from 'vue'
import {
  classifyFlowRunState,
  isDataQualityBusy,
  type DataQualityPhase,
} from '../components/helpers/explorationDataQuality'

/** The parts of a Prefect flow run this reads. */
export interface LatestFlowRun {
  id: string
  state?: { type?: string } | null
}

export interface DataQualityRunDeps {
  datasetId: () => string
  /** The cohort's latest run; null when it has none (a 404). Throws otherwise. */
  fetchLatest: (cohortDefinitionId: string, datasetId: string) => Promise<LatestFlowRun | null>
  startRun: (cohortDefinitionId: string, datasetId: string) => Promise<{ flowRunId: string }>
  notify: (notification: { kind: 'success' | 'error'; key: string; name: string }) => void
  /** The portal's DQD dialogs re-read every 10s; so does this. */
  pollIntervalMs?: number
  /**
   * How many polls may pass without `latest` returning the run being followed.
   * `latest` skips cancelled runs, so a run cancelled elsewhere never shows up;
   * after this many polls (5 minutes at the default interval) the card stops
   * waiting and the next click looks again.
   */
  maxUnmatchedPolls?: number
  /** Consecutive failed polls tolerated before the run is reported failed. */
  failureTolerance?: number
}

export type ActivateResult = 'open' | 'started' | 'running' | 'busy' | 'error'

interface Entry {
  phase: DataQualityPhase
  name: string
  flowRunId?: string
  unmatched: number
  failures: number
}

export function useDataQualityRun(deps: DataQualityRunDeps) {
  const pollIntervalMs = deps.pollIntervalMs ?? 10_000
  const maxUnmatchedPolls = deps.maxUnmatchedPolls ?? 30
  const failureTolerance = deps.failureTolerance ?? 2

  const entries = reactive(new Map<string, Entry>())
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  let disposed = false

  const phaseOf = (cohortDefinitionId: string | null): DataQualityPhase =>
    (cohortDefinitionId && entries.get(cohortDefinitionId)?.phase) || 'idle'

  // Every change is a new entry object, never an edit of the current one.
  const set = (id: string, next: Partial<Entry>): Entry => {
    const current = entries.get(id) ?? { phase: 'idle', name: '', unmatched: 0, failures: 0 }
    const entry = { ...current, ...next }
    entries.set(id, entry)
    return entry
  }

  const stop = (id: string): void => {
    const timer = timers.get(id)
    if (timer !== undefined) clearTimeout(timer)
    timers.delete(id)
  }

  // A chain of timeouts, not an interval: the next poll is armed only once the
  // previous one has answered, so a slow gateway cannot stack requests.
  const schedule = (id: string): void => {
    stop(id)
    if (disposed) return
    timers.set(
      id,
      setTimeout(() => void poll(id), pollIntervalMs)
    )
  }

  const follow = (id: string, flowRunId: string): void => {
    set(id, { phase: 'running', flowRunId, unmatched: 0, failures: 0 })
    schedule(id)
  }

  async function poll(id: string): Promise<void> {
    timers.delete(id)
    const entry = entries.get(id)
    if (!entry || entry.phase !== 'running') return

    let latest: LatestFlowRun | null
    try {
      latest = await deps.fetchLatest(id, deps.datasetId())
    } catch (error) {
      if (disposed) return
      const failures = entry.failures + 1
      if (failures > failureTolerance) {
        console.error('[data-quality] could not follow the run', error)
        set(id, { phase: 'failed', failures })
        deps.notify({ kind: 'error', key: 'MRI_PA_DATA_QUALITY_STATUS_FAILED', name: entry.name })
        return
      }
      set(id, { failures })
      schedule(id)
      return
    }
    if (disposed) return

    if (latest?.id !== entry.flowRunId) {
      // `latest` can trail a run that has only just been created.
      const unmatched = entry.unmatched + 1
      if (unmatched >= maxUnmatchedPolls) {
        set(id, { phase: 'idle', unmatched, failures: 0 })
        return
      }
      set(id, { unmatched, failures: 0 })
      schedule(id)
      return
    }

    const group = classifyFlowRunState(latest.state?.type)
    if (group === 'completed') {
      set(id, { phase: 'ready', failures: 0 })
      deps.notify({ kind: 'success', key: 'MRI_PA_DATA_QUALITY_READY', name: entry.name })
    } else if (group === 'failed') {
      set(id, { phase: 'failed', failures: 0 })
      deps.notify({ kind: 'error', key: 'MRI_PA_DATA_QUALITY_FAILED', name: entry.name })
    } else if (group === 'cancelled') {
      set(id, { phase: 'idle', failures: 0 })
    } else {
      set(id, { failures: 0 })
      schedule(id)
    }
  }

  async function activate(cohortDefinitionId: string, explorationName: string): Promise<ActivateResult> {
    const id = cohortDefinitionId
    if (isDataQualityBusy(phaseOf(id))) return 'busy'
    set(id, { phase: 'checking', name: explorationName })

    let latest: LatestFlowRun | null
    try {
      latest = await deps.fetchLatest(id, deps.datasetId())
    } catch (error) {
      if (disposed) return 'error'
      console.error('[data-quality] could not read the latest run', error)
      set(id, { phase: 'idle' })
      deps.notify({ kind: 'error', key: 'MRI_PA_DATA_QUALITY_STATUS_CHECK_FAILED', name: explorationName })
      return 'error'
    }
    if (disposed) return 'error'

    const group = latest ? classifyFlowRunState(latest.state?.type) : null
    if (latest && group === 'completed') {
      set(id, { phase: 'ready', flowRunId: latest.id })
      return 'open'
    }
    if (latest && group === 'running') {
      follow(id, latest.id)
      return 'running'
    }

    // No run, or the last one failed or was cancelled: start a fresh one.
    set(id, { phase: 'starting' })
    try {
      const { flowRunId } = await deps.startRun(id, deps.datasetId())
      if (disposed) return 'error'
      follow(id, flowRunId)
      return 'started'
    } catch (error) {
      if (disposed) return 'error'
      console.error('[data-quality] could not start a run', error)
      set(id, { phase: 'idle' })
      deps.notify({ kind: 'error', key: 'MRI_PA_DATA_QUALITY_START_FAILED', name: explorationName })
      return 'error'
    }
  }

  /** Stops every poll. A request already in flight is ignored when it lands. */
  function dispose(): void {
    disposed = true
    for (const id of [...timers.keys()]) stop(id)
  }

  return { phaseOf, activate, dispose }
}
