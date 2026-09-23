import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useAtlasParcel } from '../useAtlasParcel'
import { usePortalContextStore } from '@/stores/portalContext'

/**
 * No component is mounted here. The parcel is a fake object with the single-spa
 * handle shape, and `window.System` is stubbed, so these assert lifecycle and
 * teardown behaviour only - which the repository's testing policy allows.
 */

type FakeParcel = {
  mountPromise: Promise<unknown>
  unmount: ReturnType<typeof vi.fn>
  update?: ReturnType<typeof vi.fn>
  getStatus: () => string
}

const PLUGIN = 'data-quality'

let mountCalls: Array<Record<string, unknown>>
let parcels: FakeParcel[]
let systemImport: ReturnType<typeof vi.fn>

const makeLifecycles = () => ({
  bootstrap: vi.fn(async () => undefined),
  mount: vi.fn(async () => undefined),
  unmount: vi.fn(async () => undefined),
})

vi.mock('single-spa', () => ({
  mountRootParcel: (_config: unknown, props: Record<string, unknown>) => {
    mountCalls.push(props)
    let status = 'MOUNTED'
    const parcel: FakeParcel = {
      mountPromise: Promise.resolve(),
      unmount: vi.fn(async () => {
        status = 'NOT_MOUNTED'
      }),
      getStatus: () => status,
    }
    parcels.push(parcel)
    return parcel
  },
}))

const setSystem = (impl: (url: string) => Promise<unknown>) => {
  systemImport = vi.fn(impl)
  ;(window as unknown as { System?: unknown }).System = { import: systemImport }
}

beforeEach(() => {
  setActivePinia(createPinia())
  mountCalls = []
  parcels = []
  setSystem(async () => makeLifecycles())
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  delete (window as unknown as { System?: unknown }).System
  vi.restoreAllMocks()
})

const makeParcel = (extra: Record<string, unknown> = {}) => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const container = ref<HTMLElement | null>(el)
  return {
    container,
    parcel: useAtlasParcel({
      pluginId: PLUGIN,
      container,
      props: () => ({ hostContext: { sourceKey: 'ds-1' }, ...extra }),
    }),
  }
}

/** The injected <link> resolves only when something fires its load event. */
const settleStylesheet = async () => {
  await Promise.resolve()
  const link = document.getElementById(`plugin-style-${PLUGIN}`)
  link?.dispatchEvent(new Event('load'))
}

const mountAndSettle = async (parcel: ReturnType<typeof makeParcel>['parcel']) => {
  const pending = parcel.mount()
  await settleStylesheet()
  await pending
}

describe('useAtlasParcel', () => {
  it('mounts once and reports mounted', async () => {
    const { parcel } = makeParcel()
    await mountAndSettle(parcel)
    expect(parcel.status.value).toBe('mounted')
    expect(parcels).toHaveLength(1)
    expect(systemImport).toHaveBeenCalledTimes(1)
  })

  it('passes the host prop bundle, with the caller overriding it', async () => {
    const { parcel } = makeParcel({ locale: 'de' })
    await mountAndSettle(parcel)
    expect(mountCalls[0]).toMatchObject({
      name: PLUGIN,
      appId: PLUGIN,
      isAtlas: true,
      locale: 'de',
      hostContext: { sourceKey: 'ds-1' },
    })
    expect(typeof mountCalls[0].t).toBe('function')
    expect(mountCalls[0].domElement).toBeInstanceOf(HTMLElement)
  })

  it('does not pass uiFilesUrl, which would flip the plugin into routed mode', async () => {
    const { parcel } = makeParcel()
    await mountAndSettle(parcel)
    expect(mountCalls[0]).not.toHaveProperty('uiFilesUrl')
  })

  it('open -> close -> open mounts twice and unmounts once in between', async () => {
    const { parcel } = makeParcel()
    await mountAndSettle(parcel)
    await parcel.unmount()
    expect(parcels[0].unmount).toHaveBeenCalledTimes(1)
    expect(parcel.status.value).toBe('idle')

    await mountAndSettle(parcel)
    expect(parcels).toHaveLength(2)
    expect(parcel.status.value).toBe('mounted')
  })

  it('a second mount while one is in flight does not create a second parcel', async () => {
    const { parcel } = makeParcel()
    const first = parcel.mount()
    const second = parcel.mount()
    await settleStylesheet()
    await Promise.all([first, second])
    expect(parcels).toHaveLength(1)
  })

  it('an unmount during an in-flight mount leaves nothing mounted', async () => {
    const { parcel } = makeParcel()
    const pending = parcel.mount()
    const closing = parcel.unmount()
    await settleStylesheet()
    await Promise.all([pending, closing])
    expect(parcel.status.value).toBe('idle')
    // The parcel that finished loading after the unmount is torn down, not kept.
    expect(parcels.every(p => p.getStatus() !== 'MOUNTED')).toBe(true)
  })

  it('reports an error state when the bundle fails to load, without throwing', async () => {
    setSystem(async () => {
      throw new Error('404')
    })
    const { parcel } = makeParcel()
    await expect(mountAndSettle(parcel)).resolves.toBeUndefined()
    expect(parcel.status.value).toBe('error')
    expect(parcel.error.value).toBeInstanceOf(Error)
    expect(parcels).toHaveLength(0)
  })

  it('retries after a failure', async () => {
    setSystem(async () => {
      throw new Error('404')
    })
    const { parcel } = makeParcel()
    await mountAndSettle(parcel)
    expect(parcel.status.value).toBe('error')

    setSystem(async () => makeLifecycles())
    await mountAndSettle(parcel)
    expect(parcel.status.value).toBe('mounted')
  })

  it('errors rather than throwing when the bundle exports no lifecycles', async () => {
    setSystem(async () => ({ nope: true }))
    const { parcel } = makeParcel()
    await mountAndSettle(parcel)
    expect(parcel.status.value).toBe('error')
    expect(parcel.error.value?.message).toMatch(/lifecycles/)
  })

  it('errors rather than throwing when SystemJS is absent', async () => {
    delete (window as unknown as { System?: unknown }).System
    const { parcel } = makeParcel()
    await mountAndSettle(parcel)
    expect(parcel.status.value).toBe('error')
    expect(parcel.error.value?.message).toMatch(/SystemJS/)
  })

  it('injects the stylesheet once, at the id Atlas itself uses', async () => {
    const { parcel } = makeParcel()
    await mountAndSettle(parcel)
    await parcel.unmount()
    await mountAndSettle(parcel)
    expect(document.querySelectorAll(`#plugin-style-${PLUGIN}`)).toHaveLength(1)
  })

  it('leaves an existing stylesheet alone, so Atlas and we cannot double-inject', async () => {
    const link = document.createElement('link')
    link.id = `plugin-style-${PLUGIN}`
    link.rel = 'stylesheet'
    link.dataset.loaded = 'true'
    document.head.appendChild(link)

    const { parcel } = makeParcel()
    await mountAndSettle(parcel)
    expect(document.querySelectorAll(`#plugin-style-${PLUGIN}`)).toHaveLength(1)
    expect(document.getElementById(`plugin-style-${PLUGIN}`)).toBe(link)
  })

  it('unmount is safe when nothing was ever mounted', async () => {
    const { parcel } = makeParcel()
    await expect(parcel.unmount()).resolves.toBeUndefined()
    expect(parcel.status.value).toBe('idle')
  })

  it('derives the entry URL from the host uiFilesUrl', async () => {
    usePortalContextStore().applyProps({ uiFilesUrl: '/atlas/plugins/patient-analytics/' })
    const { parcel } = makeParcel()
    await mountAndSettle(parcel)
    expect(systemImport).toHaveBeenCalledWith(expect.stringContaining('/atlas/plugins/data-quality/index.system.js'))
  })
})
