/**
 * Core types for the query filter system
 */
import type { StoredConceptItem, ConceptSetDetail, SelectedConceptSet, ConceptSetItemDisplay } from './ConceptSetTypes'

export type CriteriaType = 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'

export interface QueryFilterCardinality {
  type: 'AT_LEAST' | 'EXACTLY' | 'AT_MOST'
  count: number
  using: 'ALL' | 'DISTINCT_CONCEPT' | 'DISTINCT_START_DATE' | 'DISTINCT_VISIT'
}

export interface AttributeConfig {
  id: string
  name: string
  description: string
  type: string
  category: string
  operator?: string | undefined
  value?: number | undefined
}

export interface WindowEndpoint {
  days: number | null // null = "all", number = specific days
  coeff: -1 | 1 // -1 = Before, 1 = After
}

export interface WindowDefinition {
  start: WindowEndpoint
  end: WindowEndpoint
  useIndexEnd: boolean // false = "index start date", true = "index end date"
  useEventEnd: boolean // false = "event starts", true = "event ends"
}

export interface QueryFilterNestedCriteria {
  id: string
  criteriaType: CriteriaType
  criteriaCount?: number
  events: QueryFilterEvent[]
}

export interface QueryFilterEvent {
  id: string
  conceptSet: string
  conceptSetId?: string | undefined
  isEditing?: boolean
  criteriaType?: CriteriaType
  selectedAttributes?: string[] | undefined
  isDemographic?: boolean
  parentEventId?: string | undefined
  attributeConfig?: AttributeConfig
  selectedConceptSet?: SelectedConceptSet | undefined
  conceptSetDetails?: ConceptSetDetail[] | undefined
  conceptSetLoading?: boolean | undefined
  cardinality?: QueryFilterCardinality | undefined
  isExpanded?: boolean | undefined
  attributes?: QueryFilterAttribute[] | undefined
  eventType?: string | undefined
  nestedCriteria?: QueryFilterNestedCriteria | undefined

  // Temporal relationship fields (NOT attributes - core event properties)
  startWindow?: WindowDefinition
  endWindow?: WindowDefinition
  restrictVisit?: boolean
  ignoreObservationPeriod?: boolean
}

// Base type for common fields in standard attributes
type StandardAttributeBase = {
  id: string
  attributeId: string
  attributeType: 'standard'
  name?: string
  title?: string
}

export type QueryFilterAttributeNested = {
  id: string
  attributeId: string
  attributeType: 'nested'
  nestedCriteria: QueryFilterNestedCriteria
}
export type QueryFilterAttributeNumericRange = StandardAttributeBase & {
  configType: 'numericRange'
  operator?: string // Internal format like 'GREATER_THAN', 'LESS_THAN', etc.
  value?: string // Always string - numeric value as string
  extent?: string // For BETWEEN/NOT_BETWEEN ranges
  description?: string
}
export type QueryFilterAttributeConceptSet = StandardAttributeBase & {
  configType: 'conceptSet'
  conceptSet?: ConceptSetItemDisplay
  conceptSetId?: string
  conceptItems?: StoredConceptItem[]
  description?: string
}
export type QueryFilterAttributeConcept = StandardAttributeBase & {
  configType: 'concept'
  domainFilter?: string
  conceptItems?: StoredConceptItem[]
  description?: string
}
export type QueryFilterAttributeDateRange = StandardAttributeBase & {
  configType: 'dateRange'
  operator?: string // Internal format like 'GREATER_THAN', 'LESS_THAN', etc.
  value?: string // Always string - ISO date string
  extent?: string // For BETWEEN/NOT_BETWEEN ranges
  description?: string
}
export type QueryFilterAttributeDateAdjustment = StandardAttributeBase & {
  configType: 'dateAdjustment'
  startWith?: 'START_DATE' | 'END_DATE'
  startOffset?: number
  endWith?: 'START_DATE' | 'END_DATE'
  endOffset?: number
  description?: string
}
export type QueryFilterAttributeBoolean = StandardAttributeBase & {
  configType: 'boolean'
  value?: boolean
  description?: string
}
export type QueryFilterAttributeText = StandardAttributeBase & {
  configType: 'text'
  value?: string
  description?: string
}
export type QueryFilterAttribute =
  | QueryFilterAttributeNested
  | QueryFilterAttributeNumericRange
  | QueryFilterAttributeConceptSet
  | QueryFilterAttributeConcept
  | QueryFilterAttributeDateRange
  | QueryFilterAttributeDateAdjustment
  | QueryFilterAttributeBoolean
  | QueryFilterAttributeText
  | (StandardAttributeBase & {
      configType?: string // For other config types not explicitly defined
      description?: string
      value?: string | boolean
    })

export interface QueryFilterGroup {
  id: string
  title: string
  description: string
  criteriaType: CriteriaType
  criteriaCount?: number
  events: QueryFilterEvent[]
}

export interface QueryFilterCriteria {
  id: string
  criteria: QueryFilterGroup[]
}

export interface EntryEvent {
  primaryCriteriaLimit: 'ALL' | 'EARLIEST' | 'LATEST'
  qualifiedLimit?: 'ALL' | 'EARLIEST' | 'LATEST' // Store QualifiedLimit from Atlas import for round-trip
  events: QueryFilterEvent[]
  priorDays: number
  postDays: number
}

export interface ExitEvent {
  endStrategy: 'CONT_OBS' | 'FIXED' | 'CONT_DRUG'
  censoringCriteria: QueryFilterEvent[]
  fixedDuration?: {
    dateField: 'StartDate' | 'EndDate'
    offset: number
  }
  contDrugSettings?: {
    conceptSetId: string
    conceptSetName?: string
    conceptSetDetails?: ConceptSetDetail[]
    gapDays: number
    offset: number
    daysSupplyOverride: number
  }
}

export interface InclusionCriteria {
  qualifyingEventsLimit: 'ALL' | 'EARLIEST' | 'LATEST'
  criteria: QueryFilterGroup[]
}

// We use plural as the events array is inside each type
export interface QueryFilterCriteriaManageData {
  cdmVersionRange?: string
  entryEvents?: EntryEvent
  inclusionCriteria?: InclusionCriteria
  exitEvents?: ExitEvent
}

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

