import { describe, expect, it } from 'vitest'
import { quickActionMenuItems, quickActionState, type QuickActionInput } from '../explorationQuickActions'

const input = (overrides: Partial<QuickActionInput> = {}): QuickActionInput => ({
  canMaterialize: true,
  canBeMaterialised: true,
  canAnalyze: true,
  showDataQuality: true,
  cohortDefinitionId: '7',
  dataQualityBusy: false,
  ...overrides,
})

const labels = {
  materialize: 'Add to collection',
  filterSummary: 'Filter summary',
  analyze: 'Analyze',
  dataQuality: 'Data quality',
}

const icons = {
  materialize: 'materialize-icon',
  filterSummary: 'filter-summary-icon',
  analyze: 'analyze-icon',
  dataQuality: 'data-quality-icon',
}

describe('quickActionState', () => {
  it('enables every action when the user and the record allow it', () => {
    expect(quickActionState(input())).toEqual({
      materialize: { visible: true, disabled: false },
      filterSummary: { visible: true, disabled: false },
      analyze: { visible: true, disabled: false },
      dataQuality: { visible: true, disabled: false },
    })
  })

  it('disables materialize when the data source cannot materialize cohorts', () => {
    expect(quickActionState(input({ canMaterialize: false })).materialize.disabled).toBe(true)
  })

  it('disables materialize when the record has nothing to materialize', () => {
    expect(quickActionState(input({ canBeMaterialised: false })).materialize.disabled).toBe(true)
  })

  it('disables analyze when the user cannot analyze', () => {
    expect(quickActionState(input({ canAnalyze: false })).analyze.disabled).toBe(true)
  })

  it('hides data quality outside the Atlas native build', () => {
    expect(quickActionState(input({ showDataQuality: false })).dataQuality.visible).toBe(false)
  })

  it('disables data quality without a cohort definition or while a run is busy', () => {
    expect(quickActionState(input({ cohortDefinitionId: null })).dataQuality.disabled).toBe(true)
    expect(quickActionState(input({ dataQualityBusy: true })).dataQuality.disabled).toBe(true)
  })
})

describe('quickActionMenuItems', () => {
  it('lists the actions in the card toolbar order', () => {
    expect(quickActionMenuItems(quickActionState(input()), labels, icons)).toEqual([
      { value: 'materialize', label: 'Add to collection', icon: 'materialize-icon', disabled: false },
      { value: 'filterSummary', label: 'Filter summary', icon: 'filter-summary-icon', disabled: false },
      { value: 'analyze', label: 'Analyze', icon: 'analyze-icon', disabled: false },
      { value: 'dataQuality', label: 'Data quality', icon: 'data-quality-icon', disabled: false },
    ])
  })

  it('leaves out a hidden action and keeps the disabled state of the others', () => {
    const state = quickActionState(input({ showDataQuality: false, canAnalyze: false }))
    expect(quickActionMenuItems(state, labels, icons).map(({ value, disabled }) => ({ value, disabled }))).toEqual([
      { value: 'materialize', disabled: false },
      { value: 'filterSummary', disabled: false },
      { value: 'analyze', disabled: true },
    ])
  })
})
