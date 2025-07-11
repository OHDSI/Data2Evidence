import { QueryFilterEvent, QueryFilterCriteriaManager } from '../models/QueryFilterModel'
import { AtlasCohortDefinition } from '../models/AtlasCohortDefinition'
import type { ConceptSetItem } from '../types/ConceptSetTypes'

export interface ConceptSetMapping {
  name: string
  id: string
  conceptSetItem: ConceptSetItem | null
}

export const convertAtlasToFilters = (
  atlasJson: AtlasCohortDefinition,
  availableConceptSets: ConceptSetItem[] = []
): QueryFilterCriteriaManager => {
  if (!atlasJson) {
    throw new Error('Invalid Atlas JSON input')
  }

  const cohortDefinition = atlasJson
  const cohortName = atlasJson.name

  const findConceptSetByCodesetId = (codesetId: number): ConceptSetMapping | null => {
    const atlasConceptSet = cohortDefinition.ConceptSets?.find(cs => cs.id === codesetId)

    if (atlasConceptSet) {
      const systemConceptSetId = atlasConceptSet.conceptSetId

      if (!systemConceptSetId) {
        console.error(`Atlas concept set ${atlasConceptSet.name} has no conceptSetId`)
        return null
      }
      const localConceptSet = availableConceptSets.find(cs => cs.value == systemConceptSetId.toString())

      if (localConceptSet) {
        return {
          name: localConceptSet.text || localConceptSet.display_value || atlasConceptSet.name,
          id: systemConceptSetId.toString(),
          conceptSetItem: localConceptSet,
        }
      } else {
        console.warn(`Local concept set not found for system ID: ${systemConceptSetId}`)
      }

      const conceptSetItem: ConceptSetItem = {
        value: systemConceptSetId.toString(),
        text: atlasConceptSet.name,
        display_value: atlasConceptSet.name,
      }

      return {
        name: atlasConceptSet.name,
        id: systemConceptSetId.toString(),
        conceptSetItem: conceptSetItem,
      }
    }

    const localConceptSet = availableConceptSets.find(cs => cs.value == codesetId.toString())
    if (localConceptSet) {
      return {
        name: localConceptSet.text || localConceptSet.display_value || `Concept Set ${codesetId}`,
        id: codesetId.toString(),
        conceptSetItem: localConceptSet,
      }
    }

    return {
      name: `Unknown Concept Set (ID: ${codesetId})`,
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

    const events: QueryFilterEvent[] = []

    criteriaList.forEach(criteriaItem => {
      const criteria = criteriaItem.Criteria || criteriaItem
      const criteriaType = getCriteriaType(criteria)
      const criteriaObj = getCriteriaObject(criteria)
      const conceptSetId = criteriaObj.CodesetId

      const conceptSetInfo = conceptSetId !== undefined ? findConceptSetByCodesetId(conceptSetId) : null

      const event: any = {
        id: `event_${Math.random().toString(36).substring(2)}`,
        eventType: criteriaType, // This is the medical event type (conditionOccurrence, drugExposure, etc.)
        criteriaType: criteriaType, // For nested events, this should be the medical event type initially
        isExpanded: true,
        cardinality: {
          type: 'AT_LEAST',
          count: criteriaItem.Occurrence?.Count || 1,
          using: 'ALL',
        },
        attributes: [],
      }

      // Only add conceptSet and related properties if we have a concept set
      if (conceptSetInfo || conceptSetId !== undefined) {
        event.conceptSet = conceptSetInfo?.name || `Concept Set ${conceptSetId}`
        event.conceptSetId = conceptSetInfo?.id
        event.selectedConceptSet = conceptSetInfo?.conceptSetItem || undefined
      }

      if (conceptSetId !== undefined) {
        const atlasConceptSet = cohortDefinition.ConceptSets?.find((cs: any) => cs.id === conceptSetId)
        if (atlasConceptSet?.expression?.items) {
          event.conceptSetDetails = atlasConceptSet.expression.items
          event.conceptSetLoading = false
        }
      }

      // Handle direct Age attributes on the event
      if (criteriaObj.Age) {
        ;(event.attributes! as any).push({
          id: `attribute_${Math.random().toString(36).substring(2)}`,
          attributeId: 'age',
          attributeType: 'numericRange',
          operator: mapAtlasOperatorToInternal(criteriaObj.Age.Op || 'gt'),
          value: criteriaObj.Age.Value.toString(),
        })
      }

      // Handle direct Gender attributes on the event
      if (criteriaObj.Gender) {
        ;(event.attributes! as any).push({
          id: `attribute_${Math.random().toString(36).substring(2)}`,
          attributeId: 'gender',
          type: 'conceptSet',
        })
      }

      // Handle CorrelatedCriteria (nested structure) - Convert to attributes format
      if (criteriaObj.CorrelatedCriteria) {
        const nestedCriteriaEvents = convertCriteriaListToEvents(criteriaObj.CorrelatedCriteria.CriteriaList || [])

        const nestedAttribute = {
          id: `attribute_${Math.random().toString(36).substring(2)}`,
          attributeType: 'nested',
          nestedCriteria: {
            id: `criteria_${Math.random().toString(36).substring(2)}`,
            criteriaType: criteriaObj.CorrelatedCriteria.Type || 'ALL',
            events: nestedCriteriaEvents,
          },
        }

        // Initialize attributes if not exists
        if (!event.attributes) {
          event.attributes = []
        }
        event.attributes.push(nestedAttribute)
      }

      events.push(event)
    })

    return events
  }

  const mapAtlasOperatorToInternal = (atlasOp: string): string => {
    switch (atlasOp) {
      case 'gt':
        return 'GREATER_THAN'
      case 'lt':
        return 'LESS_THAN'
      case 'gte':
        return 'GREATER_THAN_OR_EQUAL'
      case 'lte':
        return 'LESS_THAN_OR_EQUAL'
      case 'eq':
        return 'EQUAL'
      case 'bt':
        return 'BETWEEN'
      case 'nbt':
        return 'NOT_BETWEEN'
      default:
        return 'GREATER_THAN'
    }
  }

  // Create the main inclusionCriteria structure
  const inclusionCriteria = {
    qualifyingEventsLimit: 'ALL' as const,
    criteria: [] as any[],
  }

  if (cohortDefinition.InclusionRules && Array.isArray(cohortDefinition.InclusionRules)) {
    cohortDefinition.InclusionRules.forEach((rule: any) => {
      const criteriaItem = {
        id: `criteria_${Math.random().toString(36).substring(2)}`,
        title: rule.name || 'Inclusion Rule',
        description: rule.description || '',
        criteriaType: rule.expression?.Type || 'ALL',
        events: [] as QueryFilterEvent[],
      }

      // Handle regular CriteriaList
      if (rule.expression?.CriteriaList?.length > 0) {
        criteriaItem.events = convertCriteriaListToEvents(rule.expression.CriteriaList)
      }

      // Handle DemographicCriteriaList - create demographic events
      if (rule.expression?.DemographicCriteriaList?.length > 0) {
        rule.expression.DemographicCriteriaList.forEach((demoCriteria: any) => {
          const demographicEvent: any = {
            id: `event_${Math.random().toString(36).substring(2)}`,
            eventType: 'demographic',
            isExpanded: true,
            attributes: [],
          }

          if (demoCriteria.Age) {
            ;(demographicEvent.attributes! as any).push({
              id: `attribute_${Math.random().toString(36).substring(2)}`,
              attributeId: 'age',
              attributeType: 'numericRange',
              operator: mapAtlasOperatorToInternal(demoCriteria.Age.Op || 'gt'),
              value: demoCriteria.Age.Value.toString(),
            })
          }

          if (demoCriteria.Gender) {
            ;(demographicEvent.attributes! as any).push({
              id: `attribute_${Math.random().toString(36).substring(2)}`,
              attributeId: 'gender',
              type: 'conceptSet',
            })
          }

          criteriaItem.events.push(demographicEvent)
        })
      }

      inclusionCriteria.criteria.push(criteriaItem)
    })
  }

  // Process CensoringCriteria for exitEvents
  const exitEvents = {
    endStrategy: 'CONT_OBS' as const,
    censoringCriteria: [] as QueryFilterEvent[],
  }

  if (cohortDefinition.CensoringCriteria && Array.isArray(cohortDefinition.CensoringCriteria)) {
    exitEvents.censoringCriteria = convertCriteriaListToEvents(cohortDefinition.CensoringCriteria)
  }

  // Process PrimaryCriteria for entryEvents
  const entryEvents = {
    primaryCriteriaLimit: 'ALL' as const,
    events: [] as QueryFilterEvent[],
    priorDays: 0,
    postDays: 0,
  }

  if (cohortDefinition.PrimaryCriteria?.CriteriaList) {
    entryEvents.events = convertCriteriaListToEvents(cohortDefinition.PrimaryCriteria.CriteriaList)

    // Add observation window if present
    if (cohortDefinition.PrimaryCriteria.ObservationWindow) {
      entryEvents.priorDays = cohortDefinition.PrimaryCriteria.ObservationWindow.PriorDays || 0
      entryEvents.postDays = cohortDefinition.PrimaryCriteria.ObservationWindow.PostDays || 0
    }
  }

  // Add all three structures to the data
  const data = { inclusionCriteria, entryEvents, exitEvents }
  // Create and return QueryFilterCriteriaManager
  return new QueryFilterCriteriaManager(data)
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
