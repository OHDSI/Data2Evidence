import type {
  QueryFilterEvent,
  QueryFilterAttribute,
  QueryFilterNestedCriteria,
  WindowDefinition,
} from '../../types/QueryFilterTypes'
import type {
  CriteriaGroup,
  DemographicCriteria,
  GroupCriteria,
  NumericRange,
  DateRange,
  Window,
} from '../../types/AtlasTypes'
import { isNestedAttribute, isNumericRangeAttribute, hasAttributeId, isDateRangeAttribute } from './type-guards'
import { mapCardinalityTypeToAtlas, mapEventTypeToAtlas, mapOperatorToAtlas } from './atlas-mappers'
import { getAtlasAttributeKey } from '../../utils/AtlasUtils'

// Type for DemographicCriteria with dynamic keys
type DemographicCriteriaRecord = Record<string, unknown>

// Helper function to convert internal WindowDefinition to Atlas Window format
export const createAtlasWindow = (window?: WindowDefinition): Window => {
  if (!window) {
    // Default fallback for events without temporal relationship data
    return {
      Start: { Coeff: -1 },
      End: { Coeff: 1 },
      UseEventEnd: false,
    }
  }

  return {
    Start: {
      ...(window.start.days !== null && { Days: window.start.days }),
      Coeff: window.start.coeff,
    },
    End: {
      ...(window.end.days !== null && { Days: window.end.days }),
      Coeff: window.end.coeff,
    },
    UseIndexEnd: window.useIndexEnd,
    UseEventEnd: window.useEventEnd,
  }
}

// Helper method to recursively collect all events including nested ones
export const collectAllEvents = (events: QueryFilterEvent[]): QueryFilterEvent[] => {
  const allEvents: QueryFilterEvent[] = []

  const collectRecursively = (eventList: QueryFilterEvent[]) => {
    eventList.forEach(event => {
      allEvents.push(event)

      // Collect from attributes.nestedCriteria structure
      if (event.attributes) {
        event.attributes.forEach(attr => {
          const attributeType = attr.attributeType
          if (attributeType === 'nested' && attr.nestedCriteria?.events) {
            collectRecursively(attr.nestedCriteria.events)
          }
        })
      }

      // Collect from event.nestedCriteria structure (for group events)
      if (event.nestedCriteria?.events) {
        collectRecursively(event.nestedCriteria.events)
      }
    })
  }

  collectRecursively(events)
  return allEvents
}

// Helper method to recursively process nested groups
export const processNestedGroups = (
  events: QueryFilterEvent[],
  systemIdToAtlasId: Map<string, number>
): GroupCriteria[] => {
  const results: GroupCriteria[] = []

  // Process group events that contain sibling events
  const groupEvents = events.filter(event => event.eventType === 'group' && event.nestedCriteria)

  groupEvents.forEach(groupEvent => {
    if (groupEvent.nestedCriteria?.events) {
      // Collect all nested group events that contain actual events (not further groups)
      const nestedGroupsWithEvents = groupEvent.nestedCriteria.events.filter(
        event => event.eventType === 'group' && event.nestedCriteria?.events
      )

      // Process each non-group event in the group's nested criteria
      groupEvent.nestedCriteria.events.forEach(nestedEvent => {
        if (nestedEvent.eventType !== 'demographic' && nestedEvent.eventType !== 'group') {
          // Handle non-group events normally
          const atlasEventType = mapEventTypeToAtlas(nestedEvent.eventType!)
          const atlasCodesetId = nestedEvent.conceptSetId ? systemIdToAtlasId.get(nestedEvent.conceptSetId) : undefined

          const criteria: CriteriaGroup = {
            Criteria: {
              [atlasEventType]: {
                ...(nestedEvent.conceptSetId && atlasCodesetId && { CodesetId: atlasCodesetId }),
              },
            },
            StartWindow: createAtlasWindow(nestedEvent.startWindow),
            ...(nestedEvent.endWindow && {
              EndWindow: createAtlasWindow(nestedEvent.endWindow),
            }),
            Occurrence: {
              Type: mapCardinalityTypeToAtlas(nestedEvent.cardinality?.type || 'AT_LEAST'),
              Count: nestedEvent.cardinality?.count || 1,
            },
          }

          // Check for nested criteria in attributes format for this event
          const attributesNestedCriteria: QueryFilterAttribute[] =
            nestedEvent.attributes?.filter(attr => {
              return attr.attributeType === 'nested' && attr.nestedCriteria?.events
            }) || []

          let criteriaList: CriteriaGroup[] = []
          let demographicCriteriaList: DemographicCriteria[] = []
          let groupsList: GroupCriteria[] = []

          // Process nested criteria from attributes
          if (attributesNestedCriteria.length > 0) {
            attributesNestedCriteria.forEach(attr => {
              if (attr.attributeType === 'nested' && attr.nestedCriteria?.events) {
                const result = buildNestedCriteriaFromAttributes(attr.nestedCriteria.events, systemIdToAtlasId)
                criteriaList = criteriaList.concat(result.criteriaList)
                demographicCriteriaList = demographicCriteriaList.concat(result.demographicCriteriaList)
                groupsList = groupsList.concat(result.groupsList || [])
              }
            })
          }

          // Create a group to contain this event
          const eventGroup: GroupCriteria = {
            Type: 'ALL',
            CriteriaList: [criteria],
            DemographicCriteriaList: [],
            Groups: [],
          }

          // Add CorrelatedCriteria if we have nested content from attributes
          if (criteriaList.length > 0 || demographicCriteriaList.length > 0 || groupsList.length > 0) {
            criteria.Criteria[atlasEventType].CorrelatedCriteria = {
              Type: 'ALL',
              CriteriaList: criteriaList,
              DemographicCriteriaList: demographicCriteriaList,
              Groups: groupsList,
            }
          }

          // Process any sibling nested groups as additional groups within this event group
          nestedGroupsWithEvents.forEach(nestedGroup => {
            if (nestedGroup.nestedCriteria?.events) {
              nestedGroup.nestedCriteria.events.forEach(groupedEvent => {
                if (groupedEvent.eventType !== 'demographic' && groupedEvent.eventType !== 'group') {
                  const groupedAtlasEventType = mapEventTypeToAtlas(groupedEvent.eventType!)

                  eventGroup.Groups.push({
                    Type: 'ALL',
                    CriteriaList: [
                      {
                        Criteria: {
                          [groupedAtlasEventType]: {
                            ...(groupedEvent.conceptSetId && {
                              CodesetId: systemIdToAtlasId.get(groupedEvent.conceptSetId),
                            }),
                          },
                        },
                        StartWindow: createAtlasWindow(groupedEvent.startWindow),
                        ...(groupedEvent.endWindow && {
                          EndWindow: createAtlasWindow(groupedEvent.endWindow),
                        }),
                        RestrictVisit: groupedEvent.restrictVisit ?? false,
                        IgnoreObservationPeriod: groupedEvent.ignoreObservationPeriod ?? false,
                        Occurrence: {
                          Type: mapCardinalityTypeToAtlas(groupedEvent.cardinality?.type || 'AT_LEAST'),
                          Count: groupedEvent.cardinality?.count || 1,
                        },
                      },
                    ],
                    DemographicCriteriaList: [],
                    Groups: [],
                  })
                }
              })
            }
          })

          results.push(eventGroup)
        }
      })
    }
  })

  return results
}

// Helper method to recursively process nested Groups structure with unlimited depth
export const processNestedGroupsRecursively = (
  events: QueryFilterEvent[],
  systemIdToAtlasId: Map<string, number>
): GroupCriteria[] => {
  const groupsList: GroupCriteria[] = []

  // Find all group events at this level
  const groupEvents = events.filter(event => event.eventType === 'group' && event.nestedCriteria?.events)

  groupEvents.forEach(groupEvent => {
    if (groupEvent.nestedCriteria?.events) {
      const criteriaList: CriteriaGroup[] = []
      const demographicCriteriaList: DemographicCriteria[] = []
      const nestedGroups: GroupCriteria[] = []

      // Process non-group events for CriteriaList
      groupEvent.nestedCriteria.events
        .filter(event => event.eventType !== 'group' && event.eventType !== 'demographic')
        .forEach(nestedEvent => {
          const atlasEventType = mapEventTypeToAtlas(nestedEvent.eventType!)
          const criteria: CriteriaGroup = {
            Criteria: {
              [atlasEventType]: {
                ...(nestedEvent.conceptSetId && {
                  CodesetId: systemIdToAtlasId.get(nestedEvent.conceptSetId),
                }),
              },
            },
            StartWindow: createAtlasWindow(nestedEvent.startWindow),
            ...(nestedEvent.endWindow && {
              EndWindow: createAtlasWindow(nestedEvent.endWindow),
            }),
            Occurrence: {
              Type: mapCardinalityTypeToAtlas(nestedEvent.cardinality?.type || 'AT_LEAST'),
              Count: nestedEvent.cardinality?.count || 1,
            },
          }

          // Process nested criteria from attributes if they exist
          if (nestedEvent.attributes && Array.isArray(nestedEvent.attributes)) {
            const attributesNestedCriteria = nestedEvent.attributes.filter(
              (
                attr
              ): attr is QueryFilterAttribute & {
                attributeType: 'nested'
                nestedCriteria: QueryFilterNestedCriteria
              } => isNestedAttribute(attr)
            )

            if (attributesNestedCriteria.length > 0) {
              let nestedCriteriaList: CriteriaGroup[] = []
              let nestedDemographicCriteriaList: DemographicCriteria[] = []
              let nestedGroupsList: GroupCriteria[] = []

              attributesNestedCriteria.forEach(attr => {
                if (attr.nestedCriteria?.events) {
                  const result = buildNestedCriteriaFromAttributes(attr.nestedCriteria.events, systemIdToAtlasId)
                  nestedCriteriaList = nestedCriteriaList.concat(result.criteriaList)
                  nestedDemographicCriteriaList = nestedDemographicCriteriaList.concat(result.demographicCriteriaList)

                  // RECURSIVE CALL: Process deeper nested groups
                  const deeperGroups = processNestedGroupsRecursively(attr.nestedCriteria.events, systemIdToAtlasId)
                  nestedGroupsList = nestedGroupsList.concat(deeperGroups)
                }
              })

              // Add CorrelatedCriteria if we have nested content
              if (
                nestedCriteriaList.length > 0 ||
                nestedDemographicCriteriaList.length > 0 ||
                nestedGroupsList.length > 0
              ) {
                criteria.Criteria[atlasEventType].CorrelatedCriteria = {
                  Type: 'ALL',
                  CriteriaList: nestedCriteriaList,
                  DemographicCriteriaList: nestedDemographicCriteriaList,
                  Groups: nestedGroupsList,
                }
              }
            }
          }

          criteriaList.push(criteria)
        })

      // Process demographic events for DemographicCriteriaList
      groupEvent.nestedCriteria.events
        .filter(event => event.eventType === 'demographic')
        .forEach(event => {
          if (event.attributes && Array.isArray(event.attributes)) {
            const demographicCriteria: DemographicCriteriaRecord = {}

            event.attributes.forEach(attr => {
              if (!hasAttributeId(attr)) return

              // Get the Atlas field name for this attribute using the lookup table
              const atlasFieldName = getAtlasAttributeKey(attr.attributeId, 'DemographicCriteria')

              // Handle numericRange attributes (e.g., Age)
              if (isNumericRangeAttribute(attr)) {
                // Convert internal format (operator, value, extent?) to Atlas format (Op, Value, Extent?)
                if ('operator' in attr && 'value' in attr && attr.value) {
                  const numericConfig: NumericRange = {
                    Op: attr.operator ? mapOperatorToAtlas(attr.operator) : 'gt',
                    Value: parseInt(attr.value),
                  }
                  // Handle BETWEEN/NOT_BETWEEN with extent
                  if (attr.extent && (attr.operator === 'BETWEEN' || attr.operator === 'NOT_BETWEEN')) {
                    numericConfig.Extent = parseInt(attr.extent)
                  }
                  demographicCriteria[atlasFieldName] = numericConfig
                }
              }
              // Handle concept-type attributes (e.g., Gender, Race, Ethnicity)
              else if ('configType' in attr && attr.configType === 'concept') {
                if ('conceptItems' in attr && attr.conceptItems && attr.conceptItems.length > 0) {
                  const conceptData = attr.conceptItems.map(item => ({
                    CONCEPT_CODE: item.code || '',
                    CONCEPT_ID: item.conceptId,
                    CONCEPT_NAME: item.conceptName || item.text || item.display_value || '',
                    DOMAIN_ID: item.domainId || atlasFieldName,
                    VOCABULARY_ID: item.system || 'Unknown',
                  }))
                  demographicCriteria[atlasFieldName] = conceptData
                }
              }
              // Handle dateRange attributes (e.g., startDate -> OccurrenceStartDate, endDate -> OccurrenceEndDate)
              // DateRange attributes are stored as 'standard' type with configType: 'dateRange'
              else if (isDateRangeAttribute(attr)) {
                // Convert internal format (operator, value, extent?) to Atlas format (Op, Value, Extent)
                if ('operator' in attr && 'value' in attr && attr.value) {
                  const dateConfig: DateRange = {
                    Op: attr.operator ? mapOperatorToAtlas(attr.operator) : 'gt',
                    Value: attr.value,
                    Extent: attr.extent || '', // For BETWEEN/NOT_BETWEEN ranges
                  }
                  demographicCriteria[atlasFieldName] = dateConfig
                }
              }
            })

            // Only add if we have at least one demographic attribute
            if (Object.keys(demographicCriteria).length > 0) {
              demographicCriteriaList.push(demographicCriteria)
            }
          }
        })

      // RECURSIVE CALL: Process deeper nested groups
      const deeperNestedGroups = processNestedGroupsRecursively(groupEvent.nestedCriteria.events, systemIdToAtlasId)
      nestedGroups.push(...deeperNestedGroups)

      // Create the group criteria
      groupsList.push({
        Type: 'ALL',
        CriteriaList: criteriaList,
        DemographicCriteriaList: demographicCriteriaList,
        Groups: nestedGroups,
      })
    }
  })

  return groupsList
}

// Helper method to build nested criteria from attributes.nestedCriteria format
export const buildNestedCriteriaFromAttributes = (
  nestedCriteriaEvents: QueryFilterEvent[],
  systemIdToAtlasId: Map<string, number>
): { criteriaList: CriteriaGroup[]; demographicCriteriaList: DemographicCriteria[]; groupsList: GroupCriteria[] } => {
  const criteriaList: CriteriaGroup[] = []
  const demographicCriteriaList: DemographicCriteria[] = []
  const groupsList: GroupCriteria[] = []

  // Filter out group events - they should be handled separately in Groups, not CriteriaList
  // Also filter out demographic events as they go in DemographicCriteriaList
  const nonGroupEvents = nestedCriteriaEvents.filter(
    event => event.eventType !== 'group' && event.eventType !== 'demographic'
  )

  // Use recursive processing for Group events
  const recursiveGroups = processNestedGroupsRecursively(nestedCriteriaEvents, systemIdToAtlasId)
  groupsList.push(...recursiveGroups)

  // Handle demographic events separately
  const demographicEvents = nestedCriteriaEvents.filter(event => event.eventType === 'demographic')

  demographicEvents.forEach(event => {
    // Process demographic events and their attributes
    if (event.attributes && Array.isArray(event.attributes)) {
      const demographicCriteria: DemographicCriteriaRecord = {}

      event.attributes.forEach((attr: QueryFilterAttribute) => {
        if (!hasAttributeId(attr)) {
          return
        }

        // Get the Atlas field name for this attribute using the lookup table
        const atlasFieldName = getAtlasAttributeKey(attr.attributeId, 'DemographicCriteria')

        // Handle numericRange attributes (e.g., Age)
        if (isNumericRangeAttribute(attr)) {
          let numericConfig: NumericRange | null = null

          // Build from operator and value (internal format)
          if ('operator' in attr && 'value' in attr) {
            numericConfig = {
              Op: attr.operator ? mapOperatorToAtlas(attr.operator) : 'gt',
              Value: attr.value !== undefined ? parseInt(String(attr.value)) : 0,
            }
            // Include Extent for BETWEEN/NOT_BETWEEN operations
            if (attr.extent && (attr.operator === 'BETWEEN' || attr.operator === 'NOT_BETWEEN')) {
              numericConfig.Extent = parseInt(String(attr.extent))
            }
          }

          if (numericConfig) {
            demographicCriteria[atlasFieldName] = numericConfig
          }
        }
        // Handle concept-type attributes (e.g., Gender, Race, Ethnicity)
        else if ('configType' in attr && attr.configType === 'concept') {
          if ('conceptItems' in attr && attr.conceptItems && attr.conceptItems.length > 0) {
            const conceptData = attr.conceptItems.map(item => ({
              CONCEPT_CODE: item.code || '',
              CONCEPT_ID: item.conceptId,
              CONCEPT_NAME: item.conceptName || item.text || item.display_value || '',
              DOMAIN_ID: item.domainId || atlasFieldName,
              VOCABULARY_ID: item.system || 'Unknown',
            }))
            demographicCriteria[atlasFieldName] = conceptData
          }
        }

        // Handle dateRange attributes (e.g., startDate -> OccurrenceStartDate, endDate -> OccurrenceEndDate)
        // DateRange attributes are stored as 'standard' type with configType: 'dateRange'
        else if (isDateRangeAttribute(attr)) {
          // Convert internal format (operator, value, extent?) to Atlas format (Op, Value, Extent)
          if ('operator' in attr && 'value' in attr && attr.value) {
            const dateConfig: DateRange = {
              Op: attr.operator ? mapOperatorToAtlas(attr.operator) : 'gt',
              Value: attr.value,
              Extent: attr.extent || '', // For BETWEEN/NOT_BETWEEN ranges
            }
            demographicCriteria[atlasFieldName] = dateConfig
          }
        }
      })

      // Only add to list if we have at least one demographic attribute
      if (Object.keys(demographicCriteria).length > 0) {
        demographicCriteriaList.push(demographicCriteria as DemographicCriteria)
      }
    }
  })

  nonGroupEvents.forEach(nestedEvent => {
    const atlasEventType = mapEventTypeToAtlas(nestedEvent.eventType)
    const criteria: CriteriaGroup = {
      Criteria: {
        [atlasEventType]: {},
      },
      StartWindow: createAtlasWindow(nestedEvent.startWindow),
      ...(nestedEvent.endWindow && {
        EndWindow: createAtlasWindow(nestedEvent.endWindow),
      }),
      RestrictVisit: nestedEvent.restrictVisit ?? false,
      IgnoreObservationPeriod: nestedEvent.ignoreObservationPeriod ?? false,
      Occurrence: {
        Type: mapCardinalityTypeToAtlas(nestedEvent.cardinality?.type || 'AT_LEAST'),
        Count: nestedEvent.cardinality?.count || 1,
      },
    }

    // Add concept set reference using systemIdToAtlasId mapping
    if (nestedEvent.conceptSetId) {
      const atlasConceptSetId = systemIdToAtlasId.get(nestedEvent.conceptSetId)
      if (atlasConceptSetId !== undefined) {
        criteria.Criteria[atlasEventType].CodesetId = atlasConceptSetId
      }
    }

    // Handle further nested criteria recursively - Check attributes format
    if (nestedEvent.attributes) {
      const furtherNestedCriteria = nestedEvent.attributes.filter(attr => {
        const attributeType = attr.attributeType
        return attributeType === 'nested' && attr.nestedCriteria?.events
      })

      // Handle all standard attributes (concept, numericRange, dateRange, boolean, text, etc.)
      // Exclude only nested attributes which are handled separately
      const allAttributes = nestedEvent.attributes.filter(attr => 'configType' in attr && attr.configType !== 'nested')

      // Add attributes to the criteria
      allAttributes.forEach(attr => {
        if (hasAttributeId(attr)) {
          if ('configType' in attr && attr.configType === 'concept') {
            // Convert conceptItems to Atlas concept format for any concept-type attribute
            if ('conceptItems' in attr && attr.conceptItems && attr.conceptItems.length > 0) {
              const conceptData = attr.conceptItems.map(item => ({
                CONCEPT_CODE: item.code,
                CONCEPT_ID: item.conceptId,
                CONCEPT_NAME: item.conceptName,
                DOMAIN_ID: item.domainId,
                VOCABULARY_ID: item.system,
              }))

              // Set the appropriate field based on attribute type - use dynamic event type
              const fieldName = attr.attributeId.charAt(0).toUpperCase() + attr.attributeId.slice(1)
              criteria.Criteria[atlasEventType][fieldName] = conceptData
              console.log('[nested-criteria-processor] Added concept attribute:', {
                fieldName,
                conceptCount: conceptData.length,
              })
            } else {
              // Initialize empty array for concept-type attributes
              const fieldName = attr.attributeId.charAt(0).toUpperCase() + attr.attributeId.slice(1)
              criteria.Criteria[atlasEventType][fieldName] = []
            }
          }
          // Handle numericRange attributes (age, ageAtStart, ageAtEnd, etc.)
          else if (isNumericRangeAttribute(attr)) {
            const attributeKey = getAtlasAttributeKey(attr.attributeId, 'DemographicCriteria')
            const numericConfig: NumericRange = {
              Op: attr.operator ? mapOperatorToAtlas(attr.operator) : 'gt',
              Value: attr.value !== undefined ? parseInt(attr.value) : 0,
            }
            if (attr.extent && (attr.operator === 'BETWEEN' || attr.operator === 'NOT_BETWEEN')) {
              numericConfig.Extent = parseInt(attr.extent)
            }
            criteria.Criteria[atlasEventType][attributeKey] = numericConfig
            console.log('[nested-criteria-processor] Added numericRange attribute:', {
              eventType: atlasEventType,
              attributeKey,
              numericConfig,
            })
          }
          // TODO: Add handlers for other attribute types (dateRange, boolean, text, dateAdjustment, userDefinedPeriod)
          // For now, log unsupported types to help identify what needs implementation
          else {
            console.warn('[nested-criteria-processor] Unsupported attribute type:', {
              eventType: atlasEventType,
              attributeId: attr.attributeId,
              configType: 'configType' in attr ? attr.configType : 'unknown',
              attribute: attr,
            })
          }
        }
      })

      if (furtherNestedCriteria.length > 0) {
        let nestedCriteriaList: CriteriaGroup[] = []
        let nestedDemographicCriteriaList: DemographicCriteria[] = []
        let nestedGroupsList: GroupCriteria[] = []

        furtherNestedCriteria.forEach(attrObj => {
          if (isNestedAttribute(attrObj) && attrObj.nestedCriteria?.events) {
            const result = buildNestedCriteriaFromAttributes(attrObj.nestedCriteria.events, systemIdToAtlasId)
            nestedCriteriaList = nestedCriteriaList.concat(result.criteriaList)
            nestedDemographicCriteriaList = nestedDemographicCriteriaList.concat(result.demographicCriteriaList)

            // Add recursive processing for deeper Groups
            const deeperGroups = processNestedGroupsRecursively(attrObj.nestedCriteria.events, systemIdToAtlasId)
            nestedGroupsList = nestedGroupsList.concat(deeperGroups)
          }
        })

        if (nestedCriteriaList.length > 0 || nestedDemographicCriteriaList.length > 0 || nestedGroupsList.length > 0) {
          criteria.Criteria[atlasEventType].CorrelatedCriteria = {
            Type: 'ALL',
            CriteriaList: nestedCriteriaList,
            DemographicCriteriaList: nestedDemographicCriteriaList,
            Groups: nestedGroupsList,
          }
        }
      }
    }

    criteriaList.push(criteria)
  })

  return { criteriaList, demographicCriteriaList, groupsList }
}
