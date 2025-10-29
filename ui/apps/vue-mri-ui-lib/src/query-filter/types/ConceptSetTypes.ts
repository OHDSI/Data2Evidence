/**
 * TypeScript interfaces for concept set functionality
 */

export interface IWebapiSourceDaimon {
  sourceDaimonId: number
  daimonType: string
  tableQualifier: string
  priority: number
}

export interface IWebapiSource {
  sourceId: number
  sourceName: string
  sourceDialect: string
  sourceKey: string
  daimons: IWebapiSourceDaimon[]
}

export interface CohortGenerationInfo {
  id: {
    cohortDefinitionId: number
    sourceId: number
  }
  startTime: number
  executionDuration: number
  status: string
  isValid: boolean
  isCanceled: boolean
  failMessage: string | null
  personCount: number
  recordCount: number
  createdBy: string | null
  ccGenerateId: number
  isDemographic: boolean
}

export interface CohortInfoResponse extends Array<CohortGenerationInfo> {}

export interface NotificationJobInstance {
  instanceId: number
  name: string
}

export interface NotificationJobParameters {
  jobName: string
  jobAuthor: string
  cohort_definition_id: string
  source_id: string
}

export interface Notification {
  status: 'STARTED' | 'COMPLETED' | string // Using string union for known values, but allowing others
  startDate: number
  endDate: number | null
  exitStatus: string
  executionId: number
  jobInstance: NotificationJobInstance
  jobParameters: NotificationJobParameters
  ownerType: string
}

export type NotificationsResponse = Notification[]
export interface Summary {
  baseCount: number
  finalCount: number
  lostCount: number
  percentMatched: string
}

export interface InclusionRuleStat {
  id: number
  name: string
  percentExcluded: string
  percentSatisfying: string
  countSatisfying: number
}

export interface TreemapNode {
  name: string
  size?: number
  children?: TreemapNode[]
}

export interface InclusionReportResponse {
  summary: Summary
  inclusionRuleStats: InclusionRuleStat[]
  treemapData: string // JSON string
}

export interface ConceptSetItemDisplay {
  value: string
  text?: string
  display_value?: string
  conceptIds?: number[]
  concepts?: ConceptItem[]
  items?: ConceptItem[]
}

export interface ConceptItem {
  id?: number
  concept_id?: number
  useMapped?: boolean
  isExcluded?: boolean
  useDescendants?: boolean
}

export interface ConceptDetail {
  concept_class_id: string
  concept_code: string
  concept_id: number
  concept_name: string
  domain_id: string
  invalid_reason?: string
  standard_concept: string
  vocabulary_id: string
  valid_start_date?: string
  valid_end_date?: string
}

export interface ApiConfig {
  configId: string
  configVersion: string
  datasetId: string
}

export interface ConceptSetConfig {
  domainFilter?: string
  standardConceptCodeFilter?: string
  selectedDatasetId?: string | null
}

export interface ConceptSetDomainValues {
  values: ConceptSetItemDisplay[]
  isLoading: boolean
  loadedStatus: 'NO_RESULTS' | 'HAS_RESULTS' | 'TOO_MANY_RESULTS'
}

export interface TagInputModel {
  id: string
  props: {
    type: string
    value: ConceptSetItemDisplay[]
    attributePath: string
    domainFilter: string
    standardConceptCodeFilter: string
  }
}

export interface ConceptSetAction {
  values?: ConceptSetItemDisplay
  config?: ConceptSetConfig
  componentType?: string // Type to determine modal mode (concept vs conceptSet)
  attributeId?: string // ID of the attribute that triggered this action
  eventId?: string // ID of the event that contains the attribute
  parentAttributeId?: string // ID of the parent nested attribute (for nested events)
  action?: string // Action type (e.g., 'remove' for concept removal)
  removedItem?: {
    code: string
    conceptClassId: string
    conceptId: number
    conceptName: string
    display_value: string
    domainId: string
    standardConcept: string
    system: string
    text: string
    validEndDate?: string
    validStartDate?: string
    validity?: string
    value: string
  } // The item that was removed (for remove actions)
}
export interface ConceptSetDetails {
  [conceptSetId: string]: ConceptDetail[]
}

export interface CreateConceptSetRequest {
  id: 0
  name: string
  description?: string | null
  expression: {
    items: Array<{
      concept: {
        CONCEPT_CLASS_ID: string
        CONCEPT_CODE: string
        CONCEPT_ID: number
        CONCEPT_NAME: string
        DOMAIN_ID: string
        INVALID_REASON: string
        INVALID_REASON_CAPTION: string
        STANDARD_CONCEPT: string
        STANDARD_CONCEPT_CAPTION: string
        VOCABULARY_ID: string
        VALID_START_DATE?: string
        VALID_END_DATE?: string
      }
      isExcluded: boolean
      includeDescendants: boolean
      includeMapped: boolean
    }>
  }
}

// Types moved from QueryFilterModel.ts
export interface StoredConceptItem {
  value: string
  text: string
  display_value: string
  conceptId: number
  domainId?: string | undefined
  system?: string | undefined
  conceptClassId?: string | undefined
  standardConcept?: string | undefined
  standardConceptCaption?: string | undefined // For round-trip with Atlas
  invalidReason?: string | undefined
  invalidReasonCaption?: string | undefined // For round-trip with Atlas
  concept?: string | undefined
  code?: string | undefined
  validStartDate?: string | undefined
  validEndDate?: string | undefined
  validity?: string | undefined
  useDescendants?: boolean | undefined
  useMapped?: boolean | undefined
  isExcluded?: boolean | undefined
  score?: number | undefined
  conceptName?: string | undefined
}

export interface ConceptSetDetailConcept {
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

export interface ConceptSetDetail {
  concept: ConceptSetDetailConcept
  isExcluded: boolean
  includeDescendants: boolean
  includeMapped: boolean
}

export interface SelectedConceptSetConcept {
  id: number
  useMapped: boolean
  isExcluded: boolean
  useDescendants: boolean
}

export interface SelectedConceptSet {
  value: number
  text: string
  display_value: string
  conceptIds: number[]
  concepts: SelectedConceptSetConcept[]
  shared: boolean
  userName: string
  createdDate: string
  modifiedDate: string
}

export interface GetConceptSetsResponse {
  id: number
  name: string
  value: number
  text: string
  display_value: string
  conceptIds: number[]
  concepts: SelectedConceptSetConcept[]
  shared: boolean
  userName: string
  createdDate: string
  modifiedDate: string
}

// Interface for concept selection from terminology modal (matches portal's FhirValueSetExpansionContainsWithExt)
export interface SelectedConcept {
  conceptId: number
  display: string
  domainId: string
  system?: string | undefined
  conceptClassId?: string | undefined
  standardConcept?: string | undefined
  concept?: string | undefined
  code?: string | undefined
  validStartDate?: string | undefined
  validEndDate?: string | undefined
  validity?: string | undefined
  useDescendants?: boolean | undefined
  useMapped?: boolean | undefined
  isExcluded?: boolean | undefined
  score?: number | undefined
  // Backward compatibility field (our custom addition)
  conceptName?: string | undefined
}

// Interfaces for concept set expression API response
export interface ConceptSetExpressionConcept {
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
  VALID_START_DATE: number
  VALID_END_DATE: number
}

export interface ConceptSetExpressionItem {
  concept: ConceptSetExpressionConcept
  isExcluded: boolean
  includeDescendants: boolean
  includeMapped: boolean
}

export interface ConceptSetExpression {
  items: ConceptSetExpressionItem[]
}

// WebAPI interface for d2e-webapi endpoints (matching portal's format)
export interface IWebapiConceptSet {
  id: number
  name: string
  createdDate?: string
  modifiedDate?: string
  createdBy?: string
  modifiedBy?: string
  shared?: boolean
  userName?: string
}

