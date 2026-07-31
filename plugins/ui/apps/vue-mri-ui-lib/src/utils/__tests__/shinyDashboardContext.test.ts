import { describe, expect, it } from 'vitest'
import { buildShinyDashboardAuthMessage, buildShinyDashboardIframeUrl } from '../shinyDashboardContext'

describe('shinyDashboardContext', () => {
  it('builds the ShinyLive iframe URL from dataset ID and dashboard type', () => {
    expect(buildShinyDashboardIframeUrl('dataset-1', { dashboardType: 'table1' })).toBe(
      '/gateway/api/dataset/shiny-live/dataset-1_cohort_table1_python/'
    )
  })

  it('returns an empty iframe URL until a dashboard type is available', () => {
    expect(buildShinyDashboardIframeUrl('dataset-1', null)).toBe('')
    expect(buildShinyDashboardIframeUrl('dataset-1', { dashboardType: ' ' })).toBe('')
  })

  it('includes Table1 concept-set IDs in the iframe auth context', () => {
    const message = buildShinyDashboardAuthMessage({
      token: 'bearer-token',
      datasetId: 'dataset-1',
      cohortId: 'materialized-cohort-7',
      mriquery: '{"cohortDefinition":{"cards":[]}}',
      timestamp: 123,
      wizardConfig: {
        dashboardType: 'table1',
        conceptSets: [
          { id: '1', name: 'dm2hana' },
          { id: '2', name: 'dm2duck' },
        ],
      },
    })

    expect(message).toEqual({
      type: 'AUTH_TOKEN',
      token: 'bearer-token',
      timestamp: 123,
      context: {
        datasetId: 'dataset-1',
        cohortId: 'materialized-cohort-7',
        mriquery: '{"cohortDefinition":{"cards":[]}}',
        wizardConfig: {
          dashboardType: 'table1',
          conceptSets: [
            { id: '1', name: 'dm2hana' },
            { id: '2', name: 'dm2duck' },
          ],
        },
      },
    })
  })

  it('serializes wizard config to a plain object for postMessage', () => {
    const wizardConfig = {
      dashboardType: 'table1',
      conceptSets: [{ id: '1', name: 'dm2hana', helper: undefined }],
    }

    const message = buildShinyDashboardAuthMessage({
      token: 'bearer-token',
      datasetId: 'dataset-1',
      cohortId: 'materialized-cohort-7',
      wizardConfig,
      timestamp: 123,
    })

    expect(message.context.wizardConfig).not.toBe(wizardConfig)
    expect(message.context.wizardConfig).toEqual({
      dashboardType: 'table1',
      conceptSets: [{ id: '1', name: 'dm2hana' }],
    })
    expect(message.context.mriquery).toBeNull()
  })

  it('keeps auth context available if wizard config cannot be serialized', () => {
    const wizardConfig: Record<string, unknown> = { dashboardType: 'table1' }
    wizardConfig.self = wizardConfig

    const message = buildShinyDashboardAuthMessage({
      token: 'bearer-token',
      datasetId: 'dataset-1',
      cohortId: 'materialized-cohort-7',
      wizardConfig,
      timestamp: 123,
    })

    expect(message.context.datasetId).toBe('dataset-1')
    expect(message.context.cohortId).toBe('materialized-cohort-7')
    expect(message.context.wizardConfig).toBeNull()
  })
})
