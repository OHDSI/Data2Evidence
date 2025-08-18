/**
 * Utility functions for Atlas cohort definition operations
 */
import type { AtlasEvent, CriteriaListItem } from '../types/AtlasTypes'
import { attributeMap } from './AtlasAttributeLookup'

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

export function getAtlasAttributeKey(attributeId: string, eventType: string): string {
  return attributeMap[eventType]?.[attributeId] || attributeId
}

export const dateRangeOptions = [
  { label: 'Before', value: 'lt' },
  { label: 'On or Before', value: 'lte' },
  { label: 'On', value: 'eq' },
  { label: 'After', value: 'gt' },
  { label: 'On or After', value: 'gte' },
  { label: 'Between', value: 'btw' },
  { label: 'Not Between', value: '!btw' },
]

export const stringOptions = [
  { label: 'Starting With', value: 'startsWith' },
  { label: 'Containing', value: 'contains' },
  { label: 'Ending With', value: 'endsWith' },
  { label: 'Not Starting With', value: '!startsWith' },
  { label: 'Not Containing', value: '!contains' },
  { label: 'Not Ending With', value: '!endsWith' },
]

export const numericRangeOptions = [
  { label: 'Less Than', value: 'lt' },
  { label: 'Less or Equal To', value: 'lte' },
  { label: 'Equal To', value: 'eq' },
  { label: 'Greater Than', value: 'gt' },
  { label: 'Greater or Equal To', value: 'gte' },
  { label: 'Between', value: 'btw' },
  { label: 'Not Between', value: '!btw' },
]