import _ from 'lodash'
import { ExtCohortConcept } from './types'
import { api } from './api'

function upperCaseKeys(obj: ExtCohortConcept): ExtCohortConcept {
  const result = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const upperKey = key.toUpperCase() as keyof ExtCohortConcept // Convert the key to uppercase
      result[upperKey as keyof ExtCohortConcept] = obj[key as keyof ExtCohortConcept]
    }
  }
  return result as ExtCohortConcept
}

export const getConceptByName = async ({
  conceptName,
  datasetId,
}: {
  conceptName: string
  datasetId: string
}): Promise<ExtCohortConcept | null> => {
  const concept = await api.terminology.getConceptByName(conceptName, datasetId)
  return concept[0] ? upperCaseKeys(concept[0]) : null
}

export const getConceptById = async ({
  conceptId,
  datasetId,
}: {
  conceptId: number
  datasetId: string
}): Promise<ExtCohortConcept | null> => {
  const concept = await api.terminology.getConceptById(conceptId, datasetId)
  return concept[0] ? upperCaseKeys(concept[0]) : null
}

export const getConceptByCode = async ({
  conceptCode,
  datasetId,
}: {
  conceptCode: string
  datasetId: string
}): Promise<ExtCohortConcept | null> => {
  const concept = await api.terminology.getConceptByCode(conceptCode, datasetId)
  return concept[0] ? upperCaseKeys(concept[0]) : null
}

export const getConceptsFromConceptSet = async ({
  conceptSetId,
  datasetId,
}: {
  conceptSetId: string
  datasetId: string
}): Promise<ExtCohortConcept[] | null> => {
  const { concepts } = await api.terminology.getConceptsFromConceptSet(conceptSetId, datasetId)
  return concepts.length
    ? concepts
        .map(concept => upperCaseKeys(concept))
        .map(concept => {
          return {
            CONCEPT_ID: concept.CONCEPTID,
            CONCEPT_NAME: concept.DISPLAY,
            DOMAIN_ID: concept.DOMAINID,
            VOCABULARY_ID: concept.SYSTEM,
            CONCEPT_CLASS_ID: concept.CONCEPTCLASSID,
            STANDARD_CONCEPT: concept.STANDARDCONCEPT,
            CONCEPT_CODE: concept.CODE,
            VALID_START_DATE: concept.VALIDSTARTDATE,
            VALID_END_DATE: concept.VALIDENDDATE,
            INVALID_REASON: concept.VALIDITY,
            USEMAPPED: concept.USEMAPPED,
            USEDESCENDANTS: concept.USEDESCENDANTS,
          }
        })
    : null
}

