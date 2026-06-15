import { describe, it, expect } from 'vitest'
import AdvancedTimeFilterModel from '../AdvancedTimeFilterModel'

function makeAdvancedTimeLayout(timeFilters: any[]) {
  return {
    props: {
      timeFilterModel: { timeFilters },
      timeFilterTitle: 'Test Title',
    },
  }
}

function makeTimeFilter(overrides: any = {}) {
  return {
    originSelection: 'startdate',
    targetSelection: 'before_startdate',
    targetInteraction: 'card-2',
    days: '30',
    ...overrides,
  }
}

describe('AdvancedTimeFilterModel.getIFR', () => {
  it('skips filters with empty targetInteraction', () => {
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({ targetInteraction: '' }),
    ])
    const result = AdvancedTimeFilterModel.getIFR(layout)
    expect(result.filters).toEqual([])
  })

  it('maps before_startdate correctly', () => {
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({ targetSelection: 'before_startdate' }),
    ])
    const result = AdvancedTimeFilterModel.getIFR(layout)
    expect(result.filters).toHaveLength(1)
    expect(result.filters[0]).toMatchObject({
      other: 'startdate',
      after_before: 'before',
    })
  })

  it('maps after_startdate correctly', () => {
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({ targetSelection: 'after_startdate' }),
    ])
    const result = AdvancedTimeFilterModel.getIFR(layout)
    expect(result.filters).toHaveLength(1)
    expect(result.filters[0]).toMatchObject({
      other: 'startdate',
      after_before: 'after',
    })
  })

  it('maps before_enddate correctly', () => {
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({ targetSelection: 'before_enddate' }),
    ])
    const result = AdvancedTimeFilterModel.getIFR(layout)
    expect(result.filters).toHaveLength(1)
    expect(result.filters[0]).toMatchObject({
      other: 'enddate',
      after_before: 'before',
    })
  })

  it('maps after_enddate correctly', () => {
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({ targetSelection: 'after_enddate' }),
    ])
    const result = AdvancedTimeFilterModel.getIFR(layout)
    expect(result.filters).toHaveLength(1)
    expect(result.filters[0]).toMatchObject({
      other: 'enddate',
      after_before: 'after',
    })
  })

  it('falls back to enddate/after for unrecognized targetSelection keys', () => {
    // This documents the bug from #2562 where 'before_start' (missing 'date')
    // would incorrectly map to 'after end' behaviour
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({ targetSelection: 'before_start' }),
    ])
    const result = AdvancedTimeFilterModel.getIFR(layout)
    expect(result.filters).toHaveLength(1)
    expect(result.filters[0]).toMatchObject({
      other: 'enddate',
      after_before: 'after',
    })
  })

  it('handles originSelection: overlap', () => {
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({
        originSelection: 'overlap',
        targetSelection: 'before_startdate',
        days: '',
      }),
    ])
    const result = AdvancedTimeFilterModel.getIFR(layout)
    expect(result.filters).toHaveLength(1)
    expect(result.filters[0]).toMatchObject({
      this: 'overlap',
      other: 'overlap',
      after_before: '',
      operator: '',
    })
  })

  it('skips filters with invalid days value', () => {
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({ days: 'invalid' }),
    ])
    const result = AdvancedTimeFilterModel.getIFR(layout)
    expect(result.filters).toEqual([])
  })

  it('includes request and title in result', () => {
    const layout = makeAdvancedTimeLayout([makeTimeFilter()])
    const result = AdvancedTimeFilterModel.getIFR(layout)
    expect(result).toHaveProperty('request')
    expect(result).toHaveProperty('title', 'Test Title')
  })
})

describe('AdvancedTimeFilterModel.getRequest', () => {
  it('builds request with plain number days', () => {
    const layout = makeAdvancedTimeLayout([makeTimeFilter({ days: '10' })])
    const result = AdvancedTimeFilterModel.getRequest(layout)
    expect(result).toHaveLength(1)
    const filter = result[0].and[0]
    expect(filter.filter[0].and).toEqual([
      { op: '>=', value: 10 },
      { op: '<=', value: 10 },
    ])
  })

  it('builds request with range days', () => {
    const layout = makeAdvancedTimeLayout([makeTimeFilter({ days: '[0-30]' })])
    const result = AdvancedTimeFilterModel.getRequest(layout)
    expect(result).toHaveLength(1)
    const filter = result[0].and[0]
    expect(filter.filter[0].and).toEqual([
      { op: '>=', value: 0 },
      { op: '<=', value: 30 },
    ])
  })

  it('builds request with operator days', () => {
    const layout = makeAdvancedTimeLayout([makeTimeFilter({ days: '> 5' })])
    const result = AdvancedTimeFilterModel.getRequest(layout)
    expect(result).toHaveLength(1)
    const filter = result[0].and[0]
    expect(filter.filter[0].and).toEqual([{ op: '>', value: 5 }])
  })

  it('reverses operators for after_startdate', () => {
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({ targetSelection: 'after_startdate', days: '> 5' }),
    ])
    const result = AdvancedTimeFilterModel.getRequest(layout)
    const filter = result[0].and[0]
    expect(filter.filter[0].and).toEqual([{ op: '<', value: -5 }])
  })

  it('reverses operators for after_enddate', () => {
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({ targetSelection: 'after_enddate', days: '> 5' }),
    ])
    const result = AdvancedTimeFilterModel.getRequest(layout)
    const filter = result[0].and[0]
    expect(filter.filter[0].and).toEqual([{ op: '<', value: -5 }])
  })

  it('does not reverse operators for before_startdate', () => {
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({ targetSelection: 'before_startdate', days: '> 5' }),
    ])
    const result = AdvancedTimeFilterModel.getRequest(layout)
    const filter = result[0].and[0]
    expect(filter.filter[0].and).toEqual([{ op: '>', value: 5 }])
  })

  it('does not reverse operators for before_enddate', () => {
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({ targetSelection: 'before_enddate', days: '> 5' }),
    ])
    const result = AdvancedTimeFilterModel.getRequest(layout)
    const filter = result[0].and[0]
    expect(filter.filter[0].and).toEqual([{ op: '>', value: 5 }])
  })

  it('handles overlap originSelection', () => {
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({
        originSelection: 'overlap',
        targetSelection: 'before_startdate',
        days: '',
      }),
    ])
    const result = AdvancedTimeFilterModel.getRequest(layout)
    expect(result).toHaveLength(1)
    expect(result[0].and[0].or).toHaveLength(4)
  })

  it('groups filters with same targetInteraction', () => {
    const layout = makeAdvancedTimeLayout([
      makeTimeFilter({ days: '10' }),
      makeTimeFilter({ days: '20' }),
    ])
    const result = AdvancedTimeFilterModel.getRequest(layout)
    expect(result).toHaveLength(1)
    expect(result[0].and[0].filter).toHaveLength(2)
  })
})

describe('AdvancedTimeFilterModel.createAdvancedTimeFilterModel', () => {
  it('roundtrips from backend request to IFR format', () => {
    const request = {
      title: 'Test',
      filters: [
        {
          value: 'card-2',
          this: 'startdate',
          other: 'startdate',
          after_before: 'before',
          operator: '30',
        },
      ],
    }

    const model = AdvancedTimeFilterModel.createAdvancedTimeFilterModel(request)
    expect(model.timeFilterModel.timeFilters).toEqual([
      {
        originSelection: 'startdate',
        targetSelection: 'before_startdate',
        targetInteraction: 'card-2',
        days: '30',
      },
    ])

    // Verify the model can be converted back to IFR
    const layout = {
      props: {
        timeFilterModel: model.timeFilterModel,
        timeFilterTitle: model.timeFilterTitle,
      },
    }
    const ifr = AdvancedTimeFilterModel.getIFR(layout)
    expect(ifr.filters).toHaveLength(1)
    expect(ifr.filters[0]).toMatchObject({
      value: 'card-2',
      this: 'startdate',
      other: 'startdate',
      after_before: 'before',
      operator: '30',
    })
  })

  it('handles overlap filter from backend request', () => {
    const request = {
      title: 'Overlap Test',
      filters: [
        {
          value: 'card-2',
          this: 'overlap',
          other: '',
          after_before: '',
          operator: '',
        },
      ],
    }

    const model = AdvancedTimeFilterModel.createAdvancedTimeFilterModel(request)
    expect(model.timeFilterModel.timeFilters).toEqual([
      {
        originSelection: 'overlap',
        targetSelection: 'before_startdate',
        targetInteraction: 'card-2',
        days: '',
      },
    ])
  })
})

describe('AdvancedTimeFilterModel.validateText', () => {
  it('accepts plain numbers', () => {
    expect(AdvancedTimeFilterModel.validateText('30')).toBe(true)
    expect(AdvancedTimeFilterModel.validateText('0')).toBe(true)
  })

  it('accepts valid ranges', () => {
    expect(AdvancedTimeFilterModel.validateText('[0-30]')).toBe(true)
    expect(AdvancedTimeFilterModel.validateText(']0-30[')).toBe(true)
  })

  it('accepts valid operators', () => {
    expect(AdvancedTimeFilterModel.validateText('> 5')).toBe(true)
    expect(AdvancedTimeFilterModel.validateText('>= 10')).toBe(true)
    expect(AdvancedTimeFilterModel.validateText('< 5')).toBe(true)
    expect(AdvancedTimeFilterModel.validateText('<= 10')).toBe(true)
    expect(AdvancedTimeFilterModel.validateText('= 5')).toBe(true)
  })

  it('rejects invalid input', () => {
    expect(AdvancedTimeFilterModel.validateText('invalid')).toBe(false)
    expect(AdvancedTimeFilterModel.validateText('abc')).toBe(false)
  })

  it('accepts empty/null input', () => {
    expect(AdvancedTimeFilterModel.validateText('')).toBe(true)
    expect(AdvancedTimeFilterModel.validateText(null)).toBe(true)
  })
})
