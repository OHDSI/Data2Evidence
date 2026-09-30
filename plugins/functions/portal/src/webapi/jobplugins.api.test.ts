import { describe, it, beforeEach, afterEach } from '@std/testing/bdd'
import { assertEquals, assertRejects } from '@std/assert'

// Set SERVICE_ROUTES before importing any module that transitively imports env.ts
Deno.env.set('SERVICE_ROUTES', JSON.stringify({ trex: 'http://localhost:8000' }))

// Use dynamic import to load JobPluginsApi after env is configured
const jobPluginsModule = await import('./jobplugins.api.ts')
const { normalizeFlowState, parseEndTime, JobPluginsApi } = jobPluginsModule

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

describe('parseEndTime', () => {
  it('parses an ISO-8601 end_time into epoch milliseconds', () => {
    assertEquals(parseEndTime({ end_time: '2026-09-01T12:00:00.000Z' }), Date.parse('2026-09-01T12:00:00.000Z'))
  })

  it('returns null when end_time is absent', () => {
    assertEquals(parseEndTime({}), null)
    assertEquals(parseEndTime(undefined), null)
  })

  it('returns null when end_time is not a parseable string', () => {
    assertEquals(parseEndTime({ end_time: 'not-a-date' }), null)
    assertEquals(parseEndTime({ end_time: null }), null)
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
      globalThis.fetch = (url: string, init?: RequestInit) => {
        capturedUrl = url
        capturedInit = init
        return Promise.resolve(new Response(JSON.stringify({ flowRunId: 'test-run-id' }), { status: 200 }))
      }

      const api = new JobPluginsApi()
      await api.createCacheFlowRun('ds-123')

      assertEquals(capturedUrl, 'http://localhost:8000/jobplugins/cachedb/create-file')
    })

    it('sends datasetId and the sanitized cacheId in the JSON body', async () => {
      let capturedBody: string | undefined
      globalThis.fetch = (_url: string, init?: RequestInit) => {
        capturedBody = init?.body as string
        return Promise.resolve(new Response(JSON.stringify({ flowRunId: 'test-run-id' }), { status: 200 }))
      }

      const api = new JobPluginsApi()
      await api.createCacheFlowRun('ds-456')

      const body = JSON.parse(capturedBody!)
      assertEquals(body.datasetId, 'ds-456')
      assertEquals(body.cacheId, 'ds_456')
    })

    // Fix for the Critical naming defect: bao's cohort handlers in trex hardcode the
    // cache catalog to sanitizeIdForCacheId(dataset.id). A hyphenated UUID datasetId
    // must therefore produce the exact same sanitized value here, digit-leading ids
    // included.
    it('sanitizes a UUID-shaped datasetId into cacheId exactly like bao does', async () => {
      let capturedBody: string | undefined
      globalThis.fetch = (_url: string, init?: RequestInit) => {
        capturedBody = init?.body as string
        return Promise.resolve(new Response(JSON.stringify({ flowRunId: 'test-run-id' }), { status: 200 }))
      }

      const api = new JobPluginsApi()
      await api.createCacheFlowRun('123e4567-e89b-12d3-a456-426614174000')

      const body = JSON.parse(capturedBody!)
      assertEquals(body.cacheId, '_123e4567_e89b_12d3_a456_426614174000')
    })

    it('sets Authorization header when authToken is provided', async () => {
      globalThis.fetch = (_url: string, init?: RequestInit) => {
        capturedInit = init
        return Promise.resolve(new Response(JSON.stringify({ flowRunId: 'test-run-id' }), { status: 200 }))
      }

      const api = new JobPluginsApi()
      await api.createCacheFlowRun('ds-789', 'Bearer token123')

      const headers = capturedInit?.headers as Record<string, string>
      assertEquals(headers['Authorization'], 'Bearer token123')
    })

    it('omits Authorization header when authToken is not provided', async () => {
      globalThis.fetch = (_url: string, init?: RequestInit) => {
        capturedInit = init
        return Promise.resolve(new Response(JSON.stringify({ flowRunId: 'test-run-id' }), { status: 200 }))
      }

      const api = new JobPluginsApi()
      await api.createCacheFlowRun('ds-abc')

      const headers = capturedInit?.headers as Record<string, string>
      assertEquals(headers['Authorization'], undefined)
    })

    it('throws on non-ok response with status in message', async () => {
      globalThis.fetch = () => {
        return Promise.resolve(new Response('Server error', { status: 500 }))
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
      globalThis.fetch = (url: string) => {
        capturedUrl = url
        return Promise.resolve(new Response(JSON.stringify({ state: { type: 'COMPLETED' } }), { status: 200 }))
      }

      const api = new JobPluginsApi()
      await api.getFlowRunState('run-xyz')

      assertEquals(capturedUrl, 'http://localhost:8000/jobplugins/cachedb/results/run-xyz')
    })

    it('maps COMPLETED payload to COMPLETED state', async () => {
      globalThis.fetch = () => {
        return Promise.resolve(new Response(JSON.stringify({ state: { type: 'COMPLETED' } }), { status: 200 }))
      }

      const api = new JobPluginsApi()
      const result = await api.getFlowRunState('run-123')

      assertEquals(result.state, 'COMPLETED')
    })

    it('surfaces end_time as endTime alongside the state', async () => {
      globalThis.fetch = () => {
        return Promise.resolve(new Response(
          JSON.stringify({ state: { type: 'COMPLETED' }, end_time: '2026-09-01T12:00:00.000Z' }),
          { status: 200 },
        ))
      }

      const api = new JobPluginsApi()
      const result = await api.getFlowRunState('run-123')

      assertEquals(result.endTime, Date.parse('2026-09-01T12:00:00.000Z'))
    })

    it('returns UNKNOWN (does not throw) on non-ok response', async () => {
      globalThis.fetch = () => {
        return Promise.resolve(new Response('Not found', { status: 404 }))
      }

      const api = new JobPluginsApi()
      const result = await api.getFlowRunState('run-missing')

      assertEquals(result.state, 'UNKNOWN')
      assertEquals(result.endTime, null)
    })

    // jobplugins' getFlowRunResults returns Prefect's result[0], which is undefined
    // when the run has been pruned from Prefect's history. express then sends a 200
    // with an EMPTY body, and a naive res.json() throws a SyntaxError on it.
    it('returns UNKNOWN (does not throw) on a 200 with an empty body', async () => {
      globalThis.fetch = () => {
        return Promise.resolve(new Response('', { status: 200 }))
      }

      const api = new JobPluginsApi()
      const result = await api.getFlowRunState('run-pruned')

      assertEquals(result.state, 'UNKNOWN')
      assertEquals(result.endTime, null)
    })

    it('returns UNKNOWN (does not throw) on a 200 with an unparseable body', async () => {
      globalThis.fetch = () => {
        return Promise.resolve(new Response('not json', { status: 200 }))
      }

      const api = new JobPluginsApi()
      const result = await api.getFlowRunState('run-garbled')

      assertEquals(result.state, 'UNKNOWN')
      assertEquals(result.endTime, null)
    })
  })
})
