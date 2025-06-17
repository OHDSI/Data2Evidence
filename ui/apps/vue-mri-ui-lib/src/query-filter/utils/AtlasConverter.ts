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

/**
 * Converts Atlas cohort definition JSON to QueryFilter UI models
 * @param atlasJson - Atlas cohort definition JSON
 * @param availableConceptSets - Array of concept sets loaded from API
 * @returns Array of QueryFilterCardModel instances
 */
export const convertAtlasToFilters = (
  atlasJson: any,
  availableConceptSets: ConceptSetItem[] = []
): QueryFilterCardModel[] => {
  const filters: QueryFilterCardModel[] = []

  // Handle null or undefined input
  if (!atlasJson) {
    console.log('Atlas JSON is null or undefined')
    return filters
  }

  // Handle wrapper structure - if there's an 'expression' property, use it
  let cohortDefinition = atlasJson
  let cohortName = atlasJson.name

  if (atlasJson.expression && atlasJson.expressionType) {
    console.log('Detected Atlas wrapper structure, extracting expression')
    cohortDefinition = JSON.parse(atlasJson.expression)
    cohortName = atlasJson.name || cohortDefinition.name
  }

  console.log('Converting Atlas cohort:', cohortName, {
    primaryCriteria: cohortDefinition.PrimaryCriteria?.CriteriaList?.length || 0,
    inclusionRules: cohortDefinition.InclusionRules?.length || 0,
    exclusionRules: cohortDefinition.ExclusionRules?.length || 0,
  })

  // Helper function to find concept set by CodesetId (which maps to Atlas ConceptSets[].id)
  const findConceptSetByCodesetId = (codesetId: number): ConceptSetMapping => {
    // Find the Atlas concept set where id matches the CodesetId
    const atlasConceptSet = cohortDefinition.ConceptSets?.find((cs: any) => cs.id === codesetId)

    if (atlasConceptSet) {
      // Use the conceptSetId field to look up in available concept sets
      const actualConceptSetId = atlasConceptSet.conceptSetId || atlasConceptSet.id
      const localConceptSet = availableConceptSets.find(cs => cs.value == actualConceptSetId.toString())

      if (localConceptSet) {
        return {
          name: localConceptSet.text || localConceptSet.display_value || atlasConceptSet.name,
          id: actualConceptSetId.toString(),
          conceptSetItem: localConceptSet,
        }
      }

      // Create a concept set item from Atlas data if not found in available sets
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

    // Fallback if concept set not found
    return {
      name: `Concept Set ${codesetId}`,
      id: codesetId.toString(),
      conceptSetItem: null,
    }
  }

  // Helper function to get criteria type from Atlas criteria
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
    return 'conditionOccurrence' // default
  }

  // Helper function to get criteria object from Atlas criteria
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

  // Helper function to convert criteria list to events
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
        id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        conceptSet:
          conceptSetInfo?.name || (conceptSetId !== undefined ? `Concept Set ${conceptSetId}` : 'No Concept Set'),
        conceptSetId: conceptSetInfo?.id,
        chips: [],
        criteriaType,
        operator: 'OR',
        selectedConceptSet: conceptSetInfo?.conceptSetItem || undefined,
      }

      // Add concept set details from Atlas JSON if available
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

  // TODO: Handle PrimaryCriteria when UI support is added
  // PrimaryCriteria defines the initial qualifying events for the cohort
  // For now, we skip this as it's not yet implemented in the UI
  if (cohortDefinition.PrimaryCriteria?.CriteriaList?.length > 0) {
    console.log(
      `Skipping PrimaryCriteria with ${cohortDefinition.PrimaryCriteria.CriteriaList.length} criteria (not yet supported in UI)`
    )
  }

  // Handle InclusionRules
  if (cohortDefinition.InclusionRules && Array.isArray(cohortDefinition.InclusionRules)) {
    cohortDefinition.InclusionRules.forEach((rule: any) => {
      if (rule.expression?.CriteriaList?.length > 0) {
        const events = convertCriteriaListToEvents(rule.expression.CriteriaList)

        const inclusionFilter = new QueryFilterCardModel({
          title: rule.name || 'Inclusion Rule',
          type: 'inclusion',
          events,
        })
        filters.push(inclusionFilter)
      }
    })
  }

  // Handle ExclusionRules
  if (cohortDefinition.ExclusionRules && Array.isArray(cohortDefinition.ExclusionRules)) {
    cohortDefinition.ExclusionRules.forEach((rule: any) => {
      if (rule.expression?.CriteriaList?.length > 0) {
        const exclusionFilter = new QueryFilterCardModel({
          title: rule.name || 'Exclusion Rule',
          type: 'exclusion',
          events: convertCriteriaListToEvents(rule.expression.CriteriaList),
        })
        filters.push(exclusionFilter)
      }
    })
  }

  console.log(
    `Generated ${filters.length} filters from Atlas cohort:`,
    filters.map(f => f.title)
  )

  return filters
}

/**
 * Helper function to get concept set mappings for later detail loading
 * @param atlasJson - Atlas cohort definition JSON
 * @param availableConceptSets - Array of concept sets loaded from API
 * @returns Array of concept set mappings that need detail loading
 */
export const getConceptSetMappings = (
  atlasJson: any,
  availableConceptSets: ConceptSetItem[] = []
): ConceptSetMapping[] => {
  const mappings: ConceptSetMapping[] = []

  if (!atlasJson) return mappings

  // Handle wrapper structure - if there's an 'expression' property, use it
  const cohortDefinition = atlasJson.expression || atlasJson

  // Extract all concept set IDs used in the Atlas definition
  const conceptSetIds = new Set<number>()

  // TODO: Include PrimaryCriteria concept sets when UI support is added
  // For now, we skip extracting concept sets from PrimaryCriteria
  // cohortDefinition.PrimaryCriteria?.CriteriaList?.forEach((criteria: any) => {
  //   const criteriaObj = getCriteriaObject(criteria) || {}
  //   if (criteriaObj.CodesetId !== undefined) {
  //     conceptSetIds.add(criteriaObj.CodesetId)
  //   }
  // })

  // From InclusionRules
  cohortDefinition.InclusionRules?.forEach((rule: any) => {
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

  // From ExclusionRules
  cohortDefinition.ExclusionRules?.forEach((rule: any) => {
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

  // Create mappings for each concept set ID (CodesetId -> actual conceptSetId)
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
