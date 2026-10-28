/**
 * TypeScript interfaces for concept set functionality
 */

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

// WebAPI interface for d2e-webapi endpoints (matching portal's format)
export interface IWebapiConceptSet {
  id: string
  name: string
  createdDate?: string
  modifiedDate?: string
  createdBy?: string
  modifiedBy?: string
  shared?: boolean
  userName?: string
}
