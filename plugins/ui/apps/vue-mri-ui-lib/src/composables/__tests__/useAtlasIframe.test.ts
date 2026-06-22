import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

vi.mock('../usePortalContext', () => ({
  usePortalContext: vi.fn(),
}))

vi.mock('@/stores/atlas', () => ({
  useAtlasStore: vi.fn(),
}))

import { usePortalContext } from '../usePortalContext'
import { useAtlasStore } from '@/stores/atlas'

describe('useAtlasIframe', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('seeds the Atlas3 bearerToken in localStorage on preload, interval and load', async () => {
    vi.useFakeTimers()

    ;(usePortalContext as any).mockReturnValue({
      getToken: vi.fn(async () => 'test-token'),
      datasetId: 'dataset-1',
      username: 'user-1',
    })
    ;(useAtlasStore as any).mockReturnValue({ closeAtlas: vi.fn() })

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { useAtlasIframe } = await import('../useAtlasIframe')

    const TestComp = defineComponent({
      setup() {
        const iframeRef = ref({ contentWindow: { postMessage: vi.fn() } } as any)
        const hook = useAtlasIframe(iframeRef)
        return { hook }
      },
      render() {
        return h('div')
      },
    })

    const wrapper = mount(TestComp)
    await (wrapper.vm as any).hook.preloadToken()

    // Atlas3 reads its token from localStorage['bearerToken'] on boot.
    expect(localStorage.getItem('bearerToken')).toBe('test-token')
    // The old Atlas Lite sessionStorage handshake must no longer be used.
    expect(sessionStorage.getItem('d2e-token')).toBeNull()

    setItemSpy.mockClear()
    await vi.advanceTimersByTimeAsync(1000)
    expect(setItemSpy).toHaveBeenCalledWith('bearerToken', 'test-token')

    setItemSpy.mockClear()
    await (wrapper.vm as any).hook.handleIframeLoad()
    expect(setItemSpy).toHaveBeenCalledWith('bearerToken', 'test-token')

    wrapper.unmount()
    expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function))
  })

  it('closes atlas on CLOSE_ATLAS from same origin only', async () => {
    const closeAtlas = vi.fn()
    ;(usePortalContext as any).mockReturnValue({
      getToken: vi.fn(async () => 'test-token'),
      datasetId: 'dataset-1',
      username: 'user-1',
    })
    ;(useAtlasStore as any).mockReturnValue({ closeAtlas })

    let messageHandler: ((event: MessageEvent) => void) | null = null
    vi.spyOn(window, 'addEventListener').mockImplementation((type: any, listener: any) => {
      if (type === 'message') {
        messageHandler = listener
      }
    })

    const { useAtlasIframe } = await import('../useAtlasIframe')

    const TestComp = defineComponent({
      setup() {
        const iframeRef = ref({ contentWindow: { postMessage: vi.fn() } } as any)
        useAtlasIframe(iframeRef)
        return {}
      },
      render() {
        return h('div')
      },
    })

    const wrapper = mount(TestComp)
    expect(messageHandler).toBeTruthy()

    messageHandler?.({ origin: 'https://wrong-origin', data: { type: 'CLOSE_ATLAS' } } as MessageEvent)
    expect(closeAtlas).not.toHaveBeenCalled()

    const sameOrigin = `${window.location.protocol}//${window.location.hostname}${
      window.location.port ? ':' + window.location.port : ''
    }`
    messageHandler?.({ origin: sameOrigin, data: { type: 'WRONG_TYPE' } } as MessageEvent)
    expect(closeAtlas).not.toHaveBeenCalled()

    messageHandler?.({ origin: sameOrigin, data: { type: 'CLOSE_ATLAS' } } as MessageEvent)
    expect(closeAtlas).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })
})
