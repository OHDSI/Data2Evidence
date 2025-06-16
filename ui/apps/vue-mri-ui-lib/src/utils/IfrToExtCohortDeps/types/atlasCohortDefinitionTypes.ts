export type ConceptSetElement = ConceptItem[]
export type ConceptSets = ConceptSet[]
export type ConceptSet = {
  id: number
  name: string
  expression: {
    items: ConceptSetElement
  }
}
export type CodesetIdType = AnyConcept | ConceptSetIndex
export type AnyConcept = null
export type ConceptSetIndex = number
export type NumericRange = LessThan | LessOrEqualTo | EqualTo | GreaterThan | GreaterOrEqualTo | Between | NotBetween
export type Value = number
export type DateRange = Before | OnOrBefore | On | After | OnOrAfter | Between | NotBetween
export type CorrelatedCriteriaRange = All | Any | AtLeast | AtMost
export type OccurrenceTypeOptions = 0 | 1 | 2
export type OccurrenceCountOptions = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
export type TextOperationOptions = 'startsWith' | 'contains' | 'endsWith' | '!startsWith' | '!contains' | '!endsWith'
export type WindowDayOptions =
  | ''
  | '0'
  | '1'
  | '7'
  | '14'
  | '21'
  | '30'
  | '60'
  | '90'
  | '120'
  | '180'
  | '365'
  | '548'
  | '730'
  | '1095'
export type WindowCoeffOptions = -1 | 1
export type RestrictToTheSameVisitOccurrence = boolean
export type BaseCriteria =
  | AddConditionEra
  | AddConditionOccurrence
  | AddDeath
  | AddDeviceExposure
  | AddDoseEra
  | AddDrugEra
  | AddDrugExposure
  | AddLocationRegion
  | AddMeasurement
  | AddObservation
  | AddObservationPeriod
  | AddPayerPlanPeriod
  | AddProcedureOccurrence
  | AddSpecimen
  | AddVisit
export type CriteriaListType = {
  IgnoreObservationPeriod: boolean
  Occurrence: Occurrences
  Criteria: BaseCriteria
  StartWindow: StartWindowIs
  EndWindow?: AndEndWindowIs
  RestrictVisit?: RestrictToTheSameVisitOccurrence
}[]
export type DemographicCriteriaList = {
  Age?: NumericRange
  Gender?: ConceptCore[]
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
  Race?: ConceptCore[]
  Ethnicity?: ConceptCore[]
}[]
export type GroupsListOr = CorrelatedCriteriaRange[]
export type GroupsListAnd = CorrelatedCriteriaRange[]
export type CorrelatedCriteriaListType = BaseCriteria[]
// export type LimitInitialEventsTo = 'All' | 'First' | 'Last'
export type LimitInitialEventsTo = string
// export type EventLimitOptions = 'All' | 'First' | 'Last'
export type EventLimitOptions = string
export type InclusionCriteria = {
  name: string
  description?: string
  expression: CorrelatedCriteriaRange
  [k: string]: unknown
}[]
export type DayOptions = 0 | 1 | 7 | 14 | 21 | 30 | 60 | 90 | 120 | 180 | 365 | 548 | 730 | 1095
export type CohortExitEventPersistence =
  | EndOfContinuousObservation
  | AFixedDurationRelativeToInitialEvent
  | EndOfAContinuousDrugExposure
export type ConceptSetContainingTheDrugSOfInterest = AnyConcept | ConceptSetIndex
/**
 *  ...days between exposure records when inferring the era of persistence exposure.
 */
export type PersistenceWindowAllowForAMaximumOf =
  | 0
  | 1
  | 7
  | 14
  | 21
  | 30
  | 60
  | 90
  | 120
  | 180
  | 365
  | 548
  | 730
  | 1095
/**
 *  ...days to the end of the era of persistence exposure as an additional period of surveillance prior to cohort exit.
 */
export type SurveillanceWindowAdd = 0 | 1 | 7 | 14 | 21 | 30 | 60 | 90 | 120 | 180 | 365 | 548 | 730 | 1095
export type CohortExitCensoringEvents = BaseCriteria[]
export type CDMVersionRequired = string

export interface AtlasCohortDefinition {
  ConceptSets: ConceptSets
  PrimaryCriteria: CohortEntryEvents
  QualifiedLimit: QualifiedLimit
  InclusionRules: InclusionCriteria
  ExpressionLimit: InclusionCriteriaLimit
  CollapseSettings: CohortErasGapSize
  EndStrategy: CohortExitEventPersistence
  CensoringCriteria: CohortExitCensoringEvents
  CensorWindow: CohortErasCensoring
  cdmVersionRange: CDMVersionRequired
}
export interface ConceptItem {
  concept: ConceptCoreExtended
  isExcluded?: boolean
  includeDescendants?: boolean
  includeMapped?: boolean
}
export interface ConceptCoreExtended {
  CONCEPT_CODE: string
  CONCEPT_NAME: string
  DOMAIN_ID: string
  CONCEPT_ID: number
  VOCABULARY_ID: string
  // STANDARD_CONCEPT_CAPTION: 'Standard' | 'Classification' | 'Non-standard' | ''
  STANDARD_CONCEPT_CAPTION: string
  STANDARD_CONCEPT: string
  // INVALID_REASON_CAPTION: 'Valid' | 'Deleted' | 'Upgraded' | ''
  INVALID_REASON_CAPTION: string
  INVALID_REASON: string
  CONCEPT_CLASS_ID: string
}
export interface CohortEntryEvents {
  CriteriaList: CorrelatedCriteriaListType
  ObservationWindow: ObservationWindow
  PrimaryCriteriaLimit: ResultLimitOptions
}
export interface AddConditionEra {
  ConditionEra: ConditionEraProperty
}
export interface ConditionEraProperty {
  CodesetId: CodesetIdType
  First?: boolean
  AgeAtStart?: NumericRange
  AgeAtEnd?: NumericRange
  Gender?: ConceptCore[]
  EraStartDate?: DateRange
  EraEndDate?: DateRange
  OccurrenceCount?: NumericRange
  EraLength?: NumericRange
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface LessThan {
  Op: 'lt'
  Value: Value
  [k: string]: unknown
}
export interface LessOrEqualTo {
  Op: 'lte'
  Value: Value
  [k: string]: unknown
}
export interface EqualTo {
  Op: 'eq'
  Value: Value
  [k: string]: unknown
}
export interface GreaterThan {
  Op: 'gt'
  Value: Value
  [k: string]: unknown
}
export interface GreaterOrEqualTo {
  Op: 'gte'
  Value: Value
  [k: string]: unknown
}
export interface Between {
  Op: 'bt'
  Value: number
  Extent: number
  [k: string]: unknown
}
export interface NotBetween {
  Op: '!bt'
  Value: number
  Extent: number
  [k: string]: unknown
}
export interface ConceptCore {
  CONCEPT_CODE: string
  CONCEPT_NAME: string
  DOMAIN_ID: string
  CONCEPT_ID: number
  VOCABULARY_ID: string
}
export interface Before {
  Op: 'lt'
  Value: string
  [k: string]: unknown
}
export interface OnOrBefore {
  Op: 'lte'
  Value: string
  [k: string]: unknown
}
export interface On {
  Op: 'eq'
  Value: string
  [k: string]: unknown
}
export interface After {
  Op: 'gt'
  Value: string
  [k: string]: unknown
}
export interface OnOrAfter {
  Op: 'gte'
  Value: string
  [k: string]: unknown
}
export interface All {
  Type: 'ALL'
  CriteriaList: CriteriaListType
  DemographicCriteriaList: DemographicCriteriaList
  Groups: GroupsListAnd
}
export interface Occurrences {
  Type: OccurrenceTypeOptions
  Count: OccurrenceCountOptions
  IsDistinct: boolean
  [k: string]: unknown
}
export interface AddConditionOccurrence {
  ConditionOccurrence: ConditionOccurrenceProperty
}
export interface ConditionOccurrenceProperty {
  CodesetId: CodesetIdType
  First?: boolean
  Age?: NumericRange
  Gender?: ConceptCore[]
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
  ConditionTypeExclude?: boolean
  ConditionType?: ConceptCore[][]
  VisitType?: ConceptCore[]
  StopReason?: TextFilter
  ConditionSourceConcept?: CodesetIdType
  ProviderSpecialty?: ConceptCore[]
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface TextFilter {
  Op: TextOperationOptions
  Text: string
  [k: string]: unknown
}
export interface AddDeath {
  Death: DeathOccurrenceProperty
}
export interface DeathOccurrenceProperty {
  CodesetId: CodesetIdType
  Age?: NumericRange
  Gender?: ConceptCore[]
  OccurrenceStartDate?: DateRange
  DeathTypeExclude?: boolean
  DeathType?: ConceptCore[]
  DeathSourceConcept?: CodesetIdType
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface AddDeviceExposure {
  DeviceExposure: DeviceExposureProperty
}
export interface DeviceExposureProperty {
  CodesetId: CodesetIdType
  First?: boolean
  Age?: NumericRange
  Gender?: ConceptCore[]
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
  DeviceTypeExclude?: boolean
  DeviceType?: ConceptCore[]
  VisitType?: ConceptCore[]
  UniqueDeviceId?: TextFilter
  Quantity?: NumericRange
  DeviceSourceConcept?: CodesetIdType
  ProviderSpecialty?: ConceptCore[]
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface AddDoseEra {
  DoseEra: DoseEraProperty
}
export interface DoseEraProperty {
  CodesetId: CodesetIdType
  First?: boolean
  AgeAtStart?: NumericRange
  AgeAtEnd?: NumericRange
  Gender?: ConceptCore[]
  EraStartDate?: DateRange
  EraEndDate?: DateRange
  Unit?: ConceptCore[]
  EraLength?: NumericRange
  DoseValue?: NumericRange
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface AddDrugEra {
  DrugEra: DrugEraProperty
}
export interface DrugEraProperty {
  CodesetId: CodesetIdType
  First?: boolean
  AgeAtStart?: NumericRange
  AgeAtEnd?: NumericRange
  Gender?: ConceptCore[]
  EraStartDate?: DateRange
  EraEndDate?: DateRange
  EraLength?: NumericRange
  OccurrenceCount?: NumericRange
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface AddDrugExposure {
  DrugExposure: DrugExposureProperty
}
export interface DrugExposureProperty {
  CodesetId: CodesetIdType
  First?: boolean
  Age?: NumericRange
  Gender?: ConceptCore[]
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
  DrugTypeExclude?: boolean
  DrugType?: ConceptCore[]
  VisitType?: ConceptCore[]
  StopReason?: TextFilter
  Refills?: NumericRange
  Quantity?: NumericRange
  DaysSupply?: NumericRange
  RouteConcept?: ConceptCore[]
  EffectiveDrugDose?: NumericRange
  DoseUnit?: ConceptCore[]
  LotNumber?: TextFilter
  DrugSourceConcept?: CodesetIdType
  ProviderSpecialty?: ConceptCore[]
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface AddLocationRegion {
  LocationRegion: LocationRegionProperty
}
export interface LocationRegionProperty {
  CodesetId: CodesetIdType
  StartDate?: DateRange
  EndDate?: DateRange
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface AddMeasurement {
  Measurement: MeasurementProperty
}
export interface MeasurementProperty {
  CodesetId: CodesetIdType
  First?: boolean
  Age?: NumericRange
  Gender?: ConceptCore[]
  OccurrenceStartDate?: DateRange
  MeasurementTypeExclude?: boolean
  MeasurementType?: ConceptCore[]
  VisitType?: ConceptCore[]
  Operator?: ConceptCore[]
  ValueAsNumber?: NumericRange
  ValueAsConcept?: ConceptCore[]
  Unit?: ConceptCore[]
  Abnormal?: boolean
  RangeLow?: NumericRange
  RangeHigh?: NumericRange
  RangeLowRatio?: NumericRange
  RangeHighRatio?: NumericRange
  ProviderSpecialty?: ConceptCore[]
  MeasurementSourceConcept?: CodesetIdType
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface AddObservation {
  Observation: ObservationProperty
}
export interface ObservationProperty {
  CodesetId: CodesetIdType
  First?: boolean
  Age?: NumericRange
  Gender?: ConceptCore[]
  OccurrenceStartDate?: DateRange
  ObservationTypeExclude?: boolean
  ObservationType?: ConceptCore[]
  VisitType?: ConceptCore[]
  ValueAsNumber?: NumericRange
  ValueAsString?: TextFilter
  ValueAsConcept?: ConceptCore[]
  Qualifier?: ConceptCore[]
  Unit?: ConceptCore[]
  ObservationSourceConcept?: CodesetIdType
  ProviderSpecialty?: ConceptCore[]
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface AddObservationPeriod {
  ObservationPeriod: ObservationPeriodProperty
}
export interface ObservationPeriodProperty {
  First?: boolean
  AgeAtStart?: NumericRange
  UserDefinedPeriod?: DatePeriod
  AgeAtEnd?: NumericRange
  PeriodStartDate?: DateRange
  PeriodEndDate?: DateRange
  PeriodType?: ConceptCore[]
  PeriodLength?: NumericRange
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface DatePeriod {
  StartDate: string
  EndDate: string
  [k: string]: unknown
}
export interface AddPayerPlanPeriod {
  PayerPlanPeriod: PayerPlanPeriodProperty
}
export interface PayerPlanPeriodProperty {
  First?: boolean
  AgeAtStart?: NumericRange
  AgeAtEnd?: NumericRange
  PeriodLength?: NumericRange
  Gender?: ConceptCore[]
  UserDefinedPeriod?: DatePeriod
  PeriodStartDate?: DateRange
  PeriodEndDate?: DateRange
  PayerConcept?: CodesetIdType
  PlanConcept?: CodesetIdType
  SponsorConcept?: CodesetIdType
  StopReasonConcept?: CodesetIdType
  PayerSourceConcept?: CodesetIdType
  PlanSourceConcept?: CodesetIdType
  SponsorSourceConcept?: CodesetIdType
  StopReasonSourceConcept?: CodesetIdType
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface AddProcedureOccurrence {
  ProcedureOccurrence: ProcedureOccurrenceProperty
}
export interface ProcedureOccurrenceProperty {
  CodesetId: CodesetIdType
  First?: boolean
  Age?: NumericRange
  Gender?: ConceptCore[]
  OccurrenceStartDate?: DateRange
  ProcedureTypeExclude?: boolean
  ProcedureType?: ConceptCore[]
  VisitType?: ConceptCore[]
  Modifier?: ConceptCore[]
  Quantity?: NumericRange
  ProcedureSourceConcept?: CodesetIdType
  ProviderSpecialty?: ConceptCore[]
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface AddSpecimen {
  Specimen: SpecimenProperty
}
export interface SpecimenProperty {
  CodesetId: CodesetIdType
  First?: boolean
  Age?: NumericRange
  Gender?: ConceptCore[]
  OccurrenceStartDate?: DateRange
  SpecimenTypeExclude?: boolean
  SpecimenType?: ConceptCore[]
  Quantity?: NumericRange
  Unit?: ConceptCore[]
  AnatomicSite?: ConceptCore[]
  DiseaseStatus?: ConceptCore[]
  SourceId?: TextFilter
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface AddAnatomicSiteCode {
  CONCEPT_CODE: string
  CONCEPT_NAME: string
  DOMAIN_ID: string
  CONCEPT_ID: number
  VOCABULARY_ID: string
}
export interface AddVisit {
  VisitOccurrence: VisitOccurrenceProperty
}
export interface VisitOccurrenceProperty {
  CodesetId: CodesetIdType
  First?: boolean
  Age?: NumericRange
  Gender?: ConceptCore[]
  OccurrenceStartDate?: DateRange
  OccurrenceEndDate?: DateRange
  VisitTypeExclude?: boolean
  VisitType?: ConceptCore[]
  VisitLength?: NumericRange
  VisitSourceConcept?: CodesetIdType
  ProviderSpecialty?: ConceptCore[]
  PlaceOfService?: ConceptCore[]
  PlaceOfServiceLocation?: CodesetIdType
  CorrelatedCriteria?: CorrelatedCriteriaRange
}
export interface StartWindowIs {
  UseEventEnd: false | true
  Start: {
    Days: WindowDayOptions
    Coeff: WindowCoeffOptions
    [k: string]: unknown
  }
  End: {
    Days: WindowDayOptions
    Coeff: WindowCoeffOptions
    [k: string]: unknown
  }
  UseIndexEnd: true | false
  [k: string]: unknown
}
export interface AndEndWindowIs {
  UseEventEnd: false | true
  Start: {
    Days: WindowDayOptions
    Coeff: WindowCoeffOptions
    [k: string]: unknown
  }
  End: {
    Days: WindowDayOptions
    Coeff: WindowCoeffOptions
    [k: string]: unknown
  }
  UseIndexEnd: true | false
  [k: string]: unknown
}
export interface Any {
  Type: 'ANY'
  CriteriaList: CriteriaListType
  DemographicCriteriaList: DemographicCriteriaList
  Groups: GroupsListOr
}
export interface AtLeast {
  Type: 'AT_LEAST'
  Count: number
  CriteriaList: CriteriaListType
  DemographicCriteriaList: DemographicCriteriaList
  Groups: GroupsListOr
}
export interface AtMost {
  Type: 'AT_MOST'
  Count: number
  CriteriaList: CriteriaListType
  DemographicCriteriaList: DemographicCriteriaList
  Groups: GroupsListOr
}
export interface ObservationWindow {
  PriorDays: number
  PostDays: number
}
export interface ResultLimitOptions {
  Type: LimitInitialEventsTo
  [k: string]: unknown
}
export interface QualifiedLimit {
  Type?: EventLimitOptions
  [k: string]: unknown
}
export interface InclusionCriteriaLimit {
  Type?: EventLimitOptions
  [k: string]: unknown
}
export interface CohortErasGapSize {
  CollapseType: 'ERA'
  EraPad: DayOptions
  [k: string]: unknown
}
export interface EndOfContinuousObservation {}
export interface AFixedDurationRelativeToInitialEvent {
  DateOffset: DateOffsetStrategyType
}
export interface DateOffsetStrategyType {
  DateField: 'StartDate' | 'EndDate'
  Offset: DayOptions
  [k: string]: unknown
}
export interface EndOfAContinuousDrugExposure {
  CustomEra: CustomEra
}
/**
 * OK - The drug custom era strategy
 */
export interface CustomEra {
  drugCodesetId: ConceptSetContainingTheDrugSOfInterest
  GapDays: PersistenceWindowAllowForAMaximumOf
  Offset: SurveillanceWindowAdd
  [k: string]: unknown
}
export interface CohortErasCensoring {
  StartDate?: string
  EndDate?: string
  [k: string]: unknown
}













