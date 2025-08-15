/**
 * Type guard functions for Atlas cohort definition criteria types
 */
import type {
  DrugExposure,
  ProcedureOccurrence,
  Observation,
  VisitOccurrence,
  DeviceExposure,
  Measurement,
  Death,
  DrugEra,
  ObservationPeriod,
  AtlasEvent,
} from '../types/AtlasTypes'

export function isConditionOccurrence(criteria: AtlasEvent): criteria is AtlasEvent {
  return criteria && typeof criteria.CodesetId === 'number' && 'ConditionTypeExclude' in criteria
}

export function isDrugExposure(criteria: AtlasEvent): criteria is DrugExposure {
  return criteria && typeof criteria.CodesetId === 'number' && 'DrugTypeExclude' in criteria
}

export function isProcedureOccurrence(criteria: AtlasEvent): criteria is ProcedureOccurrence {
  return criteria && typeof criteria.CodesetId === 'number' && 'ProcedureTypeExclude' in criteria
}

export function isObservation(criteria: AtlasEvent): criteria is Observation {
  return criteria && typeof criteria.CodesetId === 'number' && 'ObservationTypeExclude' in criteria
}

export function isVisitOccurrence(criteria: AtlasEvent): criteria is VisitOccurrence {
  return criteria && typeof criteria.CodesetId === 'number' && 'VisitTypeExclude' in criteria
}

export function isDeviceExposure(criteria: AtlasEvent): criteria is DeviceExposure {
  return criteria && typeof criteria.CodesetId === 'number' && 'DeviceTypeExclude' in criteria
}

export function isMeasurement(criteria: AtlasEvent): criteria is Measurement {
  return criteria && typeof criteria.CodesetId === 'number' && 'MeasurementTypeExclude' in criteria
}

export function isDeath(criteria: AtlasEvent): criteria is Death {
  return criteria && (typeof criteria.CodesetId === 'number' || 'DeathTypeExclude' in criteria)
}

export function isDrugEra(criteria: AtlasEvent): criteria is DrugEra {
  return criteria && ('EraStartDate' in criteria || 'EraEndDate' in criteria || typeof criteria.CodesetId === 'number')
}

export function isObservationPeriod(criteria: AtlasEvent): criteria is ObservationPeriod {
  return criteria && ('PeriodStartDate' in criteria || 'PeriodEndDate' in criteria)
}
