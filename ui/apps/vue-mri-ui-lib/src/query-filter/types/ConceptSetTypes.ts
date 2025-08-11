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
}

export interface ConceptSetDetails {
  [conceptSetId: string]: ConceptDetail[]
}

export interface CreateConceptSetRequest {
  concepts: Array<{
    id: number
    useDescendants: boolean
    useMapped: boolean
    isExcluded: boolean
  }>
  name: string
  shared: boolean
  userName: string
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
