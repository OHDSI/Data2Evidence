import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { buildTable1WizardConfig, useDashboardFlow } from '../useDashboardFlow'

describe('useDashboardFlow', () => {
  const mockDispatch = vi.fn()
  const mockGetters = {
    getActiveBookmark: ref(null),
  }

  const createDashboardGetters = (overrides = {}) => ({
    getActiveBookmark: {
      id: 'bookmark-1',
      bmkId: 'bookmark-1',
      bookmarkname: 'Existing cohort',
      bookmark: '{}',
      isNew: false,
    },
    getWizardConfig: null,
    getPLRequest: vi.fn().mockReturnValue({ cohortDefinition: { cards: [{ id: 'card-1' }] } }),
    getConstraintForAttribute: vi.fn(),
    getSelectedDataset: { id: 'dataset-1' },
    getBookmarkFromIFR: null,
    getFilterCards: () => ({}),
    getCurrentBookmarkHasChanges: false,
    getActiveCohortMaterializedId: null,
    getMaterializedCohorts: [],
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with correct default state', () => {
    const flow = useDashboardFlow(mockDispatch, mockGetters)
    expect(flow.showDashboardModal.value).toBe(false)
    expect(flow.showDashboardSelectionModal.value).toBe(false)
    expect(flow.dashboardCodes.value).toEqual([])
  })

  it('preserves form presentation configured on each Cohort Builder wizard definition', async () => {
    const wizardSections = [
      {
        id: 'measurement',
        title: 'Measurement',
        groups: [{ id: 'body-measurement', fieldIds: ['height', 'weight', 'bmi'], columns: 3 as const }],
      },
    ]
    const dispatch = vi.fn(async (action: string, payload?: unknown) => {
      const url = (payload as { url?: string } | undefined)?.url || ''
      if (action === 'ajaxAuth' && url.includes('dashboard-codes')) {
        return { data: [{ name: 'calculate-incidence' }] }
      }
      if (action === 'ajaxAuth' && url.includes('wizards/config')) {
        return {
          data: {
            wizards: [
              {
                id: 'calculate-incidence',
                name: 'Calculate Incidence',
                formNote: 'Configured note',
                fields: [],
                sections: wizardSections,
              },
            ],
          },
        }
      }
      return undefined
    })
    const flow = useDashboardFlow(dispatch, createDashboardGetters())

    await flow.openDashboardModal()

    expect(flow.wizardDefinitions.value[0].sections).toEqual(wizardSections)
    expect(flow.wizardDefinitions.value[0].formNote).toBe('Configured note')
  })

  it('does not apply obsolete root sections to wizards without their own layout', async () => {
    const dispatch = vi.fn(async (action: string, payload?: unknown) => {
      const url = (payload as { url?: string } | undefined)?.url || ''
      if (action === 'ajaxAuth' && url.includes('dashboard-codes')) {
        return { data: [{ name: 'calculate-incidence' }] }
      }
      if (action === 'ajaxAuth' && url.includes('wizards/config')) {
        return {
          data: {
            sections: [{ id: 'obsolete-root', title: 'Obsolete', groups: [] }],
            wizards: [{ id: 'calculate-incidence', name: 'Calculate Incidence', fields: [] }],
          },
        }
      }
      return undefined
    })
    const flow = useDashboardFlow(dispatch, createDashboardGetters())

    await flow.openDashboardModal()

    expect(flow.wizardDefinitions.value[0].sections).toBeUndefined()
  })

  it('resetDashboardFlowState clears flow state', () => {
    const flow = useDashboardFlow(mockDispatch, mockGetters)
    flow.showDashboardSelectionModal.value = true
    flow.showRequiredFiltersModal.value = true
    flow.dashboardMetadataLoading.value = true
    flow.dashboardCodes.value = [{ name: 'test' }]
    flow.dashboardSelectionError.value = 'error'
    flow.resetDashboardFlowState()
    expect(flow.showDashboardSelectionModal.value).toBe(false)
    expect(flow.showRequiredFiltersModal.value).toBe(false)
    expect(flow.dashboardMetadataLoading.value).toBe(false)
    expect(flow.dashboardCodes.value).toEqual([])
    expect(flow.dashboardSelectionError.value).toBe('')
  })

  it('buildTable1WizardConfig normalizes selected concept sets into wizardConfig', () => {
    const wizardConfig = buildTable1WizardConfig({ id: 'table1' }, [
      { id: ' 1 ', name: ' dm2hana ' },
      { id: '2', name: '' },
    ])

    expect(wizardConfig).toEqual({
      dashboardType: 'table1',
      conceptSets: [
        { id: '1', name: 'dm2hana' },
        { id: '2', name: '2' },
      ],
    })
  })

  it('buildTable1WizardConfig rejects empty or invalid selected concept sets', () => {
    expect(buildTable1WizardConfig({ id: 'table1' }, [])).toBeNull()
    expect(buildTable1WizardConfig({ id: 'table1' }, [{ id: ' ', name: 'Missing ID' }])).toBeNull()
  })

  it('uses the required-filters flow for a table1 dashboard without flow metadata', async () => {
    const flow = useDashboardFlow(mockDispatch, {
      getActiveBookmark: { id: 'bookmark-1', bmkId: 'bookmark-1', bookmarkname: 'Cohort', bookmark: '{}' },
      getWizardConfig: null,
      getPLRequest: vi.fn(),
      getConstraintForAttribute: vi.fn(),
      getSelectedDataset: { id: 'dataset-1' },
      getBookmarkFromIFR: null,
      getFilterCards: () => ({}),
      getCurrentBookmarkHasChanges: false,
      getActiveCohortMaterializedId: null,
      getMaterializedCohorts: [],
    })
    flow.wizardDefinitions.value = [
      {
        id: 'table1',
        name: 'Table1',
        fields: [],
      },
    ]

    await flow.handleDashboardSelected({ name: 'table1' })

    expect(flow.showDashboardSelectionModal.value).toBe(false)
    expect(flow.showTable1ConfigModal.value).toBe(false)
    expect(flow.showRequiredFiltersModal.value).toBe(true)
    expect(flow.selectedWizardDefinition.value?.id).toBe('table1')
  })

  it('deletes the filter card it created when the required-filters modal is cancelled', async () => {
    // 'removeFilterCard' is not an action the query module defines, so reverting used
    // to dispatch into the void and leave the card the wizard added on the cohort.
    const dispatch = vi.fn((action: string) =>
      action === 'addFilterCard' ? Promise.resolve('card-9') : Promise.resolve(undefined)
    )
    const flow = useDashboardFlow(
      dispatch,
      createDashboardGetters({ getConstraintForAttribute: vi.fn().mockReturnValue(undefined) })
    )
    flow.allWizardFields.value = [
      { id: 'gender', configPath: 'patient.attributes.gender', filterCardPath: 'patient' } as any,
    ]

    await flow.handleRequiredFiltersSubmit({ gender: 'F' }, {}, new Set(['gender']))
    expect(dispatch).toHaveBeenCalledWith('addFilterCard', { configPath: 'patient' })

    await flow.handleRequiredFiltersCancel()

    expect(dispatch).toHaveBeenCalledWith('deleteFilterCard', { filterCardId: 'card-9' })
  })

  it('routes table1-config flow metadata to the Table1 config modal', async () => {
    const flow = useDashboardFlow(mockDispatch, createDashboardGetters())
    flow.wizardDefinitions.value = [
      {
        id: 'configured-table1',
        name: 'Configured Table 1',
        fields: [],
        flow: 'table1-config',
      },
    ]

    await flow.handleDashboardSelected({ name: 'configured-table1' })

    expect(flow.showTable1ConfigModal.value).toBe(true)
    expect(flow.showRequiredFiltersModal.value).toBe(false)
    expect(flow.selectedWizardDefinition.value?.id).toBe('configured-table1')
  })

  it('uses the required-filters flow when flow metadata is missing', async () => {
    const flow = useDashboardFlow(mockDispatch, createDashboardGetters())
    flow.wizardDefinitions.value = [
      {
        id: 'legacy-dashboard',
        name: 'Legacy dashboard',
        fields: [],
      },
    ]

    await flow.handleDashboardSelected({ name: 'legacy-dashboard' })

    expect(flow.showTable1ConfigModal.value).toBe(false)
    expect(flow.showRequiredFiltersModal.value).toBe(true)
  })

  it('confirms table1 config through existing wizardConfig and save flow', async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined)
    const getPLRequest = vi.fn().mockReturnValue({ cohortDefinition: { cards: [{ id: 'card-1' }] } })
    const flow = useDashboardFlow(dispatch, {
      getActiveBookmark: {
        id: 'bookmark-1',
        bmkId: 'bookmark-1',
        bookmarkname: 'New cohort',
        bookmark: '{}',
        isNew: true,
      },
      getWizardConfig: null,
      getPLRequest,
      getConstraintForAttribute: vi.fn(),
      getSelectedDataset: { id: 'dataset-1' },
      getBookmarkFromIFR: null,
      getFilterCards: () => ({}),
      getCurrentBookmarkHasChanges: false,
      getActiveCohortMaterializedId: null,
      getMaterializedCohorts: [],
    })
    flow.selectedWizardDefinition.value = {
      id: 'table1',
      name: 'Table1',
      fields: [],
      flow: 'table1-config',
    }
    flow.showTable1ConfigModal.value = true

    await flow.handleTable1ConfigConfirm([{ id: '1', name: 'dm2hana' }])

    expect(dispatch).toHaveBeenCalledWith('setWizardConfig', {
      dashboardType: 'table1',
      conceptSets: [{ id: '1', name: 'dm2hana' }],
    })
    expect(flow.dashboardContext.value.wizardConfig).toEqual({
      dashboardType: 'table1',
      conceptSets: [{ id: '1', name: 'dm2hana' }],
    })
    expect(flow.dashboardContext.value.mriquery).toBe(
      JSON.stringify({ cohortDefinition: { cards: [{ id: 'card-1' }] } })
    )
    expect(flow.showTable1ConfigModal.value).toBe(false)
    expect(flow.showSaveCohortModal.value).toBe(true)
    expect(flow.saveCohortModalMode.value).toBe('full')
  })

  it('uses materialize-only mode for saved unmaterialized Table1 cohorts', async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined)
    const flow = useDashboardFlow(dispatch, createDashboardGetters())
    flow.selectedDashboard.value = { name: 'table1' }
    flow.selectedWizardDefinition.value = {
      id: 'table1',
      name: 'Table1',
      fields: [],
      flow: 'table1-config',
    }
    flow.showTable1ConfigModal.value = true

    await flow.handleTable1ConfigConfirm([{ id: '1', name: 'dm2hana' }])

    expect(flow.showTable1ConfigModal.value).toBe(false)
    expect(flow.showSaveCohortModal.value).toBe(true)
    expect(flow.saveCohortModalMode.value).toBe('materialize-only')
    expect(flow.confirmedTable1ConceptSets.value).toEqual([{ id: '1', name: 'dm2hana' }])
    expect(flow.dashboardContext.value.wizardConfig).toEqual({
      dashboardType: 'table1',
      conceptSets: [{ id: '1', name: 'dm2hana' }],
    })
  })

  it('reopens Configure Table1 with confirmed selections when save materialise is cancelled', async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined)
    const flow = useDashboardFlow(dispatch, createDashboardGetters())
    flow.selectedDashboard.value = { name: 'table1' }
    flow.selectedWizardDefinition.value = {
      id: 'table1',
      name: 'Table1',
      fields: [],
      flow: 'table1-config',
    }
    flow.showTable1ConfigModal.value = true

    await flow.handleTable1ConfigConfirm([{ id: '1', name: 'dm2hana' }])
    flow.handleCancelSaveCohort()

    expect(flow.showSaveCohortModal.value).toBe(false)
    expect(flow.showTable1ConfigModal.value).toBe(true)
    expect(flow.confirmedTable1ConceptSets.value).toEqual([{ id: '1', name: 'dm2hana' }])
    expect(flow.dashboardContext.value.wizardConfig).toEqual({
      dashboardType: 'table1',
      conceptSets: [{ id: '1', name: 'dm2hana' }],
    })
  })

  it('closes the dashboard flow stack without reopening Configure Table1', async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined)
    const flow = useDashboardFlow(dispatch, createDashboardGetters())
    flow.selectedDashboard.value = { name: 'table1' }
    flow.selectedWizardDefinition.value = {
      id: 'table1',
      name: 'Table1',
      fields: [],
      flow: 'table1-config',
    }
    flow.showTable1ConfigModal.value = true

    await flow.handleTable1ConfigConfirm([{ id: '1', name: 'dm2hana' }])
    flow.closeDashboardFlow()

    expect(flow.showSaveCohortModal.value).toBe(false)
    expect(flow.showTable1ConfigModal.value).toBe(false)
    expect(flow.showDashboardModal.value).toBe(false)
    expect(flow.isProcessingDashboardFlow()).toBe(false)
    expect(flow.confirmedTable1ConceptSets.value).toEqual([{ id: '1', name: 'dm2hana' }])
  })

  it('does not reopen Configure Table1 if a save cancel event arrives after dashboard success', async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined)
    const flow = useDashboardFlow(dispatch, createDashboardGetters())
    flow.selectedDashboard.value = { name: 'table1' }
    flow.selectedWizardDefinition.value = {
      id: 'table1',
      name: 'Table1',
      fields: [],
      flow: 'table1-config',
    }
    flow.showTable1ConfigModal.value = true

    await flow.handleTable1ConfigConfirm([{ id: '1', name: 'dm2hana' }])
    flow.handleSaveCohortSuccess()
    flow.handleCancelSaveCohort()

    expect(flow.showDashboardModal.value).toBe(true)
    expect(flow.showTable1ConfigModal.value).toBe(false)
    expect(flow.confirmedTable1ConceptSets.value).toEqual([{ id: '1', name: 'dm2hana' }])
  })
})
