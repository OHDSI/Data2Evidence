/**
 * Utility functions for converting between Atlas cohort definitions and QueryFilter UI models
 */
import { QueryFilterCardModel, QueryFilterEvent } from '../models/QueryFilterModel'

export interface ConceptSetItem {
  value: string
  text?: string
  display_value?: string
}

export interface ConceptSetMapping {
  name: string
  id: string
  conceptSetItem: ConceptSetItem | null
}

export const convertAtlasToFilters = (
  atlasJson: any,
  availableConceptSets: ConceptSetItem[] = []
): QueryFilterCardModel[] => {
  const filters: QueryFilterCardModel[] = []

  if (!atlasJson) {
    return filters
  }

  let cohortDefinition = atlasJson
  let cohortName = atlasJson.name

  if (atlasJson.expression && atlasJson.expressionType) {
    cohortDefinition = JSON.parse(atlasJson.expression)
    cohortName = atlasJson.name || cohortDefinition.name
  }

  const findConceptSetByCodesetId = (codesetId: number): ConceptSetMapping => {
    const atlasConceptSet = cohortDefinition.ConceptSets?.find((cs: any) => cs.id === codesetId)

    if (atlasConceptSet) {
      const actualConceptSetId = atlasConceptSet.conceptSetId || atlasConceptSet.id
      const localConceptSet = availableConceptSets.find(cs => cs.value == actualConceptSetId.toString())

      if (localConceptSet) {
        return {
          name: localConceptSet.text || localConceptSet.display_value || atlasConceptSet.name,
          id: actualConceptSetId.toString(),
          conceptSetItem: localConceptSet,
        }
      }

      const conceptSetItem: ConceptSetItem = {
        value: actualConceptSetId.toString(),
        text: atlasConceptSet.name,
        display_value: atlasConceptSet.name,
      }

      return {
        name: atlasConceptSet.name,
        id: actualConceptSetId.toString(),
        conceptSetItem: conceptSetItem,
      }
    }

    return {
      name: `Concept Set ${codesetId}`,
      id: codesetId.toString(),
      conceptSetItem: null,
    }
  }

  const getCriteriaType = (criteria: any): string => {
    if (criteria.ConditionOccurrence) return 'conditionOccurrence'
    if (criteria.DrugExposure) return 'drugExposure'
    if (criteria.ProcedureOccurrence) return 'procedureOccurrence'
    if (criteria.Observation) return 'observation'
    if (criteria.Measurement) return 'measurement'
    if (criteria.VisitOccurrence) return 'visitOccurrence'
    if (criteria.DeviceExposure) return 'deviceExposure'
    if (criteria.Death) return 'death'
    if (criteria.ObservationPeriod) return 'observationPeriod'
    return 'conditionOccurrence'
  }

  const getCriteriaObject = (criteria: any): any => {
    if (criteria.ConditionOccurrence) return criteria.ConditionOccurrence
    if (criteria.DrugExposure) return criteria.DrugExposure
    if (criteria.ProcedureOccurrence) return criteria.ProcedureOccurrence
    if (criteria.Observation) return criteria.Observation
    if (criteria.Measurement) return criteria.Measurement
    if (criteria.VisitOccurrence) return criteria.VisitOccurrence
    if (criteria.DeviceExposure) return criteria.DeviceExposure
    if (criteria.Death) return criteria.Death
    if (criteria.ObservationPeriod) return criteria.ObservationPeriod
    return {}
  }

  const convertCriteriaListToEvents = (criteriaList: any[]): QueryFilterEvent[] => {
    if (!criteriaList || criteriaList.length === 0) {
      return []
    }

    return criteriaList.map(criteriaItem => {
      const criteria = criteriaItem.Criteria || criteriaItem
      const criteriaType = getCriteriaType(criteria)
      const criteriaObj = getCriteriaObject(criteria)
      const conceptSetId = criteriaObj.CodesetId

      const conceptSetInfo = conceptSetId !== undefined ? findConceptSetByCodesetId(conceptSetId) : null

      const event: QueryFilterEvent = {
        id: `event_${Date.now()}}`,
        conceptSet:
          conceptSetInfo?.name || (conceptSetId !== undefined ? `Concept Set ${conceptSetId}` : 'No Concept Set'),
        conceptSetId: conceptSetInfo?.id,
        criteriaType,
        selectedConceptSet: conceptSetInfo?.conceptSetItem || undefined,
      }

      if (conceptSetId !== undefined) {
        const atlasConceptSet = cohortDefinition.ConceptSets?.find((cs: any) => cs.id === conceptSetId)
        if (atlasConceptSet?.expression?.items) {
          event.conceptSetDetails = atlasConceptSet.expression.items
          event.conceptSetLoading = false
        }
      }

      return event
    })
  }

  if (cohortDefinition.InclusionRules && Array.isArray(cohortDefinition.InclusionRules)) {
    cohortDefinition.InclusionRules.forEach((rule: any) => {
      if (rule.expression?.CriteriaList?.length > 0) {
        rule.expression.CriteriaList.forEach((criteriaItem: any) => {
          const events = convertCriteriaListToEvents([criteriaItem])

          const inclusionFilter = new QueryFilterCardModel({
            title: rule.name || 'Inclusion Rule',
            type: 'inclusion',
            events,
          })
          filters.push(inclusionFilter)
        })
      }
    })
  }

  if (cohortDefinition.ExclusionRules && Array.isArray(cohortDefinition.ExclusionRules)) {
    cohortDefinition.ExclusionRules.forEach((rule: any) => {
      if (rule.expression?.CriteriaList?.length > 0) {
        rule.expression.CriteriaList.forEach((criteriaItem: any) => {
          const events = convertCriteriaListToEvents([criteriaItem])

          const exclusionFilter = new QueryFilterCardModel({
            title: rule.name || 'Exclusion Rule',
            type: 'exclusion',
            events,
          })
          filters.push(exclusionFilter)
        })
      }
    })
  }

  return filters
}

export const getConceptSetMappings = (
  atlasJson: any,
  availableConceptSets: ConceptSetItem[] = []
): ConceptSetMapping[] => {
  const mappings: ConceptSetMapping[] = []

  if (!atlasJson) return mappings

  const cohortDefinition = atlasJson.expression || atlasJson
  const conceptSetIds = new Set<number>()
  const extractConceptSetIds = (rules: any[]) => {
    rules?.forEach((rule: any) => {
      rule.expression?.CriteriaList?.forEach((criteriaItem: any) => {
        const criteria = criteriaItem.Criteria || criteriaItem
        const criteriaObj =
          criteria.ConditionOccurrence ||
          criteria.DrugExposure ||
          criteria.ProcedureOccurrence ||
          criteria.Observation ||
          criteria.Measurement ||
          criteria.VisitOccurrence ||
          criteria.DeviceExposure ||
          criteria.Death ||
          criteria.ObservationPeriod ||
          {}
        if (criteriaObj.CodesetId !== undefined) {
          conceptSetIds.add(criteriaObj.CodesetId)
        }
      })
    })
  }

  extractConceptSetIds(cohortDefinition.InclusionRules)
  extractConceptSetIds(cohortDefinition.ExclusionRules)

  conceptSetIds.forEach(codesetId => {
    const atlasConceptSet = cohortDefinition.ConceptSets?.find((cs: any) => cs.id === codesetId)
    if (atlasConceptSet) {
      const actualConceptSetId = atlasConceptSet.conceptSetId || atlasConceptSet.id
      const localConceptSet = availableConceptSets.find(cs => cs.value == actualConceptSetId.toString())

      if (localConceptSet) {
        mappings.push({
          name: localConceptSet.text || localConceptSet.display_value || atlasConceptSet.name,
          id: actualConceptSetId.toString(),
          conceptSetItem: localConceptSet,
        })
      } else {
        // Create mapping even if not found locally
        mappings.push({
          name: atlasConceptSet.name,
          id: actualConceptSetId.toString(),
          conceptSetItem: {
            value: actualConceptSetId.toString(),
            text: atlasConceptSet.name,
            display_value: atlasConceptSet.name,
          },
        })
      }
    }
  })

  return mappings
}
