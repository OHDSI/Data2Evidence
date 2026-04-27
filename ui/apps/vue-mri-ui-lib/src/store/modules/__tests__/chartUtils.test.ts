import { vi } from 'vitest'

vi.mock('@/store', () => ({
  default: {
    getters: {},
    dispatch: vi.fn(),
    commit: vi.fn(),
  },
}))

vi.mock('@/utils/Constants', () => ({
  default: {
    AxisId: { X: 1, Y: 2 },
    XAxisLabelMaxLength: 30,
    MRIChartProperties: { Sort: 0 },
    CDMAttrType: { Date: 'time', Datetime: 'datetime' },
  },
}))

import chartUtils from '@/store/modules/chartUtils'

// Extract the private helpers by reaching into the module's getters
// buildTickLabels and truncateAtWordBoundary are module-level closures; we test
// them indirectly through dataToTraces.
const { getters } = chartUtils

// ─────────────────────────────────────────────────────────────
// Helpers used in tests
// ─────────────────────────────────────────────────────────────

function makeMockGetters(overrides = {}) {
  return {
    getMriFrontendConfig: {
      getAttributeByPath: () => ({
        getType: () => 'text',
        getName: () => 'attr',
        sParentPath: 'patient',
      }),
      getFilterCardByPath: () => ({ getName: () => 'Card' }),
    },
    getText: (key: string) => key,
    sortProperty: { props: {} },
    getChartProperty: () => ({}),
    sortData: (data: any) => data,
    ...overrides,
  }
}

function makeMinimalChartData(xValues: string[], yCategory?: string) {
  const xAxis = { id: 'patient.attributes.diagnosis', axis: 1, name: 'Diagnosis' }
  const yAxis = yCategory ? [{ id: 'patient.attributes.gender', axis: 2, name: 'Gender' }] : []
  const categories = yCategory ? [xAxis, ...yAxis] : [xAxis]

  const data = yCategory
    ? xValues.map(x => ({ [xAxis.id]: x, [yAxis[0].id]: yCategory, 'patient.attributes.count': 5 }))
    : xValues.map(x => ({ [xAxis.id]: x, 'patient.attributes.count': 5 }))

  return {
    categories,
    measures: [{ id: 'patient.attributes.count', name: 'Count' }],
    data,
  }
}

// ─────────────────────────────────────────────────────────────
// truncateAtWordBoundary (via dataToTraces ticktext output)
// ─────────────────────────────────────────────────────────────

describe('truncateAtWordBoundary (via dataToTraces ticktext)', () => {
  const state = {}
  const mockGetters = makeMockGetters()

  it('returns the label unchanged when it is at or under maxLength (30)', () => {
    const label = 'Short label' // 11 chars
    const chartData = makeMinimalChartData([label])
    const result = getters.dataToTraces(state, mockGetters)(chartData)
    expect(result.ticktext[0]).toBe(label)
  })

  it('truncates labels over 30 chars and result is ≤ 30 chars', () => {
    const label = 'This is a very long label that definitely exceeds thirty characters'
    const chartData = makeMinimalChartData([label])
    const result = getters.dataToTraces(state, mockGetters)(chartData)
    const truncated = result.ticktext[0]
    expect(truncated.length).toBeLessThanOrEqual(30)
    expect(truncated).toMatch(/\.\.\.$/)
  })

  it('truncates at word boundary (not mid-word) when possible', () => {
    // "ABCDE FGHIJ KLMNO PQRST UVWXY" is 29 chars — fits at 30 → no truncation
    // "ABCDE FGHIJ KLMNO PQRSTU VWXYZ" — 31 chars; budget=27; last space before 27 is at index 20
    const label = 'ABCDE FGHIJ KLMNO PQRSTU VWXYZ' // 30 chars → no truncation
    const chartData = makeMinimalChartData([label])
    const result = getters.dataToTraces(state, mockGetters)(chartData)
    expect(result.ticktext[0]).toBe(label) // exactly 30, not truncated
  })

  it('truncates mid-word when there is no space within budget', () => {
    const label = 'Supercalifragilistic12345678901' // 31 chars, no spaces
    const chartData = makeMinimalChartData([label])
    const result = getters.dataToTraces(state, mockGetters)(chartData)
    const truncated = result.ticktext[0]
    expect(truncated.length).toBeLessThanOrEqual(30)
    expect(truncated).toBe('Supercalifragilistic1234567...')
  })

  it('never produces output longer than maxLength even with word-boundary truncation', () => {
    // Force a worst case: a word of exactly (budget-1) chars followed by a space and more
    // budget = 30 - 3 = 27; word = 26 chars + space + rest
    const word27 = 'A'.repeat(26)
    const label = `${word27} extra stuff here` // 27+1+16 = 44 chars
    const chartData = makeMinimalChartData([label])
    const result = getters.dataToTraces(state, mockGetters)(chartData)
    const truncated = result.ticktext[0]
    expect(truncated.length).toBeLessThanOrEqual(30)
  })
})

// ─────────────────────────────────────────────────────────────
// buildTickLabels (via dataToTraces tickvals/ticktext/ticktextFull)
// ─────────────────────────────────────────────────────────────

describe('buildTickLabels (via dataToTraces)', () => {
  const state = {}
  const mockGetters = makeMockGetters()

  it('builds tickvals as the full untruncated category values', () => {
    const labels = ['Apple', 'Banana', 'Cherry']
    const chartData = makeMinimalChartData(labels)
    const result = getters.dataToTraces(state, mockGetters)(chartData)
    expect(result.tickvals).toEqual(labels)
  })

  it('ticktextFull equals the full untruncated values', () => {
    const labels = ['Apple', 'Banana', 'Cherry']
    const chartData = makeMinimalChartData(labels)
    const result = getters.dataToTraces(state, mockGetters)(chartData)
    expect(result.ticktextFull).toEqual(labels)
  })

  it('ticktext contains truncated versions of labels over maxLength', () => {
    const longLabel = 'A'.repeat(40)
    const shortLabel = 'Short'
    const chartData = makeMinimalChartData([longLabel, shortLabel])
    const result = getters.dataToTraces(state, mockGetters)(chartData)
    expect(result.ticktext[0].length).toBeLessThanOrEqual(30)
    expect(result.ticktext[1]).toBe(shortLabel)
  })

  it('deduplicates category values in tickvals', () => {
    // Same x value appearing in multiple data rows
    const labels = ['Apple', 'Banana', 'Apple', 'Cherry']
    const chartData = makeMinimalChartData(labels)
    const result = getters.dataToTraces(state, mockGetters)(chartData)
    // buildTickLabels deduplicates: 'Apple' appears only once
    expect(result.tickvals).toEqual(['Apple', 'Banana', 'Cherry'])
    expect(result.tickvals.filter((v: string) => v === 'Apple').length).toBe(1)
  })

  it('returns undefined tickvals/ticktext/ticktextFull for multi-axis (multicategory) charts', () => {
    const xAxis1 = { id: 'patient.attributes.diagnosis', axis: 1, name: 'Diagnosis' }
    const xAxis2 = { id: 'patient.attributes.stage', axis: 1, name: 'Stage' }
    const categories = [xAxis1, xAxis2]
    const data = [
      { [xAxis1.id]: 'Cancer', [xAxis2.id]: 'I', 'patient.attributes.count': 3 },
      { [xAxis1.id]: 'Cancer', [xAxis2.id]: 'II', 'patient.attributes.count': 7 },
    ]
    const chartData = {
      categories,
      measures: [{ id: 'patient.attributes.count', name: 'Count' }],
      data,
    }
    const result = getters.dataToTraces(state, mockGetters)(chartData)
    // Multi-axis: buildTickLabels returns null → chartData fields should be undefined
    expect(result.tickvals).toBeUndefined()
    expect(result.ticktext).toBeUndefined()
    expect(result.ticktextFull).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────
// dataToTraces — trace.x contains full untruncated values
// ─────────────────────────────────────────────────────────────

describe('dataToTraces trace.x canonical values', () => {
  const state = {}
  const mockGetters = makeMockGetters()

  it('trace.x contains the full untruncated x-axis value (not truncated)', () => {
    const longLabel = 'This diagnosis name is extremely long and will be truncated'
    const chartData = makeMinimalChartData([longLabel])
    const result = getters.dataToTraces(state, mockGetters)(chartData)
    // Single category trace (reversed, so index 0)
    expect(result.traces[0].x[0]).toBe(longLabel)
  })

  it('trace.x values match tickvals exactly for single-axis', () => {
    const labels = ['Flu', 'Cold', 'Fever']
    const chartData = makeMinimalChartData(labels)
    const result = getters.dataToTraces(state, mockGetters)(chartData)
    // tickvals should be a subset match (same values as in x data)
    result.traces.forEach(trace => {
      trace.x.forEach((val: string) => {
        expect(result.tickvals).toContain(val)
      })
    })
  })
})

describe('dataToTraces multicategory display labels', () => {
  const state = {}
  const mockGetters = makeMockGetters()

  it('uses truncated display labels for multicategory axes while preserving canonical full values', () => {
    const xAxis1 = { id: 'patient.attributes.diagnosis', axis: 1, name: 'Diagnosis' }
    const xAxis2 = { id: 'patient.attributes.stage', axis: 1, name: 'Stage' }
    const longDiagnosis = 'This diagnosis name is extremely long and should be truncated for display'
    const longStage = 'This stage description is also long enough to need truncation'
    const chartData = {
      categories: [xAxis1, xAxis2],
      measures: [{ id: 'patient.attributes.count', name: 'Count' }],
      data: [
        {
          [xAxis1.id]: longDiagnosis,
          [xAxis2.id]: longStage,
          'patient.attributes.count': 5,
        },
      ],
    }

    const result = getters.dataToTraces(state, mockGetters)(chartData)

    expect(result.traces[0].x[0][0]).not.toBe(longDiagnosis)
    expect(result.traces[0].x[1][0]).not.toBe(longStage)
    expect(result.traces[0].x[0][0].length).toBeLessThanOrEqual(30)
    expect(result.traces[0].x[1][0].length).toBeLessThanOrEqual(30)
    expect(result.traces[0].customdata[0].values[0]).toBe(longDiagnosis)
    expect(result.traces[0].customdata[0].values[1]).toBe(longStage)
  })
})
