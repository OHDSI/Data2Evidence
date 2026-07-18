import _ from 'lodash'
import { ExtCohortConcept } from './types'
import { api } from './api'
import { formatConceptSetRef, parseConceptSetRef } from '@/query-filter/utils/conceptSetRef'

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
  const ref = parseConceptSetRef(conceptSetId)

  if (ref.source === 'webapi') {
    const concepts = await api.d2eWebapi.getIncludedConcepts([formatConceptSetRef(ref)], datasetId)

    return concepts.length
      ? concepts.map((concept: any) => ({
          CONCEPT_ID: concept.CONCEPT_ID,
          CONCEPT_NAME: concept.CONCEPT_NAME,
          DOMAIN_ID: concept.DOMAIN_ID,
          VOCABULARY_ID: concept.VOCABULARY_ID,
          CONCEPT_CLASS_ID: concept.CONCEPT_CLASS_ID,
          STANDARD_CONCEPT: concept.STANDARD_CONCEPT,
          CONCEPT_CODE: concept.CONCEPT_CODE,
          VALID_START_DATE: concept.VALID_START_DATE,
          VALID_END_DATE: concept.VALID_END_DATE,
          INVALID_REASON: concept.INVALID_REASON,
          USEMAPPED: concept.USEMAPPED,
          USEDESCENDANTS: concept.USEDESCENDANTS,
        }))
      : null
  }

  const { concepts } = await api.terminology.getConceptsFromConceptSet(ref.externalId, datasetId)
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

