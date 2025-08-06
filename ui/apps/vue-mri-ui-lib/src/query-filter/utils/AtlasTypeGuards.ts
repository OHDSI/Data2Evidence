/**
 * Type guard functions for Atlas cohort definition criteria types
 */
import type {
  ConditionOccurrence,
  DrugExposure,
  ProcedureOccurrence,
  Observation,
  VisitOccurrence,
  DeviceExposure,
  Measurement,
  Death,
  DrugEra,
  ObservationPeriod,
} from '../types/AtlasTypes'

export function isConditionOccurrence(criteria: any): criteria is ConditionOccurrence {
  return criteria && typeof criteria.CodesetId === 'number' && 'ConditionTypeExclude' in criteria
}

export function isDrugExposure(criteria: any): criteria is DrugExposure {
  return criteria && typeof criteria.CodesetId === 'number' && 'DrugTypeExclude' in criteria
}

export function isProcedureOccurrence(criteria: any): criteria is ProcedureOccurrence {
  return criteria && typeof criteria.CodesetId === 'number' && 'ProcedureTypeExclude' in criteria
}

export function isObservation(criteria: any): criteria is Observation {
  return criteria && typeof criteria.CodesetId === 'number' && 'ObservationTypeExclude' in criteria
}

export function isVisitOccurrence(criteria: any): criteria is VisitOccurrence {
  return criteria && typeof criteria.CodesetId === 'number' && 'VisitTypeExclude' in criteria
}

export function isDeviceExposure(criteria: any): criteria is DeviceExposure {
  return criteria && typeof criteria.CodesetId === 'number' && 'DeviceTypeExclude' in criteria
}

export function isMeasurement(criteria: any): criteria is Measurement {
  return criteria && typeof criteria.CodesetId === 'number' && 'MeasurementTypeExclude' in criteria
}

export function isDeath(criteria: any): criteria is Death {
  return criteria && (typeof criteria.CodesetId === 'number' || 'DeathTypeExclude' in criteria)
}

export function isDrugEra(criteria: any): criteria is DrugEra {
  return criteria && ('EraStartDate' in criteria || 'EraEndDate' in criteria || typeof criteria.CodesetId === 'number')
}

export function isObservationPeriod(criteria: any): criteria is ObservationPeriod {
  return criteria && ('PeriodStartDate' in criteria || 'PeriodEndDate' in criteria)
}
