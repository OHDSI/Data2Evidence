import { afterEach, describe, expect, it, vi } from 'vitest'
import { publishPaTools, PA_TOOLS_CHANGED_EVENT } from '../paToolBridge'
import { createPaTools } from '../webmcpServer'

// Same minimal Vuex stand-in as webmcpServer.test.ts, plus getSelectedDataset —
// the bridge surfaces the loaded dataset so the drawer can refuse to edit a
// cohort belonging to a different dataset than the one the user is looking at.
const makeStore = (datasetId: string | null = 'ds-1') => ({
  getters: {
    getBookmarksData: { name: 'Elderly Diabetics', cards: ['c1'] },
    getBookmarkFromIFR: { filter: { age: { min: 65 } } },
    getBookmarks: [],
    getActiveBookmark: null,
    getSelectedDataset: datasetId === null ? undefined : { id: datasetId },
  },
  dispatch: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn(),
})

const registry = () => {
  const reg = window.__d2ePaTools
  if (!reg) throw new Error('registry not published')
  return reg
}

describe('publishPaTools', () => {
  afterEach(() => {
    delete window.__d2ePaTools
    vi.restoreAllMocks()
  })

  it('publishes a descriptor for every createPaTools tool', () => {
    const store: any = makeStore()

    publishPaTools(store)

    const names = registry()
      .list()
      .map(t => t.name)
    expect(names).toEqual(createPaTools(store).map(t => t.name))
    expect(registry().version).toBe(1)
    // Descriptors must carry what a model needs to call the tool.
    for (const descriptor of registry().list()) {
      expect(descriptor.description).toBeTruthy()
      expect(descriptor.inputSchema).toBeTruthy()
    }
  })

  it('announces availability on publish and on teardown', () => {
    const seen: boolean[] = []
    const listener = (e: Event) => seen.push((e as CustomEvent).detail.available)
    window.addEventListener(PA_TOOLS_CHANGED_EVENT, listener)

    const teardown = publishPaTools(makeStore() as any)
    teardown()

    window.removeEventListener(PA_TOOLS_CHANGED_EVENT, listener)
    expect(seen).toEqual([true, false])
  })

  it('reads datasetId live rather than snapshotting it', () => {
    const store: any = makeStore('ds-1')
    publishPaTools(store)
    expect(registry().datasetId).toBe('ds-1')

    // The user switched datasets while PA stayed mounted.
    store.getters.getSelectedDataset = { id: 'ds-2' }
    expect(registry().datasetId).toBe('ds-2')
  })

  it('reports a null datasetId when no dataset is loaded', () => {
    publishPaTools(makeStore(null) as any)
    expect(registry().datasetId).toBeNull()
  })

  it('executes a tool through call() and returns its MCP result envelope', async () => {
    const store: any = makeStore()
    publishPaTools(store)

    const result = await registry().call('pa_get_current_cohort')

    expect(JSON.parse(result.content[0].text)).toMatchObject({
      bookmarkData: store.getters.getBookmarksData,
      ifr: store.getters.getBookmarkFromIFR,
    })
  })

  it('passes arguments through to the tool handler', async () => {
    const store: any = makeStore()
    publishPaTools(store)

    await registry().call('pa_new_cohort', { name: 'Cohort X' })

    expect(store.commit).toHaveBeenCalledWith('SET_ACTIVE_BOOKMARK', {
      bookmarkname: 'Cohort X',
      isNew: true,
    })
  })

  it('rejects an unknown tool with the available names', async () => {
    publishPaTools(makeStore() as any)

    await expect(registry().call('pa_not_a_tool')).rejects.toThrow(/Unknown PA tool "pa_not_a_tool".*pa_new_cohort/s)
  })

  it('removes the registry on teardown', () => {
    const teardown = publishPaTools(makeStore() as any)
    teardown()
    expect(window.__d2ePaTools).toBeUndefined()
  })

  // A remount can publish before the outgoing instance tears down. The stale
  // teardown must not remove the live registry — that would leave the drawer
  // believing PA is gone while it is on screen.
  it('teardown of a superseded registry leaves the newer one in place', () => {
    const staleTeardown = publishPaTools(makeStore() as any)
    publishPaTools(makeStore('ds-2') as any)

    staleTeardown()

    expect(window.__d2ePaTools).toBeDefined()
    expect(registry().datasetId).toBe('ds-2')
  })
})
