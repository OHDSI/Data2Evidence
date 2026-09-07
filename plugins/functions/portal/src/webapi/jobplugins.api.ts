import { Injectable } from '@danet/core'
import { createLogger } from '../logger.ts'
import { env } from '../env.ts'

export type CacheFlowState = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'UNKNOWN'

const TERMINAL_FAILURE = new Set(['FAILED', 'CRASHED', 'CANCELLED', 'CANCELLING', 'TIMEDOUT'])
const IN_FLIGHT = new Set([
  'PENDING', 'SCHEDULED', 'RUNNING', 'RETRYING', 'PAUSED', 'LATE', 'RESUMING', 'AWAITINGRETRY',
])

// Prefect exposes a run's state twice with different casing: state.type is
// upper-case ("COMPLETED"), state.name is title-case ("Completed", the vocabulary
// in jobplugins/src/const.ts:78). Accept either, and strip the underscore in
// TIMED_OUT / AWAITING_RETRY so both spellings land on one key.
export function normalizeFlowState(flowRun: unknown): CacheFlowState {
  const state = (flowRun as { state?: { type?: unknown; name?: unknown } })?.state
  const raw = String(state?.type ?? state?.name ?? '').toUpperCase().replace(/_/g, '')
  if (raw === 'COMPLETED') return 'COMPLETED'
  if (TERMINAL_FAILURE.has(raw)) return 'FAILED'
  if (IN_FLIGHT.has(raw)) return 'RUNNING'
  return 'UNKNOWN'
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

  // jobplugins resolves the dataset itself (PortalServerAPI.getDataset) and derives
  // the cache catalog through resolveCacheWriteTarget, so datasetId is the whole
  // request body. Deliberately no cacheId here: duplicating that derivation is what
  // issue #2877 was about.
  async createCacheFlowRun(
    datasetId: string,
    authToken?: string,
  ): Promise<{ flowRunId: string }> {
    const url = `${this.baseUrl}/cachedb/create-file`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(authToken),
      body: JSON.stringify({ datasetId }),
    })
    if (!res.ok) {
      throw new Error(`Failed to start cache flow for ${datasetId}: ${res.status} ${await res.text()}`)
    }
    return await res.json()
  }

  async getFlowRunState(flowRunId: string, authToken?: string): Promise<CacheFlowState> {
    const url = `${this.baseUrl}/cachedb/results/${flowRunId}`
    const res = await fetch(url, { method: 'GET', headers: this.headers(authToken) })
    if (!res.ok) {
      this.logger.warn(`Flow run ${flowRunId} state unreadable: ${res.status}`)
      return 'UNKNOWN'
    }
    return normalizeFlowState(await res.json())
  }
}
