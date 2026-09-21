import { Injectable } from '@danet/core'
import { createLogger } from '../logger.ts'
import { env } from '../env.ts'
import { sanitizeIdForCacheId } from '../dataset/entity/dataset.entity.ts'

export type CacheFlowState = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'UNKNOWN'

const TERMINAL_FAILURE = new Set(['FAILED', 'CRASHED', 'CANCELLED', 'CANCELLING', 'TIMEDOUT'])
const IN_FLIGHT = new Set([
  'PENDING', 'SCHEDULED', 'RUNNING', 'RETRYING', 'PAUSED', 'LATE', 'RESUMING', 'AWAITINGRETRY',
])

// Prefect exposes a run's state twice with different casing: state.type is
// upper-case ("COMPLETED"), state.name is title-case ("Completed", the vocabulary
// in jobplugins/src/const.ts:78). Accept either. The underscore strip below is
// defensive only: real Prefect payloads never need it — state.type values are
// already underscore-free (e.g. "TIMEDOUT") and state.name is TitleCase (e.g.
// "AwaitingRetry") — so TIMED_OUT / AWAITING_RETRY spellings are unreachable here.
export function normalizeFlowState(flowRun: unknown): CacheFlowState {
  const state = (flowRun as { state?: { type?: unknown; name?: unknown } })?.state
  const raw = String(state?.type ?? state?.name ?? '').toUpperCase().replace(/_/g, '')
  if (raw === 'COMPLETED') return 'COMPLETED'
  if (TERMINAL_FAILURE.has(raw)) return 'FAILED'
  if (IN_FLIGHT.has(raw)) return 'RUNNING'
  return 'UNKNOWN'
}

// Prefect's flow run carries end_time as an ISO-8601 string at the top level
// (alongside, not inside, `state`). Returns epoch milliseconds, or null when
// absent or unparseable (e.g. the run hasn't finished yet).
export function parseEndTime(flowRun: unknown): number | null {
  const endTime = (flowRun as { end_time?: unknown })?.end_time
  if (typeof endTime !== 'string') return null
  const parsed = Date.parse(endTime)
  return Number.isNaN(parsed) ? null : parsed
}

@Injectable()
export class JobPluginsApi {
  private readonly logger = createLogger(this.constructor.name)
  private readonly baseUrl = `${env.JOBPLUGINS_API_URL}/jobplugins`

  private headers(authToken?: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: authToken } : {}),
    }
  }

  // jobplugins resolves the dataset itself (PortalServerAPI.getDataset), so datasetId is
  // required for that lookup. We also pin cacheId explicitly: bao's cohort handlers in trex
  // (execute-circe-handler, count-patients-handler, count-inclusion-handler) hardcode the
  // cache catalog to sanitizeIdForCacheId(dataset.id) with no override, and the dataset row's
  // stored cache_id does not always equal that (a dataset transformed from type 'source', or
  // any legacy row, diverges). jobplugins' resolveCacheWriteTarget derives a target from the
  // row for every OTHER caller and is still used as the fallback there when cacheId is absent
  // — but a webapi dataset's build must always land where bao reads.
  async createCacheFlowRun(
    datasetId: string,
    authToken?: string,
  ): Promise<{ flowRunId: string }> {
    const url = `${this.baseUrl}/cachedb/create-file`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(authToken),
      body: JSON.stringify({ datasetId, cacheId: sanitizeIdForCacheId(datasetId) }),
    })
    if (!res.ok) {
      throw new Error(`Failed to start cache flow for ${datasetId}: ${res.status} ${await res.text()}`)
    }
    return await res.json()
  }

  async getFlowRunState(
    flowRunId: string,
    authToken?: string,
  ): Promise<{ state: CacheFlowState; endTime: number | null }> {
    const url = `${this.baseUrl}/cachedb/results/${flowRunId}`
    const res = await fetch(url, { method: 'GET', headers: this.headers(authToken) })
    if (!res.ok) {
      this.logger.warn(`Flow run ${flowRunId} state unreadable: ${res.status}`)
      return { state: 'UNKNOWN', endTime: null }
    }
    // jobplugins' getFlowRunResults returns Prefect's result[0], which is undefined when
    // the run has been pruned from Prefect's history — express then sends a 200 with an
    // EMPTY body, and res.json() throws a SyntaxError on it. Read as text first so an
    // empty/unparseable body degrades to UNKNOWN instead of throwing.
    const text = await res.text()
    if (!text) {
      this.logger.warn(`Flow run ${flowRunId} state unreadable: empty response body`)
      return { state: 'UNKNOWN', endTime: null }
    }
    let flowRun: unknown
    try {
      flowRun = JSON.parse(text)
    } catch {
      this.logger.warn(`Flow run ${flowRunId} state unreadable: invalid JSON response`)
      return { state: 'UNKNOWN', endTime: null }
    }
    return { state: normalizeFlowState(flowRun), endTime: parseEndTime(flowRun) }
  }
}
