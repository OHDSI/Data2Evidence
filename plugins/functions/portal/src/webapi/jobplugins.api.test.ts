import { describe, it, beforeEach, afterEach } from '@std/testing/bdd'
import { assertEquals, assertRejects } from '@std/assert'

// Set SERVICE_ROUTES before importing any module that transitively imports env.ts
Deno.env.set('SERVICE_ROUTES', JSON.stringify({ trex: 'http://localhost:8000' }))

// Use dynamic import to load JobPluginsApi after env is configured
const jobPluginsModule = await import('./jobplugins.api.ts')
const { normalizeFlowState, JobPluginsApi } = jobPluginsModule

describe('normalizeFlowState', () => {
  it('treats an upper-case state.type as terminal success', () => {
    assertEquals(normalizeFlowState({ state: { type: 'COMPLETED' } }), 'COMPLETED')
  })

  it('treats a title-case state.name as terminal success', () => {
    assertEquals(normalizeFlowState({ state: { name: 'Completed' } }), 'COMPLETED')
  })

  it('maps every terminal failure state onto FAILED', () => {
    for (const s of ['FAILED', 'CRASHED', 'CANCELLED', 'TIMEDOUT']) {
      assertEquals(normalizeFlowState({ state: { type: s } }), 'FAILED')
    }
  })

  it('maps in-flight states onto RUNNING', () => {
    for (const s of ['PENDING', 'SCHEDULED', 'RUNNING', 'RETRYING', 'PAUSED', 'LATE']) {
      assertEquals(normalizeFlowState({ state: { type: s } }), 'RUNNING')
    }
  })

  it('returns UNKNOWN for a missing or unrecognised state', () => {
    assertEquals(normalizeFlowState(undefined), 'UNKNOWN')
    assertEquals(normalizeFlowState({}), 'UNKNOWN')
    assertEquals(normalizeFlowState({ state: { type: 'WAT' } }), 'UNKNOWN')
  })
})

describe('JobPluginsApi', () => {
  let originalFetch: typeof fetch
  let capturedUrl: string | undefined
  let capturedInit: RequestInit | undefined

  beforeEach(() => {
    originalFetch = globalThis.fetch
    capturedUrl = undefined
    capturedInit = undefined
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('createCacheFlowRun', () => {
    it('requests the exact /jobplugins/cachedb/create-file URL', async () => {
      globalThis.fetch = async (url: string, init?: RequestInit) => {
        capturedUrl = url
        capturedInit = init
        return new Response(JSON.stringify({ flowRunId: 'test-run-id' }), { status: 200 })
      }

      const api = new JobPluginsApi()
      await api.createCacheFlowRun('ds-123')

      assertEquals(capturedUrl, 'http://localhost:8000/jobplugins/cachedb/create-file')
    })

    it('sends datasetId in the JSON body', async () => {
      let capturedBody: string | undefined
      globalThis.fetch = async (_url: string, init?: RequestInit) => {
        capturedBody = init?.body as string
        return new Response(JSON.stringify({ flowRunId: 'test-run-id' }), { status: 200 })
      }

      const api = new JobPluginsApi()
      await api.createCacheFlowRun('ds-456')

      const body = JSON.parse(capturedBody!)
      assertEquals(body.datasetId, 'ds-456')
    })

    it('sets Authorization header when authToken is provided', async () => {
      globalThis.fetch = async (_url: string, init?: RequestInit) => {
        capturedInit = init
        return new Response(JSON.stringify({ flowRunId: 'test-run-id' }), { status: 200 })
      }

      const api = new JobPluginsApi()
      await api.createCacheFlowRun('ds-789', 'Bearer token123')

      const headers = capturedInit?.headers as Record<string, string>
      assertEquals(headers['Authorization'], 'Bearer token123')
    })

    it('omits Authorization header when authToken is not provided', async () => {
      globalThis.fetch = async (_url: string, init?: RequestInit) => {
        capturedInit = init
        return new Response(JSON.stringify({ flowRunId: 'test-run-id' }), { status: 200 })
      }

      const api = new JobPluginsApi()
      await api.createCacheFlowRun('ds-abc')

      const headers = capturedInit?.headers as Record<string, string>
      assertEquals(headers['Authorization'], undefined)
    })

    it('throws on non-ok response with status in message', async () => {
      globalThis.fetch = async () => {
        return new Response('Server error', { status: 500 })
      }

      const api = new JobPluginsApi()

      await assertRejects(
        () => api.createCacheFlowRun('ds-fail'),
        Error,
        'Failed to start cache flow for ds-fail: 500',
      )
    })
  })

  describe('getFlowRunState', () => {
    it('requests the exact /jobplugins/cachedb/results/<id> URL', async () => {
      globalThis.fetch = async (url: string) => {
        capturedUrl = url
        return new Response(JSON.stringify({ state: { type: 'COMPLETED' } }), { status: 200 })
      }

      const api = new JobPluginsApi()
      await api.getFlowRunState('run-xyz')

      assertEquals(capturedUrl, 'http://localhost:8000/jobplugins/cachedb/results/run-xyz')
    })

    it('maps COMPLETED payload to COMPLETED state', async () => {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ state: { type: 'COMPLETED' } }), { status: 200 })
      }

      const api = new JobPluginsApi()
      const state = await api.getFlowRunState('run-123')

      assertEquals(state, 'COMPLETED')
    })

    it('returns UNKNOWN (does not throw) on non-ok response', async () => {
      globalThis.fetch = async () => {
        return new Response('Not found', { status: 404 })
      }

      const api = new JobPluginsApi()
      const state = await api.getFlowRunState('run-missing')

      assertEquals(state, 'UNKNOWN')
    })
  })
})
