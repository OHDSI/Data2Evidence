/**
 * TypeScript types for OHDSI Atlas Cohort Definition JSON structure
 */

// Concept definition as used in ConceptSets
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

// Individual concept set item
export interface ConceptSetItem {
  concept: Concept
  isExcluded: boolean
  includeDescendants: boolean
  includeMapped: boolean
}

// Concept set expression
export interface ConceptSetExpression {
  items: ConceptSetItem[]
}

// Complete concept set definition
export interface ConceptSet {
  id: number
  name: string
  expression: ConceptSetExpression
}

// Criteria types
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
  CorrelatedCriteria?: CorrelatedCriteria // Added support for nested criteria
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

// Criteria list item (union of all possible criteria types)
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

// Date and numeric range types
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

// Observation window
export interface ObservationWindow {
  PriorDays: number
  PostDays: number
}

// Primary criteria limit
export interface PrimaryCriteriaLimit {
  Type: 'First' | 'All' | 'Last'
}

// Primary criteria
export interface PrimaryCriteria {
  CriteriaList: CriteriaListItem[]
  ObservationWindow: ObservationWindow
  PrimaryCriteriaLimit: PrimaryCriteriaLimit
}

// Qualified limit
export interface QualifiedLimit {
  Type: 'First' | 'All' | 'Last'
}

// Expression limit
export interface ExpressionLimit {
  Type: 'First' | 'All' | 'Last'
}

// Date offset for end strategy
export interface DateOffset {
  DateField: 'StartDate' | 'EndDate'
  Offset: number
}

// Custom era for end strategy
export interface CustomEra {
  CodesetId: number
  GapDays: number
  Offset: number
}

// End strategy
export interface EndStrategy {
  DateOffset?: DateOffset
  CustomEra?: CustomEra
}

// Collapse settings
export interface CollapseSettings {
  CollapseType: 'ERA'
  EraPad: number
}

// Censor window
export interface CensorWindow {
  StartDate?: string
  EndDate?: string
}

// Correlated criteria for nested events
export interface CorrelatedCriteria {
  Type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  Count?: number
  CriteriaList: CriteriaGroup[]
  DemographicCriteriaList: DemographicCriteria[]
  Groups: GroupCriteria[]
}

// Inclusion rule
export interface InclusionRule {
  name: string
  description?: string // Added support for description
  expression: {
    Type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
    Count?: number
    CriteriaList: CriteriaGroup[]
    DemographicCriteriaList?: DemographicCriteria[]
    Groups?: GroupCriteria[]
  }
}

// Criteria group for inclusion rules
export interface CriteriaGroup {
  Criteria?: CriteriaListItem
  StartWindow?: Window
  EndWindow?: Window
  Occurrence?: OccurrenceSettings
  RestrictVisit?: boolean
}

// Window settings
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

// Occurrence settings
export interface OccurrenceSettings {
  Type: number
  Count: number
  IsDistinct?: boolean
}

// Demographic criteria
export interface DemographicCriteria {
  Age?: NumericRange
  Gender?: ConceptSet[]
  Race?: ConceptSet[]
  Ethnicity?: ConceptSet[]
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
}

// Group criteria
export interface GroupCriteria {
  Type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  Count?: number
  CriteriaList?: CriteriaGroup[]
  DemographicCriteriaList?: DemographicCriteria[]
  Groups?: GroupCriteria[]
}

// Censoring criteria
export interface CensoringCriteria {
  // Similar structure to criteria list items
  [key: string]: any
}

// Main cohort definition interface
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
  ExclusionRules?: InclusionRule[] // Same structure as inclusion rules
}

// Atlas cohort definition API response wrapper
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

// Type guards
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

// Helper to get criteria type from a criteria list item
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

// Helper to get the criteria object from a criteria list item
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

// Helper types for cardinality mapping
export type CardinalityType = 'exactly' | 'atMost' | 'AT_LEAST'
export type AtlasOccurrenceType = 0 | 1 | 2 // 0=exactly, 1=at most, 2=at least

// Helper function to map cardinality to Atlas occurrence type
export function mapCardinalityToAtlas(cardinality: CardinalityType): AtlasOccurrenceType {
  switch (cardinality) {
    case 'exactly': return 0
    case 'atMost': return 1
    case 'AT_LEAST':
    default: return 2
  }
}

// Helper function to map criteria type to Atlas primary criteria type
export function mapCriteriaTypeToAtlas(criteriaType: 'ALL' | 'EARLIEST' | 'LATEST'): 'All' | 'First' | 'Last' {
  switch (criteriaType) {
    case 'EARLIEST': return 'First'
    case 'LATEST': return 'Last'
    case 'ALL':
    default: return 'All'
  }
}
