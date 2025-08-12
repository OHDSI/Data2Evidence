/**
 * Model for the query filter card system with hierarchical structure.
 * Provides interfaces and classes for managing filter cards and events,
 * with support for Atlas cohort definition conversion.
 */
import type { NumericRange, DemographicCriteria } from './AtlasCohortDefinition'
import type { ConceptSetItem } from '../types/ConceptSetTypes'
export interface QueryFilterCardinality {
  type: 'AT_LEAST' | 'EXACTLY' | 'AT_MOST'
  count: number
  using: 'ALL' | 'DISTINCT_CONCEPT' | 'DISTINCT_START_DATE' | 'DISTINCT_VISIT'
}

export interface ConceptSetDetailConcept {
  CONCEPT_ID: number
  CONCEPT_NAME: string
  STANDARD_CONCEPT: string
  STANDARD_CONCEPT_CAPTION: string
  INVALID_REASON: string
  INVALID_REASON_CAPTION: string
  CONCEPT_CODE: string
  DOMAIN_ID: string
  VOCABULARY_ID: string
  CONCEPT_CLASS_ID: string
}

export interface ConceptSetDetail {
  concept: ConceptSetDetailConcept
  isExcluded: boolean
  includeDescendants: boolean
  includeMapped: boolean
}

export interface SelectedConceptSetConcept {
  id: number
  useMapped: boolean
  isExcluded: boolean
  useDescendants: boolean
}

export interface SelectedConceptSet {
  value: number
  text: string
  display_value: string
  conceptIds: number[]
  concepts: SelectedConceptSetConcept[]
  shared: boolean
  userName: string
  createdDate: string
  modifiedDate: string
}

export interface QueryFilterNestedCriteria {
  id: string
  criteriaType: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  events: QueryFilterEvent[]
}

export interface QueryFilterGroup {
  id: string
  title: string
  description: string
  criteriaType: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  criteriaCount?: number
  events: QueryFilterEvent[]
}

export interface QueryFilterCriteria {
  id: string
  criteriaType: 'ALL' | 'EARLIEST' | 'LATEST'
  criteria: QueryFilterGroup[]
}

export interface QueryFilterEvent {
  id: string
  conceptSet: string
  conceptSetId?: string | undefined
  isEditing?: boolean
  criteriaType?: string | undefined
  selectedAttributes?: string[] | undefined
  isDemographic?: boolean
  parentEventId?: string | undefined
  attributeConfig?:
    | {
        id: string
        name: string
        description: string
        type: string
        category: string
        operator?: string | undefined
        value?: number | undefined
      }
    | undefined
  selectedConceptSet?: SelectedConceptSet | undefined
  conceptSetDetails?: ConceptSetDetail[] | undefined
  conceptSetLoading?: boolean | undefined
  cardinality?: QueryFilterCardinality | undefined
  isExpanded?: boolean | undefined
  attributes?: QueryFilterAttribute[] | undefined
  eventType?: string | undefined
  nestedCriteria?: QueryFilterNestedCriteria | undefined
}
export type QueryFilterAttribute =
  | {
      id: string
      attributeType: 'nested'
      nestedCriteria: QueryFilterNestedCriteria
    }
  | {
      id: string
      attributeId: string
      attributeType: 'numericRange'
      operator: string
      value: string
    }
  | {
      id: string
      attributeId: string
      attributeType: 'conceptSet'
      conceptSet?: ConceptSetItem
      conceptSetId?: string
    }
  | {
      id: string
      attributeId: string
      attributeType: 'standard'
      operator?: string
      value?: string
    }

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

const hasAttributeId = (attr: QueryFilterAttribute): attr is QueryFilterAttribute & { attributeId: string } => {
  return 'attributeId' in attr
}

export interface EntryEvent {
  primaryCriteriaLimit: 'ALL' | 'EARLIEST' | 'LATEST'
  events: QueryFilterEvent[]
  priorDays: number
  postDays: number
}
export interface ExitEvent {
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
  }
}

export interface InclusionCriteria {
  qualifyingEventsLimit: 'ALL' | 'EARLIEST' | 'LATEST'
  criteria: QueryFilterGroup[]
}

export class QueryFilterCardModel {
  id: string
  title?: string
  type?: 'inclusion' | 'exclusion'
  events: QueryFilterEvent[]
  isExpanded: boolean
  cardinality: QueryFilterCardinality

  constructor(data: Partial<QueryFilterCardModel> = {}) {
    this.id = data.id || this.generateId()
    this.title = data.title || ''
    this.type = data.type || 'inclusion'
    this.events = data.events || []
    this.isExpanded = data.isExpanded !== undefined ? data.isExpanded : true
    this.cardinality = data.cardinality || {
      type: 'AT_LEAST',
      count: 1,
      using: 'ALL',
    }
  }

  private generateId(): string {
    return `filter_${Math.random().toString(36).substring(2)}`
  }

  addEvent(event?: Partial<QueryFilterEvent>): QueryFilterEvent {
    const newEvent: QueryFilterEvent = {
      id: event?.id || `event_${Math.random().toString(36).substring(2)}`,
      conceptSet: event?.conceptSet || '',
      conceptSetId: event?.conceptSetId,
      isEditing: event?.isEditing || false,
      criteriaType: event?.criteriaType,
      selectedAttributes: event?.selectedAttributes,
      isDemographic: event?.isDemographic || false,
      parentEventId: event?.parentEventId,
      attributeConfig: event?.attributeConfig,
      selectedConceptSet: event?.selectedConceptSet,
      conceptSetDetails: event?.conceptSetDetails || [],
      conceptSetLoading: event?.conceptSetLoading || false,
    }
    this.events.push(newEvent)
    return newEvent
  }

  addAttributeEvent(parentEventId: string, attributeConfig: any): QueryFilterEvent {
    const parentEvent = this.getEvent(parentEventId)
    if (!parentEvent) {
      throw new Error(`Parent event ${parentEventId} not found`)
    }

    // Handle both direct config and nested config object
    const config = attributeConfig.attributeConfig || attributeConfig
    const displayTitle = (config.title || config.name || '').replace(/^Add\s+/, '')

    // Regular attribute event
    const newEvent: QueryFilterEvent = {
      id: `attribute_${Math.random().toString(36).substring(2)}`,
      conceptSet: displayTitle,
      isEditing: false,
      criteriaType: parentEvent.criteriaType,
      parentEventId: parentEventId,
      attributeConfig: {
        id: attributeConfig.id,
        name: displayTitle,
        description: attributeConfig.description || attributeConfig.defaultDescription || '',
        type: attributeConfig.type,
        category: attributeConfig.category || 'criteria-specific',
      },
    }

    // Find the insert position (after parent and its existing attribute children)
    const parentIndex = this.events.findIndex(e => e.id === parentEventId)
    let insertIndex = parentIndex + 1

    // Find the last attribute event that belongs to this parent
    while (insertIndex < this.events.length && this.events[insertIndex]?.parentEventId === parentEventId) {
      insertIndex++
    }

    this.events.splice(insertIndex, 0, newEvent)
    return newEvent
  }

  getEventWithParent(parentEventId: string): QueryFilterEvent[] {
    const events: QueryFilterEvent[] = []
    const parent = this.getEvent(parentEventId)
    if (parent) {
      events.push(parent)
      events.push(...this.events.filter(e => e.parentEventId === parentEventId))
    }
    return events
  }

  canDeleteEvent(eventId: string): boolean {
    const event = this.getEvent(eventId)
    if (!event) return false

    // Can't delete if it's a parent event with attribute children
    if (this.events.some(e => e.parentEventId === eventId)) {
      return false
    }

    return true
  }

  // Legacy

  removeEvent(eventId: string): boolean {
    const index = this.events.findIndex(e => e.id === eventId)
    if (index > -1) {
      this.events.splice(index, 1)
      return true
    }
    return false
  }

  updateEvent(eventId: string, updates: Partial<QueryFilterEvent>): boolean {
    const event = this.events.find(e => e.id === eventId)
    if (event) {
      Object.assign(event, updates)
      return true
    }
    return false
  }

  getEvent(eventId: string): QueryFilterEvent | undefined {
    // Only check main events - nested events are now in attributes
    return this.events.find(e => e.id === eventId)
  }

  // Utility methods
  toggle(): void {
    this.isExpanded = !this.isExpanded
  }

  hasEvents(): boolean {
    return this.events.length > 0
  }

  // Cloning and serialization
  clone(): QueryFilterCardModel {
    const cloneData = this.toJSON()
    return new QueryFilterCardModel({
      ...cloneData,
      id: this.generateId(), // Generate new ID for clone
      events: cloneData.events.map((event: any) => ({
        ...event,
        id: `event_${Math.random().toString(36).substring(2)}`, // Generate new ID for each event
      })),
    })
  }

  toJSON(): any {
    return {
      id: this.id,
      title: this.title,
      type: this.type,
      events: this.events.map(e => ({
        ...e,
      })),
      isExpanded: this.isExpanded,
      cardinality: { ...this.cardinality }, // Include cardinality
    }
  }
}

export class QueryFilterCriteriaManager {
  private entryEvents: EntryEvent
  private exitEvents: ExitEvent
  private inclusionCriteria: InclusionCriteria

  constructor(data: any = {}) {
    try {
      // Always initialize all properties

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
            data.inclusionCriteria.criteria?.map((criteria: any) => ({
              id: criteria.id,
              title: criteria.title,
              description: criteria.description,
              criteriaType: criteria.criteriaType,
              events: this.transformEvents(criteria.events || []),
            })) || [],
        }
      } else {
        // Handle original structure - initialize inclusionCriteria with proper structure
        this.inclusionCriteria = {
          qualifyingEventsLimit: data.criteriaType || 'ALL',
          criteria: data.criteria || [],
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
      criteriaType: this.mapQualifyingEventsLimit(this.inclusionCriteria.qualifyingEventsLimit || 'ALL'),
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

  // Primary criteria management
  getCensoringCriteria(): ExitEvent {
    return this.exitEvents
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

  // Filter management within groups
  addFilterToGroup(groupId: string, filter?: Partial<QueryFilterCardModel>): QueryFilterCardModel | null {
    const group = this.getGroup(groupId)
    if (group) {
      const newFilter = new QueryFilterCardModel(filter)
      group.events.push(newFilter as any)
      return newFilter
    }
    return null
  }

  removeFilterFromGroup(groupId: string, filterId: string): boolean {
    const group = this.getGroup(groupId)
    if (group) {
      const index = group.events.findIndex(f => f.id === filterId)
      if (index > -1) {
        group.events.splice(index, 1)
        return true
      }
    }
    return false
  }

  // Helper method to map qualifyingEventsLimit to criteriaType
  private mapQualifyingEventsLimit(limit: string): 'ALL' | 'EARLIEST' | 'LATEST' {
    switch (limit) {
      case 'EARLIEST':
        return 'EARLIEST'
      case 'LATEST':
        return 'LATEST'
      case 'ALL':
      default:
        return 'ALL'
    }
  }

  // Transform events from new structure to internal structure
  private transformEvents(events: QueryFilterEvent[]): QueryFilterEvent[] {
    const transformedEvents: QueryFilterEvent[] = []

    events.forEach(event => {
      // Keep track of which attributes are processed to avoid duplication
      const processedAttributes: any[] = []
      const remainingAttributes: any[] = []

      // Main event
      const mainEvent: QueryFilterEvent = {
        id: event.id,
        conceptSet: event.conceptSet || '',
        conceptSetId: event.conceptSetId,
        conceptSetDetails: event.conceptSetDetails,
        selectedConceptSet: event.selectedConceptSet,
        conceptSetLoading: event.conceptSetLoading,
        criteriaType: event.eventType,
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
            const processedAttr = {
              id: attr.id,
              attributeType: 'nested', // Ensure normalized attributeType
              nestedCriteria: {
                ...attr.nestedCriteria,
                events: this.transformNestedEvents(attr.nestedCriteria.events || [], mainEvent.id),
              },
            }
            remainingAttributes.push(processedAttr)
            processedAttributes.push(attr)
          } else if (hasAttributeId(attr) && attributeType && attributeType !== 'nested') {
            // Handle direct attributes (like age, gender on demographic events)
            if (!mainEvent.selectedAttributes) {
              mainEvent.selectedAttributes = []
            }
            const attributeId = attr.attributeId
            mainEvent.selectedAttributes.push(attributeId)

            // Store attribute config for later processing
            mainEvent.attributeConfig = {
              id: attributeId,
              name: attributeId,
              description: '',
              type: attributeType || 'conceptSet',
              category: 'criteria-specific',
            }

            // Store operator and value for age attributes
            if (attributeId === 'age' && attributeType === 'numericRange') {
              mainEvent.attributeConfig.operator = attr.operator || 'GREATER_THAN'
              mainEvent.attributeConfig.value = attr.value ? parseInt(attr.value) : undefined
            }

            processedAttributes.push(attr)
          } else {
            // Keep attributes that weren't specifically processed
            remainingAttributes.push(attr)
          }
        })
      }

      // Only preserve attributes that weren't processed into selectedAttributes or nested events
      mainEvent.attributes = remainingAttributes
    })

    return transformedEvents
  }

  // Recursively transform nested events to handle multiple levels
  private transformNestedEvents(events: QueryFilterEvent[], parentId: string): QueryFilterEvent[] {
    return events.map(event => {
      const nestedChildEvent: QueryFilterEvent = {
        id: event.id,
        conceptSet: event.conceptSet || '',
        conceptSetId: event.conceptSetId,
        conceptSetDetails: event.conceptSetDetails,
        selectedConceptSet: event.selectedConceptSet,
        conceptSetLoading: event.conceptSetLoading,
        criteriaType: event.eventType,
        isExpanded: event.isExpanded,
        cardinality: event.cardinality,
        parentEventId: parentId,
      }

      // Handle further nesting if this event has attributes
      if (event.attributes && event.attributes.length > 0) {
        nestedChildEvent.attributes = event.attributes.map(attr => {
          // Normalize attributeType from either attributeType or type field
          const attributeType = attr.attributeType

          if (attributeType === 'nested' && attr.nestedCriteria) {
            // Recursively process nested criteria, keeping attributes format
            return {
              id: attr.id,
              attributeType: 'nested', // Ensure normalized attributeType
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

  // Conversion methods
  convertToAtlasFormat(): any {
    // Build Atlas cohort definition from hierarchical structure

    // Initialize mapping objects early so they can be used throughout the method
    const conceptSets: any[] = []
    const usedConceptSetIds = new Set<string>()
    const systemIdToAtlasId = new Map<string, number>() // System ID → Atlas sequential ID

    // FIRST: Build concept sets and mapping before processing InclusionRules
    ;(this.inclusionCriteria.criteria || []).forEach((group: QueryFilterGroup) => {
      // Collect all events including nested ones
      const allGroupEvents = this.collectAllEvents(group.events)
      allGroupEvents.forEach(event => {
        if (event.conceptSetDetails && event.conceptSetDetails.length > 0 && event.conceptSetId) {
          const systemConceptSetId = event.conceptSetId
          if (!usedConceptSetIds.has(systemConceptSetId)) {
            usedConceptSetIds.add(systemConceptSetId)
            const atlasSequentialId = conceptSets.length // Use sequential ID starting from 0
            systemIdToAtlasId.set(systemConceptSetId, atlasSequentialId)

            const conceptSetDef: any = {
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

            const conceptSetDef: any = {
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

            const conceptSetDef: any = {
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

    const atlasDef: any = {
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
                  const criteria: any = {
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
                    criteria.Criteria.ConditionOccurrence.Age = {
                      Op: 'gt',
                    }
                  }

                  // Check for nested criteria in attributes format

                  const attributesNestedCriteria =
                    event.attributes?.filter(attr => {
                      return attr.attributeType === 'nested' && attr.nestedCriteria?.events
                    }) || []

                  if (attributesNestedCriteria.length > 0) {
                    let criteriaList: any[] = []
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
                      criteria.Criteria.ConditionOccurrence.CorrelatedCriteria = {
                        Type: 'ALL',
                        CriteriaList: criteriaList,
                        DemographicCriteriaList: demographicCriteriaList,
                        Groups: [],
                      }
                    }
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
                  // Check if this demographic event has age attributes in selectedAttributes/attributeConfig (transformed)
                  if (event.selectedAttributes?.includes('age') && event.attributeConfig?.id === 'age') {
                    const ageConfig: NumericRange = {
                      Op: 'gt', // Default operator
                      Value: 0, // Default value
                    }

                    // Map operator and value if available
                    if (event.attributeConfig.operator) {
                      ageConfig.Op = this.mapOperatorToAtlas(event.attributeConfig.operator)
                    }

                    if (event.attributeConfig.value !== undefined) {
                      ageConfig.Value = event.attributeConfig.value
                    }

                    demographicCriteria.push({
                      Age: ageConfig,
                    })
                  }

                  // Also check for age attributes directly in the original attributes array (for events not fully transformed)
                  const eventAny = event as any
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
            Groups: group.events
              .filter(event => event.eventType === 'group' && event.nestedCriteria)
              .map(groupEvent => {
                return {
                  Type: groupEvent.nestedCriteria!.criteriaType,
                  CriteriaList: groupEvent
                    .nestedCriteria!.events.filter(
                      nestedEvent =>
                        nestedEvent.eventType !== 'demographic' &&
                        nestedEvent.eventType !== 'group' &&
                        nestedEvent.eventType
                    )
                    .map(nestedEvent => {
                      const atlasEventType = this.mapEventTypeToAtlas(nestedEvent.eventType!)
                      console.log('Processing nested event:', nestedEvent, atlasEventType)
                      return {
                        Criteria: {
                          [atlasEventType]: {
                            ...(nestedEvent.conceptSetId && {
                              CodesetId: systemIdToAtlasId.get(nestedEvent.conceptSetId),
                            }),
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
                  DemographicCriteriaList: groupEvent
                    .nestedCriteria!.events.filter(nestedEvent => nestedEvent.eventType === 'demographic')
                    .flatMap(nestedEvent => {
                      // Process demographic events in nested groups
                      const demographicCriteria: DemographicCriteria[] = []
                      // Add age processing logic similar to main demographic processing if needed
                      return demographicCriteria
                    }),
                  Groups: this.processNestedGroups(groupEvent.nestedCriteria!.events, systemIdToAtlasId),
                }
              }),
          },
        }
      }),
      EndStrategy: this.buildEndStrategy(),
      CensoringCriteria: (this.exitEvents?.censoringCriteria || [])
        .filter(event => event.eventType && event.conceptSetId) // Only events with eventType and conceptSetId
        .map(event => {
          const criteriaType = this.mapEventTypeToAtlas(event.eventType!)
          const criteria: any = {
            [criteriaType]: {
              CodesetId: systemIdToAtlasId.get(event.conceptSetId!), // Use Atlas sequential ID
            },
          }

          // Check for nested criteria in attributes format for exit events
          const attributesNestedCriteria =
            event.attributes?.filter(attr => {
              return attr.attributeType === 'nested' && attr.nestedCriteria?.events
            }) || []

          if (attributesNestedCriteria.length > 0) {
            let criteriaList: any[] = []
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
              criteria[criteriaType].CorrelatedCriteria = {
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
          const criteriaType = this.mapEventTypeToAtlas(event.eventType!)
          const criteria: any = {
            [criteriaType]: {
              CodesetId: systemIdToAtlasId.get(event.conceptSetId!),
            },
          }

          // Check for nested criteria in attributes format for entry events
          const attributesNestedCriteria =
            event.attributes?.filter(attr => {
              return attr.attributeType === 'nested' && attr.nestedCriteria?.events
            }) || []

          if (attributesNestedCriteria.length > 0) {
            let criteriaList: any[] = []
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
              criteria[criteriaType].CorrelatedCriteria = {
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

          return criteria
        })
      atlasDef.cdmVersionRange = '>=5.0.0'
    }

    // CensoringCriteria, CollapseSettings, and CensorWindow are already set above

    // ConceptSets already populated above

    // Also add CodesetId to the criteria (use Atlas sequential IDs)
    let ruleIndex = 0
    atlasDef.InclusionRules.forEach((rule: any) => {
      let criteriaIndex = 0
      rule.expression.CriteriaList.forEach((criteriaItem: any) => {
        // Find the corresponding event for this specific criteriaItem
        const correspondingGroup = (this.inclusionCriteria.criteria || [])[ruleIndex]
        if (correspondingGroup && correspondingGroup.events[criteriaIndex]) {
          const event = correspondingGroup.events[criteriaIndex]
          if (event && event.conceptSetId && event.criteriaType) {
            const criteriaType = this.mapEventTypeToAtlas(event.criteriaType)
            if (criteriaItem.Criteria[criteriaType]) {
              const atlasId = systemIdToAtlasId.get(event.conceptSetId)
              if (atlasId !== undefined) {
                criteriaItem.Criteria[criteriaType].CodesetId = atlasId // Use Atlas sequential ID
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

  private buildEndStrategy(): any {
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
  private processNestedGroups(events: QueryFilterEvent[], systemIdToAtlasId: Map<string, number>): any[] {
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
          DemographicCriteriaList: groupEvent
            .nestedCriteria!.events.filter(nestedEvent => nestedEvent.eventType === 'demographic')
            .flatMap(nestedEvent => {
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
  private mapCriteriaTypeToAtlas(type: string): string {
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
      default:
        return 'ConditionOccurrence' // Default fallback
    }
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

  private mapCardinalityExtras(using: string): Record<string, any> {
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
  toJSON(): any {
    return {
      inclusionCriteria: this.inclusionCriteria,
      entryEvents: this.entryEvents,
      exitEvents: this.exitEvents,
    }
  }

  static fromJSON(data: any): QueryFilterCriteriaManager {
    // Handle new sample2 structure directly
    if (data.inclusionCriteria) {
      return new QueryFilterCriteriaManager(data)
    }

    // Handle original structure
    const criteria = {
      id: data.id,
      criteriaType: data.criteriaType,
      criteria:
        data.criteria?.map((group: any) => ({
          id: group.id,
          title: group.title,
          description: group.description,
          criteriaType: group.criteriaType,
          events: group.events || [],
        })) || [],
    }
    return new QueryFilterCriteriaManager(criteria)
  }

  // Helper method to build nested criteria from attributes.nestedCriteria format
  private buildNestedCriteriaFromAttributes(
    nestedCriteriaEvents: QueryFilterEvent[],
    systemIdToAtlasId: Map<string, number>
  ): { criteriaList: any[]; demographicCriteriaList: DemographicCriteria[] } {
    const criteriaList: any[] = []
    const demographicCriteriaList: DemographicCriteria[] = []

    nestedCriteriaEvents.forEach(nestedEvent => {
      const criteria: any = {
        Criteria: {
          ConditionOccurrence: {},
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
          criteria.Criteria.ConditionOccurrence.CodesetId = atlasConceptSetId
        }
      }

      // Handle further nested criteria recursively - Check attributes format
      if (nestedEvent.attributes) {
        const furtherNestedCriteria = nestedEvent.attributes.filter(attr => {
          const attributeType = attr.attributeType
          return attributeType === 'nested' && attr.nestedCriteria?.events
        })

        // Handle demographic attributes like Gender
        const demographicAttributes = nestedEvent.attributes.filter(
          attr => hasAttributeId(attr) && (attr.attributeId === 'gender' || attr.attributeId === 'age')
        )

        // Add demographic attributes to the criteria
        demographicAttributes.forEach(attr => {
          if (hasAttributeId(attr)) {
            if (attr.attributeId === 'gender') {
              criteria.Criteria.ConditionOccurrence.Gender = []
            } else if (attr.attributeId === 'age' && isNumericRangeAttribute(attr)) {
              const ageConfig: any = {
                Op: 'gt', // Default operator
              }
              if (attr.operator) {
                ageConfig.Op = this.mapOperatorToAtlas(attr.operator)
              }
              if (attr.value !== undefined) {
                ageConfig.Value = parseInt(attr.value)
              }
              criteria.Criteria.ConditionOccurrence.Age = ageConfig
            }
          }
        })

        if (furtherNestedCriteria.length > 0) {
          let nestedCriteriaList: any[] = []
          let nestedDemographicCriteriaList: DemographicCriteria[] = []

          furtherNestedCriteria.forEach(attrObj => {
            if (isNestedAttribute(attrObj) && attrObj.nestedCriteria?.events) {
              const result = this.buildNestedCriteriaFromAttributes(attrObj.nestedCriteria.events, systemIdToAtlasId)
              nestedCriteriaList = nestedCriteriaList.concat(result.criteriaList)
              nestedDemographicCriteriaList = nestedDemographicCriteriaList.concat(result.demographicCriteriaList)
            }
          })

          if (nestedCriteriaList.length > 0 || nestedDemographicCriteriaList.length > 0) {
            criteria.Criteria.ConditionOccurrence.CorrelatedCriteria = {
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

  // Clone
  clone(): QueryFilterCriteriaManager {
    const jsonData = this.toJSON()
    // Generate new IDs for the cloned structure
    const cloneData = {
      ...jsonData,
      inclusionCriteria: {
        ...jsonData.inclusionCriteria,
        criteria:
          jsonData.inclusionCriteria.criteria?.map((criteria: any) => ({
            ...criteria,
            id: `criteria_${Math.random().toString(36).substring(2)}`,
            events: criteria.events.map((event: any) => ({
              ...event,
              id: `event_${Math.random().toString(36).substring(2)}`,
            })),
          })) || [],
      },
    }
    return QueryFilterCriteriaManager.fromJSON(cloneData)
  }

  // Helper method to collect concept sets from nested events that were missed in initial collection
  private collectNestedConceptSets(
    groups: QueryFilterGroup[],
    systemIdToAtlasId: Map<string, number>,
    usedConceptSetIds: Set<string>,
    conceptSets: any[]
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
    conceptSets: any[]
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

                  const conceptSetDef: any = {
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

              const conceptSetDef: any = {
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
