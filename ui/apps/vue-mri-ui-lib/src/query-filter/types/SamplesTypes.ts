type AgeMode =
  | 'between'
  | 'notBetween'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'equalTo'
  | 'greaterThan'
  | 'greaterThanOrEqual'

export interface AgeFilter {
  min?: number
  max?: number
  value?: number
  mode: AgeMode
}

export interface GenderFilter {
  conceptIds: number[]
  otherNonBinary: boolean
}

export interface SampleElement {
  rank: number
  personId: string
  genderConceptId: number
  age: number
}

export interface Sample {
  id: number
  name: string
  size: number
  createdDate: number
  cohortDefinitionId: number
  sourceId: number
  age?: AgeFilter
  gender: GenderFilter
  elements?: SampleElement[]
}

export interface FetchSamplesResponse {
  cohortDefinitionId: number
  sourceId: number
  generationStatus: 'COMPLETE' | 'PENDING' | 'FAILED' | string
  samples: Sample[]
  valid: boolean
}

export interface CreateSampleDTO {
  name: string
  size: number
  age: AgeFilter | null
  gender: GenderFilter
}
