import type { NumericRange } from '../../types/AtlasTypes'

// Helper methods for mapping values to Atlas format
export const mapCriteriaTypeToAtlas = (type: string) => {
  switch (type) {
    case 'EARLIEST':
      return 'First'
    case 'LATEST':
      return 'Last'
    case 'ALL':
    default:
      return 'All'
  }
}

export const mapCardinalityTypeToAtlas = (type: string): number => {
  switch (type) {
    case 'EXACTLY':
      return 0 // Atlas Type 0 = exactly
    case 'AT_MOST':
      return 1 // Atlas Type 1 = at most
    case 'AT_LEAST':
    default:
      return 2 // Atlas Type 2 = at least
  }
}

export const mapEventTypeToAtlas = (eventType: string): string => {
  switch (eventType) {
    case 'conditionEra':
      return 'ConditionEra'
    case 'conditionOccurrence':
      return 'ConditionOccurrence'
    case 'death':
      return 'Death'
    case 'deviceExposure':
      return 'DeviceExposure'
    case 'doseEra':
      return 'DoseEra'
    case 'drugEra':
      return 'DrugEra'
    case 'drugExposure':
      return 'DrugExposure'
    case 'locationRegion':
      return 'LocationRegion'
    case 'measurement':
      return 'Measurement'
    case 'observation':
      return 'Observation'
    case 'observationPeriod':
      return 'ObservationPeriod'
    case 'payerPlanPeriod':
      return 'PayerPlanPeriod'
    case 'procedureOccurrence':
      return 'ProcedureOccurrence'
    case 'specimen':
      return 'Specimen'
    case 'visitDetail':
      return 'VisitDetail'
    case 'visitOccurrence':
      return 'VisitOccurrence'
    default:
      // Convert camelCase to PascalCase for unknown event types
      return toPascalCase(eventType)
  }
}

// Helper method to convert camelCase to PascalCase
export const toPascalCase = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const mapOperatorToAtlas = (operator: string): NumericRange['Op'] => {
  // Atlas format mappings verified from OHDSI documentation
  switch (operator) {
    case 'GREATER_THAN':
      return 'gt'
    case 'LESS_THAN':
      return 'lt'
    case 'GREATER_THAN_OR_EQUAL':
      return 'gte'
    case 'LESS_THAN_OR_EQUAL':
      return 'lte'
    case 'EQUAL':
      return 'eq'
    case 'BETWEEN':
      return 'bt' // Common abbreviation for "between"
    case 'NOT_BETWEEN':
      return '!bt' // Not between - Atlas uses !bt notation
    default:
      return 'gt'
  }
}

export const mapCardinalityExtras = (using: string) => {
  switch (using) {
    case 'ALL':
      return { CountColumn: 'START_DATE' }
    case 'DISTINCT_CONCEPT':
      return { CountColumn: 'DOMAIN_CONCEPT', IsDistinct: true }
    case 'DISTINCT_START_DATE':
      return { CountColumn: 'START_DATE', IsDistinct: true }
    case 'DISTINCT_VISIT':
      return { CountColumn: 'VISIT_ID', IsDistinct: true }
    default:
      return {}
  }
}
