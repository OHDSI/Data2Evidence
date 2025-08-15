/**
 * Model for the query filter card system with hierarchical structure.
 * Provides interfaces and classes for managing filter cards and events,
 * with support for Atlas cohort definition conversion.
 */
import type {
  NumericRange,
  DemographicCriteria,
  CriteriaGroup,
  ConceptSet,
  AtlasCohortDefinition,
  CriteriaListItem,
} from '../types/AtlasTypes'
import type {
  QueryFilterEvent,
  QueryFilterAttribute,
  QueryFilterGroup,
  QueryFilterCriteria,
  EntryEvent,
  ExitEvent,
  InclusionCriteria,
  QueryFilterCriteriaManageData,
  QueryFilterNestedCriteria,
} from '../types/QueryFilterTypes'

// Type guards for QueryFilterAttribute discriminated union
const isNestedAttribute = (
  attr: QueryFilterAttribute
): attr is QueryFilterAttribute & {
  attributeType: 'nested'
  nestedCriteria: QueryFilterNestedCriteria
} => {
  return attr.attributeType === 'nested'
}

const isNumericRangeAttribute = (
  attr: QueryFilterAttribute
): attr is QueryFilterAttribute & {
  attributeId: string
  attributeType: 'numericRange'
  operator: string
  value: string
} => {
  return attr.attributeType === 'numericRange'
}

const hasAttributeId = (attr: QueryFilterAttribute): attr is Extract<QueryFilterAttribute, { attributeId: string }> => {
  return 'attributeId' in attr
}

export class QueryFilterCriteriaManager {
  private entryEvents: EntryEvent
  private exitEvents: ExitEvent
  private inclusionCriteria: InclusionCriteria

  constructor(data: QueryFilterCriteriaManageData = {}) {
    try {
      if (data.entryEvents) {
        this.entryEvents = {
          primaryCriteriaLimit: data.entryEvents.primaryCriteriaLimit || 'ALL',
          events: this.transformEvents(data.entryEvents.events || []),
          priorDays: data.entryEvents.priorDays || 0,
          postDays: data.entryEvents.postDays || 0,
        }
      } else {
        this.entryEvents = {
          primaryCriteriaLimit: 'ALL',
          events: [],
          priorDays: 0,
          postDays: 0,
        }
      }

      if (data.exitEvents) {
        this.exitEvents = {
          endStrategy: data.exitEvents.endStrategy || 'CONT_OBS',
          censoringCriteria: data.exitEvents.censoringCriteria || [],
        }
      } else {
        this.exitEvents = {
          endStrategy: 'CONT_OBS',
          censoringCriteria: [],
        }
      }

      if (data.inclusionCriteria) {
        this.inclusionCriteria = {
          qualifyingEventsLimit: data.inclusionCriteria.qualifyingEventsLimit || 'ALL',
          criteria:
            data.inclusionCriteria.criteria.map(criteria => ({
              id: criteria.id,
              title: criteria.title,
              description: criteria.description,
              criteriaType: criteria.criteriaType,
              events: this.transformEvents(criteria.events || []),
            })) || [],
        }
      } else {
        this.inclusionCriteria = {
          qualifyingEventsLimit: 'ALL',
          criteria: [],
        }
      }
    } catch (error) {
      console.error('Error initializing QueryFilterCriteriaManager:', error)
      throw error
    }
  }

  private generateId(): string {
    return `criteria_${Math.random().toString(36).substring(2)}`
  }

  // Criteria management
  getCriteria(): QueryFilterCriteria {
    return {
      id: this.generateId(),
      criteria: this.inclusionCriteria.criteria || [],
    }
  }

  setCriteriaType(type: 'ALL' | 'EARLIEST' | 'LATEST'): void {
    this.inclusionCriteria.qualifyingEventsLimit = type
  }

  // Primary criteria management
  getPrimaryEvents(): EntryEvent {
    return this.entryEvents
  }

  updatePrimaryEvents(events: QueryFilterEvent[]): void {
    this.entryEvents.events = events
  }

  // Primary criteria management
  getCensoringCriteria(): ExitEvent {
    return this.exitEvents
  }

  updateCensoringCriteria(events: QueryFilterEvent[]): void {
    this.exitEvents.censoringCriteria = events
  }

  // Group management
  addCriteria(group?: Partial<QueryFilterGroup>): QueryFilterGroup {
    const newGroup: QueryFilterGroup = {
      id: group?.id || `criteria_${Math.random().toString(36).substring(2)}`,
      title: group?.title || 'Group 1',
      description: group?.description || 'Description 1',
      criteriaType: group?.criteriaType || 'ALL',
      events: group?.events || [],
    }
    if (!this.inclusionCriteria.criteria) {
      this.inclusionCriteria.criteria = []
    }
    this.inclusionCriteria.criteria.push(newGroup)
    return newGroup
  }

  removeGroup(groupId: string): boolean {
    if (this.inclusionCriteria.criteria) {
      const index = this.inclusionCriteria.criteria.findIndex((g: QueryFilterGroup) => g.id === groupId)
      if (index > -1) {
        this.inclusionCriteria.criteria.splice(index, 1)
        return true
      }
    }
    return false
  }

  getGroup(groupId: string): QueryFilterGroup | undefined {
    return this.inclusionCriteria.criteria?.find((g: QueryFilterGroup) => g.id === groupId)
  }

  updateGroup(groupId: string, updates: Partial<QueryFilterGroup>): boolean {
    const group = this.getGroup(groupId)
    if (group) {
      Object.assign(group, updates)
      return true
    }
    return false
  }

  removeEventFromGroup(groupId: string, eventId: string): boolean {
    const group = this.getGroup(groupId)
    if (group) {
      const index = group.events.findIndex(event => event.id === eventId)
      if (index > -1) {
        group.events.splice(index, 1)
        return true
      }
    }
    return false
  }

  // Legacy alias for backward compatibility - will be deprecated
  removeFilterFromGroup(groupId: string, filterId: string): boolean {
    return this.removeEventFromGroup(groupId, filterId)
  }

  // Transform events from new structure to internal structure
  private transformEvents(events: QueryFilterEvent[]): QueryFilterEvent[] {
    const transformedEvents: QueryFilterEvent[] = []

    events.forEach(event => {
      const processedAttributes: QueryFilterAttribute[] = []
      const remainingAttributes: QueryFilterAttribute[] = []

      // Main event
      const mainEvent: QueryFilterEvent = {
        id: event.id,
        conceptSet: event.conceptSet || '',
        conceptSetId: event.conceptSetId,
        conceptSetDetails: event.conceptSetDetails,
        selectedConceptSet: event.selectedConceptSet,
        conceptSetLoading: event.conceptSetLoading,
        criteriaType: event.criteriaType,
        eventType: event.eventType,
        isExpanded: event.isExpanded,
        cardinality: event.cardinality,
        attributes: [], // Will be populated with remaining attributes
      }
      transformedEvents.push(mainEvent)

      // Process attributes - keep original attributes format
      if (event.attributes && event.attributes.length > 0) {
        event.attributes.forEach(attr => {
          // Normalize attributeType from either attributeType or type field
          const attributeType = attr.attributeType

          if (attributeType === 'nested' && attr.nestedCriteria) {
            // Keep nested criteria in the attributes format, just process the events
            const processedAttr: QueryFilterAttribute = {
              id: attr.id,
              attributeType: 'nested',
              nestedCriteria: {
                ...attr.nestedCriteria,
                events: this.transformNestedEvents(attr.nestedCriteria.events || [], mainEvent.id),
              },
            }
            remainingAttributes.push(processedAttr)
            processedAttributes.push(attr)
          } else if (hasAttributeId(attr) && attributeType && attributeType !== 'nested') {
            if (!mainEvent.selectedAttributes) {
              mainEvent.selectedAttributes = []
            }
            const attributeId = attr.attributeId
            mainEvent.selectedAttributes.push(attributeId)

            mainEvent.attributeConfig = {
              id: attributeId,
              name: attributeId,
              description: '',
              type: attributeType || 'conceptSet',
              category: 'criteria-specific',
            }

            if (attributeId === 'age' && attributeType === 'numericRange') {
              mainEvent.attributeConfig.operator = attr.operator || 'GREATER_THAN'
              mainEvent.attributeConfig.value = attr.value ? parseInt(attr.value) : undefined
            }

            processedAttributes.push(attr)
          } else {
            remainingAttributes.push(attr)
          }
        })
      }

      mainEvent.attributes = remainingAttributes
    })

    return transformedEvents
  }

  private transformNestedEvents(events: QueryFilterEvent[], parentId: string): QueryFilterEvent[] {
    return events.map(event => {
      const nestedChildEvent: QueryFilterEvent = {
        id: event.id,
        conceptSet: event.conceptSet || '',
        conceptSetId: event.conceptSetId,
        conceptSetDetails: event.conceptSetDetails,
        selectedConceptSet: event.selectedConceptSet,
        conceptSetLoading: event.conceptSetLoading,
        criteriaType: event.criteriaType,
        eventType: event.eventType,
        isExpanded: event.isExpanded,
        cardinality: event.cardinality,
        parentEventId: parentId,
      }

      if (event.attributes && event.attributes.length > 0) {
        nestedChildEvent.attributes = event.attributes.map(attr => {
          const attributeType = attr.attributeType

          if (attributeType === 'nested' && attr.nestedCriteria) {
            return {
              id: attr.id,
              attributeType: 'nested',
              nestedCriteria: {
                ...attr.nestedCriteria,
                events: this.transformNestedEvents(attr.nestedCriteria.events || [], nestedChildEvent.id),
              },
            }
          }
          return attr
        })
      }

      return nestedChildEvent
    })
  }

  convertToAtlasFormat(): AtlasCohortDefinition {
    const conceptSets: ConceptSet[] = []
    const usedConceptSetIds = new Set<string>()
    const systemIdToAtlasId = new Map<string, number>() // System ID → Atlas sequential ID

    this.inclusionCriteria.criteria.forEach((group: QueryFilterGroup) => {
      // Collect all events including nested ones
      const allGroupEvents = this.collectAllEvents(group.events)
      allGroupEvents.forEach(event => {
        if (event.conceptSetDetails && event.conceptSetDetails.length > 0 && event.conceptSetId) {
          const systemConceptSetId = event.conceptSetId
          if (!usedConceptSetIds.has(systemConceptSetId)) {
            usedConceptSetIds.add(systemConceptSetId)
            const atlasSequentialId = conceptSets.length // Use sequential ID starting from 0
            systemIdToAtlasId.set(systemConceptSetId, atlasSequentialId)

            const conceptSetDef: ConceptSet = {
              id: atlasSequentialId, // Sequential ID for Atlas JSON
              name: event.conceptSet || `Concept Set ${systemConceptSetId}`,
              expression: {
                items: event.conceptSetDetails,
              },
            }

            // Add conceptSetId field with system database ID
            conceptSetDef.conceptSetId = parseInt(systemConceptSetId)

            conceptSets.push(conceptSetDef)
          }
        }
      })
    })

    // Also collect concept sets from entryEvents.events
    if (this.entryEvents?.events) {
      this.entryEvents.events.forEach(event => {
        if (event.conceptSetDetails && event.conceptSetDetails.length > 0 && event.conceptSetId) {
          const systemConceptSetId = event.conceptSetId
          if (!usedConceptSetIds.has(systemConceptSetId)) {
            usedConceptSetIds.add(systemConceptSetId)
            const atlasSequentialId = conceptSets.length // Use sequential ID starting from current length
            systemIdToAtlasId.set(systemConceptSetId, atlasSequentialId)

            const conceptSetDef: ConceptSet = {
              id: atlasSequentialId, // Sequential ID for Atlas JSON
              name: event.conceptSet || `Concept Set ${systemConceptSetId}`,
              expression: {
                items: event.conceptSetDetails,
              },
            }

            // Add conceptSetId field with system database ID
            conceptSetDef.conceptSetId = parseInt(systemConceptSetId)

            conceptSets.push(conceptSetDef)
          }
        }
      })
    }

    // Also collect concept sets from exitEvents.censoringCriteria
    if (this.exitEvents?.censoringCriteria) {
      console.log(
        '🔧 convertToAtlasFormat: Collecting concept sets from censoring criteria:',
        this.exitEvents.censoringCriteria.length
      )
      this.exitEvents.censoringCriteria.forEach((event, index) => {
        console.log(`🔧 Censoring event ${index}:`, {
          conceptSetId: event.conceptSetId,
          conceptSet: event.conceptSet,
          hasDetails: !!event.conceptSetDetails?.length,
          detailsCount: event.conceptSetDetails?.length || 0,
        })
        if (event.conceptSetDetails && event.conceptSetDetails.length > 0 && event.conceptSetId) {
          const systemConceptSetId = event.conceptSetId
          if (!usedConceptSetIds.has(systemConceptSetId)) {
            usedConceptSetIds.add(systemConceptSetId)
            const atlasSequentialId = conceptSets.length // Use sequential ID starting from current length
            systemIdToAtlasId.set(systemConceptSetId, atlasSequentialId)

            const conceptSetDef: ConceptSet = {
              id: atlasSequentialId, // Sequential ID for Atlas JSON
              name: event.conceptSet || `Concept Set ${systemConceptSetId}`,
              expression: {
                items: event.conceptSetDetails,
              },
            }

            // Add conceptSetId field with system database ID
            conceptSetDef.conceptSetId = parseInt(systemConceptSetId)

            conceptSets.push(conceptSetDef)
            console.log(
              `🔧 Added censoring concept set:`,
              conceptSetDef.name,
              `(Atlas ID: ${atlasSequentialId}, System ID: ${systemConceptSetId})`
            )
          }
        } else {
          console.log(`🔧 Skipping censoring event ${index}: missing details or already processed`)
        }
      })
    }

    // SECOND PASS: Collect concept sets from nested events that were missed in initial collection
    // This addresses timing issues where nested events are added after initial collection
    this.collectNestedConceptSets(
      this.inclusionCriteria.criteria || [],
      systemIdToAtlasId,
      usedConceptSetIds,
      conceptSets
    )
    if (this.entryEvents?.events) {
      this.collectNestedConceptSetsFromEvents(
        this.entryEvents.events,
        systemIdToAtlasId,
        usedConceptSetIds,
        conceptSets
      )
    }
    if (this.exitEvents?.censoringCriteria) {
      this.collectNestedConceptSetsFromEvents(
        this.exitEvents.censoringCriteria,
        systemIdToAtlasId,
        usedConceptSetIds,
        conceptSets
      )
    }

    const atlasDef: AtlasCohortDefinition = {
      cdmVersionRange: '>=5.0.0',
      ConceptSets: conceptSets, // Now populated with all concept sets
      PrimaryCriteria: {
        CriteriaList: [],
        ObservationWindow: {
          PriorDays: this.entryEvents.priorDays || 0,
          PostDays: this.entryEvents.postDays || 0,
        },
        PrimaryCriteriaLimit: {
          Type: this.mapCriteriaTypeToAtlas(this.entryEvents.primaryCriteriaLimit || 'ALL'),
        },
      },
      QualifiedLimit: {
        Type: this.mapCriteriaTypeToAtlas(this.inclusionCriteria.qualifyingEventsLimit || 'ALL'),
      },
      ExpressionLimit: {
        Type: this.mapCriteriaTypeToAtlas(this.inclusionCriteria.qualifyingEventsLimit || 'ALL'),
      },
      InclusionRules: (this.inclusionCriteria.criteria || []).map((group: QueryFilterGroup) => {
        return {
          name: group.title, // Maps group.title → Atlas InclusionRule.name
          description: group.description, // Maps group.description → Atlas InclusionRule.description
          expression: {
            Type: group.criteriaType, // Maps criteriaType → Atlas expression.Type
            Count: group.criteriaCount, // Maps criteriaCount → Atlas expression.Count (for AT_LEAST/AT_MOST)
            CriteriaList: group.events.flatMap(event =>
              [event]
                .filter(e => e.eventType !== 'demographic' && e.eventType !== 'group' && e.eventType) // Exclude demographic and group events
                .map(event => {
                  const atlasEventType = this.mapEventTypeToAtlas(event.eventType!)
                  const criteria: CriteriaGroup = {
                    Criteria: {
                      [atlasEventType]: {
                        // Add CodesetId if available
                        ...(event.conceptSetId && { CodesetId: systemIdToAtlasId.get(event.conceptSetId) }),
                      },
                    },
                    StartWindow: {
                      Start: {
                        Coeff: -1,
                      },
                      End: {
                        Coeff: 1,
                      },
                      UseEventEnd: false,
                    },
                    Occurrence: {
                      Type: this.mapCardinalityTypeToAtlas(event.cardinality?.type || 'AT_LEAST'), // Maps cardinality.type → Atlas Occurrence.Type
                      Count: event.cardinality?.count || 1, // Maps cardinality.count → Atlas Occurrence.Count
                      ...this.mapCardinalityExtras(event.cardinality?.using ?? 'ALL'),
                    },
                  }

                  // Check for age attributes that belong directly to this event
                  const ageAttributes = group.events.filter(
                    e =>
                      e.parentEventId === event.id &&
                      e.attributeConfig?.type === 'numericRange' &&
                      e.attributeConfig?.id === 'age'
                  )
                  if (ageAttributes.length > 0) {
                    criteria.Criteria[atlasEventType].Age = {
                      Op: 'gt',
                    }
                  }

                  // Check for nested criteria in attributes format

                  const attributesNestedCriteria =
                    event.attributes?.filter(attr => {
                      return attr.attributeType === 'nested' && attr.nestedCriteria?.events
                    }) || []

                  if (attributesNestedCriteria.length > 0) {
                    let criteriaList: CriteriaGroup[] = []
                    let demographicCriteriaList: DemographicCriteria[] = []

                    // Process nested criteria from attributes
                    attributesNestedCriteria.forEach(attr => {
                      if (attr.attributeType === 'nested' && attr.nestedCriteria?.events) {
                        const result = this.buildNestedCriteriaFromAttributes(
                          attr.nestedCriteria.events,
                          systemIdToAtlasId
                        )
                        criteriaList = criteriaList.concat(result.criteriaList)
                        demographicCriteriaList = demographicCriteriaList.concat(result.demographicCriteriaList)
                      }
                    })

                    if (criteriaList.length > 0 || demographicCriteriaList.length > 0) {
                      criteria.Criteria[atlasEventType].CorrelatedCriteria = {
                        Type: 'ALL',
                        CriteriaList: criteriaList,
                        DemographicCriteriaList: demographicCriteriaList,
                        Groups: [],
                      }
                    }
                  }

                  // Handle concept-type attributes on the main event
                  if (event.attributes) {
                    const conceptAttributes = event.attributes.filter(
                      attr => hasAttributeId(attr) && 'configType' in attr && attr.configType === 'concept'
                    )

                    conceptAttributes.forEach(attr => {
                      if (
                        hasAttributeId(attr) &&
                        'conceptItems' in attr &&
                        attr.conceptItems &&
                        attr.conceptItems.length > 0
                      ) {
                        const conceptData = attr.conceptItems.map(item => ({
                          CONCEPT_CODE: item.code,
                          CONCEPT_ID: item.conceptId,
                          CONCEPT_NAME: item.conceptName,
                          DOMAIN_ID: item.domainId,
                          VOCABULARY_ID: item.system,
                        }))

                        const fieldName = attr.attributeId.charAt(0).toUpperCase() + attr.attributeId.slice(1)
                        criteria.Criteria[atlasEventType][fieldName] = conceptData
                      }
                    })
                  }

                  return criteria
                })
            ),
            DemographicCriteriaList: group.events
              .filter(event => event.eventType === 'demographic')
              .flatMap(event => {
                // Process demographic events and their age attributes
                const demographicEvents = [event]

                const demographicCriteria: DemographicCriteria[] = []

                demographicEvents.forEach(event => {
                  // Also check for age attributes directly in the original attributes array (for events not fully transformed)
                  const eventAny = event
                  if (eventAny.attributes && Array.isArray(eventAny.attributes)) {
                    eventAny.attributes.forEach((attr: QueryFilterAttribute) => {
                      if (isNumericRangeAttribute(attr) && attr.attributeId === 'age') {
                        const ageConfig: NumericRange = {
                          Op: 'gt', // Default operator
                          Value: 0, // Default value
                        }

                        // Map operator and value if available
                        if (attr.operator) {
                          ageConfig.Op = this.mapOperatorToAtlas(attr.operator)
                        }

                        if (attr.value !== undefined) {
                          ageConfig.Value = parseInt(attr.value)
                        }

                        demographicCriteria.push({
                          Age: ageConfig,
                        })
                      }
                    })
                  }
                })

                return demographicCriteria
              }),
            Groups: this.processNestedGroups(group.events, systemIdToAtlasId),
          },
        }
      }),
      EndStrategy: this.buildEndStrategy(),
      CensoringCriteria: (this.exitEvents?.censoringCriteria || [])
        .filter(event => event.eventType && event.conceptSetId) // Only events with eventType and conceptSetId
        .map(event => {
          const eventType = this.mapEventTypeToAtlas(event.eventType!)
          const criteria: CriteriaListItem = {
            [eventType]: {
              CodesetId: systemIdToAtlasId.get(event.conceptSetId!), // Use Atlas sequential ID
            },
          }

          // Check for nested criteria in attributes format for exit events
          const attributesNestedCriteria =
            event.attributes?.filter(attr => {
              return attr.attributeType === 'nested' && attr.nestedCriteria?.events
            }) || []

          if (attributesNestedCriteria.length > 0) {
            let criteriaList: CriteriaGroup[] = []
            let demographicCriteriaList: DemographicCriteria[] = []

            // Process nested criteria from attributes
            attributesNestedCriteria.forEach(attr => {
              if (isNestedAttribute(attr) && attr.nestedCriteria?.events) {
                const result = this.buildNestedCriteriaFromAttributes(attr.nestedCriteria.events, systemIdToAtlasId)
                criteriaList = criteriaList.concat(result.criteriaList)
                demographicCriteriaList = demographicCriteriaList.concat(result.demographicCriteriaList)
              }
            })

            if (criteriaList.length > 0 || demographicCriteriaList.length > 0) {
              criteria[eventType].CorrelatedCriteria = {
                Type:
                  attributesNestedCriteria[0] && isNestedAttribute(attributesNestedCriteria[0])
                    ? attributesNestedCriteria[0].nestedCriteria?.criteriaType || 'ALL'
                    : 'ALL',
                CriteriaList: criteriaList,
                DemographicCriteriaList: demographicCriteriaList,
                Groups: [],
              }
            }
          }

          // Handle concept-type attributes on the main exit event
          if (event.attributes) {
            const conceptAttributes = event.attributes.filter(
              attr => hasAttributeId(attr) && 'configType' in attr && attr.configType === 'concept'
            )

            conceptAttributes.forEach(attr => {
              if (hasAttributeId(attr) && 'conceptItems' in attr && attr.conceptItems && attr.conceptItems.length > 0) {
                const conceptData = attr.conceptItems.map(item => ({
                  CONCEPT_CODE: item.code,
                  CONCEPT_ID: item.conceptId,
                  CONCEPT_NAME: item.conceptName,
                  DOMAIN_ID: item.domainId,
                  VOCABULARY_ID: item.system,
                }))

                const fieldName = attr.attributeId.charAt(0).toUpperCase() + attr.attributeId.slice(1)
                criteria[eventType][fieldName] = conceptData
              }
            })
          }

          return criteria
        }),
      CollapseSettings: {
        CollapseType: 'ERA',
        EraPad: 0,
      },
      CensorWindow: {},
    }

    // Convert entryEvents to PrimaryCriteria.CriteriaList
    if (this.entryEvents?.events && this.entryEvents.events.length > 0) {
      atlasDef.PrimaryCriteria.CriteriaList = this.entryEvents.events
        .filter(event => event.eventType && event.conceptSetId) // Only events with eventType and conceptSetId
        .map(event => {
          const eventType = this.mapEventTypeToAtlas(event.eventType!)
          const criteria: CriteriaListItem = {
            [eventType]: {
              CodesetId: systemIdToAtlasId.get(event.conceptSetId!),
            },
          }

          // Check for nested criteria in attributes format for entry events
          const attributesNestedCriteria =
            event.attributes?.filter(attr => {
              return attr.attributeType === 'nested' && attr.nestedCriteria?.events
            }) || []

          if (attributesNestedCriteria.length > 0) {
            let criteriaList: CriteriaGroup[] = []
            let demographicCriteriaList: DemographicCriteria[] = []

            // Process nested criteria from attributes
            attributesNestedCriteria.forEach(attr => {
              if (isNestedAttribute(attr) && attr.nestedCriteria?.events) {
                const result = this.buildNestedCriteriaFromAttributes(attr.nestedCriteria.events, systemIdToAtlasId)
                criteriaList = criteriaList.concat(result.criteriaList)
                demographicCriteriaList = demographicCriteriaList.concat(result.demographicCriteriaList)
              }
            })

            if (criteriaList.length > 0 || demographicCriteriaList.length > 0) {
              criteria[eventType].CorrelatedCriteria = {
                Type:
                  attributesNestedCriteria[0] && isNestedAttribute(attributesNestedCriteria[0])
                    ? attributesNestedCriteria[0].nestedCriteria?.criteriaType || 'ALL'
                    : 'ALL',
                CriteriaList: criteriaList,
                DemographicCriteriaList: demographicCriteriaList,
                Groups: [],
              }
            }
          }

          // Handle concept-type attributes on the main entry event
          if (event.attributes) {
            const conceptAttributes = event.attributes.filter(attr => {
              const hasAttrId = hasAttributeId(attr)
              const hasConfigType = 'configType' in attr
              const isConceptType = hasConfigType && attr.configType === 'concept'

              return hasAttrId && hasConfigType && isConceptType
            })

            conceptAttributes.forEach(attr => {
              if (hasAttributeId(attr) && 'conceptItems' in attr && attr.conceptItems && attr.conceptItems.length > 0) {
                const conceptData = attr.conceptItems.map(item => {
                  const conceptName = item.conceptName || item.text || item.display_value || item.concept || ''

                  return {
                    CONCEPT_CODE: item.code || '',
                    CONCEPT_ID: item.conceptId,
                    CONCEPT_NAME: conceptName,
                    DOMAIN_ID: item.domainId || 'Unknown',
                    VOCABULARY_ID: item.system || 'Unknown',
                  }
                })

                const fieldName = attr.attributeId.charAt(0).toUpperCase() + attr.attributeId.slice(1)
                criteria[eventType][fieldName] = conceptData
              }
            })
          }

          return criteria
        })
      atlasDef.cdmVersionRange = '>=5.0.0'
    }

    // CensoringCriteria, CollapseSettings, and CensorWindow are already set above

    // ConceptSets already populated above

    // Also add CodesetId to the criteria (use Atlas sequential IDs)
    let ruleIndex = 0
    atlasDef.InclusionRules.forEach(rule => {
      let criteriaIndex = 0
      rule.expression.CriteriaList.forEach(criteriaItem => {
        // Find the corresponding event for this specific criteriaItem
        const correspondingGroup = (this.inclusionCriteria.criteria || [])[ruleIndex]
        if (correspondingGroup && correspondingGroup.events[criteriaIndex]) {
          const event = correspondingGroup.events[criteriaIndex]
          if (event && event.conceptSetId && event.eventType) {
            const eventType = this.mapEventTypeToAtlas(event.eventType)
            if (criteriaItem.Criteria[eventType]) {
              const atlasId = systemIdToAtlasId.get(event.conceptSetId)
              if (atlasId !== undefined) {
                criteriaItem.Criteria[eventType].CodesetId = atlasId // Use Atlas sequential ID
              } else {
                console.error(`Missing Atlas ID mapping for concept set ${event.conceptSetId}`)
              }
            }
          }
        }
        criteriaIndex++
      })
      ruleIndex++
    })

    return atlasDef
  }

  private buildEndStrategy() {
    if (this.exitEvents?.endStrategy === 'FIXED' && this.exitEvents.fixedDuration) {
      return {
        DateOffset: {
          DateField: this.exitEvents.fixedDuration.dateField,
          Offset: this.exitEvents.fixedDuration.offset,
        },
      }
    }

    if (this.exitEvents?.endStrategy === 'CONT_DRUG' && this.exitEvents.contDrugSettings) {
      return {
        CustomEra: {
          DrugCodesetId: parseInt(this.exitEvents.contDrugSettings.conceptSetId) || 0,
          GapDays: this.exitEvents.contDrugSettings.gapDays,
          Offset: this.exitEvents.contDrugSettings.offset,
          DaysSupplyOverride: this.exitEvents.contDrugSettings.daysSupplyOverride,
        },
      }
    }

    return {}
  }

  // Helper method to recursively process nested groups
  private processNestedGroups(events: QueryFilterEvent[], systemIdToAtlasId: Map<string, number>) {
    return events
      .filter(event => event.eventType === 'group' && event.nestedCriteria)
      .map(groupEvent => {
        return {
          Type: groupEvent.nestedCriteria!.criteriaType,
          CriteriaList: groupEvent
            .nestedCriteria!.events.filter(
              nestedEvent =>
                nestedEvent.eventType !== 'demographic' && nestedEvent.eventType !== 'group' && nestedEvent.eventType
            )
            .map(nestedEvent => {
              const atlasEventType = this.mapEventTypeToAtlas(nestedEvent.eventType!)
              return {
                Criteria: {
                  [atlasEventType]: {
                    ...(nestedEvent.conceptSetId && { CodesetId: systemIdToAtlasId.get(nestedEvent.conceptSetId) }),
                  },
                },
                StartWindow: {
                  Start: {
                    Coeff: -1,
                  },
                  End: {
                    Coeff: 1,
                  },
                  UseEventEnd: false,
                },
                Occurrence: {
                  Type: this.mapCardinalityTypeToAtlas(nestedEvent.cardinality?.type || 'AT_LEAST'),
                  Count: nestedEvent.cardinality?.count || 1,
                },
              }
            }),
          DemographicCriteriaList: groupEvent.nestedCriteria.events
            .filter(nestedEvent => nestedEvent.eventType === 'demographic')
            .flatMap(() => {
              // Process demographic events in nested groups
              const demographicCriteria: DemographicCriteria[] = []
              // Add age processing logic similar to main demographic processing if needed
              return demographicCriteria
            }),
          Groups: this.processNestedGroups(groupEvent.nestedCriteria!.events, systemIdToAtlasId), // Recursive call for further nesting
        }
      })
  }

  // Helper method to recursively collect all events including nested ones
  private collectAllEvents(events: QueryFilterEvent[]): QueryFilterEvent[] {
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

  // Helper methods for mapping values to Atlas format
  private mapCriteriaTypeToAtlas(type: string) {
    switch (type) {
      case 'EARLIEST':
        return 'First'
      case 'LATEST':
        return 'Last'
      case 'ALL':
      default:
        return 'All'
    }
  }

  private mapCardinalityTypeToAtlas(type: string): number {
    switch (type) {
      case 'EXACTLY':
        return 0 // Atlas Type 0 = exactly
      case 'AT_MOST':
        return 1 // Atlas Type 1 = at most
      case 'AT_LEAST':
      default:
        return 2 // Atlas Type 2 = at least
    }
  }

  private mapEventTypeToAtlas(eventType: string): string {
    switch (eventType) {
      case 'conditionOccurrence':
        return 'ConditionOccurrence'
      case 'drugExposure':
        return 'DrugExposure'
      case 'procedureOccurrence':
        return 'ProcedureOccurrence'
      case 'measurement':
        return 'Measurement'
      case 'observation':
        return 'Observation'
      case 'visitOccurrence':
        return 'VisitOccurrence'
      case 'death':
        return 'Death'
      case 'deviceExposure':
        return 'DeviceExposure'
      case 'drugEra':
        return 'DrugEra'
      case 'locationRegion':
        return 'LocationRegion'
      default:
        // Convert camelCase to PascalCase for unknown event types
        return this.toPascalCase(eventType)
    }
  }

  // Helper method to convert camelCase to PascalCase
  private toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  private mapOperatorToAtlas(operator: string): NumericRange['Op'] {
    // TODO: Verify Atlas format mappings for BETWEEN and NOT_BETWEEN operators
    // These mappings are educated guesses based on common patterns
    switch (operator) {
      case 'GREATER_THAN':
        return 'gt'
      case 'LESS_THAN':
        return 'lt'
      case 'GREATER_THAN_OR_EQUAL':
        return 'gte'
      case 'LESS_THAN_OR_EQUAL':
        return 'lte'
      case 'EQUAL':
        return 'eq'
      case 'BETWEEN':
        return 'bt' // Common abbreviation for "between"
      case 'NOT_BETWEEN':
        return 'nbt' // Not between - may need verification
      default:
        return 'gt'
    }
  }

  private mapCardinalityExtras(using: string) {
    switch (using) {
      case 'ALL':
        return { CountColumn: 'START_DATE' }
      case 'DISTINCT_CONCEPT':
        return { CountColumn: 'DOMAIN_CONCEPT', IsDistinct: true }
      case 'DISTINCT_START_DATE':
        return { CountColumn: 'START_DATE', IsDistinct: true }
      case 'DISTINCT_VISIT':
        return { CountColumn: 'VISIT_ID', IsDistinct: true }
      default:
        return {}
    }
  }

  // Serialization
  toJSON(): QueryFilterCriteriaManageData {
    return {
      inclusionCriteria: this.inclusionCriteria,
      entryEvents: this.entryEvents,
      exitEvents: this.exitEvents,
    }
  }

  static fromJSON(data: QueryFilterCriteriaManageData): QueryFilterCriteriaManager {
    return new QueryFilterCriteriaManager(data)
  }

  // Helper method to build nested criteria from attributes.nestedCriteria format
  private buildNestedCriteriaFromAttributes(
    nestedCriteriaEvents: QueryFilterEvent[],
    systemIdToAtlasId: Map<string, number>
  ): { criteriaList: CriteriaGroup[]; demographicCriteriaList: DemographicCriteria[] } {
    const criteriaList: CriteriaGroup[] = []
    const demographicCriteriaList: DemographicCriteria[] = []

    nestedCriteriaEvents.forEach(nestedEvent => {
      const atlasEventType = this.mapEventTypeToAtlas(nestedEvent.eventType)
      const criteria: CriteriaGroup = {
        Criteria: {
          [atlasEventType]: {},
        },
        StartWindow: {
          Start: {
            Coeff: -1,
          },
          End: {
            Coeff: 1,
          },
          UseEventEnd: false,
        },
        Occurrence: {
          Type: this.mapCardinalityTypeToAtlas(nestedEvent.cardinality?.type || 'AT_LEAST'),
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

        // Handle attributes - both demographic and concept-type attributes
        const allAttributes = nestedEvent.attributes.filter(
          attr => 'configType' in attr && attr.configType === 'concept'
        )

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
              } else {
                // Initialize empty array for concept-type attributes
                const fieldName = attr.attributeId.charAt(0).toUpperCase() + attr.attributeId.slice(1)
                criteria.Criteria[atlasEventType][fieldName] = []
              }
            } else if (attr.attributeId === 'age' && isNumericRangeAttribute(attr)) {
              const ageConfig: NumericRange = {
                Value: 0,
                Op: 'gt', // Default operator
              }
              if (attr.operator) {
                ageConfig.Op = this.mapOperatorToAtlas(attr.operator)
              }
              if (attr.value !== undefined) {
                ageConfig.Value = parseInt(attr.value)
              }
              criteria.Criteria[atlasEventType].Age = ageConfig
            }
          }
        })

        if (furtherNestedCriteria.length > 0) {
          let nestedCriteriaList: CriteriaGroup[] = []
          let nestedDemographicCriteriaList: DemographicCriteria[] = []

          furtherNestedCriteria.forEach(attrObj => {
            if (isNestedAttribute(attrObj) && attrObj.nestedCriteria?.events) {
              const result = this.buildNestedCriteriaFromAttributes(attrObj.nestedCriteria.events, systemIdToAtlasId)
              nestedCriteriaList = nestedCriteriaList.concat(result.criteriaList)
              nestedDemographicCriteriaList = nestedDemographicCriteriaList.concat(result.demographicCriteriaList)
            }
          })

          if (nestedCriteriaList.length > 0 || nestedDemographicCriteriaList.length > 0) {
            criteria.Criteria[atlasEventType].CorrelatedCriteria = {
              Type: 'ALL',
              CriteriaList: nestedCriteriaList,
              DemographicCriteriaList: nestedDemographicCriteriaList,
              Groups: [],
            }
          }
        }
      }

      criteriaList.push(criteria)
    })

    return { criteriaList, demographicCriteriaList }
  }

  // Update qualifying events limit
  updateQualifyingEventsLimit(limit: 'ALL' | 'EARLIEST' | 'LATEST') {
    this.inclusionCriteria.qualifyingEventsLimit = limit
  }
  updatePrimaryCriteriaLimit(limit: 'ALL' | 'EARLIEST' | 'LATEST') {
    this.entryEvents.primaryCriteriaLimit = limit
  }
  updateEndStrategy(limit: 'CONT_OBS' | 'FIXED' | 'CONT_DRUG') {
    this.exitEvents.endStrategy = limit
  }
  updateEntryDays(type: 'PRIOR' | 'POST', days: number) {
    if (type === 'PRIOR') {
      this.entryEvents.priorDays = days
    } else if (type === 'POST') {
      this.entryEvents.postDays = days
    }
  }

  updateFixedDuration(eventDateOffset: 'StartDate' | 'EndDate', daysOffset: number) {
    this.exitEvents.fixedDuration = {
      dateField: eventDateOffset,
      offset: daysOffset,
    }
  }

  updateContDrugSettings(conceptSetId: string, gapDays: number, offset: number, daysSupplyOverride: number) {
    this.exitEvents.contDrugSettings = {
      conceptSetId,
      gapDays,
      offset,
      daysSupplyOverride,
    }
  }

  // Add criteria group
  addCriteriaGroup(group: Partial<QueryFilterGroup>) {
    const newGroup: QueryFilterGroup = {
      id: group.id || `criteria_${Math.random().toString(36).substring(2)}`,
      title: group.title || '',
      description: group.description || '',
      criteriaType: group.criteriaType || 'ALL',
      events: group.events || [],
    }

    if (!this.inclusionCriteria.criteria) {
      this.inclusionCriteria.criteria = []
    }
    this.inclusionCriteria.criteria.push(newGroup)
  }

  // Update criteria group
  updateCriteriaGroup(index: number, updatedGroup: QueryFilterGroup) {
    if (this.inclusionCriteria.criteria && index >= 0 && index < this.inclusionCriteria.criteria.length) {
      this.inclusionCriteria.criteria[index] = updatedGroup
    }
  }

  // Remove criteria group
  removeCriteriaGroup(index: number) {
    if (this.inclusionCriteria.criteria && index >= 0 && index < this.inclusionCriteria.criteria.length) {
      this.inclusionCriteria.criteria.splice(index, 1)
    }
  }

  // Clear all criteria
  clearAllCriteria() {
    this.inclusionCriteria.criteria = []
  }

  // Set criteria (for Atlas loading)
  setData({
    inclusionCriteria,
    entryEvents,
    exitEvents,
  }: {
    inclusionCriteria: InclusionCriteria
    entryEvents: EntryEvent
    exitEvents: ExitEvent
  }) {
    this.inclusionCriteria = inclusionCriteria
    this.entryEvents = entryEvents
    this.exitEvents = exitEvents
  }

  getData() {
    return {
      inclusionCriteria: this.inclusionCriteria,
      entryEvents: this.entryEvents,
      exitEvents: this.exitEvents,
    }
  }

  // Helper method to collect concept sets from nested events that were missed in initial collection
  private collectNestedConceptSets(
    groups: QueryFilterGroup[],
    systemIdToAtlasId: Map<string, number>,
    usedConceptSetIds: Set<string>,
    conceptSets: ConceptSet[]
  ): void {
    groups.forEach(group => {
      if (group.events) {
        this.collectNestedConceptSetsFromEvents(group.events, systemIdToAtlasId, usedConceptSetIds, conceptSets)
      }
    })
  }

  // Helper method to collect concept sets from events and their nested attributes
  private collectNestedConceptSetsFromEvents(
    events: QueryFilterEvent[],
    systemIdToAtlasId: Map<string, number>,
    usedConceptSetIds: Set<string>,
    conceptSets: ConceptSet[]
  ): void {
    events.forEach(event => {
      // Check if this event has attributes with nested events
      if (event.attributes) {
        event.attributes.forEach(attr => {
          // Look for nested criteria with events that have concept sets
          if (attr.attributeType === 'nested' && attr.nestedCriteria?.events) {
            attr.nestedCriteria.events.forEach(nestedEvent => {
              // This is the key check - nested events with concept sets that weren't collected initially
              if (
                nestedEvent.conceptSetDetails &&
                nestedEvent.conceptSetDetails.length > 0 &&
                nestedEvent.conceptSetId
              ) {
                const systemConceptSetId = nestedEvent.conceptSetId
                if (!usedConceptSetIds.has(systemConceptSetId)) {
                  usedConceptSetIds.add(systemConceptSetId)
                  const atlasSequentialId = conceptSets.length
                  systemIdToAtlasId.set(systemConceptSetId, atlasSequentialId)

                  const conceptSetDef: ConceptSet = {
                    id: atlasSequentialId,
                    name: nestedEvent.conceptSet || `Concept Set ${systemConceptSetId}`,
                    expression: {
                      items: nestedEvent.conceptSetDetails,
                    },
                  }

                  // Add conceptSetId field with system database ID
                  conceptSetDef.conceptSetId = parseInt(systemConceptSetId)
                  conceptSets.push(conceptSetDef)
                }
              }
            })

            // Recursively process further nested levels
            this.collectNestedConceptSetsFromEvents(
              attr.nestedCriteria.events,
              systemIdToAtlasId,
              usedConceptSetIds,
              conceptSets
            )
          }
        })
      }

      // Check if this event has nestedCriteria (for group events)
      if (event.nestedCriteria?.events) {
        event.nestedCriteria.events.forEach(nestedEvent => {
          // Collect concept sets from group events
          if (nestedEvent.conceptSetDetails && nestedEvent.conceptSetDetails.length > 0 && nestedEvent.conceptSetId) {
            const systemConceptSetId = nestedEvent.conceptSetId
            if (!usedConceptSetIds.has(systemConceptSetId)) {
              usedConceptSetIds.add(systemConceptSetId)
              const atlasSequentialId = conceptSets.length
              systemIdToAtlasId.set(systemConceptSetId, atlasSequentialId)

              const conceptSetDef: ConceptSet = {
                id: atlasSequentialId,
                name: nestedEvent.conceptSet || `Concept Set ${systemConceptSetId}`,
                expression: {
                  items: nestedEvent.conceptSetDetails,
                },
              }

              // Add conceptSetId field with system database ID
              conceptSetDef.conceptSetId = parseInt(systemConceptSetId)
              conceptSets.push(conceptSetDef)
            }
          }
        })

        // Recursively process further nested levels in group events
        this.collectNestedConceptSetsFromEvents(
          event.nestedCriteria.events,
          systemIdToAtlasId,
          usedConceptSetIds,
          conceptSets
        )
      }
    })
  }
}
