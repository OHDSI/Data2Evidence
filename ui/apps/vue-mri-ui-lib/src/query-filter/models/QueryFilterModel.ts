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
  GroupCriteria,
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
} from '../types/QueryFilterTypes'
import { getAtlasAttributeKey } from '../utils/AtlasUtils'
import { isNestedAttribute, isNumericRangeAttribute, hasAttributeId } from './modules/type-guards'
import {
  mapCriteriaTypeToAtlas,
  mapCardinalityTypeToAtlas,
  mapEventTypeToAtlas,
  mapOperatorToAtlas,
  mapCardinalityExtras,
} from './modules/atlas-mappers'
import { transformEvents } from './modules/event-transformer'
import {
  collectAllEvents,
  processNestedGroups,
  buildNestedCriteriaFromAttributes,
} from './modules/nested-criteria-processor'
import { collectNestedConceptSets, collectNestedConceptSetsFromEvents } from './modules/concept-set-collector'

export class QueryFilterCriteriaManager {
  private entryEvents: EntryEvent
  private exitEvents: ExitEvent
  private inclusionCriteria: InclusionCriteria

  constructor(data: QueryFilterCriteriaManageData = {}) {
    try {
      if (data.entryEvents) {
        this.entryEvents = {
          primaryCriteriaLimit: data.entryEvents.primaryCriteriaLimit || 'ALL',
          events: transformEvents(data.entryEvents.events || []),
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
              events: transformEvents(criteria.events || []),
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

  convertToAtlasFormat(): AtlasCohortDefinition {
    const conceptSets: ConceptSet[] = []
    const usedConceptSetIds = new Set<string>()
    const systemIdToAtlasId = new Map<string, number>() // System ID → Atlas sequential ID

    this.inclusionCriteria.criteria.forEach((group: QueryFilterGroup) => {
      // Collect all events including nested ones
      const allGroupEvents = collectAllEvents(group.events)
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
    collectNestedConceptSets(this.inclusionCriteria.criteria || [], systemIdToAtlasId, usedConceptSetIds, conceptSets)
    if (this.entryEvents?.events) {
      collectNestedConceptSetsFromEvents(this.entryEvents.events, systemIdToAtlasId, usedConceptSetIds, conceptSets)
    }
    if (this.exitEvents?.censoringCriteria) {
      collectNestedConceptSetsFromEvents(
        this.exitEvents.censoringCriteria,
        systemIdToAtlasId,
        usedConceptSetIds,
        conceptSets
      )
    }

    const endStrategy = this.buildEndStrategy()

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
          Type: mapCriteriaTypeToAtlas(this.entryEvents.primaryCriteriaLimit || 'ALL'),
        },
      },
      QualifiedLimit: {
        Type: mapCriteriaTypeToAtlas(this.inclusionCriteria.qualifyingEventsLimit || 'ALL'),
      },
      ExpressionLimit: {
        Type: mapCriteriaTypeToAtlas(this.inclusionCriteria.qualifyingEventsLimit || 'ALL'),
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
                  const atlasEventType = mapEventTypeToAtlas(event.eventType!)
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
                      Type: mapCardinalityTypeToAtlas(event.cardinality?.type || 'AT_LEAST'), // Maps cardinality.type → Atlas Occurrence.Type
                      Count: event.cardinality?.count || 1, // Maps cardinality.count → Atlas Occurrence.Count
                      ...mapCardinalityExtras(event.cardinality?.using ?? 'ALL'),
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

                  const attributesNestedCriteria: QueryFilterAttribute[] =
                    event.attributes?.filter(attr => {
                      return attr.attributeType === 'nested' && attr.nestedCriteria?.events
                    }) || []

                  if (attributesNestedCriteria.length > 0) {
                    let criteriaList: CriteriaGroup[] = []
                    let demographicCriteriaList: DemographicCriteria[] = []
                    let groupsList: GroupCriteria[] = []

                    // Process nested criteria from attributes
                    attributesNestedCriteria.forEach(attr => {
                      if (attr.attributeType === 'nested' && attr.nestedCriteria?.events) {
                        const result = buildNestedCriteriaFromAttributes(attr.nestedCriteria.events, systemIdToAtlasId)
                        criteriaList = criteriaList.concat(result.criteriaList)
                        demographicCriteriaList = demographicCriteriaList.concat(result.demographicCriteriaList)
                        groupsList = groupsList.concat(result.groupsList || [])
                      }
                    })

                    if (criteriaList.length > 0 || demographicCriteriaList.length > 0 || groupsList.length > 0) {
                      criteria.Criteria[atlasEventType].CorrelatedCriteria = {
                        Type: 'ALL',
                        CriteriaList: criteriaList,
                        DemographicCriteriaList: demographicCriteriaList,
                        Groups: groupsList.filter(
                          group =>
                            group.CriteriaList.length > 0 ||
                            group.DemographicCriteriaList.length > 0 ||
                            group.Groups.length > 0
                        ),
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

                    // Handle all other attributes
                    event.attributes.forEach(attr => {
                      if (hasAttributeId(attr) && 'configType' in attr) {
                        const attributeKey = getAtlasAttributeKey(attr.attributeId, atlasEventType)
                        if (attr.configType === 'boolean') {
                          criteria.Criteria[atlasEventType][attributeKey] = true
                        }
                        if (attr.value) {
                          criteria.Criteria[atlasEventType][attributeKey] = attr.value
                        }
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
                          ageConfig.Op = mapOperatorToAtlas(attr.operator)
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
            Groups: processNestedGroups(group.events, systemIdToAtlasId).filter(
              group =>
                group.CriteriaList.length > 0 || group.DemographicCriteriaList.length > 0 || group.Groups.length > 0
            ),
          },
        }
      }),
      ...(Object.keys(endStrategy).length ? { EndStrategy: endStrategy } : {}),
      CensoringCriteria: (this.exitEvents?.censoringCriteria || [])
        .filter(event => event.eventType)
        .map(event => {
          const eventType = mapEventTypeToAtlas(event.eventType!)
          const criteria: CriteriaListItem = {
            [eventType]: {
              CodesetId: systemIdToAtlasId.get(event.conceptSetId!), // Use Atlas sequential ID
            },
          }

          // Check for nested criteria in attributes format for exit events
          const attributesNestedCriteria: QueryFilterAttribute[] =
            event.attributes?.filter(attr => {
              return attr.attributeType === 'nested' && attr.nestedCriteria?.events
            }) || []

          if (attributesNestedCriteria.length > 0) {
            let criteriaList: CriteriaGroup[] = []
            let demographicCriteriaList: DemographicCriteria[] = []
            let groupsList: GroupCriteria[] = []

            // Process nested criteria from attributes
            attributesNestedCriteria.forEach(attr => {
              if (isNestedAttribute(attr) && attr.nestedCriteria?.events) {
                const result = buildNestedCriteriaFromAttributes(attr.nestedCriteria.events, systemIdToAtlasId)
                criteriaList = criteriaList.concat(result.criteriaList)
                demographicCriteriaList = demographicCriteriaList.concat(result.demographicCriteriaList)
                groupsList = groupsList.concat(result.groupsList || [])
              }
            })

            if (criteriaList.length > 0 || demographicCriteriaList.length > 0 || groupsList.length > 0) {
              criteria[eventType].CorrelatedCriteria = {
                Type:
                  attributesNestedCriteria[0] && isNestedAttribute(attributesNestedCriteria[0])
                    ? attributesNestedCriteria[0].nestedCriteria?.criteriaType || 'ALL'
                    : 'ALL',
                CriteriaList: criteriaList,
                DemographicCriteriaList: demographicCriteriaList,
                Groups: groupsList.filter(
                  group =>
                    group.CriteriaList.length > 0 || group.DemographicCriteriaList.length > 0 || group.Groups.length > 0
                ),
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
            // Handle all other attributes
            event.attributes.forEach(attr => {
              if (hasAttributeId(attr) && 'configType' in attr) {
                const attributeKey = getAtlasAttributeKey(attr.attributeId, eventType)
                if (attr.configType === 'boolean') {
                  criteria[eventType][attributeKey] = true
                }
                if (attr.value) {
                  criteria[eventType][attributeKey] = attr.value
                }
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
        .filter(event => event.eventType)
        .map(event => {
          const eventType = mapEventTypeToAtlas(event.eventType!)
          const criteria: CriteriaListItem = {
            [eventType]: {
              CodesetId: systemIdToAtlasId.get(event.conceptSetId!),
            },
          }

          // Check for nested criteria in attributes format for entry events
          const attributesNestedCriteria: QueryFilterAttribute[] =
            event.attributes?.filter(attr => {
              return attr.attributeType === 'nested' && attr.nestedCriteria?.events
            }) || []

          if (attributesNestedCriteria.length > 0) {
            let criteriaList: CriteriaGroup[] = []
            let demographicCriteriaList: DemographicCriteria[] = []
            let groupsList: GroupCriteria[] = []

            // Process nested criteria from attributes
            attributesNestedCriteria.forEach(attr => {
              if (isNestedAttribute(attr) && attr.nestedCriteria?.events) {
                const result = buildNestedCriteriaFromAttributes(attr.nestedCriteria.events, systemIdToAtlasId)
                criteriaList = criteriaList.concat(result.criteriaList)
                demographicCriteriaList = demographicCriteriaList.concat(result.demographicCriteriaList)
                groupsList = groupsList.concat(result.groupsList || [])
              }
            })

            if (criteriaList.length > 0 || demographicCriteriaList.length > 0 || groupsList.length > 0) {
              criteria[eventType].CorrelatedCriteria = {
                Type:
                  attributesNestedCriteria[0] && isNestedAttribute(attributesNestedCriteria[0])
                    ? attributesNestedCriteria[0].nestedCriteria?.criteriaType || 'ALL'
                    : 'ALL',
                CriteriaList: criteriaList,
                DemographicCriteriaList: demographicCriteriaList,
                Groups: groupsList.filter(
                  group =>
                    group.CriteriaList.length > 0 || group.DemographicCriteriaList.length > 0 || group.Groups.length > 0
                ),
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

            // Handle all other attributes
            event.attributes.forEach(attr => {
              if (hasAttributeId(attr) && 'configType' in attr) {
                const attributeKey = getAtlasAttributeKey(attr.attributeId, eventType)
                if (attr.configType === 'boolean') {
                  criteria[eventType][attributeKey] = true
                }
                if (attr.value) {
                  criteria[eventType][attributeKey] = attr.value
                }
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
            const eventType = mapEventTypeToAtlas(event.eventType)
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
}
