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

export interface QueryFilterNestedCriteria {
  id: string
  criteriaType: CriteriaType
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
}

export type QueryFilterAttribute =
  | (
      | {
          id: string
          attributeType: 'nested'
          nestedCriteria: QueryFilterNestedCriteria
        }
      | {
          id: string
          attributeId: string
          attributeType: 'numericRange'
          operator: string
          value: string
        }
      | {
          id: string
          attributeId: string
          attributeType: 'conceptSet'
          conceptSet?: ConceptSetItemDisplay
          conceptSetId?: string
          conceptItems?: StoredConceptItem[]
        }
      | {
          id: string
          attributeId: string
          attributeType: 'standard'
          configType?: string // Original type from config (concept, conceptSet, etc.)
          domainFilter?: string // Domain filter from config
          operator?: string
          value?: string
          conceptItems?: StoredConceptItem[]
        }
    ) & {
      name?: string
      title?: string
    }

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
  entryEvents?: EntryEvent
  inclusionCriteria?: InclusionCriteria
  exitEvents?: ExitEvent
}
