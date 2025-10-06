import { QueryFilterCriteriaManager } from '../models/QueryFilterModel'
import {
  QueryFilterEvent,
  InclusionCriteria,
  QueryFilterAttribute,
  CriteriaType,
  QueryFilterAttributeDateRange,
  QueryFilterAttributeNumericRange,
} from '../types/QueryFilterTypes'
import {
  AtlasCohortDefinition,
  CriteriaListItem,
  AtlasEvent,
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
  CorrelatedCriteria,
  Concept,
  ConceptSetItem,
} from '../types/AtlasTypes'

import type { ConceptSetItemDisplay, SelectedConceptSet, StoredConceptItem } from '../types/ConceptSetTypes'
import type ConfigLoader from './ConfigLoader'

export interface ConceptSetMapping {
  name: string
  id: string
  conceptSetItem: ConceptSetItemDisplay | null
}

type CriteriaObject =
  | AtlasEvent
  | DrugExposure
  | ProcedureOccurrence
  | Observation
  | Measurement
  | VisitOccurrence
  | DeviceExposure
  | Death
  | ObservationPeriod
  | Record<string, never>

const CRITERIA_KEYS = [
  'ConditionOccurrence',
  'DrugExposure',
  'DrugEra',
  'ProcedureOccurrence',
  'Observation',
  'VisitOccurrence',
  'DeviceExposure',
  'Measurement',
  'Death',
  'ObservationPeriod',
  'ConditionEra',
  'DemographicCriteria',
  'DoseEra',
  'LocationRegion',
  'PayerPlanPeriod',
  'Specimen',
  'VisitDetail',
]

const isCriteriaGroup = (item: CriteriaListItem | CriteriaGroup): item is CriteriaGroup => {
  return 'Criteria' in item
}

const isCriteriaListItem = (item: CriteriaListItem | CriteriaGroup): item is CriteriaListItem => {
  return CRITERIA_KEYS.some(key => key in item)
}

export const hasCodesetId = (
  criteriaObj: CriteriaObject
): criteriaObj is Extract<CriteriaObject, { CodesetId: number }> => {
  return 'CodesetId' in criteriaObj && criteriaObj !== null && typeof criteriaObj === 'object'
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

const convertAtlasConceptsToInternal = (atlasConcepts: Concept[]): StoredConceptItem[] => {
  return atlasConcepts.map(concept => ({
    value: concept.CONCEPT_ID?.toString() || '',
    text: concept.CONCEPT_NAME || '',
    display_value: concept.CONCEPT_NAME || '',
    conceptId: concept.CONCEPT_ID || 0,
    conceptName: concept.CONCEPT_NAME || '', // Add conceptName for terminology UI compatibility
    domainId: concept.DOMAIN_ID || '',
    system: concept.VOCABULARY_ID || '',
    code: concept.CONCEPT_CODE || '',
    standardConcept: concept.STANDARD_CONCEPT || '',
    conceptClassId: concept.CONCEPT_CLASS_ID || '', // Add conceptClassId if available
    validity: concept.VALID_START_DATE && concept.VALID_END_DATE ? 'Valid' : undefined, // Basic validity info
    validStartDate: concept.VALID_START_DATE,
    validEndDate: concept.VALID_END_DATE,
  }))
}

const convertConceptSetArrayToAttribute = (
  attributeId: string,
  conceptArray: Concept[],
  eventType: string,
  configLoader?: typeof ConfigLoader
): QueryFilterAttribute => {
  const conceptItems = convertAtlasConceptsToInternal(conceptArray)

  let configType = 'conceptSet' // default
  let domainFilter = 'Condition' // default

  if (configLoader) {
    try {
      const attributeConfig = configLoader.getAttributeConfig(eventType, attributeId)
      if (attributeConfig) {
        configType = attributeConfig.type === 'concept' ? 'concept' : 'conceptSet'
        domainFilter = attributeConfig.domainFilter || domainFilter
      }
    } catch (error) {
      console.warn(`Could not find config for ${eventType}.${attributeId}, using defaults`)
    }
  }

  let displayName = attributeId // fallback to attributeId
  if (configLoader) {
    try {
      const attributeConfig = configLoader.getAttributeConfig(eventType, attributeId)
      if (attributeConfig && attributeConfig.name) {
        displayName = attributeConfig.name
      }
    } catch (error) {
      console.warn(`Could not find config for ${eventType}.${attributeId}`)
    }
  }

  if (configType === 'concept') {
    return {
      id: `attribute_${Math.random().toString(36).substring(2)}`,
      attributeId: attributeId,
      attributeType: 'standard' as const,
      configType: configType,
      domainFilter: domainFilter,
      conceptItems: conceptItems,
      name: displayName,
      title: displayName,
    }
  } else {
    // For conceptSet type, we store the concepts as conceptItems array
    // The actual ConceptSetItemDisplay will be resolved from the concept set ID later
    return {
      id: `attribute_${Math.random().toString(36).substring(2)}`,
      attributeId: attributeId,
      attributeType: 'standard' as const,
      configType: 'conceptSet',
      conceptItems: conceptItems,
      name: displayName,
      title: displayName,
    }
  }
}

const convertConceptSetItemToSelected = (item: ConceptSetItemDisplay): SelectedConceptSet | null => {
  if (!item.value || !item.text) return null

  return {
    value: parseInt(item.value),
    text: item.text,
    display_value: item.display_value || item.text,
    conceptIds: item.conceptIds || [],
    concepts: (item.concepts || []).map(c => ({
      id: c.id || c.concept_id || 0,
      useMapped: c.useMapped || false,
      isExcluded: c.isExcluded || false,
      useDescendants: c.useDescendants || false,
    })),
    shared: false,
    userName: '',
    createdDate: new Date().toISOString(),
    modifiedDate: new Date().toISOString(),
  }
}

export const convertAtlasToFilters = (
  atlasJson: AtlasCohortDefinition,
  availableConceptSets: ConceptSetItemDisplay[] = [],
  configLoader?: typeof ConfigLoader
): QueryFilterCriteriaManager => {
  try {
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

        const conceptSetItem: ConceptSetItemDisplay = {
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

    const getCriteriaType = (criteria: CriteriaListItem): string | undefined => {
      for (const key of CRITERIA_KEYS) {
        if (criteria[key]) {
          return key.charAt(0).toLowerCase() + key.slice(1)
        }
      }
      return undefined
    }

    const getCriteriaObject = (criteria: CriteriaListItem): CriteriaObject => {
      for (const key of CRITERIA_KEYS) {
        if (criteria[key]) return criteria[key]
      }
      return {}
    }

    // This function is used both entry (PrimaryCriteria) and inclusion criteria.
    // For PrimaryCriteria, it uses CriteriaListItem.
    // For InclusionCriteria, it uses CriteriaGroup which has a Criteria property.
    const convertCriteriaListToEvents = (
      criteriaList: (CriteriaListItem | CriteriaGroup)[],
      criteriaType: CriteriaType
    ): QueryFilterEvent[] => {
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

        if (!criteriaItem) {
          return // Skip if no valid criteria
        }
        const eventType = getCriteriaType(criteriaItem)
        const criteriaObj = getCriteriaObject(criteriaItem)
        const codesetId = hasCodesetId(criteriaObj) ? criteriaObj.CodesetId : undefined

        const conceptSetInfo = codesetId !== undefined ? findConceptSetByCodesetId(codesetId) : null

        // Create a better display name for events without concept sets
        let eventDisplayName = conceptSetInfo?.name
        if (!eventDisplayName && codesetId !== undefined) {
          eventDisplayName = `Concept Set ${codesetId}`
        }
        if (!eventDisplayName) {
          // Use human-readable names based on criteria type
          const typeDisplayNames = {
            conditionOccurrence: 'Condition',
            drugExposure: 'Drug Exposure',
            procedureOccurrence: 'Procedure',
            observation: 'Observation',
            measurement: 'Measurement',
            visitOccurrence: 'Visit',
            deviceExposure: 'Device Exposure',
            death: 'Death',
            observationPeriod: 'Observation Period',
          }
          eventDisplayName = typeDisplayNames[eventType] || 'Unknown Event'
        }

        const event: QueryFilterEvent = {
          id: `event_${Math.random().toString(36).substring(2)}`,
          conceptSet: eventDisplayName,
          eventType: eventType, // This is the medical event type (conditionOccurrence, drugExposure, etc.)
          criteriaType, // For nested events, this should be the medical event type initially
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

        // Handle all attributes on the event dynamically using configuration
        // This includes: concept arrays, NumericRange (Age, AgeAtStart, etc), DateRange, and other types
        if (configLoader) {
          const atlasKeyToAttributeIdMap = configLoader.getAtlasJsonToAttributeMapping(eventType)

          Object.keys(criteriaObj).forEach(atlasKey => {
            const value = criteriaObj[atlasKey]
            // Check if it is concept type attribute
            if (Array.isArray(value) && value.length > 0 && atlasKeyToAttributeIdMap[atlasKey]) {
              const attributeId = atlasKeyToAttributeIdMap[atlasKey]

              if (!event.attributes) {
                event.attributes = []
              }
              event.attributes.push(convertConceptSetArrayToAttribute(attributeId, value, eventType, configLoader))
            } else if (atlasKeyToAttributeIdMap[atlasKey]) {
              const attributeId = atlasKeyToAttributeIdMap[atlasKey]
              const attributeConfig = configLoader.getAttributeConfig(eventType, attributeId)

              if (attributeConfig) {
                // Check if value is a NumericRange object {Op, Value, Extent?}
                if (typeof value === 'object' && value !== null && 'Op' in value && 'Value' in value) {
                  const numericRange = value as NumericRange
                  event.attributes.push({
                    id: `attribute_${Math.random().toString(36).substring(2)}`,
                    attributeId: attributeId,
                    attributeType: 'standard' as const,
                    configType: 'numericRange',
                    operator: mapAtlasOperatorToInternal(numericRange.Op || 'gt'),
                    value: numericRange.Value.toString(),
                    ...(numericRange.Extent !== undefined && { extent: numericRange.Extent.toString() }),
                    name: attributeConfig.name || attributeId,
                    description: attributeConfig.description || '',
                  })
                } else {
                  // Handle other attribute types
                  event.attributes.push({
                    id: `attribute_${Math.random().toString(36).substring(2)}`,
                    attributeId: attributeId,
                    attributeType: 'standard' as const,
                    configType: attributeConfig.type,
                    description: attributeConfig.description || '',
                    value: value,
                  })
                }
              }
            }
          })
        }

        // Handle CorrelatedCriteria (nested structure) - Convert to attributes format
        if (hasCorrelatedCriteria(criteriaObj)) {
          criteriaObj.CorrelatedCriteria.Type
          const nestedCriteriaEvents = convertCriteriaListToEvents(
            criteriaObj.CorrelatedCriteria.CriteriaList || [],
            criteriaObj.CorrelatedCriteria.Type
          )

          // Handle DemographicCriteriaList within CorrelatedCriteria
          if (criteriaObj.CorrelatedCriteria.DemographicCriteriaList?.length > 0) {
            criteriaObj.CorrelatedCriteria.DemographicCriteriaList.forEach(demoCriteria => {
              const demographicEvent: QueryFilterEvent = {
                id: `event_${Math.random().toString(36).substring(2)}`,
                conceptSet: 'Demographic Criteria',
                eventType: 'demographic',
                isExpanded: true,
                attributes: [],
              }

              // Handle all demographic attributes generically using config
              if (configLoader) {
                const demographicAtlasKeyToAttributeIdMap = configLoader.getAllAtlasJsonToAttributeMappings()

                Object.keys(demoCriteria).forEach((atlasKey: keyof typeof demoCriteria) => {
                  const value = demoCriteria[atlasKey]
                  const attributeId = demographicAtlasKeyToAttributeIdMap[atlasKey]

                  if (!attributeId) {
                    return
                  }

                  // Get attribute config using the ConfigLoader method
                  const attrConfig = configLoader.getAttributeConfig('demographic', attributeId)
                  if (!attrConfig) {
                    return
                  }

                  if (!demographicEvent.attributes) {
                    demographicEvent.attributes = []
                  }

                  // Handle based on attribute type from config
                  if (
                    attrConfig.type === 'numericRange' &&
                    typeof value === 'object' &&
                    value !== null &&
                    'Op' in value &&
                    'Value' in value
                  ) {
                    const mappedOperator = mapAtlasOperatorToInternal(value.Op)
                    const mappedValue = value.Value.toString()

                    // NumericRange type (e.g., Age) - Convert from Atlas format to internal format
                    const numericAttribute: QueryFilterAttributeNumericRange = {
                      id: `attribute_${Math.random().toString(36).substring(2)}`,
                      attributeId,
                      attributeType: 'standard',
                      configType: 'numericRange',
                      name: attrConfig.name,
                      description: attrConfig.description,
                      operator: mappedOperator,
                      value: mappedValue,
                      ...(value.Extent !== undefined ? { extent: value.Extent.toString() } : {}),
                    }
                    demographicEvent.attributes.push(numericAttribute)
                  } else if (attrConfig.type === 'concept' && Array.isArray(value) && value.length > 0) {
                    // Concept type (e.g., Gender, Race, Ethnicity)
                    const conceptAttr = convertConceptSetArrayToAttribute(
                      attributeId,
                      value,
                      'demographic',
                      configLoader
                    )
                    demographicEvent.attributes.push(conceptAttr)
                  } else if (
                    attrConfig.type === 'dateRange' &&
                    typeof value === 'object' &&
                    value !== null &&
                    'Value' in value
                  ) {
                    // DateRange type (e.g., StartDate, EndDate) - Convert from Atlas format to internal format
                    const dateAttribute: QueryFilterAttributeDateRange = {
                      id: `attribute_${Math.random().toString(36).substring(2)}`,
                      attributeId,
                      attributeType: 'standard',
                      configType: 'dateRange',
                      name: attrConfig.name,
                      description: attrConfig.description,
                      operator: mapAtlasOperatorToInternal(value.Op),
                      value: value.Value.toString(),
                      ...(value.Extent !== undefined ? { extent: value.Extent.toString() } : {}),
                    }
                    demographicEvent.attributes.push(dateAttribute)
                  }
                })
              }

              // Need to populate selectedAttributes for UI to show the attributes
              if (demographicEvent.attributes && demographicEvent.attributes.length > 0) {
                demographicEvent.selectedAttributes = demographicEvent.attributes.map(
                  attr => attr.attributeId || attr.id
                )
              }

              nestedCriteriaEvents.push(demographicEvent)
            })
          }

          const nestedAttribute = {
            id: `attribute_${Math.random().toString(36).substring(2)}`,
            attributeId: 'nested', // Config ID for nested attributes
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
      qualifyingEventsLimit: 'ALL' as 'ALL' | 'EARLIEST' | 'LATEST',
      criteria: [],
    }

    // Read ExpressionLimit from Atlas JSON (for Inclusion Criteria)
    const expressionLimitType = cohortDefinition.ExpressionLimit?.Type
    if (expressionLimitType) {
      if (expressionLimitType === 'First') {
        inclusionCriteria.qualifyingEventsLimit = 'EARLIEST'
      } else if (expressionLimitType === 'Last') {
        inclusionCriteria.qualifyingEventsLimit = 'LATEST'
      } else if (expressionLimitType === 'All') {
        inclusionCriteria.qualifyingEventsLimit = 'ALL'
      }
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
          criteriaItem.events = convertCriteriaListToEvents(rule.expression.CriteriaList, rule.expression.Type)
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

            // Handle all demographic attributes generically using config (same as nested)
            if (configLoader) {
              const demographicAtlasKeyToAttributeIdMap = configLoader.getAllAtlasJsonToAttributeMappings()

              Object.keys(demoCriteria).forEach((atlasKey: keyof typeof demoCriteria) => {
                const value = demoCriteria[atlasKey]
                const attributeId = demographicAtlasKeyToAttributeIdMap[atlasKey]

                if (!attributeId) {
                  return
                }

                // Get attribute config using the ConfigLoader method
                const attrConfig = configLoader.getAttributeConfig('demographic', attributeId)
                if (!attrConfig) {
                  return
                }

                if (!demographicEvent.attributes) {
                  demographicEvent.attributes = []
                }

                // Handle based on attribute type from config
                if (
                  attrConfig.type === 'numericRange' &&
                  typeof value === 'object' &&
                  value !== null &&
                  'Op' in value &&
                  'Value' in value
                ) {
                  const mappedOperator = mapAtlasOperatorToInternal(value.Op)
                  const mappedValue = value.Value.toString()
                  // NumericRange type (e.g., Age) - Convert from Atlas format to internal format
                  const numericAttribute: QueryFilterAttributeNumericRange = {
                    id: `attribute_${Math.random().toString(36).substring(2)}`,
                    attributeId,
                    attributeType: 'standard',
                    configType: 'numericRange',
                    name: attrConfig.name,
                    description: attrConfig.description,
                    operator: mappedOperator,
                    value: mappedValue,
                    ...(value.Extent !== undefined ? { extent: value.Extent.toString() } : {}),
                  }

                  demographicEvent.attributes.push(numericAttribute)
                } else if (attrConfig.type === 'concept' && Array.isArray(value) && value.length > 0) {
                  // Concept type (e.g., Gender, Race, Ethnicity)
                  const conceptAttr = convertConceptSetArrayToAttribute(attributeId, value, 'demographic', configLoader)
                  demographicEvent.attributes.push(conceptAttr)
                } else if (
                  attrConfig.type === 'dateRange' &&
                  typeof value === 'object' &&
                  value !== null &&
                  'Value' in value
                ) {
                  // DateRange type (e.g., StartDate, EndDate) - Convert from Atlas format to internal format
                  const dateAttribute: QueryFilterAttributeDateRange = {
                    id: `attribute_${Math.random().toString(36).substring(2)}`,
                    attributeId,
                    attributeType: 'standard',
                    configType: 'dateRange',
                    name: attrConfig.name,
                    description: attrConfig.description,
                    operator: mapAtlasOperatorToInternal(value.Op),
                    value: value.Value.toString(),
                    ...(value.Extent !== undefined ? { extent: value.Extent.toString() } : {}),
                  }
                  demographicEvent.attributes.push(dateAttribute)
                }
              })
            }

            // Need to populate selectedAttributes for UI to show the attributes
            if (demographicEvent.attributes && demographicEvent.attributes.length > 0) {
              demographicEvent.selectedAttributes = demographicEvent.attributes.map(attr => attr.attributeId || attr.id)
            }

            criteriaItem.events.push(demographicEvent)
          })
        }

        // Handle Groups - convert them back to group events
        if (rule.expression?.Groups && rule.expression.Groups.length > 0) {
          rule.expression.Groups.forEach(groupCriteria => {
            const groupEvent: QueryFilterEvent = {
              id: `event_${Math.random().toString(36).substring(2)}`,
              conceptSet: 'Group',
              eventType: 'group',
              isExpanded: true,
              nestedCriteria: {
                id: `nested_${Math.random().toString(36).substring(2)}`,
                criteriaType: groupCriteria.Type || 'ALL',
                events: [] as QueryFilterEvent[],
              },
            }

            // Convert CriteriaList within the group
            if (groupCriteria.CriteriaList && groupCriteria.CriteriaList.length > 0) {
              const convertedEvents = convertCriteriaListToEvents(
                groupCriteria.CriteriaList,
                groupCriteria.Type || 'ALL'
              )
              groupEvent.nestedCriteria!.events = convertedEvents
            }

            // TODO: Handle DemographicCriteriaList within groups if needed
            // TODO: Handle nested Groups recursively if needed

            criteriaItem.events.push(groupEvent)
          })
        }

        inclusionCriteria.criteria.push(criteriaItem)
      })
    }

    // Process CensoringCriteria for exitEvents
    const exitEvents: {
      endStrategy: 'CONT_OBS' | 'FIXED' | 'CONT_DRUG'
      censoringCriteria: QueryFilterEvent[]
      fixedDuration?: {
        dateField: 'StartDate' | 'EndDate'
        offset: number
      }
      contDrugSettings?: {
        conceptSetId: string
        gapDays: number
        offset: number
        daysSupplyOverride: number
        conceptSetName?: string
        conceptSetDetails?: ConceptSetItem[]
      }
    } = {
      endStrategy: 'CONT_OBS',
      censoringCriteria: [],
    }

    // Read EndStrategy from Atlas JSON
    if (cohortDefinition.EndStrategy) {
      if ('DateOffset' in cohortDefinition.EndStrategy) {
        // Fixed duration strategy
        exitEvents.endStrategy = 'FIXED'
        exitEvents.fixedDuration = {
          dateField: cohortDefinition.EndStrategy.DateOffset.DateField as 'StartDate' | 'EndDate',
          offset: cohortDefinition.EndStrategy.DateOffset.Offset,
        }
      } else if ('CustomEra' in cohortDefinition.EndStrategy) {
        // Continuous drug strategy
        exitEvents.endStrategy = 'CONT_DRUG'

        // Find the concept set using the Atlas DrugCodesetId
        const drugCodesetId = cohortDefinition.EndStrategy.CustomEra.DrugCodesetId

        const conceptSetMapping = drugCodesetId !== undefined ? findConceptSetByCodesetId(drugCodesetId) : null

        if (conceptSetMapping) {
          // Found the concept set - use system ID, name, and get details
          const atlasConceptSet = cohortDefinition.ConceptSets?.find(cs => cs.id === drugCodesetId)

          exitEvents.contDrugSettings = {
            conceptSetId: conceptSetMapping.id, // System ID
            conceptSetName: conceptSetMapping.name, // Display name
            conceptSetDetails: atlasConceptSet?.expression?.items, // Details for saving
            gapDays: cohortDefinition.EndStrategy.CustomEra.GapDays,
            offset: cohortDefinition.EndStrategy.CustomEra.Offset,
            daysSupplyOverride: cohortDefinition.EndStrategy.CustomEra.DaysSupplyOverride,
          }
        } else {
          // Fallback - store with Atlas ID (will need to be resolved later)
          exitEvents.contDrugSettings = {
            conceptSetId: drugCodesetId?.toString() || '',
            gapDays: cohortDefinition.EndStrategy.CustomEra.GapDays,
            offset: cohortDefinition.EndStrategy.CustomEra.Offset,
            daysSupplyOverride: cohortDefinition.EndStrategy.CustomEra.DaysSupplyOverride,
          }
        }
      }
      // If neither, it stays as 'CONT_OBS' (default)
    }

    if (cohortDefinition.CensoringCriteria && Array.isArray(cohortDefinition.CensoringCriteria)) {
      exitEvents.censoringCriteria = convertCriteriaListToEvents(cohortDefinition.CensoringCriteria, 'ALL')
    }

    // Process PrimaryCriteria for entryEvents
    const entryEvents = {
      primaryCriteriaLimit: 'ALL' as 'ALL' | 'EARLIEST' | 'LATEST',
      events: [] as QueryFilterEvent[],
      priorDays: 0,
      postDays: 0,
    }

    if (cohortDefinition.PrimaryCriteria?.CriteriaList) {
      entryEvents.events = convertCriteriaListToEvents(cohortDefinition.PrimaryCriteria.CriteriaList, 'ALL')

      // Add observation window if present
      if (cohortDefinition.PrimaryCriteria.ObservationWindow) {
        entryEvents.priorDays = cohortDefinition.PrimaryCriteria.ObservationWindow.PriorDays || 0
        entryEvents.postDays = cohortDefinition.PrimaryCriteria.ObservationWindow.PostDays || 0
      }

      // Read PrimaryCriteriaLimit and QualifiedLimit from Atlas JSON (both for Entry Events)
      // Prefer PrimaryCriteriaLimit, fallback to QualifiedLimit
      const primaryLimitType = cohortDefinition.PrimaryCriteria.PrimaryCriteriaLimit?.Type
      const qualifiedLimitType = cohortDefinition.QualifiedLimit?.Type

      const limitType = primaryLimitType || qualifiedLimitType
      if (limitType) {
        if (limitType === 'First') {
          entryEvents.primaryCriteriaLimit = 'EARLIEST'
        } else if (limitType === 'Last') {
          entryEvents.primaryCriteriaLimit = 'LATEST'
        } else if (limitType === 'All') {
          entryEvents.primaryCriteriaLimit = 'ALL'
        }
      }
    }

    // Add all three structures to the data
    const data = { inclusionCriteria, entryEvents, exitEvents }
    // Create and return QueryFilterCriteriaManager
    return new QueryFilterCriteriaManager(data)
  } catch (error) {
    console.error('convertAtlasToFilters - Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    throw error
  }
}

export const getConceptSetMappings = (
  atlasJson: AtlasCohortDefinition,
  availableConceptSets: ConceptSetItemDisplay[] = []
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
