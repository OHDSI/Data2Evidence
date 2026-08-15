import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/composables/usePortalContext', () => ({
  usePortalContext: vi.fn(),
}))

import { usePortalContext } from '@/composables/usePortalContext'

describe('utils/IfrToExtCohortDeps/api/request', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('adds bearer token from portal context in request interceptor', async () => {
    ;(usePortalContext as any).mockReturnValue({
      getToken: vi.fn(async () => 'ctx-token'),
      qeSvcUrl: 'https://qe.example',
    })

    const { client } = await import('../request')
    const handler = (client.interceptors.request as any).handlers[0].fulfilled
    const config = { headers: {} as Record<string, string> }

    const updatedConfig = await handler(config)

    expect(updatedConfig.baseURL).toBe('https://qe.example')
    expect(updatedConfig.headers.Authorization).toBe('Bearer ctx-token')
  })
})
