import { vi } from 'vitest'
import { createPaTools, registerPaTools, PaTool } from '../webmcpServer'

// A minimal Vuex-store stand-in. Only the surface the handlers touch is mocked:
// a few getters and dispatch. This is verification "layer B" — handler ↔ Vuex
// correctness — with no browser / modelContext in play.
//
// `bookmarks` seeds getters.getBookmarks (saved-cohort records shaped like the
// real store: { bmkId, bookmarkname, ... }). `loadAllResult`, when set, is what
// getBookmarks becomes after a `fireBookmarkQuery({cmd:'loadAll'})` dispatch —
// so we can exercise the "list not loaded yet" branch realistically.
const makeStore = ({ bookmarks = [], loadAllResult }: { bookmarks?: any[]; loadAllResult?: any[] } = {}) => {
  const store: any = {
    getters: {
      getBookmarksData: { name: 'Elderly Diabetics', cards: ['c1'] },
      getBookmarkFromIFR: { filter: { age: { min: 65 } } },
      getBookmarks: bookmarks,
    },
    dispatch: vi.fn(),
  }
  store.dispatch.mockImplementation((type: string, payload: any) => {
    if (type === 'fireBookmarkQuery' && payload?.params?.cmd === 'loadAll' && loadAllResult) {
      store.getters.getBookmarks = loadAllResult
    }
    return Promise.resolve(undefined)
  })
  return store
}

const byName = (tools: PaTool[], name: string): PaTool => {
  const tool = tools.find(t => t.name === name)
  if (!tool) throw new Error(`tool ${name} not registered`)
  return tool
}

// Every handler returns { content: [{ type: 'text', text: <json> }] }.
const parse = (res: { content: Array<{ text: string }> }) => JSON.parse(res.content[0].text)

describe('createPaTools', () => {
  it('registers exactly the expected PA tools with required-arg schemas', () => {
    const tools = createPaTools(makeStore())

    expect(tools.map(t => t.name)).toEqual([
      'pa_get_current_cohort',
      'pa_list_cohorts',
      'pa_open_cohort',
      'pa_apply_cohort_patch',
      'pa_list_filter_options',
      'pa_save_current_cohort',
    ])
    // pa_save_current_cohort must declare its required inputs so the model can't
    // call it with an empty object. pa_apply_cohort_patch accepts either
    // `patchOps` (preferred) or `bookmark` (legacy), so neither is unconditionally
    // required — the handler validates that at least one is present.
    expect((byName(tools, 'pa_save_current_cohort').inputSchema as any).required).toEqual(['params'])
  })

  describe('pa_get_current_cohort', () => {
    it('serializes the live bookmark getters — the value only the running store has', async () => {
      const store = makeStore()
      const res = await byName(createPaTools(store), 'pa_get_current_cohort').execute()

      expect(parse(res)).toEqual({
        bookmarkData: store.getters.getBookmarksData,
        ifr: store.getters.getBookmarkFromIFR,
      })
      expect(store.dispatch).not.toHaveBeenCalled()
    })
  })

  describe('pa_list_cohorts', () => {
    it('returns the saved cohorts as { bmkId, name } without refetching when already loaded', async () => {
      const store = makeStore({
        bookmarks: [
          { bmkId: 'b1', bookmarkname: 'Elderly Diabetics', bookmark: '{}' },
          { bmkId: 'b2', bookmarkname: 'Young Smokers', bookmark: '{}' },
        ],
      })
      const res = await byName(createPaTools(store), 'pa_list_cohorts').execute()

      expect(parse(res)).toEqual({
        cohorts: [
          { bmkId: 'b1', name: 'Elderly Diabetics' },
          { bmkId: 'b2', name: 'Young Smokers' },
        ],
      })
      expect(store.dispatch).not.toHaveBeenCalledWith('fireBookmarkQuery', expect.anything())
    })

    it('fetches the list via fireBookmarkQuery(loadAll) when the store is empty', async () => {
      const store = makeStore({
        bookmarks: [],
        loadAllResult: [{ bmkId: 'b9', bookmarkname: 'Loaded Later', bookmark: '{}' }],
      })
      const res = await byName(createPaTools(store), 'pa_list_cohorts').execute()

      expect(store.dispatch).toHaveBeenCalledWith('fireBookmarkQuery', { method: 'get', params: { cmd: 'loadAll' } })
      expect(parse(res)).toEqual({ cohorts: [{ bmkId: 'b9', name: 'Loaded Later' }] })
    })
  })

  describe('pa_open_cohort', () => {
    const cohorts = [
      { bmkId: 'b1', bookmarkname: 'Elderly Diabetics', bookmark: '{}' },
      { bmkId: 'b2', bookmarkname: 'Young Smokers', bookmark: '{}' },
      { bmkId: 'b3', bookmarkname: 'Dupe', bookmark: '{}' },
      { bmkId: 'b4', bookmarkname: 'Dupe', bookmark: '{}' },
    ]

    it('resolves a unique name to its bmkId and loads it into the builder', async () => {
      const store = makeStore({ bookmarks: cohorts })
      const res = await byName(createPaTools(store), 'pa_open_cohort').execute({ name: 'Young Smokers' })

      expect(store.dispatch).toHaveBeenCalledWith('loadbookmarkToState', { bmkId: 'b2', chartType: undefined })
      expect(parse(res)).toEqual({ opened: true, bmkId: 'b2' })
    })

    it('opens by explicit bmkId (with chartType) when provided', async () => {
      const store = makeStore({ bookmarks: cohorts })
      const res = await byName(createPaTools(store), 'pa_open_cohort').execute({ bmkId: 'b1', chartType: 'bar' })

      expect(store.dispatch).toHaveBeenCalledWith('loadbookmarkToState', { bmkId: 'b1', chartType: 'bar' })
      expect(parse(res)).toEqual({ opened: true, bmkId: 'b1' })
    })

    it('returns an error and does not load when the name is unknown', async () => {
      const store = makeStore({ bookmarks: cohorts })
      const res = await byName(createPaTools(store), 'pa_open_cohort').execute({ name: 'Nonexistent' })

      expect(parse(res)).toEqual({ opened: false, error: 'No cohort named "Nonexistent".' })
      expect(store.dispatch).not.toHaveBeenCalledWith('loadbookmarkToState', expect.anything())
    })

    it('returns the candidates (and does not load) when a name is ambiguous', async () => {
      const store = makeStore({ bookmarks: cohorts })
      const res = await byName(createPaTools(store), 'pa_open_cohort').execute({ name: 'Dupe' })

      expect(parse(res)).toEqual({
        opened: false,
        ambiguous: [
          { bmkId: 'b3', name: 'Dupe' },
          { bmkId: 'b4', name: 'Dupe' },
        ],
      })
      expect(store.dispatch).not.toHaveBeenCalledWith('loadbookmarkToState', expect.anything())
    })

    it('errors when a bmkId does not exist', async () => {
      const store = makeStore({ bookmarks: cohorts })
      const res = await byName(createPaTools(store), 'pa_open_cohort').execute({ bmkId: 'nope' })

      expect(parse(res)).toEqual({ opened: false, error: 'No cohort with bmkId "nope".' })
      expect(store.dispatch).not.toHaveBeenCalledWith('loadbookmarkToState', expect.anything())
    })

    it('errors when neither name nor bmkId is given', async () => {
      const store = makeStore({ bookmarks: cohorts })
      const res = await byName(createPaTools(store), 'pa_open_cohort').execute({})

      expect(parse(res)).toEqual({ opened: false, error: 'Provide a cohort name or bmkId.' })
      expect(store.dispatch).not.toHaveBeenCalled()
    })
  })

  describe('pa_apply_cohort_patch', () => {
    it('dispatches loadBookmarkDataToState with the bookmark + chartType', async () => {
      const store = makeStore()
      const bookmark = { filter: { some: 'filter' } }
      const res = await byName(createPaTools(store), 'pa_apply_cohort_patch').execute({ bookmark, chartType: 'bar' })

      expect(store.dispatch).toHaveBeenCalledWith('loadBookmarkDataToState', { bookmark, chartType: 'bar' })
      expect(parse(res)).toEqual({ applied: true })
    })

    it('passes chartType: undefined when omitted', async () => {
      const store = makeStore()
      const bookmark = { filter: {} }
      await byName(createPaTools(store), 'pa_apply_cohort_patch').execute({ bookmark })

      expect(store.dispatch).toHaveBeenCalledWith('loadBookmarkDataToState', { bookmark, chartType: undefined })
    })

    it('routes patchOps through the deterministic applier (no legacy bookmark dispatch)', async () => {
      const store = makeStore()
      // Minimal store surface applyCohortPatch touches for a single add_card.
      store.getters.getFilterCards = () => ({ fc1: {} })
      store.dispatch.mockImplementation((type: string) => {
        if (type === 'addFilterCard') return Promise.resolve('fc1')
        return Promise.resolve(undefined)
      })

      const patchOps = [{ op: 'add_card', cardConfigPath: 'patient.interactions.priDiag' }]
      const res = await byName(createPaTools(store), 'pa_apply_cohort_patch').execute({ patchOps })

      expect(store.dispatch).toHaveBeenCalledWith('addFilterCard', {
        configPath: 'patient.interactions.priDiag',
        isExclusion: false,
      })
      expect(store.dispatch).not.toHaveBeenCalledWith('loadBookmarkDataToState', expect.anything())
      expect(parse(res)).toEqual({ applied: true, createdCards: ['fc1'] })
    })

    it('returns applied:false with an error when neither patchOps nor bookmark is given', async () => {
      const store = makeStore()
      const res = await byName(createPaTools(store), 'pa_apply_cohort_patch').execute({})

      expect(parse(res)).toEqual({ applied: false, error: 'Provide patchOps (preferred) or a bookmark object.' })
      expect(store.dispatch).not.toHaveBeenCalled()
    })
  })

  describe('pa_list_filter_options', () => {
    it('maps the frontend config filter cards + attributes to a flat catalog', async () => {
      const store = makeStore()
      store.getters.getMriFrontendConfig = {
        getFilterCards: () => [
          {
            getConfigPath: () => 'patient',
            getName: () => 'Basic Data',
            getAllAttributes: () => [
              { getConfigPath: () => 'patient.attributes.age', getName: () => 'Age', getType: () => 'num' },
            ],
          },
        ],
      }

      const res = await byName(createPaTools(store), 'pa_list_filter_options').execute()

      expect(parse(res)).toEqual({
        filterCards: [
          {
            cardConfigPath: 'patient',
            cardName: 'Basic Data',
            attributes: [{ attributePath: 'patient.attributes.age', name: 'Age', type: 'num' }],
          },
        ],
      })
    })

    it('degrades gracefully when the frontend config is not loaded', async () => {
      const store = makeStore()
      store.getters.getMriFrontendConfig = undefined
      const res = await byName(createPaTools(store), 'pa_list_filter_options').execute()
      expect(parse(res)).toEqual({ filterCards: [], error: 'Frontend config not loaded.' })
    })
  })

  describe('pa_save_current_cohort', () => {
    it('defaults method to "post" and returns the bmkId from the dispatch result', async () => {
      const store = makeStore()
      store.dispatch.mockResolvedValue({ bmkId: 'srv-generated-42' })
      const params = { name: 'x' }
      const res = await byName(createPaTools(store), 'pa_save_current_cohort').execute({ params })

      expect(store.dispatch).toHaveBeenCalledWith('fireBookmarkQuery', {
        method: 'post',
        params,
        bookmarkId: undefined,
      })
      expect(parse(res)).toEqual({ saved: true, bookmarkId: 'srv-generated-42' })
    })

    it('falls back to the passed bookmarkId when the result has none (e.g. put/update)', async () => {
      const store = makeStore()
      store.dispatch.mockResolvedValue(undefined)
      const params = { name: 'x' }
      const res = await byName(createPaTools(store), 'pa_save_current_cohort').execute({
        params,
        bookmarkId: 'existing-7',
        method: 'put',
      })

      expect(store.dispatch).toHaveBeenCalledWith('fireBookmarkQuery', {
        method: 'put',
        params,
        bookmarkId: 'existing-7',
      })
      expect(parse(res)).toEqual({ saved: true, bookmarkId: 'existing-7' })
    })
  })
})

describe('registerPaTools', () => {
  afterEach(() => {
    delete (document as any).modelContext
    delete (navigator as any).modelContext
    vi.restoreAllMocks()
  })

  it('returns a no-op and warns when modelContext is unavailable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const cleanup = registerPaTools(makeStore())

    expect(typeof cleanup).toBe('function')
    expect(warn).toHaveBeenCalledOnce()
    expect(() => cleanup()).not.toThrow()
  })

  it('registers every createPaTools tool on document.modelContext and unregisters on cleanup', () => {
    const unregister = vi.fn()
    const registerTool = vi.fn(() => ({ unregister }))
    ;(document as any).modelContext = { registerTool }
    const store = makeStore()
    const toolCount = createPaTools(store).length

    const cleanup = registerPaTools(store)

    const registeredNames = registerTool.mock.calls.map(c => (c[0] as PaTool).name)
    expect(registeredNames).toEqual(createPaTools(store).map(t => t.name))
    expect(registerTool).toHaveBeenCalledTimes(toolCount)

    cleanup()
    expect(unregister).toHaveBeenCalledTimes(toolCount)
  })

  it('falls back to navigator.modelContext when document.modelContext is absent', () => {
    const registerTool = vi.fn(() => ({ unregister: vi.fn() }))
    ;(navigator as any).modelContext = { registerTool }
    const store = makeStore()

    registerPaTools(store)

    expect(registerTool).toHaveBeenCalledTimes(createPaTools(store).length)
  })
})
