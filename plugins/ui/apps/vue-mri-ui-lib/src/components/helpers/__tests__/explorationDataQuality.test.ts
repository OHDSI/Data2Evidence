import { describe, it, expect } from 'vitest'
import {
  dataQualityCohortId,
  canOpenDataQuality,
  buildDataQualityParcelProps,
  classifyFlowRunState,
  isDataQualityBusy,
  dataQualityTooltipKey,
} from '../explorationDataQuality'

describe('dataQualityCohortId', () => {
  it('returns the cohort definition id as a string when the record is materialised', () => {
    expect(dataQualityCohortId({ cohortDefinition: { id: 'abc-123' } })).toBe('abc-123')
  })

  it('normalises a numeric id, because it becomes a URL path segment', () => {
    expect(dataQualityCohortId({ cohortDefinition: { id: 42 } })).toBe('42')
  })

  it('returns null for a never-materialised exploration', () => {
    expect(dataQualityCohortId({ cohortDefinition: null })).toBeNull()
    expect(dataQualityCohortId({})).toBeNull()
  })

  it('ignores a bookmark id and an Atlas id, which key different tables', () => {
    const card = { bookmark: { id: 'bmk-1' }, atlasCohortDefinition: { id: 7 } }
    expect(dataQualityCohortId(card as never)).toBeNull()
  })

  it('rejects an empty string rather than building a URL with a blank segment', () => {
    expect(dataQualityCohortId({ cohortDefinition: { id: '' } })).toBeNull()
  })

  it('rejects a non-finite number', () => {
    expect(dataQualityCohortId({ cohortDefinition: { id: Number.NaN } })).toBeNull()
  })

  it('is safe on null and undefined', () => {
    expect(dataQualityCohortId(null)).toBeNull()
    expect(dataQualityCohortId(undefined)).toBeNull()
  })
})

describe('canOpenDataQuality', () => {
  it('is true only when a cohort definition id resolves', () => {
    expect(canOpenDataQuality({ cohortDefinition: { id: 'abc' } })).toBe(true)
    expect(canOpenDataQuality({ cohortDefinition: { id: 0 } })).toBe(true)
    expect(canOpenDataQuality({})).toBe(false)
    expect(canOpenDataQuality(null)).toBe(false)
  })
})

describe('buildDataQualityParcelProps', () => {
  const getToken = async () => 'token'
  const build = (itemId: 'dashboard' | 'checks') =>
    buildDataQualityParcelProps({ datasetId: 'ds-1', cohortDefinitionId: '42', itemId, locale: 'de', getToken })

  it('sends the full host context, because parcel.update replaces props rather than merging them', () => {
    expect(build('dashboard')).toEqual({
      hostContext: {
        surface: 'mri-exploration-card',
        itemId: 'dashboard',
        locale: 'de',
        permissions: [],
        sourceKey: 'ds-1',
        cohortDefinitionId: '42',
      },
      datasetId: 'ds-1',
      getToken,
      locale: 'de',
    })
  })

  it('carries the tab as the itemId', () => {
    expect((build('checks').hostContext as { itemId: string }).itemId).toBe('checks')
  })

  it('never sends uiFilesUrl, which would flip the plugin into routed mode', () => {
    expect(build('dashboard')).not.toHaveProperty('uiFilesUrl')
  })
})

describe('classifyFlowRunState', () => {
  it.each([
    'SCHEDULED',
    'PENDING',
    'RUNNING',
    'PAUSED',
    'CANCELLING',
    'LATE',
    'RETRYING',
    'AWAITINGRETRY',
    'SUSPENDED',
  ])('reads %s as running', type => expect(classifyFlowRunState(type)).toBe('running'))

  it.each(['FAILED', 'CRASHED', 'TIMEDOUT'])('reads %s as failed', type =>
    expect(classifyFlowRunState(type)).toBe('failed')
  )

  it('reads COMPLETED as completed and CANCELLED as cancelled', () => {
    expect(classifyFlowRunState('COMPLETED')).toBe('completed')
    expect(classifyFlowRunState('CANCELLED')).toBe('cancelled')
  })

  it('reads a missing or unknown state as failed, so the next click can run again', () => {
    expect(classifyFlowRunState(undefined)).toBe('failed')
    expect(classifyFlowRunState(null)).toBe('failed')
    expect(classifyFlowRunState('X')).toBe('failed')
  })
})

describe('isDataQualityBusy', () => {
  it('is true while the run is being checked, started or polled', () => {
    expect(isDataQualityBusy('checking')).toBe(true)
    expect(isDataQualityBusy('starting')).toBe(true)
    expect(isDataQualityBusy('running')).toBe(true)
  })

  it('is false once the outcome is known', () => {
    expect(isDataQualityBusy('idle')).toBe(false)
    expect(isDataQualityBusy('ready')).toBe(false)
    expect(isDataQualityBusy('failed')).toBe(false)
  })
})

describe('dataQualityTooltipKey', () => {
  it('asks for materialisation first, whatever the phase', () => {
    expect(dataQualityTooltipKey('ready', false)).toBe('MRI_PA_DATA_QUALITY_DISABLED_NOT_MATERIALISED')
  })

  it('names each phase', () => {
    expect(dataQualityTooltipKey('idle', true)).toBe('MRI_PA_DATA_QUALITY_TOOLTIP_GENERATE')
    expect(dataQualityTooltipKey('checking', true)).toBe('MRI_PA_DATA_QUALITY_TOOLTIP_RUNNING')
    expect(dataQualityTooltipKey('starting', true)).toBe('MRI_PA_DATA_QUALITY_TOOLTIP_RUNNING')
    expect(dataQualityTooltipKey('running', true)).toBe('MRI_PA_DATA_QUALITY_TOOLTIP_RUNNING')
    expect(dataQualityTooltipKey('ready', true)).toBe('MRI_PA_DATA_QUALITY_TOOLTIP_READY')
    expect(dataQualityTooltipKey('failed', true)).toBe('MRI_PA_DATA_QUALITY_TOOLTIP_FAILED')
  })
})
