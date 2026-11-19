import { describe, expect, it } from 'vitest'
import { chartQueryFor } from '../explorationSqlQuery'

// The bookmark's own datasetId differs from the selected dataset on purpose:
// the query must send the selected dataset, never the bookmark value.
const bookmark = { datasetId: 'ds-bookmark', filter: { cards: { content: [] } } }
const datasetId = 'ds-selected'

describe('chartQueryFor', () => {
  it('maps the stacked bar chart and sends the selected dataset', () => {
    const q = chartQueryFor('stacked', { bookmarksData: bookmark, datasetId })
    expect(q?.url).toBe('/analytics-svc/api/services/population/json/barchart')
    expect(q?.params.mriquery).toBe(JSON.stringify(bookmark))
    expect(q?.params.datasetId).toBe('ds-selected')
  })

  it('defaults an absent chart type to the bar chart, as the restore does', () => {
    for (const t of [undefined, null, '']) {
      const q = chartQueryFor(t, { bookmarksData: bookmark, datasetId })
      expect(q?.url).toBe('/analytics-svc/api/services/population/json/barchart')
      expect(q?.params.datasetId).toBe('ds-selected')
    }
  })

  it('maps boxplot and km and sends the selected dataset', () => {
    const box = chartQueryFor('boxplot', { bookmarksData: bookmark, datasetId })
    expect(box?.url).toBe('/analytics-svc/api/services/population/json/boxplot')
    expect(box?.params.datasetId).toBe('ds-selected')

    const km = chartQueryFor('km', { bookmarksData: bookmark, datasetId })
    expect(km?.url).toBe('/analytics-svc/api/services/population/json/kaplanmeier')
    expect(km?.params.datasetId).toBe('ds-selected')
  })

  it('maps the patient list to its own endpoint and its own request shape', () => {
    const plRequest = { columns: ['a'] }
    const q = chartQueryFor('list', {
      bookmarksData: bookmark,
      patientListRequest: plRequest,
      datasetId: 'ds-9',
    })
    expect(q?.url).toBe('/analytics-svc/api/services/patient')
    // The list sends its own request, not the bookmark.
    expect(q?.params.mriquery).toBe(JSON.stringify(plRequest))
    expect(q?.params.datasetId).toBe('ds-9')
  })

  it('returns null for the list when its request is missing', () => {
    expect(chartQueryFor('list', { bookmarksData: bookmark, datasetId })).toBeNull()
  })

  it('returns null for every chart type when no dataset is selected', () => {
    for (const t of ['stacked', 'boxplot', 'km', 'list', undefined]) {
      expect(chartQueryFor(t, { bookmarksData: bookmark, patientListRequest: {} })).toBeNull()
    }
  })

  it('returns null for an empty or absent bookmark, so no request is made', () => {
    expect(chartQueryFor('stacked', { bookmarksData: {}, datasetId })).toBeNull()
    expect(chartQueryFor('stacked', { bookmarksData: null, datasetId })).toBeNull()
    expect(chartQueryFor('stacked', { bookmarksData: undefined, datasetId })).toBeNull()
  })

  it('returns null for a chart type it does not know', () => {
    expect(chartQueryFor('sunburst', { bookmarksData: bookmark, datasetId })).toBeNull()
  })

  it('sends the selected dataset when the bookmark carries none', () => {
    const q = chartQueryFor('stacked', { bookmarksData: { filter: {} }, datasetId })
    expect(q?.params.datasetId).toBe('ds-selected')
    expect(q?.params.mriquery).toBeDefined()
  })
})
