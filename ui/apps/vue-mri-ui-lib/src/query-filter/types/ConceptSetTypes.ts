/**
 * TypeScript interfaces for concept set functionality
 */

export interface ConceptSetItem {
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
  CONCEPT_ID?: number
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

export interface ConceptSetDomainValues {
  values: ConceptSetItem[]
  isLoading: boolean
  loadedStatus: 'NO_RESULTS' | 'HAS_RESULTS' | 'TOO_MANY_RESULTS'
}

export interface TagInputModel {
  id: string
  props: {
    type: string
    value: ConceptSetItem[]
    attributePath: string
    domainFilter: string
    standardConceptCodeFilter: string
  }
}

export interface ConceptSetAction {
  values?: ConceptSetItem
  config?: any
}

export interface ConceptSetDetails {
  [conceptSetId: string]: any[]
}