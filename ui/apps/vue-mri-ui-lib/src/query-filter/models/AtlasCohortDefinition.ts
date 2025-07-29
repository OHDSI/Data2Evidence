/**
 * TypeScript types for OHDSI Atlas Cohort Definition JSON structure
 */
export interface Concept {
  CONCEPT_ID: number
  CONCEPT_NAME: string
  STANDARD_CONCEPT: string
  STANDARD_CONCEPT_CAPTION: string
  INVALID_REASON: string
  INVALID_REASON_CAPTION: string
  CONCEPT_CODE: string
  DOMAIN_ID: string
  VOCABULARY_ID: string
  CONCEPT_CLASS_ID: string
  VALID_START_DATE: string
  VALID_END_DATE: string
}

export interface ConceptSetItem {
  concept: Concept
  isExcluded: boolean
  includeDescendants: boolean
  includeMapped: boolean
}

export interface ConceptSetExpression {
  items: ConceptSetItem[]
}

export interface ConceptSet {
  id: number
  conceptSetId?: number
  name: string
  expression: ConceptSetExpression
}

export interface ConditionOccurrence {
  CodesetId?: number
  ConditionTypeExclude?: boolean
  First?: boolean
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
  ConditionType?: ConceptSet[]
  Gender?: ConceptSet[]
  Age?: NumericRange
  ProviderSpecialty?: ConceptSet[]
  VisitType?: ConceptSet[]
  CorrelatedCriteria?: CorrelatedCriteria
}

export interface DrugExposure {
  CodesetId: number
  DrugTypeExclude: boolean
  First?: boolean
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
  DrugType?: ConceptSet[]
  RefillsRange?: NumericRange
  QuantityRange?: NumericRange
  DaysSupplyRange?: NumericRange
  RouteConcept?: ConceptSet[]
  EffectiveDrugDose?: NumericRange
  DoseUnit?: ConceptSet[]
  LotNumber?: string
  Gender?: ConceptSet[]
  Age?: NumericRange
  ProviderSpecialty?: ConceptSet[]
  VisitType?: ConceptSet[]
}

export interface ProcedureOccurrence {
  CodesetId: number
  ProcedureTypeExclude: boolean
  First?: boolean
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
  ProcedureType?: ConceptSet[]
  Modifier?: ConceptSet[]
  Quantity?: NumericRange
  Gender?: ConceptSet[]
  Age?: NumericRange
  ProviderSpecialty?: ConceptSet[]
  VisitType?: ConceptSet[]
}

export interface Observation {
  CodesetId: number
  ObservationTypeExclude: boolean
  First?: boolean
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
  ObservationType?: ConceptSet[]
  ValueAsNumber?: NumericRange
  ValueAsString?: string
  ValueAsConcept?: ConceptSet[]
  Qualifier?: ConceptSet[]
  Unit?: ConceptSet[]
  Gender?: ConceptSet[]
  Age?: NumericRange
  ProviderSpecialty?: ConceptSet[]
  VisitType?: ConceptSet[]
}

export interface VisitOccurrence {
  CodesetId: number
  VisitTypeExclude: boolean
  First?: boolean
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
  VisitType?: ConceptSet[]
  VisitLength?: NumericRange
  Gender?: ConceptSet[]
  Age?: NumericRange
  ProviderSpecialty?: ConceptSet[]
}

export interface DeviceExposure {
  CodesetId: number
  DeviceTypeExclude: boolean
  First?: boolean
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
  DeviceType?: ConceptSet[]
  UniqueDeviceId?: string
  Quantity?: NumericRange
  Gender?: ConceptSet[]
  Age?: NumericRange
  ProviderSpecialty?: ConceptSet[]
  VisitType?: ConceptSet[]
}

export interface Measurement {
  CodesetId: number
  MeasurementTypeExclude: boolean
  First?: boolean
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
  MeasurementType?: ConceptSet[]
  Operator?: ConceptSet[]
  ValueAsNumber?: NumericRange
  ValueAsConcept?: ConceptSet[]
  Unit?: ConceptSet[]
  RangeLow?: NumericRange
  RangeHigh?: NumericRange
  RangeLowRatio?: NumericRange
  RangeHighRatio?: NumericRange
  Abnormal?: boolean
  Gender?: ConceptSet[]
  Age?: NumericRange
  ProviderSpecialty?: ConceptSet[]
  VisitType?: ConceptSet[]
}

export interface Death {
  CodesetId?: number
  DeathTypeExclude?: boolean
  OccurrenceStartDate?: DateRange
  DeathType?: ConceptSet[]
  DeathSourceConcept?: ConceptSet[]
  Gender?: ConceptSet[]
  Age?: NumericRange
}

export interface DrugEra {
  CodesetId?: number
  EraStartDate?: DateRange
  EraEndDate?: DateRange
  EraLength?: NumericRange
  AgeAtStart?: NumericRange
  AgeAtEnd?: NumericRange
  Gender?: ConceptSet[]
}

export interface ObservationPeriod {
  PeriodStartDate?: DateRange
  PeriodEndDate?: DateRange
  PeriodLength?: NumericRange
  AgeAtStart?: NumericRange
  AgeAtEnd?: NumericRange
  Gender?: ConceptSet[]
}

export interface CriteriaListItem {
  ConditionOccurrence?: ConditionOccurrence
  DrugExposure?: DrugExposure
  DrugEra?: DrugEra
  ProcedureOccurrence?: ProcedureOccurrence
  Observation?: Observation
  VisitOccurrence?: VisitOccurrence
  DeviceExposure?: DeviceExposure
  Measurement?: Measurement
  Death?: Death
  ObservationPeriod?: ObservationPeriod
}

export interface DateRange {
  Value: string // ISO date string
  Extent: string // ISO date string
  Op: 'lt' | 'lte' | 'eq' | 'gte' | 'gt' | 'bt' | 'nbt'
}

export interface NumericRange {
  Value: number
  Extent?: number
  Op: 'lt' | 'lte' | 'eq' | 'gte' | 'gt' | 'bt' | 'nbt'
}

export interface ObservationWindow {
  PriorDays: number
  PostDays: number
}

export interface PrimaryCriteriaLimit {
  Type: 'First' | 'All' | 'Last'
}

export interface PrimaryCriteria {
  CriteriaList: CriteriaListItem[]
  ObservationWindow: ObservationWindow
  PrimaryCriteriaLimit: PrimaryCriteriaLimit
}

export interface QualifiedLimit {
  Type: 'First' | 'All' | 'Last'
}

export interface ExpressionLimit {
  Type: 'First' | 'All' | 'Last'
}

export interface DateOffset {
  DateField: 'StartDate' | 'EndDate'
  Offset: number
}

export interface CustomEra {
  CodesetId: number
  GapDays: number
  Offset: number
}

export interface EndStrategy {
  DateOffset?: DateOffset
  CustomEra?: CustomEra
}

export interface CollapseSettings {
  CollapseType: 'ERA'
  EraPad: number
}

export interface CensorWindow {
  StartDate?: string
  EndDate?: string
}

export interface CorrelatedCriteria {
  Type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  Count?: number
  CriteriaList: CriteriaGroup[]
  DemographicCriteriaList: DemographicCriteria[]
  Groups: GroupCriteria[]
}

export interface InclusionRule {
  name: string
  description?: string
  expression: {
    Type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
    Count?: number
    CriteriaList: CriteriaGroup[]
    DemographicCriteriaList?: DemographicCriteria[]
    Groups?: GroupCriteria[]
  }
}

export interface CriteriaGroup {
  Criteria?: CriteriaListItem
  StartWindow?: Window
  EndWindow?: Window
  Occurrence?: OccurrenceSettings
  RestrictVisit?: boolean
}

export interface Window {
  Start: {
    Days?: number
    Coeff: number
  }
  End: {
    Days?: number
    Coeff: number
  }
  UseIndexEnd?: boolean
  UseEventEnd?: boolean
}

export interface OccurrenceSettings {
  Type: number
  Count: number
  IsDistinct?: boolean
}

export interface DemographicCriteria {
  Age?: NumericRange
  Gender?: ConceptSet[]
  Race?: ConceptSet[]
  Ethnicity?: ConceptSet[]
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
}

export interface GroupCriteria {
  Type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  Count?: number
  CriteriaList?: CriteriaGroup[]
  DemographicCriteriaList?: DemographicCriteria[]
  Groups?: GroupCriteria[]
}

export interface CensoringCriteria {
  [key: string]: any
}

export interface AtlasCohortDefinition {
  cdmVersionRange: string
  PrimaryCriteria: PrimaryCriteria
  ConceptSets: ConceptSet[]
  QualifiedLimit: QualifiedLimit
  ExpressionLimit: ExpressionLimit
  InclusionRules: InclusionRule[]
  EndStrategy?: EndStrategy
  CensoringCriteria: CensoringCriteria[]
  CollapseSettings: CollapseSettings
  CensorWindow: CensorWindow
  name?: string
  description?: string
}

export interface AtlasCohortDefinitionResponse {
  id: number
  name: string
  description?: string
  expressionType: string
  expression: AtlasCohortDefinition
  createdBy: string
  createdDate: number
  modifiedBy: string
  modifiedDate: number
  tags: any[]
  hasWriteAccess: boolean
  hasReadAccess: boolean
}

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

export function getCriteriaObject(item: CriteriaListItem): any {
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
