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
  DateRange,
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
import { isNestedAttribute, isNumericRangeAttribute, hasAttributeId, isDateRangeAttribute } from './modules/type-guards'
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
  createAtlasWindow,
} from './modules/nested-criteria-processor'
import { collectNestedConceptSets, collectNestedConceptSetsFromEvents } from './modules/concept-set-collector'

export class QueryFilterCriteriaManager {
  private entryEvents: EntryEvent
  private exitEvents: ExitEvent
  private inclusionCriteria: InclusionCriteria
  private cdmVersionRange?: string

  constructor(data: QueryFilterCriteriaManageData = {}) {
    this.cdmVersionRange = data.cdmVersionRange
    try {
      if (data.entryEvents) {
        this.entryEvents = {
          primaryCriteriaLimit: data.entryEvents.primaryCriteriaLimit || 'EARLIEST',
          qualifiedLimit: data.entryEvents.qualifiedLimit, // Preserve QualifiedLimit for round-trip
          events: transformEvents(data.entryEvents.events || []),
          priorDays: data.entryEvents.priorDays || 0,
          postDays: data.entryEvents.postDays || 0,
        }
      } else {
        this.entryEvents = {
          primaryCriteriaLimit: 'EARLIEST',
          events: [],
          priorDays: 0,
          postDays: 0,
        }
      }

      if (data.exitEvents) {
        this.exitEvents = {
          endStrategy: data.exitEvents.endStrategy || 'CONT_OBS',
          censoringCriteria: data.exitEvents.censoringCriteria || [],
          fixedDuration: data.exitEvents.fixedDuration, // Preserve FIXED duration settings
          contDrugSettings: data.exitEvents.contDrugSettings, // Preserve CONT_DRUG settings
        }
      } else {
        this.exitEvents = {
          endStrategy: 'CONT_OBS',
          censoringCriteria: [],
        }
      }

      if (data.inclusionCriteria) {
        this.inclusionCriteria = {
          qualifyingEventsLimit: data.inclusionCriteria.qualifyingEventsLimit || 'EARLIEST',
          criteria:
            data.inclusionCriteria.criteria.map(criteria => ({
              id: criteria.id,
              title: criteria.title,
              description: criteria.description,
              criteriaType: criteria.criteriaType,
              criteriaCount: criteria.criteriaCount,
              events: transformEvents(criteria.events || []),
            })) || [],
        }
      } else {
        this.inclusionCriteria = {
          qualifyingEventsLimit: 'EARLIEST',
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
  getCriteria(): InclusionCriteria {
    return {
      qualifyingEventsLimit: this.inclusionCriteria.qualifyingEventsLimit || 'ALL',
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
      criteriaCount: group?.criteriaCount,
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
    const missingConceptDetails: string[] = [] // Track events missing concept details

    this.inclusionCriteria.criteria.forEach((group: QueryFilterGroup) => {
      // Collect all events including nested ones
      const allGroupEvents = collectAllEvents(group.events)
      allGroupEvents.forEach(event => {
        if (event.conceptSetId) {
          if (event.conceptSetDetails && event.conceptSetDetails.length > 0) {
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
          } else {
            // Event has concept set but missing details
            const eventName = event.conceptSet || event.id
            missingConceptDetails.push(`Inclusion criteria event: ${eventName} (ID: ${event.conceptSetId})`)
          }
        }
      })
    })

    // Also collect concept sets from entryEvents.events
    if (this.entryEvents?.events) {
      this.entryEvents.events.forEach(event => {
        if (event.conceptSetId) {
          if (event.conceptSetDetails && event.conceptSetDetails.length > 0) {
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
          } else {
            // Event has concept set but missing details
            const eventName = event.conceptSet || event.id
            missingConceptDetails.push(`Entry event: ${eventName} (ID: ${event.conceptSetId})`)
          }
        }
      })
    }

    // Also collect concept sets from exitEvents.censoringCriteria
    if (this.exitEvents?.censoringCriteria) {
      this.exitEvents.censoringCriteria.forEach(event => {
        if (event.conceptSetId) {
          if (event.conceptSetDetails && event.conceptSetDetails.length > 0) {
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
          } else {
            // Event has concept set but missing details
            const eventName = event.conceptSet || event.id
            missingConceptDetails.push(`Exit event: ${eventName} (ID: ${event.conceptSetId})`)
          }
        }
      })
    }

    // Also collect concept set from CONT_DRUG settings (not stored as an event)
    if (this.exitEvents?.contDrugSettings?.conceptSetId) {
      const systemConceptSetId = this.exitEvents.contDrugSettings.conceptSetId
      const contDrugDetails = this.exitEvents.contDrugSettings.conceptSetDetails
      const contDrugName = this.exitEvents.contDrugSettings.conceptSetName

      if (!usedConceptSetIds.has(systemConceptSetId)) {
        if (contDrugDetails && contDrugDetails.length > 0) {
          usedConceptSetIds.add(systemConceptSetId)
          const atlasSequentialId = conceptSets.length
          systemIdToAtlasId.set(systemConceptSetId, atlasSequentialId)

          const conceptSetDef: ConceptSet = {
            id: atlasSequentialId,
            name: contDrugName || `Concept Set ${systemConceptSetId}`,
            expression: {
              items: contDrugDetails,
            },
          }

          conceptSetDef.conceptSetId = parseInt(systemConceptSetId)
          conceptSets.push(conceptSetDef)
        } else {
          console.warn('[QueryFilterModel] CONT_DRUG concept set missing details')
          missingConceptDetails.push(`CONT_DRUG concept set (ID: ${systemConceptSetId})`)
        }
      }
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

    const endStrategy = this.buildEndStrategy(systemIdToAtlasId)

    const atlasDef: AtlasCohortDefinition = {
      ...(this.cdmVersionRange && { cdmVersionRange: this.cdmVersionRange }),
      ConceptSets: conceptSets, // Now populated with all concept sets
      PrimaryCriteria: {
        CriteriaList: [],
        ObservationWindow: {
          PriorDays: this.entryEvents.priorDays || 0,
          PostDays: this.entryEvents.postDays || 0,
        },
        PrimaryCriteriaLimit: {
          Type: mapCriteriaTypeToAtlas(this.entryEvents.primaryCriteriaLimit),
        },
      },
      QualifiedLimit: {
        // NOTE: QualifiedLimit is primarily for AdditionalCriteria (not yet supported)
        // Use the stored value from import if available, otherwise default to 'First'
        Type: this.entryEvents.qualifiedLimit ? mapCriteriaTypeToAtlas(this.entryEvents.qualifiedLimit) : 'First',
      },
      ExpressionLimit: {
        Type: mapCriteriaTypeToAtlas(this.inclusionCriteria.qualifyingEventsLimit),
      },
      InclusionRules: (this.inclusionCriteria.criteria || []).map((group: QueryFilterGroup) => {
        return {
          name: group.title, // Maps group.title → Atlas InclusionRule.name
          ...(group.description && { description: group.description }), // Only include description if present
          expression: {
            Type: group.criteriaType, // Maps criteriaType → Atlas expression.Type
            ...(group.criteriaCount === undefined ? {} : { Count: group.criteriaCount }), // Maps criteriaCount → Atlas expression.Count (for AT_LEAST/AT_MOST)
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
                    StartWindow: createAtlasWindow(event.startWindow),
                    ...(event.endWindow && {
                      EndWindow: createAtlasWindow(event.endWindow),
                    }),
                    Occurrence: {
                      Type: mapCardinalityTypeToAtlas(event.cardinality?.type || 'AT_LEAST'), // Maps cardinality.type → Atlas Occurrence.Type
                      Count: event.cardinality?.count ?? 1, // Maps cardinality.count → Atlas Occurrence.Count
                      // Only add CountColumn/IsDistinct if 'using' is explicitly specified
                      ...(event.cardinality?.using ? mapCardinalityExtras(event.cardinality.using) : {}),
                    },
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

                    // Get criteriaType and criteriaCount from first nested attribute (all should have same type)
                    const firstNestedAttr = attributesNestedCriteria.find(
                      attr => attr.attributeType === 'nested' && attr.nestedCriteria
                    )
                    const nestedCriteriaType =
                      firstNestedAttr?.attributeType === 'nested' && firstNestedAttr.nestedCriteria
                        ? firstNestedAttr.nestedCriteria.criteriaType
                        : 'ALL'
                    const nestedCriteriaCount =
                      firstNestedAttr?.attributeType === 'nested' && firstNestedAttr.nestedCriteria
                        ? firstNestedAttr.nestedCriteria.criteriaCount
                        : undefined

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
                        Type: nestedCriteriaType,
                        ...(nestedCriteriaCount !== undefined && { Count: nestedCriteriaCount }),
                        CriteriaList: criteriaList,
                        DemographicCriteriaList: demographicCriteriaList,
                        Groups: groupsList,
                      }
                    }
                  }

                  // Handle attributes directly on the main event
                  if (event.attributes) {
                    // Process each attribute based on its configType
                    event.attributes.forEach(attr => {
                      if (hasAttributeId(attr) && 'configType' in attr) {
                        // Handle concept-type attributes
                        if (
                          attr.configType === 'concept' &&
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
                        // Handle numericRange attributes (age)
                        else if (attr.configType === 'numericRange' && isNumericRangeAttribute(attr)) {
                          const attributeKey = getAtlasAttributeKey(attr.attributeId, atlasEventType)
                          const numericConfig: NumericRange = {
                            Op: attr.operator ? mapOperatorToAtlas(attr.operator) : 'gt',
                            Value: attr.value !== undefined ? parseInt(attr.value) : 0,
                          }
                          if (attr.extent && (attr.operator === 'BETWEEN' || attr.operator === 'NOT_BETWEEN')) {
                            numericConfig.Extent = parseInt(attr.extent)
                          }
                          criteria.Criteria[atlasEventType][attributeKey] = numericConfig
                          console.log('[QueryFilterModel] Added numericRange attribute:', {
                            attributeKey,
                            numericConfig,
                            fromAttribute: { operator: attr.operator, value: attr.value, extent: attr.extent },
                          })
                        }
                        // Handle dateRange attributes
                        else if (attr.configType === 'dateRange' && isDateRangeAttribute(attr)) {
                          const attributeKey = getAtlasAttributeKey(attr.attributeId, atlasEventType)
                          const dateConfig: DateRange = {
                            Op: attr.operator ? mapOperatorToAtlas(attr.operator) : 'gt',
                            Value: attr.value || '',
                            Extent: attr.extent || '',
                          }
                          criteria.Criteria[atlasEventType][attributeKey] = dateConfig
                          console.log('[QueryFilterModel] Added dateRange attribute:', { attributeKey, dateConfig })
                        }
                        // Handle boolean attributes
                        else if (attr.configType === 'boolean') {
                          const attributeKey = getAtlasAttributeKey(attr.attributeId, atlasEventType)
                          criteria.Criteria[atlasEventType][attributeKey] = true
                        }
                        // Generic fallback for other attribute types
                        else if ('value' in attr && attr.value) {
                          const attributeKey = getAtlasAttributeKey(attr.attributeId, atlasEventType)
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
                // Process demographic events and their attributes generically
                const demographicCriteria: Record<string, unknown> = {}

                if (event.attributes && Array.isArray(event.attributes)) {
                  event.attributes.forEach((attr: QueryFilterAttribute) => {
                    if (!hasAttributeId(attr)) {
                      return
                    }

                    // Get the Atlas field name for this attribute using the lookup table
                    const atlasFieldName = getAtlasAttributeKey(attr.attributeId, 'DemographicCriteria')

                    // Handle numericRange attributes (e.g., Age) - Convert from internal format to Atlas format
                    if (isNumericRangeAttribute(attr) && 'operator' in attr && 'value' in attr && attr.value) {
                      const numericRange: NumericRange = {
                        Op: attr.operator ? mapOperatorToAtlas(attr.operator) : 'gt',
                        Value: parseInt(attr.value),
                      }
                      // Include Extent for 'between' operations
                      if (attr.extent && (attr.operator === 'BETWEEN' || attr.operator === 'NOT_BETWEEN')) {
                        numericRange.Extent = parseInt(attr.extent)
                      }
                      demographicCriteria[atlasFieldName] = numericRange
                    }
                    // Handle concept attributes (e.g., Gender, Race, Ethnicity)
                    else if (
                      'configType' in attr &&
                      attr.configType === 'concept' &&
                      'conceptItems' in attr &&
                      attr.conceptItems
                    ) {
                      const conceptData = attr.conceptItems.map(item => ({
                        CONCEPT_CODE: item.code,
                        CONCEPT_ID: item.conceptId,
                        CONCEPT_NAME: item.conceptName,
                        DOMAIN_ID: item.domainId,
                        VOCABULARY_ID: item.system,
                        STANDARD_CONCEPT_CAPTION: item.standardConceptCaption || '',
                        INVALID_REASON_CAPTION: item.invalidReasonCaption || '',
                      }))
                      demographicCriteria[atlasFieldName] = conceptData
                    }
                    // Handle dateRange attributes (e.g., StartDate) - Convert from internal format to Atlas format
                    else if (isDateRangeAttribute(attr) && 'operator' in attr && 'value' in attr && attr.value) {
                      const dateRange: DateRange = {
                        Op: attr.operator ? mapOperatorToAtlas(attr.operator) : 'gt',
                        Value: attr.value,
                        Extent: attr.extent || '',
                      }
                      demographicCriteria[atlasFieldName] = dateRange
                    }
                  })
                }

                // Return as array with single item if there are any demographic criteria
                if (Object.keys(demographicCriteria).length > 0) {
                  return [demographicCriteria as DemographicCriteria]
                }
                return []
              }),
            Groups: processNestedGroups(group.events, systemIdToAtlasId),
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
              // Only add CodesetId if conceptSetId exists
              ...(event.conceptSetId && { CodesetId: systemIdToAtlasId.get(event.conceptSetId) }),
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

            // Get criteriaType and criteriaCount from first nested attribute
            const firstNestedAttr = attributesNestedCriteria[0]
            const nestedCriteriaType =
              firstNestedAttr && isNestedAttribute(firstNestedAttr)
                ? firstNestedAttr.nestedCriteria?.criteriaType || 'ALL'
                : 'ALL'
            const nestedCriteriaCount =
              firstNestedAttr && isNestedAttribute(firstNestedAttr)
                ? firstNestedAttr.nestedCriteria?.criteriaCount
                : undefined

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
                Type: nestedCriteriaType,
                ...(nestedCriteriaCount !== undefined && { Count: nestedCriteriaCount }),
                CriteriaList: criteriaList,
                DemographicCriteriaList: demographicCriteriaList,
                Groups: groupsList,
              }
            }
          }

          // Handle attributes directly on the exit event
          if (event.attributes) {
            event.attributes.forEach(attr => {
              if (hasAttributeId(attr) && 'configType' in attr) {
                // Handle concept-type attributes
                if (
                  attr.configType === 'concept' &&
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
                  criteria[eventType][fieldName] = conceptData
                }
                // Handle numericRange attributes (age)
                else if (attr.configType === 'numericRange' && isNumericRangeAttribute(attr)) {
                  const attributeKey = getAtlasAttributeKey(attr.attributeId, eventType)
                  const numericConfig: NumericRange = {
                    Op: attr.operator ? mapOperatorToAtlas(attr.operator) : 'gt',
                    Value: attr.value !== undefined ? parseInt(attr.value) : 0,
                  }
                  if (attr.extent && (attr.operator === 'BETWEEN' || attr.operator === 'NOT_BETWEEN')) {
                    numericConfig.Extent = parseInt(attr.extent)
                  }
                  criteria[eventType][attributeKey] = numericConfig
                }
                // Handle dateRange attributes
                else if (attr.configType === 'dateRange' && isDateRangeAttribute(attr)) {
                  const attributeKey = getAtlasAttributeKey(attr.attributeId, eventType)
                  const dateConfig: DateRange = {
                    Op: attr.operator ? mapOperatorToAtlas(attr.operator) : 'gt',
                    Value: attr.value || '',
                    Extent: attr.extent || '',
                  }
                  criteria[eventType][attributeKey] = dateConfig
                }
                // Handle boolean attributes
                else if (attr.configType === 'boolean') {
                  const attributeKey = getAtlasAttributeKey(attr.attributeId, eventType)
                  criteria[eventType][attributeKey] = true
                }
                // Generic fallback for other attribute types
                else if ('value' in attr && attr.value) {
                  const attributeKey = getAtlasAttributeKey(attr.attributeId, eventType)
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
              // Only add CodesetId if conceptSetId exists
              ...(event.conceptSetId && { CodesetId: systemIdToAtlasId.get(event.conceptSetId) }),
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

            // Get criteriaType and criteriaCount from first nested attribute
            const firstNestedAttr = attributesNestedCriteria[0]
            const nestedCriteriaType =
              firstNestedAttr && isNestedAttribute(firstNestedAttr)
                ? firstNestedAttr.nestedCriteria?.criteriaType || 'ALL'
                : 'ALL'
            const nestedCriteriaCount =
              firstNestedAttr && isNestedAttribute(firstNestedAttr)
                ? firstNestedAttr.nestedCriteria?.criteriaCount
                : undefined

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
                Type: nestedCriteriaType,
                ...(nestedCriteriaCount !== undefined && { Count: nestedCriteriaCount }),
                CriteriaList: criteriaList,
                DemographicCriteriaList: demographicCriteriaList,
                Groups: groupsList,
              }
            }
          }

          // Handle attributes directly on the entry event
          if (event.attributes) {
            event.attributes.forEach(attr => {
              if (hasAttributeId(attr) && 'configType' in attr) {
                // Handle concept-type attributes
                if (
                  attr.configType === 'concept' &&
                  'conceptItems' in attr &&
                  attr.conceptItems &&
                  attr.conceptItems.length > 0
                ) {
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
                // Handle numericRange attributes (age)
                else if (attr.configType === 'numericRange' && isNumericRangeAttribute(attr)) {
                  const attributeKey = getAtlasAttributeKey(attr.attributeId, eventType)
                  const numericConfig: NumericRange = {
                    Op: attr.operator ? mapOperatorToAtlas(attr.operator) : 'gt',
                    Value: attr.value !== undefined ? parseInt(attr.value) : 0,
                  }
                  if (attr.extent && (attr.operator === 'BETWEEN' || attr.operator === 'NOT_BETWEEN')) {
                    numericConfig.Extent = parseInt(attr.extent)
                  }
                  criteria[eventType][attributeKey] = numericConfig
                }
                // Handle dateRange attributes
                else if (attr.configType === 'dateRange' && isDateRangeAttribute(attr)) {
                  const attributeKey = getAtlasAttributeKey(attr.attributeId, eventType)
                  const dateConfig: DateRange = {
                    Op: attr.operator ? mapOperatorToAtlas(attr.operator) : 'gt',
                    Value: attr.value || '',
                    Extent: attr.extent || '',
                  }
                  criteria[eventType][attributeKey] = dateConfig
                }
                // Handle boolean attributes
                else if (attr.configType === 'boolean') {
                  const attributeKey = getAtlasAttributeKey(attr.attributeId, eventType)
                  criteria[eventType][attributeKey] = true
                }
                // Generic fallback for other attribute types
                else if ('value' in attr && attr.value) {
                  const attributeKey = getAtlasAttributeKey(attr.attributeId, eventType)
                  criteria[eventType][attributeKey] = attr.value
                }
              }
            })
          }

          return criteria
        })
    }

    // CensoringCriteria, CollapseSettings, and CensorWindow are already set above
    // cdmVersionRange is already set in the initial atlasDef if it was present

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

    // Log warnings for any events missing concept details
    if (missingConceptDetails.length > 0) {
      console.warn(
        '⚠️ WARNING: Atlas JSON conversion incomplete. The following events are missing concept details:',
        missingConceptDetails
      )
      console.warn(
        '⚠️ This will result in incomplete ConceptSets array in the Atlas JSON. Please wait for all concept details to load before saving.'
      )
    }

    return atlasDef
  }

  private buildEndStrategy(systemIdToAtlasId: Map<string, number>) {
    if (this.exitEvents?.endStrategy === 'FIXED' && this.exitEvents.fixedDuration) {
      return {
        DateOffset: {
          DateField: this.exitEvents.fixedDuration.dateField,
          Offset: this.exitEvents.fixedDuration.offset,
        },
      }
    }

    if (this.exitEvents?.endStrategy === 'CONT_DRUG' && this.exitEvents.contDrugSettings) {
      // Get the Atlas sequential ID from the map, using the system concept set ID
      const systemConceptSetId = this.exitEvents.contDrugSettings.conceptSetId
      const atlasConceptSetId = systemIdToAtlasId.get(systemConceptSetId)
      const endStrategy = {
        CustomEra: {
          DrugCodesetId: atlasConceptSetId, // Use Atlas sequential ID, not system ID
          GapDays: this.exitEvents.contDrugSettings.gapDays,
          Offset: this.exitEvents.contDrugSettings.offset,
          DaysSupplyOverride: this.exitEvents.contDrugSettings.daysSupplyOverride,
        },
      }
      return endStrategy
    }

    return {}
  }

  // Serialization
  toJSON(): QueryFilterCriteriaManageData {
    return {
      cdmVersionRange: this.cdmVersionRange,
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

  updateContDrugSettings(
    conceptSetId: string,
    conceptSetName: string | undefined,
    conceptSetDetails: any[] | undefined,
    gapDays: number,
    offset: number,
    daysSupplyOverride: number
  ) {
    this.exitEvents.contDrugSettings = {
      conceptSetId,
      conceptSetName,
      conceptSetDetails,
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
      criteriaCount: group.criteriaCount,
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

  // Clear all criteria and reset to default state
  clearAllCriteria() {
    // Reset inclusion criteria to defaults
    this.inclusionCriteria = {
      qualifyingEventsLimit: 'EARLIEST',
      criteria: [],
    }

    // Reset entry/primary events to defaults
    this.entryEvents = {
      primaryCriteriaLimit: 'EARLIEST',
      events: [],
      priorDays: 0,
      postDays: 0,
    }

    // Reset exit events to defaults
    this.exitEvents = {
      endStrategy: 'CONT_OBS',
      censoringCriteria: [],
    }
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
