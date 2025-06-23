/**
 * Model for the query filter card system with hierarchical structure.
 * Provides interfaces and classes for managing filter cards and events,
 * with support for Atlas cohort definition conversion.
 */
export interface QueryFilterCardinality {
  type: 'AT_LEAST' | 'exactly' | 'atMost'
  count: number
  using: 'ALL'
}

export interface QueryFilterGroup {
  id: string
  title: string
  description: string
  criteriaType: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
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
  conceptSetId?: string
  isEditing?: boolean
  criteriaType?: string
  selectedAttributes?: string[]
  isDemographic?: boolean
  parentEventId?: string
  attributeConfig?: {
    id: string
    name: string
    description: string
    type: string
    category: string
    operator?: string
    value?: number
  }
  selectedConceptSet?: any
  conceptSetDetails?: any[]
  conceptSetLoading?: boolean
  cardinality?: QueryFilterCardinality
  isExpanded?: boolean
  attributes?: QueryFilterAttribute[]
  eventType?: string
}

export interface QueryFilterAttribute {
  id: string
  attributeType: 'nested' | 'standard'
  nestedCriteria?: {
    id: string
    criteriaType: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
    events: QueryFilterEvent[]
  }
}

export interface EntryEvent {}

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

    // Nested criteria is now handled via attributes on the parent event
    if (config.type === 'nested') {
      console.warn('Nested criteria should be handled via attributes, not as separate events')
      throw new Error('Legacy nested event creation is not supported. Use attributes instead.')
    }

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
    while (insertIndex < this.events.length && this.events[insertIndex].parentEventId === parentEventId) {
      insertIndex++
    }

    this.events.splice(insertIndex, 0, newEvent)
    return newEvent
  }

  // Get all events that belong to a parent (including the parent itself)
  getEventWithParent(parentEventId: string): QueryFilterEvent[] {
    const events: QueryFilterEvent[] = []
    const parent = this.getEvent(parentEventId)
    if (parent) {
      events.push(parent)
      events.push(...this.events.filter(e => e.parentEventId === parentEventId))
    }
    return events
  }

  // Check if an event can be deleted (not the parent event or has no attribute children)
  canDeleteEvent(eventId: string): boolean {
    const event = this.getEvent(eventId)
    if (!event) return false

    // Can't delete if it's a parent event with attribute children
    if (this.events.some(e => e.parentEventId === eventId)) {
      return false
    }

    return true
  }

  addNestedAttributeEvent(parentEventId: string, attributeConfig: any): QueryFilterEvent {
    throw new Error('Legacy addNestedAttributeEvent method is not supported. Use attributes instead.')
  }

  updateNestedOperator(nestedEventId: string, operator: 'AND' | 'OR'): boolean {
    throw new Error('Legacy updateNestedOperator method is not supported. Use attributes instead.')
  }

  // Legacy
  removeNestedEvent(nestedEventId: string, eventId: string): boolean {
    throw new Error('Legacy removeNestedEvent method is not supported. Use attributes instead.')
  }

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
  private inclusionCriteria: InclusionCriteria

  constructor(data: any = {}) {
    try {
      // Always initialize all properties
      this.entryEvents = data.entryEvents || {}

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
  private transformEvents(events: any[]): QueryFilterEvent[] {
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
        event.attributes.forEach((attr: any) => {
          if (attr.attributeType === 'nested' && attr.nestedCriteria) {
            // Keep nested criteria in the attributes format, just process the events
            const processedAttr = {
              ...attr,
              nestedCriteria: {
                ...attr.nestedCriteria,
                events: this.transformNestedEvents(attr.nestedCriteria.events || [], mainEvent.id),
              },
            }
            remainingAttributes.push(processedAttr)
            processedAttributes.push(attr)
          } else if ((attr.attributeId || attr.id) && attr.attributeType && attr.attributeType !== 'nested') {
            // Handle direct attributes (like age, gender on demographic events)
            if (!mainEvent.selectedAttributes) {
              mainEvent.selectedAttributes = []
            }
            const attributeId = attr.attributeId || attr.id
            mainEvent.selectedAttributes.push(attributeId)

            // Store attribute config for later processing
            mainEvent.attributeConfig = {
              id: attributeId,
              name: attributeId,
              description: '',
              type: attr.attributeType || attr.type || 'conceptSet',
              category: 'criteria-specific',
            }

            // Store operator and value for age attributes
            if (attributeId === 'age' && attr.attributeType === 'numericRange') {
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
  private transformNestedEvents(events: any[], parentId: string): QueryFilterEvent[] {
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
        nestedChildEvent.attributes = event.attributes.map((attr: any) => {
          if (attr.attributeType === 'nested' && attr.nestedCriteria) {
            // Recursively process nested criteria, keeping attributes format
            return {
              ...attr,
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
    const usedConceptSetIds = new window.Set() as Set<string>
    const systemIdToAtlasId = new window.Map() as Map<string, number> // System ID → Atlas sequential ID

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

    const atlasDef: any = {
      ConceptSets: conceptSets, // Now populated with all concept sets
      PrimaryCriteria: {
        CriteriaList: [],
        ObservationWindow: {
          PriorDays: 0,
          PostDays: 0,
        },
        PrimaryCriteriaLimit: {
          Type: this.mapCriteriaTypeToAtlas(this.inclusionCriteria.qualifyingEventsLimit || 'ALL'), // Maps criteriaType → Atlas Type
        },
      },
      QualifiedLimit: {
        Type: this.mapCriteriaTypeToAtlas(this.inclusionCriteria.qualifyingEventsLimit || 'ALL'),
      },
      ExpressionLimit: {
        Type: this.mapCriteriaTypeToAtlas(this.inclusionCriteria.qualifyingEventsLimit || 'ALL'),
      },
      InclusionRules: (this.inclusionCriteria.criteria || []).map((group: QueryFilterGroup, groupIndex) => {
        return {
          name: group.title, // Maps group.title → Atlas InclusionRule.name
          description: group.description, // Maps group.description → Atlas InclusionRule.description
          expression: {
            Type: group.criteriaType, // Maps criteriaType → Atlas expression.Type
            CriteriaList: group.events.flatMap(event =>
              [event]
                .filter(e => e.eventType !== 'demographic') // Only non-demographic main events
                .map(event => {
                  const criteria: any = {
                    Criteria: {
                      [this.mapEventTypeToAtlas(event.eventType)]: {}, // Maps filter events → Atlas Criteria
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
                    let demographicCriteriaList: any[] = []

                    // Process nested criteria from attributes
                    attributesNestedCriteria.forEach((attr, index) => {
                      if (attr.nestedCriteria?.events) {
                        const result = this.buildNestedCriteriaFromAttributes(
                          attr.nestedCriteria.events,
                          systemIdToAtlasId,
                          event.id
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

                const demographicCriteria: any[] = []

                demographicEvents.forEach(event => {
                  // Check if this demographic event has age attributes in selectedAttributes/attributeConfig (transformed)
                  if (event.selectedAttributes?.includes('age') && event.attributeConfig?.id === 'age') {
                    const ageConfig: any = {
                      Op: 'gt', // Default operator
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
                    eventAny.attributes.forEach((attr: any) => {
                      if (attr.attributeId === 'age' && attr.attributeType === 'numericRange') {
                        const ageConfig: any = {
                          Op: 'gt', // Default operator
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
            Groups: [],
          },
        }
      }),
      EndStrategy: {},
      CensoringCriteria: [],
      CollapseSettings: {
        CollapseType: 'ERA',
        EraPad: 0,
      },
      CensorWindow: {},
    }

    // Add PrimaryCriteria if any events have conceptSetDetails with actual data
    const hasConceptSets = (this.inclusionCriteria.criteria || []).some((group: QueryFilterGroup) =>
      group.events.some(e => e.conceptSetDetails && e.conceptSetDetails.length > 0)
    )
    if (hasConceptSets) {
      atlasDef.PrimaryCriteria.CriteriaList = [
        {
          ObservationPeriod: {
            PeriodStartDate: {
              Value: '1800-01-01',
              Op: 'gt',
            },
            PeriodEndDate: {
              Value: '2999-01-01',
              Op: 'lt',
            },
          },
        },
      ]
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
          if (event.conceptSetId) {
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

  // Helper method to recursively collect all events including nested ones
  private collectAllEvents(events: QueryFilterEvent[]): QueryFilterEvent[] {
    const allEvents: QueryFilterEvent[] = []

    const collectRecursively = (eventList: QueryFilterEvent[]) => {
      eventList.forEach(event => {
        allEvents.push(event)

        // Collect from attributes.nestedCriteria structure
        if (event.attributes) {
          event.attributes.forEach(attr => {
            if (attr.attributeType === 'nested' && attr.nestedCriteria?.events) {
              collectRecursively(attr.nestedCriteria.events)
            }
          })
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
      case 'exactly':
        return 0 // Atlas Type 0 = exactly
      case 'atMost':
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

  private mapOperatorToAtlas(operator: string): string {
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

  // Serialization
  toJSON(): any {
    return {
      inclusionCriteria: this.inclusionCriteria,
      entryEvents: this.entryEvents,
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
    nestedCriteriaEvents: any[],
    systemIdToAtlasId: Map<string, number>,
    parentEventId?: string
  ): { criteriaList: any[]; demographicCriteriaList: any[] } {
    const criteriaList: any[] = []
    const demographicCriteriaList: any[] = []

    nestedCriteriaEvents.forEach((nestedEvent, index) => {
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
        const furtherNestedCriteria = nestedEvent.attributes.filter(
          (attr: any) => attr.attributeType === 'nested' && attr.nestedCriteria?.events
        )

        // Handle demographic attributes like Gender
        const demographicAttributes = nestedEvent.attributes.filter(
          (attr: any) => attr.attributeId === 'gender' || attr.attributeId === 'age'
        )

        // Add demographic attributes to the criteria
        demographicAttributes.forEach((attr: any) => {
          if (attr.attributeId === 'gender') {
            criteria.Criteria.ConditionOccurrence.Gender = []
          } else if (attr.attributeId === 'age') {
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
        })

        if (furtherNestedCriteria.length > 0) {
          let nestedCriteriaList: any[] = []
          let nestedDemographicCriteriaList: any[] = []

          furtherNestedCriteria.forEach((attrObj: any) => {
            if (attrObj.nestedCriteria?.events) {
              const result = this.buildNestedCriteriaFromAttributes(
                attrObj.nestedCriteria.events,
                systemIdToAtlasId,
                nestedEvent.id
              )
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
  setData({ inclusionCriteria, entryEvents }: { inclusionCriteria: InclusionCriteria; entryEvents: any }) {
    this.inclusionCriteria = inclusionCriteria
    this.entryEvents = entryEvents
  }

  getData() {
    return {
      inclusionCriteria: this.inclusionCriteria,
      entryEvents: this.entryEvents,
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
}
