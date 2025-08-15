/**
 * Utility functions for Atlas cohort definition operations
 */
import type { AtlasEvent, CriteriaListItem } from '../types/AtlasTypes'

export function getCriteriaType(item: CriteriaListItem): string | null {
  if (item.ConditionOccurrence) return 'ConditionOccurrence'
  if (item.DrugExposure) return 'DrugExposure'
  if (item.DrugEra) return 'DrugEra'
  if (item.ProcedureOccurrence) return 'ProcedureOccurrence'
  if (item.Observation) return 'Observation'
  if (item.VisitOccurrence) return 'VisitOccurrence'
  if (item.DeviceExposure) return 'DeviceExposure'
  if (item.Measurement) return 'Measurement'
  if (item.Death) return 'Death'
  if (item.ObservationPeriod) return 'ObservationPeriod'
  return null
}

export function getCriteriaObject(item: CriteriaListItem): AtlasEvent {
  return (
    item.ConditionOccurrence ||
    item.DrugExposure ||
    item.DrugEra ||
    item.ProcedureOccurrence ||
    item.Observation ||
    item.VisitOccurrence ||
    item.DeviceExposure ||
    item.Measurement ||
    item.Death ||
    item.ObservationPeriod ||
    null
  )
}

export type CardinalityType = 'EXACTLY' | 'AT_MOST' | 'AT_LEAST'
export type AtlasOccurrenceType = 0 | 1 | 2

export function mapCardinalityToAtlas(cardinality: CardinalityType): AtlasOccurrenceType {
  switch (cardinality) {
    case 'EXACTLY':
      return 0
    case 'AT_MOST':
      return 1
    case 'AT_LEAST':
    default:
      return 2
  }
}

export function mapCriteriaTypeToAtlas(criteriaType: 'ALL' | 'EARLIEST' | 'LATEST'): 'All' | 'First' | 'Last' {
  switch (criteriaType) {
    case 'EARLIEST':
      return 'First'
    case 'LATEST':
      return 'Last'
    case 'ALL':
    default:
      return 'All'
  }
}
