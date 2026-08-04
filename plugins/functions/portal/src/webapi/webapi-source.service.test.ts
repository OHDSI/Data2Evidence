import { describe, it } from '@std/testing/bdd'
import { assertEquals } from '@std/assert'
import { WebApiSourceService } from './webapi-source.service.ts'

function makeService(cacheStatus: unknown, createCacheResult?: unknown) {
  const api = {
    getCacheStatus: () => Promise.resolve(cacheStatus),
    createCache: () => Promise.resolve(createCacheResult),
  }
  // deno-lint-ignore no-explicit-any
  return new WebApiSourceService(api as any)
}

describe('WebApiSourceService.getCacheStatus', () => {
  it('passes lastModified through and reports ready when built', async () => {
    const svc = makeService({
      cacheExists: true,
      cacheAttached: true,
      lastModified: 1782194854916,
      activeJob: null,
    })
    const status = await svc.getCacheStatus('key')
    assertEquals(status.ready, true)
    assertEquals(status.lastModified, 1782194854916)
    assertEquals(status.cacheExists, true)
    assertEquals(status.cacheAttached, true)
  })

  it('reports not-ready and null lastModified when no cache exists', async () => {
    const svc = makeService({ cacheExists: false, cacheAttached: false })
    const status = await svc.getCacheStatus('key')
    assertEquals(status.ready, false)
    assertEquals(status.lastModified, null)
  })
})

describe('WebApiSourceService.refreshCache', () => {
  it('delegates to createCache with sourceKey, schemaName and authToken and returns its result', async () => {
    const stubResult = { success: true, databaseCode: '_ds1' }
    let capturedArgs: unknown[] = []
    const api = {
      getCacheStatus: () => Promise.resolve({}),
      createCache: (...args: unknown[]) => {
        capturedArgs = args
        return Promise.resolve(stubResult)
      },
    }
    // deno-lint-ignore no-explicit-any
    const svc = new WebApiSourceService(api as any)
    const result = await svc.refreshCache('ds1', 'cdm_x_123', 'Bearer t')
    assertEquals(result, stubResult)
    assertEquals(capturedArgs, ['ds1', 'cdm_x_123', 'Bearer t'])
  })

  it('propagates a failure result from createCache', async () => {
    const stubResult = { success: false, databaseCode: '_ds1', error: 'boom' }
    const api = {
      getCacheStatus: () => Promise.resolve({}),
      createCache: () => Promise.resolve(stubResult),
    }
    // deno-lint-ignore no-explicit-any
    const svc = new WebApiSourceService(api as any)
    const result = await svc.refreshCache('ds1', 'cdm_x_123', 'Bearer t')
    assertEquals(result, stubResult)
  })
})
