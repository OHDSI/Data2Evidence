import {
  QueryFilterEvent,
  QueryFilterCriteriaManager,
  InclusionCriteria,
  SelectedConceptSet,
} from '../models/QueryFilterModel'
import {
  AtlasCohortDefinition,
  CriteriaListItem,
  ConditionOccurrence,
  DrugExposure,
  ProcedureOccurrence,
  Observation,
  Measurement,
  VisitOccurrence,
  DeviceExposure,
  Death,
  ObservationPeriod,
  InclusionRule,
  CriteriaGroup,
  ConceptSet,
  NumericRange,
  DemographicCriteria,
  CorrelatedCriteria,
} from '../models/AtlasCohortDefinition'
import type { ConceptSetItem } from '../types/ConceptSetTypes'

export interface ConceptSetMapping {
  name: string
  id: string
  conceptSetItem: ConceptSetItem | null
}

type CriteriaObject =
  | ConditionOccurrence
  | DrugExposure
  | ProcedureOccurrence
  | Observation
  | Measurement
  | VisitOccurrence
  | DeviceExposure
  | Death
  | ObservationPeriod
  | Record<string, never>

// Type guards for proper type narrowing
const isCriteriaGroup = (item: CriteriaListItem | CriteriaGroup): item is CriteriaGroup => {
  return 'Criteria' in item
}

const isCriteriaListItem = (item: CriteriaListItem | CriteriaGroup): item is CriteriaListItem => {
  return (
    'ConditionOccurrence' in item ||
    'DrugExposure' in item ||
    'ProcedureOccurrence' in item ||
    'Observation' in item ||
    'Measurement' in item ||
    'VisitOccurrence' in item ||
    'DeviceExposure' in item ||
    'Death' in item ||
    'ObservationPeriod' in item
  )
}

// Type guard for criteria objects that have CodesetId
const hasCodesetId = (criteriaObj: CriteriaObject): criteriaObj is CriteriaObject & { CodesetId?: number } => {
  return 'CodesetId' in criteriaObj && criteriaObj !== null && typeof criteriaObj === 'object'
}

// Type guards for specific Atlas attributes
const hasAge = (criteriaObj: CriteriaObject): criteriaObj is CriteriaObject & { Age: NumericRange } => {
  return (
    'Age' in criteriaObj && criteriaObj !== null && typeof criteriaObj === 'object' && criteriaObj.Age !== undefined
  )
}

const hasGender = (criteriaObj: CriteriaObject): criteriaObj is CriteriaObject & { Gender: ConceptSet[] } => {
  return (
    'Gender' in criteriaObj &&
    criteriaObj !== null &&
    typeof criteriaObj === 'object' &&
    criteriaObj.Gender !== undefined
  )
}

const hasCorrelatedCriteria = (
  criteriaObj: CriteriaObject
): criteriaObj is CriteriaObject & { CorrelatedCriteria: CorrelatedCriteria } => {
  return (
    'CorrelatedCriteria' in criteriaObj &&
    criteriaObj !== null &&
    typeof criteriaObj === 'object' &&
    criteriaObj.CorrelatedCriteria !== undefined
  )
}

// Type guard for demographic criteria with Age
const hasDemographicAge = (
  demoCriteria: DemographicCriteria
): demoCriteria is DemographicCriteria & { Age: NumericRange } => {
  return demoCriteria.Age !== undefined
}

// Type guard for demographic criteria with Gender
const hasDemographicGender = (
  demoCriteria: DemographicCriteria
): demoCriteria is DemographicCriteria & { Gender: ConceptSet[] } => {
  return demoCriteria.Gender !== undefined
}

// Helper function to convert ConceptSetItem to SelectedConceptSet
const convertConceptSetItemToSelected = (item: ConceptSetItem): SelectedConceptSet | null => {
  if (!item.value || !item.text) return null

  return {
    value: parseInt(item.value), // Convert string to number
    text: item.text,
    display_value: item.display_value || item.text,
    conceptIds: item.conceptIds || [],
    concepts: (item.concepts || []).map(c => ({
      id: c.id || c.concept_id || c.CONCEPT_ID || 0,
      useMapped: c.useMapped || false,
      isExcluded: c.isExcluded || false,
      useDescendants: c.useDescendants || false,
    })),
    shared: false, // Default value
    userName: '', // Default value
    createdDate: new Date().toISOString(),
    modifiedDate: new Date().toISOString(),
  }
}

export const convertAtlasToFilters = (
  atlasJson: AtlasCohortDefinition,
  availableConceptSets: ConceptSetItem[] = []
): QueryFilterCriteriaManager => {
  if (!atlasJson) {
    throw new Error('Invalid Atlas JSON input')
  }

  const cohortDefinition = atlasJson

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

  // TODO: these mappings could just be Pascal to camel case instead of being hardcoded
  const getCriteriaType = (criteria: CriteriaListItem): string => {
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

  // TODO: these mappings could come from the config instead of being hardcoded
  const getCriteriaObject = (criteria: CriteriaListItem): CriteriaObject => {
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

  // This function is used both entry (PrimaryCriteria) and inclusion criteria.
  // For PrimaryCriteria, it uses CriteriaListItem.
  // For InclusionCriteria, it uses CriteriaGroup which has a Criteria property.
  const convertCriteriaListToEvents = (criteriaList: (CriteriaListItem | CriteriaGroup)[]): QueryFilterEvent[] => {
    if (!criteriaList || criteriaList.length === 0) {
      return []
    }

    const events: QueryFilterEvent[] = []

    criteriaList.forEach(_criteriaItem => {
      const criteriaItem = isCriteriaGroup(_criteriaItem)
        ? _criteriaItem.Criteria
        : isCriteriaListItem(_criteriaItem)
        ? _criteriaItem
        : undefined

      const occurrence = isCriteriaGroup(_criteriaItem) ? _criteriaItem.Occurrence : undefined

      if (!criteriaItem) return // Skip if no valid criteria

      const criteriaType = getCriteriaType(criteriaItem)
      const criteriaObj = getCriteriaObject(criteriaItem)
      const codesetId = hasCodesetId(criteriaObj) ? criteriaObj.CodesetId : undefined

      const conceptSetInfo = codesetId !== undefined ? findConceptSetByCodesetId(codesetId) : null

      const event: QueryFilterEvent = {
        id: `event_${Math.random().toString(36).substring(2)}`,
        conceptSet: conceptSetInfo?.name || `Concept Set ${codesetId}` || 'Unknown Concept Set',
        eventType: criteriaType, // This is the medical event type (conditionOccurrence, drugExposure, etc.)
        criteriaType: criteriaType, // For nested events, this should be the medical event type initially
        isExpanded: true,
        cardinality: {
          type: 'AT_LEAST',
          count: occurrence?.Count || 1,
          using: 'ALL',
        },
        attributes: [],
      }

      // Only add conceptSetId and selectedConceptSet if we have a concept set
      if (conceptSetInfo || codesetId !== undefined) {
        if (conceptSetInfo?.id) {
          event.conceptSetId = conceptSetInfo.id
        }
        if (conceptSetInfo?.conceptSetItem) {
          const converted = convertConceptSetItemToSelected(conceptSetInfo.conceptSetItem)
          if (converted) {
            event.selectedConceptSet = converted
          }
        }
      }

      if (codesetId !== undefined) {
        const atlasConceptSet = cohortDefinition.ConceptSets?.find(cs => cs.id === codesetId)
        if (atlasConceptSet?.expression?.items) {
          event.conceptSetDetails = atlasConceptSet.expression.items
          event.conceptSetLoading = false
        }
      }

      // Handle direct Age attributes on the event
      if (hasAge(criteriaObj)) {
        if (!event.attributes) {
          event.attributes = []
        }
        event.attributes.push({
          id: `attribute_${Math.random().toString(36).substring(2)}`,
          attributeId: 'age',
          attributeType: 'numericRange',
          operator: mapAtlasOperatorToInternal(criteriaObj.Age.Op || 'gt'),
          value: criteriaObj.Age.Value.toString(),
        })
      }

      // Handle direct Gender attributes on the event
      if (hasGender(criteriaObj)) {
        if (!event.attributes) {
          event.attributes = []
        }
        event.attributes.push({
          id: `attribute_${Math.random().toString(36).substring(2)}`,
          attributeId: 'gender',
          attributeType: 'conceptSet',
        })
      }

      // Handle CorrelatedCriteria (nested structure) - Convert to attributes format
      if (hasCorrelatedCriteria(criteriaObj)) {
        const nestedCriteriaEvents = convertCriteriaListToEvents(criteriaObj.CorrelatedCriteria.CriteriaList || [])

        const nestedAttribute = {
          id: `attribute_${Math.random().toString(36).substring(2)}`,
          attributeType: 'nested' as const,
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
  const inclusionCriteria: InclusionCriteria = {
    qualifyingEventsLimit: 'ALL' as const,
    criteria: [],
  }

  if (cohortDefinition.InclusionRules && Array.isArray(cohortDefinition.InclusionRules)) {
    cohortDefinition.InclusionRules.forEach(rule => {
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
      if (rule.expression?.DemographicCriteriaList && rule.expression.DemographicCriteriaList.length > 0) {
        rule.expression.DemographicCriteriaList.forEach(demoCriteria => {
          const demographicEvent: QueryFilterEvent = {
            id: `event_${Math.random().toString(36).substring(2)}`,
            conceptSet: 'Demographic Criteria',
            eventType: 'demographic',
            isExpanded: true,
            attributes: [],
          }

          if (hasDemographicAge(demoCriteria)) {
            if (!demographicEvent.attributes) {
              demographicEvent.attributes = []
            }
            demographicEvent.attributes.push({
              id: `attribute_${Math.random().toString(36).substring(2)}`,
              attributeId: 'age',
              attributeType: 'numericRange',
              operator: mapAtlasOperatorToInternal(demoCriteria.Age.Op || 'gt'),
              value: demoCriteria.Age.Value.toString(),
            })
          }

          if (hasDemographicGender(demoCriteria)) {
            if (!demographicEvent.attributes) {
              demographicEvent.attributes = []
            }
            demographicEvent.attributes.push({
              id: `attribute_${Math.random().toString(36).substring(2)}`,
              attributeId: 'gender',
              attributeType: 'conceptSet',
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
  atlasJson: AtlasCohortDefinition,
  availableConceptSets: ConceptSetItem[] = []
): ConceptSetMapping[] => {
  const mappings: ConceptSetMapping[] = []

  if (!atlasJson) return mappings

  const cohortDefinition = atlasJson
  const conceptSetIds = new Set<number>()
  const extractConceptSetIds = (rules: InclusionRule[]) => {
    rules?.forEach(rule => {
      rule.expression?.CriteriaList?.forEach(criteriaItem => {
        const criteria = isCriteriaGroup(criteriaItem)
          ? criteriaItem.Criteria
          : isCriteriaListItem(criteriaItem)
          ? criteriaItem
          : undefined
        if (criteria) {
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
          if (hasCodesetId(criteriaObj) && criteriaObj.CodesetId !== undefined) {
            conceptSetIds.add(criteriaObj.CodesetId)
          }
        }
      })
    })
  }

  extractConceptSetIds(cohortDefinition.InclusionRules)

  conceptSetIds.forEach(codesetId => {
    const atlasConceptSet = cohortDefinition.ConceptSets?.find((cs: ConceptSet) => cs.id === codesetId)
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
