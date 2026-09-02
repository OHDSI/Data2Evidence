import { flushPromises, shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import appTagInput from '../app-tag-input.vue'
import { getConceptByCode, getConceptById, getConceptByName } from '@/utils/IfrToExtCohortDeps/conceptGetters'
import { setConceptBrowserOpening } from '../conceptBrowserLock'

vi.mock('@/utils/IfrToExtCohortDeps/conceptGetters', () => ({
  getConceptByCode: vi.fn(),
  getConceptById: vi.fn(),
  getConceptByName: vi.fn(),
}))

beforeEach(() => {
  // Shared across every instance and therefore across tests, so a test that leaves it held
  // would silently block the next one.
  setConceptBrowserOpening(false)
  vi.mocked(getConceptByCode).mockReset().mockResolvedValue(null)
  vi.mocked(getConceptById).mockReset().mockResolvedValue(null)
  vi.mocked(getConceptByName).mockReset().mockResolvedValue(null)
})

// What the vocabulary lookup returns: upper-cased column names.
const MORPHINE_RECORD = {
  CONCEPT_ID: 35605858,
  CONCEPT_NAME: '1 ML Morphine Sulfate 5 MG/ML Injection',
  CONCEPT_CODE: '1732136',
  VOCABULARY_ID: 'RxNorm',
  DOMAIN_ID: 'Drug',
  CONCEPT_CLASS_ID: 'Quant Clinical Drug',
  STANDARD_CONCEPT: 'S',
  INVALID_REASON: null,
} as any

const CONDITION_CONCEPT = {
  conceptId: 201826,
  display: 'Type 2 diabetes mellitus',
  code: '44054006',
  domainId: 'Condition',
}

const mountTagInput = (modelProps: Record<string, unknown>, values: unknown[] = []) => {
  // The live store entity. `getConstraint` deep-clones it (as the real getter does), so
  // the `model` prop is only ever a snapshot — the component must read current values
  // through the getter, not off the prop.
  const storeConstraint = {
    id: 'constraint-1',
    props: {
      type: 'text',
      name: 'Condition concept id',
      attributePath: 'patient.conditions.attributes.conditionconceptid',
      value: values,
      ...modelProps,
    },
  }
  const updateConstraintValue = vi.fn((_ctx: unknown, payload: { value: unknown[] }) => {
    storeConstraint.props.value = payload.value
  })
  const store = createStore({
    state: {},
    getters: {
      getDomainValues: () => () => ({ values: [], isLoading: false, loadedStatus: 'NO_RESULTS' }),
      getConstraint: () => () => JSON.parse(JSON.stringify(storeConstraint)),
      getText: () => (key: string) => key,
      getMriFrontendConfig: () => ({ _internalConfig: { panelOptions: { domainValuesLimit: 200 } } }),
      getSelectedDataset: () => ({ id: 'dataset-1' }),
    },
    actions: {
      loadValuesForAttributePath: vi.fn(),
      updateConstraintValue,
    },
  })

  const wrapper = shallowMount(appTagInput as any, {
    global: { plugins: [store] },
    // Deliberately a stale snapshot, which is what Constraint.vue passes down.
    props: { model: JSON.parse(JSON.stringify(storeConstraint)), isCatalogAttribute: true },
  })

  return { wrapper, constraint: storeConstraint, updateConstraintValue }
}

// Opening resolves stored values against the vocabulary first, so the event is
// dispatched a tick after the click.
const openBrowser = async (wrapper: any) => {
  const dispatched: CustomEvent[] = []
  const listener = (event: Event) => dispatched.push(event as CustomEvent)
  window.addEventListener('alp-terminology-open', listener)
  wrapper.vm.handleConceptSet({
    values: null,
    config: wrapper.vm.conceptSetConfig,
    componentType: 'text',
    action: 'browse',
  })
  await flushPromises()
  window.removeEventListener('alp-terminology-open', listener)
  return dispatched[0]?.detail.props
}

const writtenValues = (updateConstraintValue: any) =>
  updateConstraintValue.mock.calls[0][1].value.map((item: any) => item.value)

describe('app-tag-input concept browsing', () => {
  describe('overlay filters', () => {
    it('opens in multi-select mode with the configured filters', async () => {
      const { wrapper } = mountTagInput({
        conceptIdentifierType: 'id',
        domainFilter: 'Condition',
        standardConceptCodeFilter: 'S',
      })

      const props = await openBrowser(wrapper)

      expect(props.mode).toBe('CONCEPT_MULTI_SELECT')
      expect(props.selectedDatasetId).toBe('dataset-1')
      expect(props.defaultFilters).toEqual([
        { id: 'domainId', value: ['Condition'] },
        { id: 'concept', value: ['S'] },
      ])
    })

    it('sends empty filters when nothing scopes the attribute', async () => {
      const { wrapper } = mountTagInput({ conceptIdentifierType: 'id' })

      const props = await openBrowser(wrapper)

      expect(props.defaultFilters).toEqual([
        { id: 'domainId', value: [] },
        { id: 'concept', value: [] },
      ])
    })
  })

  describe('attributes storing concept ids', () => {
    // The Selected tab renders these fields verbatim, so a partial concept shows up as a
    // row with blank Code / Vocabulary / Domain / Class / Validity columns.
    it('pre-populates with every column the Selected tab renders', async () => {
      vi.mocked(getConceptById).mockResolvedValue(MORPHINE_RECORD)
      const { wrapper } = mountTagInput({ conceptIdentifierType: 'id' }, [{ value: '35605858' }])

      const props = await openBrowser(wrapper)

      expect(getConceptById).toHaveBeenCalledWith({ conceptId: 35605858, datasetId: 'dataset-1' })
      expect(props.initialSelectedConcepts).toEqual([
        {
          conceptId: 35605858,
          display: '1 ML Morphine Sulfate 5 MG/ML Injection',
          conceptName: '1 ML Morphine Sulfate 5 MG/ML Injection',
          code: '1732136',
          conceptCode: '1732136',
          system: 'RxNorm',
          vocabularyId: 'RxNorm',
          domainId: 'Drug',
          conceptClassId: 'Quant Clinical Drug',
          standardConcept: 'S',
          concept: 'Standard',
          validity: 'Valid',
          validStartDate: undefined,
          validEndDate: undefined,
        },
      ])
    })

    it('falls back to id and stored label when the lookup returns nothing', async () => {
      const { wrapper } = mountTagInput({ conceptIdentifierType: 'id' }, [
        { value: '201826', text: 'Type 2 diabetes mellitus' },
      ])

      const props = await openBrowser(wrapper)

      expect(props.initialSelectedConcepts).toEqual([
        { conceptId: 201826, display: 'Type 2 diabetes mellitus', conceptName: 'Type 2 diabetes mellitus' },
      ])
      expect(getConceptByCode).not.toHaveBeenCalled()
    })

    it('replaces the pre-populated values with the overlay selection', async () => {
      const { wrapper, updateConstraintValue } = mountTagInput({ conceptIdentifierType: 'id' }, [
        { value: '4024659', text: 'Old selection' },
      ])

      const props = await openBrowser(wrapper)
      props.onClose({ selectedConcepts: [CONDITION_CONCEPT] })

      expect(updateConstraintValue.mock.calls[0][1]).toEqual({
        constraintId: 'constraint-1',
        value: [
          {
            value: '201826',
            text: 'Type 2 diabetes mellitus',
            display_value: 'Type 2 diabetes mellitus',
            score: 1,
          },
        ],
      })
    })

    it('keeps hand-typed values the overlay never knew about', async () => {
      const { wrapper, updateConstraintValue } = mountTagInput({ conceptIdentifierType: 'id' }, [
        { value: 'E11.9', text: 'E11.9' },
      ])

      const props = await openBrowser(wrapper)
      props.onClose({ selectedConcepts: [CONDITION_CONCEPT] })

      expect(writtenValues(updateConstraintValue)).toEqual(['E11.9', '201826'])
    })

    it('pre-populates a second open with what the first one selected', async () => {
      const { wrapper } = mountTagInput({ conceptIdentifierType: 'id' })

      const first = await openBrowser(wrapper)
      first.onClose({ selectedConcepts: [CONDITION_CONCEPT] })
      const second = await openBrowser(wrapper)

      expect(second.initialSelectedConcepts).toEqual([
        { conceptId: 201826, display: 'Type 2 diabetes mellitus', conceptName: 'Type 2 diabetes mellitus' },
      ])
    })

    // Values are written as concept ids for any identifier type that is not explicitly a
    // code or a name, so pre-population has to accept exactly the same set. Gating it on
    // a literal 'id' left these configs writing tags they could never read back.
    it.each(['ID', 'Id', ' id ', 'concept_id', ''])(
      'round-trips concept ids when conceptIdentifierType is %o',
      async identifierType => {
        const { wrapper } = mountTagInput({ conceptIdentifierType: identifierType })

        const first = await openBrowser(wrapper)
        first.onClose({ selectedConcepts: [CONDITION_CONCEPT] })
        const second = await openBrowser(wrapper)

        expect(second.initialSelectedConcepts).toEqual([
          { conceptId: 201826, display: 'Type 2 diabetes mellitus', conceptName: 'Type 2 diabetes mellitus' },
        ])
      }
    )
  })

  describe('attributes storing concept codes or names', () => {
    it('writes the concept code, and resolves stored codes for the next open', async () => {
      vi.mocked(getConceptByCode).mockResolvedValue({
        CONCEPT_ID: 4024659,
        CONCEPT_NAME: 'Diabetes mellitus',
      } as any)
      const { wrapper, updateConstraintValue } = mountTagInput({ conceptIdentifierType: 'code' }, [
        { value: '73211009', text: 'Diabetes mellitus' },
      ])

      const props = await openBrowser(wrapper)

      expect(getConceptByCode).toHaveBeenCalledWith({ conceptCode: '73211009', datasetId: 'dataset-1' })
      expect(props.initialSelectedConcepts).toMatchObject([
        { conceptId: 4024659, display: 'Diabetes mellitus', conceptName: 'Diabetes mellitus' },
      ])

      // The overlay showed that code as selected, so its result replaces it.
      props.onClose({ selectedConcepts: [CONDITION_CONCEPT] })
      expect(writtenValues(updateConstraintValue)).toEqual(['44054006'])
    })

    it('keeps a stored code that no longer resolves, and merges the selection', async () => {
      const { wrapper, updateConstraintValue } = mountTagInput({ conceptIdentifierType: 'code' }, [
        { value: '73211009', text: 'Diabetes mellitus' },
      ])

      const props = await openBrowser(wrapper)
      expect(props.initialSelectedConcepts).toBeUndefined()

      props.onClose({ selectedConcepts: [CONDITION_CONCEPT] })
      expect(writtenValues(updateConstraintValue)).toEqual(['73211009', '44054006'])
    })

    it('survives a failing vocabulary lookup and still opens', async () => {
      vi.mocked(getConceptByCode).mockRejectedValue(new Error('terminology unavailable'))
      const { wrapper } = mountTagInput({ conceptIdentifierType: 'code' }, [{ value: '73211009' }])

      const props = await openBrowser(wrapper)

      expect(props.mode).toBe('CONCEPT_MULTI_SELECT')
      expect(props.initialSelectedConcepts).toBeUndefined()
    })

    it('resolves stored names by name', async () => {
      vi.mocked(getConceptByName).mockResolvedValue({
        CONCEPT_ID: 201826,
        CONCEPT_NAME: 'Type 2 diabetes mellitus',
      } as any)
      const { wrapper } = mountTagInput({ conceptIdentifierType: 'name' }, [{ value: 'Type 2 diabetes mellitus' }])

      const props = await openBrowser(wrapper)

      expect(getConceptByName).toHaveBeenCalledWith({
        conceptName: 'Type 2 diabetes mellitus',
        datasetId: 'dataset-1',
      })
      expect(props.initialSelectedConcepts).toMatchObject([
        { conceptId: 201826, display: 'Type 2 diabetes mellitus', conceptName: 'Type 2 diabetes mellitus' },
      ])
    })

    it('writes the concept name when the attribute stores names', async () => {
      const { wrapper, updateConstraintValue } = mountTagInput({ conceptIdentifierType: 'name' })

      const props = await openBrowser(wrapper)
      props.onClose({ selectedConcepts: [CONDITION_CONCEPT] })

      expect(updateConstraintValue.mock.calls[0][1].value).toEqual([
        {
          value: 'Type 2 diabetes mellitus',
          text: 'Type 2 diabetes mellitus',
          display_value: 'Type 2 diabetes mellitus',
          score: 1,
        },
      ])
    })

    it('treats an explicit CODE identifier as a code whatever the casing', async () => {
      const { wrapper, updateConstraintValue } = mountTagInput({ conceptIdentifierType: 'CODE' })

      const props = await openBrowser(wrapper)
      props.onClose({ selectedConcepts: [CONDITION_CONCEPT] })

      expect(writtenValues(updateConstraintValue)).toEqual(['44054006'])
    })
  })

  it('ignores a close that carries no selection', async () => {
    const { wrapper, updateConstraintValue } = mountTagInput({ conceptIdentifierType: 'id' })

    const props = await openBrowser(wrapper)
    props.onClose(undefined)

    expect(updateConstraintValue).not.toHaveBeenCalled()
  })

  // Resolution happens before the overlay is dispatched, and nothing is on screen to
  // swallow clicks during it. A second dispatch reaching the terminology listener while
  // the overlay is already open would keep the first attribute's pre-selection but adopt
  // the second attribute's onClose, writing picks into the wrong constraint.
  describe('concurrent opens', () => {
    const deferred = () => {
      let resolve: (value: unknown) => void = () => undefined
      const promise = new Promise(res => {
        resolve = res
      })
      return { promise, resolve }
    }

    const browse = (wrapper: any) =>
      wrapper.vm.handleConceptSet({
        values: null,
        config: wrapper.vm.conceptSetConfig,
        componentType: 'text',
        action: 'browse',
      })

    it('dispatches one overlay only, when a second "+" is clicked mid-resolution', async () => {
      const pending = deferred()
      vi.mocked(getConceptById).mockReturnValue(pending.promise as any)
      // Two attributes on one filter card: two component instances, so a per-instance
      // flag would not have closed the window.
      const first = mountTagInput({ conceptIdentifierType: 'id', domainFilter: 'Condition' }, [{ value: '201826' }])
      const second = mountTagInput({ conceptIdentifierType: 'id', domainFilter: 'Drug' }, [{ value: '35605858' }])

      const dispatched: CustomEvent[] = []
      const listener = (event: Event) => dispatched.push(event as CustomEvent)
      window.addEventListener('alp-terminology-open', listener)
      browse(first.wrapper)
      browse(second.wrapper)
      pending.resolve(MORPHINE_RECORD)
      await flushPromises()
      window.removeEventListener('alp-terminology-open', listener)

      expect(dispatched).toHaveLength(1)
      // The one that got through is the attribute that was clicked first.
      expect(dispatched[0].detail.props.defaultFilters).toContainEqual({ id: 'domainId', value: ['Condition'] })
    })

    it('greys out every "+" while any one of them is resolving', async () => {
      const pending = deferred()
      vi.mocked(getConceptById).mockReturnValue(pending.promise as any)
      const first = mountTagInput({ conceptIdentifierType: 'id' }, [{ value: '201826' }])
      const second = mountTagInput({ conceptIdentifierType: 'id' }, [{ value: '35605858' }])

      browse(first.wrapper)
      await first.wrapper.vm.$nextTick()

      expect(first.wrapper.vm.conceptBrowserOpening).toBe(true)
      expect(second.wrapper.vm.conceptBrowserOpening).toBe(true)
      // The child is resolved by name at runtime, so match the rendered stub, not the import.
      expect(first.wrapper.find('basetaginput').attributes('concept-browser-opening')).toBe('true')

      pending.resolve(MORPHINE_RECORD)
      await flushPromises()

      expect(first.wrapper.vm.conceptBrowserOpening).toBe(false)
      expect(second.wrapper.vm.conceptBrowserOpening).toBe(false)
    })

    it('releases the guard so the overlay can be opened again', async () => {
      const { wrapper } = mountTagInput({ conceptIdentifierType: 'id' })

      expect(await openBrowser(wrapper)).toBeDefined()
      expect(await openBrowser(wrapper)).toBeDefined()
    })

    it('swallows and reports a failed open instead of stranding the guard', async () => {
      const { wrapper } = mountTagInput({ conceptIdentifierType: 'id' })
      const boom = vi.spyOn(wrapper.vm, 'dispatchConceptBrowser').mockRejectedValueOnce(new Error('boom'))
      const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      // Nothing awaits openConceptBrowser, so it must not reject.
      await expect(wrapper.vm.openConceptBrowser(wrapper.vm.conceptSetConfig)).resolves.toBeUndefined()
      expect(logged).toHaveBeenCalled()
      expect(wrapper.vm.conceptBrowserOpening).toBe(false)

      boom.mockRestore()
      logged.mockRestore()
      expect(await openBrowser(wrapper)).toBeDefined()
    })
  })

  it('still opens the concept set overlay for concept set attributes', async () => {
    const { wrapper } = mountTagInput({ type: 'conceptSet' })

    const dispatched: CustomEvent[] = []
    const listener = (event: Event) => dispatched.push(event as CustomEvent)
    window.addEventListener('alp-terminology-open', listener)
    wrapper.vm.handleConceptSet({ values: null, config: wrapper.vm.conceptSetConfig })
    window.removeEventListener('alp-terminology-open', listener)

    expect(dispatched[0].detail.props.mode).toBe('CONCEPT_SET')
  })
})
