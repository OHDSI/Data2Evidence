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
      getActiveBookmark: null,
    },
    dispatch: vi.fn(),
    commit: vi.fn(),
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
      'pa_new_cohort',
      'pa_get_current_cohort',
      'pa_list_cohorts',
      'pa_open_cohort',
      'pa_apply_cohort_patch',
      'pa_list_filter_options',
      'pa_search_attribute_values',
      'pa_get_cohort_result',
      'pa_save_current_cohort',
    ])
    // pa_save_current_cohort has no unconditionally-required input: it builds the
    // payload from live store state given { name } (insert) or { bookmarkId } (update),
    // and still accepts a raw `params` escape hatch — the handler validates the combo.
    expect((byName(tools, 'pa_save_current_cohort').inputSchema as any).required).toBeUndefined()
    // pa_search_attribute_values does require its two search inputs.
    expect((byName(tools, 'pa_search_attribute_values').inputSchema as any).required).toEqual([
      'attributePath',
      'query',
    ])
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

    it('forceRefresh reloads via loadAll even when the list is already populated (fixes staleness)', async () => {
      const store = makeStore({
        bookmarks: [{ bmkId: 'b1', bookmarkname: 'Old', bookmark: '{}' }],
        loadAllResult: [
          { bmkId: 'b1', bookmarkname: 'Old', bookmark: '{}' },
          { bmkId: 'b2', bookmarkname: 'Just Saved', bookmark: '{}' },
        ],
      })
      const res = await byName(createPaTools(store), 'pa_list_cohorts').execute({ forceRefresh: true })

      expect(store.dispatch).toHaveBeenCalledWith('fireBookmarkQuery', { method: 'get', params: { cmd: 'loadAll' } })
      expect(parse(res)).toEqual({
        cohorts: [
          { bmkId: 'b1', name: 'Old' },
          { bmkId: 'b2', name: 'Just Saved' },
        ],
      })
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

    it('attaches the valid filter catalog when a patch fails, so a bad path is self-correcting', async () => {
      const store = makeStore()
      store.getters.getMriFrontendConfig = {
        getFilterCards: () => [
          { getConfigPath: () => 'patient', getName: () => 'Basic Data', getAllAttributes: () => [] },
        ],
      }
      // Force the applier to throw (addFilterCard rejects).
      store.dispatch.mockImplementation((type: string) =>
        type === 'addFilterCard' ? Promise.reject(new Error('boom')) : Promise.resolve(undefined)
      )

      const res = await byName(createPaTools(store), 'pa_apply_cohort_patch').execute({
        patchOps: [{ op: 'add_card', cardConfigPath: 'patient' }],
      })

      const parsed = parse(res)
      expect(parsed.applied).toBe(false)
      expect(parsed.validFilterOptions).toEqual([{ cardConfigPath: 'patient', cardName: 'Basic Data', attributes: [] }])
    })

    it('rejects a malformed bookmark, restores the active cohort, and steers to patchOps', async () => {
      const store = makeStore()
      const prevActive = { bmkId: 'test-1', bookmarkname: 'test', isNew: false }
      store.getters.getActiveBookmark = prevActive
      // loadBookmarkDataToState clobbers the active bookmark, then rejects on the bad tree.
      store.dispatch.mockImplementation((type: string) => {
        if (type === 'loadBookmarkDataToState') {
          const e: any = new Error('')
          e.name = 'InvalidArgumentException'
          return Promise.reject(e)
        }
        return Promise.resolve(undefined)
      })

      const res = await byName(createPaTools(store), 'pa_apply_cohort_patch').execute({
        // filter card missing `attributes` — the shape that threw in the wild
        bookmark: { filter: { cards: { type: 'FilterCard' } } },
      })

      const parsed = parse(res)
      expect(parsed.applied).toBe(false)
      expect(parsed.error).toContain('patchOps')
      // the failed load left a broken active bookmark; the tool restores the prior one
      expect(store.commit).toHaveBeenCalledWith('SET_ACTIVE_BOOKMARK', prevActive)
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

      const parsed = parse(res)
      expect(parsed.filterCards).toEqual([
        {
          cardConfigPath: 'patient',
          cardName: 'Basic Data',
          attributes: [
            {
              attributePath: 'patient.attributes.age',
              name: 'Age',
              type: 'num',
              valueKind: 'numeric',
              howTo: expect.stringContaining('operator'),
            },
          ],
        },
      ])
      // the routing note steers value shape on non-OMOP configs
      expect(parsed.note).toContain('valueKind')
    })

    it('classifies a coded catalog attribute (useRefValue) as valueKind "catalog"', async () => {
      const store = makeStore()
      store.getters.getMriFrontendConfig = {
        getFilterCards: () => [
          {
            getConfigPath: () => 'patient.interactions.conditionoccurrence',
            getName: () => 'Conditions',
            getAllAttributes: () => [
              {
                getConfigPath: () => 'patient.interactions.conditionoccurrence.attributes.condsourcecode',
                getName: () => 'Condition Source concept code',
                getType: () => 'text',
                isCatalogAttribute: () => true,
              },
              {
                getConfigPath: () => 'patient.interactions.conditionoccurrence.attributes.condsourceconceptset',
                getName: () => 'Condition Source concept set',
                getType: () => 'conceptSet',
                isCatalogAttribute: () => false,
              },
            ],
          },
        ],
      }

      const attrs = parse(await byName(createPaTools(store), 'pa_list_filter_options').execute()).filterCards[0]
        .attributes
      expect(attrs[0].valueKind).toBe('catalog')
      expect(attrs[0].howTo).toContain('pa_search_attribute_values')
      expect(attrs[1].valueKind).toBe('conceptSet')
      expect(attrs[1].howTo).toContain('conceptSetId')
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

    it('builds an insert payload from live state, refreshes the list, and adopts the saved bookmark', async () => {
      const savedRecord = { bmkId: 'new-1', bookmarkname: 'Female Sinusitis', bookmark: '{}' }
      const store = makeStore()
      store.getters.getActiveBookmark = { bookmarkname: 'New cohort', isNew: true }
      store.dispatch.mockImplementation((type: string, payload: any) => {
        if (type === 'fireBookmarkQuery' && payload?.params?.cmd === 'insert') return Promise.resolve({ bmkId: 'new-1' })
        if (type === 'fireBookmarkQuery' && payload?.params?.cmd === 'loadAll') {
          store.getters.getBookmarks = [savedRecord]
        }
        return Promise.resolve(undefined)
      })

      const res = await byName(createPaTools(store), 'pa_save_current_cohort').execute({ name: 'Female Sinusitis' })

      expect(store.dispatch).toHaveBeenCalledWith('fireBookmarkQuery', {
        method: 'post',
        params: {
          cmd: 'insert',
          bookmarkname: 'Female Sinusitis',
          bookmark: JSON.stringify(store.getters.getBookmarksData),
          shareBookmark: false,
        },
        bookmarkId: undefined,
      })
      expect(store.dispatch).toHaveBeenCalledWith('fireBookmarkQuery', { method: 'get', params: { cmd: 'loadAll' } })
      expect(store.commit).toHaveBeenCalledWith('SET_ACTIVE_BOOKMARK', savedRecord)
      expect(parse(res)).toEqual({ saved: true, bookmarkId: 'new-1' })
    })

    it('builds an update payload (cmd:update) when a bookmarkId is given', async () => {
      const store = makeStore()
      store.dispatch.mockResolvedValue(undefined)
      const res = await byName(createPaTools(store), 'pa_save_current_cohort').execute({
        bookmarkId: 'existing-9',
        share: true,
      })

      expect(store.dispatch).toHaveBeenCalledWith('fireBookmarkQuery', {
        method: 'put',
        params: { cmd: 'update', bookmark: JSON.stringify(store.getters.getBookmarksData), shareBookmark: true },
        bookmarkId: 'existing-9',
      })
      expect(parse(res)).toEqual({ saved: true, bookmarkId: 'existing-9' })
    })

    it('refuses to save an empty cohort without dispatching', async () => {
      const store = makeStore()
      store.getters.getBookmarksData = {}
      const res = await byName(createPaTools(store), 'pa_save_current_cohort').execute({ name: 'Empty' })

      expect(parse(res)).toEqual({ saved: false, error: 'Current cohort is empty — build filters before saving.' })
      expect(store.dispatch).not.toHaveBeenCalled()
    })

    it('requires a name to insert a brand-new cohort', async () => {
      const store = makeStore()
      store.getters.getActiveBookmark = { bookmarkname: 'New cohort', isNew: true }
      const res = await byName(createPaTools(store), 'pa_save_current_cohort').execute({})

      expect(parse(res)).toEqual({ saved: false, error: 'Provide a name to save a new cohort.' })
    })
  })

  describe('pa_new_cohort', () => {
    it('resets the active bookmark + chart and switches to the builder view', async () => {
      const store = makeStore()
      const showBuilder = vi.fn()
      const res = await byName(createPaTools(store, { showBuilder }), 'pa_new_cohort').execute({ name: 'My Cohort' })

      expect(store.commit).toHaveBeenCalledWith('SET_ACTIVE_BOOKMARK', { bookmarkname: 'My Cohort', isNew: true })
      expect(store.dispatch).toHaveBeenCalledWith('resetChart')
      expect(showBuilder).toHaveBeenCalledOnce()
      expect(parse(res)).toEqual({ created: true, name: 'My Cohort' })
    })

    it('defaults the name and works without a showBuilder hook', async () => {
      const store = makeStore()
      const res = await byName(createPaTools(store), 'pa_new_cohort').execute()

      expect(store.commit).toHaveBeenCalledWith('SET_ACTIVE_BOOKMARK', { bookmarkname: 'New cohort', isNew: true })
      expect(parse(res)).toEqual({ created: true, name: 'New cohort' })
    })
  })

  describe('pa_search_attribute_values', () => {
    it('delegates to loadValuesForAttributePath and returns the values with counts', async () => {
      const store = makeStore()
      const values = [{ value: '461', text: 'Acute sinusitis', display_value: 'Acute sinusitis (461)' }]
      store.dispatch.mockImplementation((type: string) =>
        type === 'loadValuesForAttributePath' ? Promise.resolve(values) : Promise.resolve(undefined)
      )
      const res = await byName(createPaTools(store), 'pa_search_attribute_values').execute({
        attributePath: 'patient.interactions.priDiag.attributes.icd10',
        query: 'sinusitis',
      })

      expect(store.dispatch).toHaveBeenCalledWith('loadValuesForAttributePath', {
        attributePathUid: 'patient.interactions.priDiag.attributes.icd10',
        searchQuery: 'sinusitis',
        attributeType: 'text',
      })
      // A small clean result: no truncation, no note, counts reported.
      expect(parse(res)).toEqual({
        attributePath: 'patient.interactions.priDiag.attributes.icd10',
        total: 1,
        returned: 1,
        truncated: false,
        values,
      })
    })

    it('caps a large result to `limit`, flags truncation, and returns a routing note', async () => {
      const store = makeStore()
      // 1,602 tokens (the gemfibrozil case) — the flood the cap protects against.
      const values = Array.from({ length: 1602 }, (_, i) => ({ value: String(i), text: `gemfibrozil ${i}` }))
      store.dispatch.mockImplementation((type: string) =>
        type === 'loadValuesForAttributePath' ? Promise.resolve(values) : Promise.resolve(undefined)
      )
      const res = await byName(createPaTools(store), 'pa_search_attribute_values').execute({
        attributePath: 'patient.interactions.drugexposure.attributes.drugconceptcode',
        query: 'gemfibrozil',
        limit: 25,
      })

      const parsed = parse(res)
      expect(parsed.total).toBe(1602)
      expect(parsed.returned).toBe(25)
      expect(parsed.values).toHaveLength(25)
      expect(parsed.truncated).toBe(true)
      expect(parsed.note).toContain('concept set with descendants')
    })

    it('clamps limit to MAX_VALUE_LIMIT (200)', async () => {
      const store = makeStore()
      const values = Array.from({ length: 500 }, (_, i) => ({ value: String(i), text: `t${i}` }))
      store.dispatch.mockImplementation((type: string) =>
        type === 'loadValuesForAttributePath' ? Promise.resolve(values) : Promise.resolve(undefined)
      )
      const res = await byName(createPaTools(store), 'pa_search_attribute_values').execute({
        attributePath: 'p.attr',
        query: 'x',
        limit: 10000,
      })
      expect(parse(res).returned).toBe(200)
    })

    it('surfaces loadedStatus TOO_MANY_RESULTS so the model narrows instead of concluding "absent"', async () => {
      const store = makeStore()
      store.dispatch.mockImplementation((type: string) =>
        // 204 → the store records TOO_MANY_RESULTS and returns an empty list.
        type === 'loadValuesForAttributePath' ? Promise.resolve([]) : Promise.resolve(undefined)
      )
      store.getters.getDomainValues = () => ({ loadedStatus: 'TOO_MANY_RESULTS', values: [] })

      const res = await byName(createPaTools(store), 'pa_search_attribute_values').execute({
        attributePath: 'p.attr',
        query: 'aspirin',
      })
      const parsed = parse(res)
      expect(parsed.loadedStatus).toBe('TOO_MANY_RESULTS')
      expect(parsed.total).toBe(0)
      expect(parsed.note).toContain('TOO_MANY_RESULTS')
      expect(parsed.note).toContain('Narrow the query')
    })

    it('errors without dispatching when attributePath or query is missing', async () => {
      const store = makeStore()
      const res = await byName(createPaTools(store), 'pa_search_attribute_values').execute({ attributePath: '', query: '' })

      expect(parse(res)).toEqual({ values: [], error: 'Provide attributePath and query.' })
      expect(store.dispatch).not.toHaveBeenCalled()
    })
  })

  describe('pa_get_cohort_result', () => {
    it('returns the matched count, total, chart type and binned chart data', async () => {
      const store = makeStore()
      const chartData = {
        totalPatientCount: 2694,
        categories: [{ id: 'patient.attributes.age', name: 'Age', binsize: 10 }],
        measures: [{ id: 'patient.attributes.pcount', name: 'Patient Count' }],
        data: [{ 'patient.attributes.age': 0, 'patient.attributes.pcount': 12 }],
      }
      Object.assign(store.getters, {
        getCurrentPatientCount: 1275,
        getTotalPatientCount: 2694,
        getTotalPatientListCount: 0,
        getDisplayTotalGuardedPatientCount: false,
        getActiveChart: 'vb',
        getResponse: () => ({ data: chartData }),
      })

      const res = await byName(createPaTools(store), 'pa_get_cohort_result').execute()

      expect(parse(res)).toEqual({
        currentPatientCount: 1275,
        totalPatientCount: 2694,
        chartType: 'vb',
        chart: {
          totalPatientCount: 2694,
          categories: chartData.categories,
          measures: chartData.measures,
          data: chartData.data,
        },
      })
    })

    it('uses the guarded total for list/custom charts and null chart when no response data', async () => {
      const store = makeStore()
      Object.assign(store.getters, {
        getCurrentPatientCount: 5,
        getTotalPatientCount: 99,
        getTotalPatientListCount: 42,
        getDisplayTotalGuardedPatientCount: true,
        getActiveChart: 'list',
        getResponse: () => ({}),
      })

      const res = await byName(createPaTools(store), 'pa_get_cohort_result').execute()

      expect(parse(res)).toEqual({ currentPatientCount: 5, totalPatientCount: 42, chartType: 'list', chart: null })
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
    const registerTool = vi.fn((_tool: PaTool) => ({ unregister }))
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
