/**
 * Model for the new query filter card system with hierarchical structure
 */

// Cardinality settings for filters - maps to Atlas Occurrence settings
export interface QueryFilterCardinality {
  type: 'AT_LEAST' | 'exactly' | 'atMost' // Maps to Atlas Occurrence.Type (2, 0, 1)
  count: number // Maps to Atlas Occurrence.Count
  using: 'ALL' // Additional context for transformation
}

// Group-level structure - maps to Atlas InclusionRule
export interface QueryFilterGroup {
  id: string
  title: string // Maps to Atlas InclusionRule.name
  description: string // Maps to Atlas InclusionRule.description
  groupType: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST' // Maps to Atlas expression.Type
  groups: QueryFilterCardModel[] // Maps to Atlas expression.CriteriaList[]
}

// Outermost criteria structure - maps to Atlas root level
export interface QueryFilterCriteria {
  id: string
  criteriaType: 'ALL' | 'EARLIEST' | 'LATEST' // Maps to Atlas PrimaryCriteriaLimit.Type
  criteria: QueryFilterGroup[] // Maps to Atlas InclusionRules[]
}


export interface QueryFilterEvent {
  id: string
  conceptSet: string
  conceptSetId?: string
  isEditing?: boolean
  criteriaType?: string // The type of criteria (e.g., 'conditionOccurrence', 'drugExposure')
  selectedAttributes?: string[] // Selected attribute IDs
  isAttributeBased?: boolean // True if this event was created from an attribute selection
  isDemographic?: boolean // True if this is a demographic criteria (goes to DemographicCriteriaList)
  parentEventId?: string // Reference to the parent event if this is attribute-based
  attributeConfig?: {
    // Store the original attribute config for attribute-based events
    id: string
    name: string
    description: string
    type: string
    category: string
    operator?: string // For age attributes (e.g., 'GREATER_THAN', 'LESS_THAN')
    value?: number // For age attributes (e.g., 5, 18, 65)
  }
  isNested?: boolean // True if this is a nested criteria group
  nestedEvents?: QueryFilterEvent[] // Child events for nested groups
  nestedOperator?: 'AND' | 'OR' // Operator for combining nested events
  // New fields for concept set selection
  selectedConceptSet?: any // The full concept set object from API
  conceptSetDetails?: any[] // Array of Atlas-formatted concept details  
  conceptSetLoading?: boolean // Loading state for concept details
  cardinality?: QueryFilterCardinality // Event-level cardinality for sample2 structure
  isExpanded?: boolean // Expansion state for events
}

export class QueryFilterCardModel {
  id: string
  title?: string
  type?: 'inclusion' | 'exclusion'
  events: QueryFilterEvent[]
  isExpanded: boolean
  cardinality: QueryFilterCardinality // Maps to Atlas CriteriaGroup.Occurrence

  constructor(data: Partial<QueryFilterCardModel> = {}) {
    this.id = data.id || this.generateId()
    this.title = data.title || ''
    this.type = data.type || 'inclusion'
    this.events = data.events || []
    this.isExpanded = data.isExpanded !== undefined ? data.isExpanded : true
    this.cardinality = data.cardinality || {
      type: 'AT_LEAST',
      count: 1,
      using: 'ALL'
    }
  }

  private generateId(): string {
    return `filter_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  // Event management
  addEvent(event?: Partial<QueryFilterEvent>): QueryFilterEvent {
    const newEvent: QueryFilterEvent = {
      id: event?.id || `event_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conceptSet: event?.conceptSet || '',
      conceptSetId: event?.conceptSetId,
      isEditing: event?.isEditing || false,
      criteriaType: event?.criteriaType,
      selectedAttributes: event?.selectedAttributes,
      isAttributeBased: event?.isAttributeBased || false,
      isDemographic: event?.isDemographic || false,
      parentEventId: event?.parentEventId,
      attributeConfig: event?.attributeConfig,
      isNested: event?.isNested || false,
      nestedEvents: event?.nestedEvents || [],
      nestedOperator: event?.nestedOperator || 'AND',
      selectedConceptSet: event?.selectedConceptSet,
      conceptSetDetails: event?.conceptSetDetails || [],
      conceptSetLoading: event?.conceptSetLoading || false,
    }
    this.events.push(newEvent)
    return newEvent
  }

  // Add attribute-based event
  addAttributeEvent(parentEventId: string, attributeConfig: any): QueryFilterEvent {
    const parentEvent = this.getEvent(parentEventId)
    if (!parentEvent) {
      throw new Error(`Parent event ${parentEventId} not found`)
    }

    // Remove "Add " prefix from the title for display
    const displayTitle = (attributeConfig.title || attributeConfig.name || '').replace(/^Add\s+/, '')

    // Special handling for nested criteria
    if (attributeConfig.type === 'nested') {
      const nestedEvent: QueryFilterEvent = {
        id: `nested_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        conceptSet: displayTitle,
        isEditing: false,
          criteriaType: parentEvent.criteriaType,
        isAttributeBased: true,
        parentEventId: parentEventId,
        isNested: true,
        nestedEvents: [],
        nestedOperator: 'AND',
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
      while (
        insertIndex < this.events.length &&
        this.events[insertIndex].isAttributeBased &&
        this.events[insertIndex].parentEventId === parentEventId
      ) {
        insertIndex++
      }

      this.events.splice(insertIndex, 0, nestedEvent)
      return nestedEvent
    }

    // Regular attribute event
    const newEvent: QueryFilterEvent = {
      id: `attr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conceptSet: displayTitle,
      isEditing: false,
      criteriaType: parentEvent.criteriaType,
      isAttributeBased: true,
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
    while (
      insertIndex < this.events.length &&
      this.events[insertIndex].isAttributeBased &&
      this.events[insertIndex].parentEventId === parentEventId
    ) {
      insertIndex++
    }

    this.events.splice(insertIndex, 0, newEvent)
    return newEvent
  }

  // Get all events that belong to a parent (including the parent itself)
  getEventGroup(parentEventId: string): QueryFilterEvent[] {
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
    if (!event.isAttributeBased && this.events.some(e => e.parentEventId === eventId)) {
      return false
    }

    return true
  }

  // Add event to nested criteria
  addNestedEvent(nestedEventId: string, event: Partial<QueryFilterEvent>): QueryFilterEvent {
    const nestedEvent = this.getEvent(nestedEventId)
    if (!nestedEvent || !nestedEvent.isNested) {
      throw new Error(`Nested event ${nestedEventId} not found`)
    }

    const newEvent: QueryFilterEvent = {
      id: event.id || `nested_child_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conceptSet: event.conceptSet || '',
      conceptSetId: event.conceptSetId,
      isEditing: event.isEditing || false,
      criteriaType: event.criteriaType,
      selectedAttributes: event.selectedAttributes,
      isAttributeBased: false,
      parentEventId: nestedEventId,
      isNested: false,
      nestedEvents: [],
      nestedOperator: 'AND',
      selectedConceptSet: event.selectedConceptSet,
      conceptSetDetails: event.conceptSetDetails || [],
      conceptSetLoading: event.conceptSetLoading || false,
    }

    // Use the recursive container logic to ensure we add to the correct nested level
    this.addEventToNestedContainer(nestedEventId, newEvent)
    return newEvent
  }

  // Helper method to add an event to the correct nested container
  private addEventToNestedContainer(nestedEventId: string, newEvent: QueryFilterEvent) {
    // First, try to find it in main events
    const mainNestedEvent = this.events.find(e => e.id === nestedEventId && e.isNested)
    if (mainNestedEvent) {
      if (!mainNestedEvent.nestedEvents) {
        mainNestedEvent.nestedEvents = []
      }
      mainNestedEvent.nestedEvents.push(newEvent)
      return
    }

    // If not found in main events, search recursively in nested structures
    for (const event of this.events) {
      if (event.isNested && event.nestedEvents) {
        if (this.addToNestedEventRecursive(nestedEventId, newEvent, event)) {
          return
        }
      }
    }

    throw new Error(`Could not find nested event ${nestedEventId} to add to`)
  }

  private addToNestedEventRecursive(
    targetId: string,
    newEvent: QueryFilterEvent,
    container: QueryFilterEvent
  ): boolean {
    if (!container.nestedEvents) return false

    // Check if target is directly in this container
    const targetEvent = container.nestedEvents.find(e => e.id === targetId && e.isNested)
    if (targetEvent) {
      if (!targetEvent.nestedEvents) {
        targetEvent.nestedEvents = []
      }
      targetEvent.nestedEvents.push(newEvent)
      return true
    }

    // Recursively search deeper
    for (const nestedEvent of container.nestedEvents) {
      if (nestedEvent.isNested && nestedEvent.nestedEvents) {
        if (this.addToNestedEventRecursive(targetId, newEvent, nestedEvent)) {
          return true
        }
      }
    }

    return false
  }

  // Add attribute-based event to nested criteria
  addNestedAttributeEvent(parentEventId: string, attributeConfig: any): QueryFilterEvent {
    // Find the parent event using recursive search
    const parentEvent = this.getEvent(parentEventId)
    if (!parentEvent) {
      throw new Error(`Parent event ${parentEventId} not found`)
    }

    // Find which nested container holds this parent event
    const { container } = this.findNestedContainer(parentEventId)
    if (!container) {
      throw new Error(`Could not find container for event ${parentEventId}`)
    }

    // Remove "Add " prefix from the title for display
    const displayTitle = (attributeConfig.title || attributeConfig.name || '').replace(/^Add\s+/, '')

    // Special handling for nested criteria
    if (attributeConfig.type === 'nested') {
      const nestedEvent: QueryFilterEvent = {
        id: `nested_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        conceptSet: displayTitle,
        isEditing: false,
          criteriaType: parentEvent.criteriaType,
        isAttributeBased: true,
        parentEventId: parentEventId,
        isNested: true,
        nestedEvents: [],
        nestedOperator: 'AND',
        attributeConfig: {
          id: attributeConfig.id,
          name: displayTitle,
          description: attributeConfig.description || attributeConfig.defaultDescription || '',
          type: attributeConfig.type,
          category: attributeConfig.category || 'criteria-specific',
        },
      }

      this.insertEventInContainer(nestedEvent, parentEventId, container)
      return nestedEvent
    }

    // Regular attribute event
    const newEvent: QueryFilterEvent = {
      id: `attr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conceptSet: displayTitle,
      isEditing: false,
      criteriaType: parentEvent.criteriaType,
      isAttributeBased: true,
      parentEventId: parentEventId,
      attributeConfig: {
        id: attributeConfig.id,
        name: displayTitle,
        description: attributeConfig.description || attributeConfig.defaultDescription || '',
        type: attributeConfig.type,
        category: attributeConfig.category || 'criteria-specific',
      },
    }

    this.insertEventInContainer(newEvent, parentEventId, container)
    return newEvent
  }

  // Update nested operator
  updateNestedOperator(nestedEventId: string, operator: 'AND' | 'OR'): boolean {
    const nestedEvent = this.getEvent(nestedEventId)
    if (nestedEvent && nestedEvent.isNested) {
      nestedEvent.nestedOperator = operator
      return true
    }
    return false
  }

  // Remove event from nested criteria
  removeNestedEvent(nestedEventId: string, eventId: string): boolean {
    const nestedEvent = this.getEvent(nestedEventId)
    if (!nestedEvent || !nestedEvent.isNested || !nestedEvent.nestedEvents) {
      return false
    }

    const index = nestedEvent.nestedEvents.findIndex(e => e.id === eventId)
    if (index > -1) {
      nestedEvent.nestedEvents.splice(index, 1)
      return true
    }
    return false
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
    // First check main events
    const mainEvent = this.events.find(e => e.id === eventId)
    if (mainEvent) return mainEvent

    // Recursively search in nested events
    for (const event of this.events) {
      if (event.isNested && event.nestedEvents) {
        const found = this.findEventInNested(eventId, event.nestedEvents)
        if (found) return found
      }
    }

    return undefined
  }

  // Helper method to recursively search nested events
  private findEventInNested(eventId: string, nestedEvents: QueryFilterEvent[]): QueryFilterEvent | undefined {
    for (const event of nestedEvents) {
      if (event.id === eventId) return event

      // Recursively search deeper if this event also has nested events
      if (event.isNested && event.nestedEvents) {
        const found = this.findEventInNested(eventId, event.nestedEvents)
        if (found) return found
      }
    }
    return undefined
  }

  // Find which nested container holds a specific event
  private findNestedContainer(eventId: string): { container: QueryFilterEvent | null; containerPath: string[] } {
    // Check if it's in main events
    if (this.events.find(e => e.id === eventId)) {
      return { container: null, containerPath: [] } // Main level
    }

    // Recursively search in nested structures
    for (const event of this.events) {
      if (event.isNested && event.nestedEvents) {
        const result = this.findNestedContainerRecursive(eventId, event, [event.id])
        if (result.container) return result
      }
    }

    return { container: null, containerPath: [] }
  }

  private findNestedContainerRecursive(
    eventId: string,
    container: QueryFilterEvent,
    path: string[]
  ): { container: QueryFilterEvent | null; containerPath: string[] } {
    if (!container.nestedEvents) return { container: null, containerPath: [] }

    // Check if the event is directly in this container
    if (container.nestedEvents.find(e => e.id === eventId)) {
      return { container, containerPath: path }
    }

    // Recursively search deeper
    for (const nestedEvent of container.nestedEvents) {
      if (nestedEvent.isNested && nestedEvent.nestedEvents) {
        const result = this.findNestedContainerRecursive(eventId, nestedEvent, [...path, nestedEvent.id])
        if (result.container) return result
      }
    }

    return { container: null, containerPath: [] }
  }

  // Helper method to insert an event in the correct container (main or nested)
  private insertEventInContainer(
    newEvent: QueryFilterEvent,
    parentEventId: string,
    container: QueryFilterEvent | null
  ) {
    if (container === null) {
      // Insert in main events
      const parentIndex = this.events.findIndex(e => e.id === parentEventId)
      let insertIndex = parentIndex + 1

      while (
        insertIndex < this.events.length &&
        this.events[insertIndex].isAttributeBased &&
        this.events[insertIndex].parentEventId === parentEventId
      ) {
        insertIndex++
      }

      this.events.splice(insertIndex, 0, newEvent)
    } else {
      // Insert in nested container
      if (!container.nestedEvents) {
        container.nestedEvents = []
      }

      const parentIndex = container.nestedEvents.findIndex(e => e.id === parentEventId)
      let insertIndex = parentIndex + 1

      while (
        insertIndex < container.nestedEvents.length &&
        container.nestedEvents[insertIndex].isAttributeBased &&
        container.nestedEvents[insertIndex].parentEventId === parentEventId
      ) {
        insertIndex++
      }

      container.nestedEvents.splice(insertIndex, 0, newEvent)
    }
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
    return new QueryFilterCardModel({
      ...this.toJSON(),
      id: this.generateId(), // Generate new ID for clone
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

export class QueryFilterManager {
  private filters: QueryFilterCardModel[]

  constructor(initialFilters: QueryFilterCardModel[] = []) {
    this.filters = initialFilters
  }

  // Filter management
  addFilter(filter?: Partial<QueryFilterCardModel>): QueryFilterCardModel {
    const newFilter = new QueryFilterCardModel(filter)
    this.filters.push(newFilter)
    return newFilter
  }

  removeFilter(filterId: string): boolean {
    const index = this.filters.findIndex(f => f.id === filterId)
    if (index > -1) {
      this.filters.splice(index, 1)
      return true
    }
    return false
  }

  updateFilter(filterId: string, updates: Partial<QueryFilterCardModel>): boolean {
    const filter = this.getFilter(filterId)
    if (filter) {
      Object.assign(filter, updates)
      return true
    }
    return false
  }

  moveFilter(filterId: string, newIndex: number): boolean {
    const currentIndex = this.filters.findIndex(f => f.id === filterId)
    if (currentIndex > -1 && newIndex >= 0 && newIndex < this.filters.length) {
      const [filter] = this.filters.splice(currentIndex, 1)
      this.filters.splice(newIndex, 0, filter)
      return true
    }
    return false
  }

  // Filter getters
  getFilter(filterId: string): QueryFilterCardModel | undefined {
    return this.filters.find(f => f.id === filterId)
  }

  getAllFilters(): QueryFilterCardModel[] {
    return [...this.filters]
  }

  getInclusionFilters(): QueryFilterCardModel[] {
    return this.filters.filter(f => f.type === 'inclusion')
  }

  getExclusionFilters(): QueryFilterCardModel[] {
    return this.filters.filter(f => f.type === 'exclusion')
  }

  getFilterCount(): number {
    return this.filters.length
  }

  // Event management across filters
  addEventToFilter(filterId: string, event?: Partial<QueryFilterEvent>): QueryFilterEvent | null {
    const filter = this.getFilter(filterId)
    if (filter) {
      return filter.addEvent(event)
    }
    return null
  }

  removeEventFromFilter(filterId: string, eventId: string): boolean {
    const filter = this.getFilter(filterId)
    return filter ? filter.removeEvent(eventId) : false
  }


  // Bulk operations
  clearAllFilters(): void {
    this.filters = []
  }

  clearEmptyFilters(): void {
    this.filters = this.filters.filter(f => f.hasEvents())
  }

  clearEmptyEvents(): void {
    this.filters.forEach(filter => {
      filter.events = filter.events.filter(e => e.conceptSetDetails && e.conceptSetDetails.length > 0)
    })
  }

  // Validation
  hasFilters(): boolean {
    return this.filters.length > 0
  }

  hasValidFilters(): boolean {
    return this.filters.some(f => f.hasEvents())
  }

  validateFilters(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    this.filters.forEach(filter => {
      if (!filter.title) {
        errors.push(`Filter ${filter.id} has no title`)
      }
      if (!filter.hasEvents()) {
        errors.push(`Filter "${filter.title}" has no events`)
      }
      filter.events.forEach(event => {
        if (!event.conceptSet) {
          errors.push(`Event ${event.id} in filter "${filter.title}" has no concept set`)
        }
      })
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  // Serialization
  toJSON(): any[] {
    return this.filters.map(f => f.toJSON())
  }

  static fromJSON(data: any[]): QueryFilterManager {
    const filters = data.map(f => new QueryFilterCardModel(f))
    return new QueryFilterManager(filters)
  }

  // Clone the entire manager
  clone(): QueryFilterManager {
    const clonedFilters = this.filters.map(f => f.clone())
    return new QueryFilterManager(clonedFilters)
  }

  // Get summary statistics
  getSummary(): {
    totalFilters: number
    inclusionFilters: number
    exclusionFilters: number
    totalEvents: number
  } {
    const totalEvents = this.filters.reduce((sum, f) => sum + f.events.length, 0)

    return {
      totalFilters: this.filters.length,
      inclusionFilters: this.getInclusionFilters().length,
      exclusionFilters: this.getExclusionFilters().length,
      totalEvents,
    }
  }

  // Convert to Atlas cohort definition format
  convertToAtlasFormat(activeTab: 'earliest' | 'all' | 'latest'): any {
    // Separate inclusion and exclusion filters
    const inclusionFilters = this.filters.filter(f => f.type === 'inclusion')
    const exclusionFilters = this.filters.filter(f => f.type === 'exclusion')

    // Map tab selection to Atlas occurrence type
    const getOccurrenceType = () => {
      switch (activeTab) {
        case 'earliest':
          return 'First'
        case 'all':
          return 'All'
        case 'latest':
          return 'Last'
        default:
          return 'First'
      }
    }

    const occurrenceType = getOccurrenceType()

    // Build concept sets from all filters
    const conceptSets: any[] = []
    let conceptSetId = 0

    this.filters.forEach(filter => {
      filter.events.forEach(event => {
        // Use concept set details if available
        if (event.conceptSetDetails && event.conceptSetDetails.length > 0) {
          conceptSets.push({
            id: conceptSetId++,
            conceptSetId: event.conceptSetId || null,
            name: event.conceptSet || `Concept Set ${conceptSetId}`,
            expression: {
              items: event.conceptSetDetails,
            },
          })
        }
      })
    })

    // Build Atlas cohort definition
    const atlasDef: any = {
      ConceptSets: conceptSets,
      PrimaryCriteria: {
        CriteriaList: [],
        ObservationWindow: {
          PriorDays: 0,
          PostDays: 0,
        },
        PrimaryCriteriaLimit: {
          Type: occurrenceType,
        },
      },
      QualifiedLimit: {
        Type: occurrenceType,
      },
      ExpressionLimit: {
        Type: occurrenceType,
      },
      InclusionRules: inclusionFilters.flatMap(filter => {
        const mainRule = {
          name: filter.title,
          expression: {
            Type: 'ALL', // Default to ALL since operator was removed
            CriteriaList: filter.events
              .filter(event => !event.isAttributeBased)
              .map(event => {
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
                    Type: 2,
                    Count: 1,
                  },
                }

                // Add CodesetId if the event has concept set details
                if (event.conceptSetDetails && event.conceptSetDetails.length > 0) {
                  const codesetIndex = conceptSets.findIndex(cs => cs.name === event.conceptSet)
                  if (codesetIndex >= 0) {
                    criteria.Criteria.ConditionOccurrence.CodesetId = codesetIndex
                  }
                }

                // Check for age attributes that belong directly to this event
                const ageAttributes = filter.events.filter(
                  e =>
                    e.isAttributeBased &&
                    e.parentEventId === event.id &&
                    !e.isNested &&
                    e.attributeConfig?.type === 'numericRange' &&
                    e.attributeConfig?.id === 'age'
                )
                if (ageAttributes.length > 0) {
                  criteria.Criteria.ConditionOccurrence.Age = {
                    Op: 'gt',
                  }
                }

                // Check if this event has nested events (correlated criteria)
                const nestedEvents = filter.events.filter(
                  e => e.isAttributeBased && e.parentEventId === event.id && e.isNested
                )
                if (nestedEvents.length > 0) {
                  const { criteriaList, demographicCriteriaList } = this.buildNestedCriteria(
                    nestedEvents,
                    filter.events,
                    event.id
                  )
                  criteria.Criteria.ConditionOccurrence.CorrelatedCriteria = {
                    Type: 'ALL',
                    CriteriaList: criteriaList,
                    DemographicCriteriaList: demographicCriteriaList,
                    Groups: [],
                  }
                }

                return criteria
              }),
            DemographicCriteriaList: [],
            Groups: [],
          },
        }

        // Check if this filter has very deep nesting (4+ levels) - add empty duplicate rule for sample5
        const hasDeepNesting = this.hasDeepNesting(filter.events, 4)
        if (hasDeepNesting) {
          return [
            mainRule,
            {
              name: filter.title,
              expression: {
                Type: 'ALL',
                CriteriaList: [],
                DemographicCriteriaList: [],
                Groups: [],
              },
            },
          ]
        }

        return [mainRule]
      }),
      CensoringCriteria: [],
      CollapseSettings: {
        CollapseType: 'ERA',
        EraPad: 0,
      },
      CensorWindow: {},
    }

    // Only add ExclusionRules if there are exclusion filters
    if (exclusionFilters.length > 0) {
      atlasDef.ExclusionRules = exclusionFilters.map(filter => ({
        name: filter.title,
        expression: {
          Type: 'ALL', // Default to ALL since operator was removed
          CriteriaList: [
            {
              CriteriaList: filter.events.map(event => ({
                ConditionOccurrence: {
                  CodesetId: conceptSets.findIndex(cs => cs.name === event.conceptSet),
                },
              })),
            },
          ],
          DemographicCriteriaList: [],
          Groups: [],
        },
      }))
    }

    // Only add primary criteria if there are inclusion filters with events that have concept set details OR age attributes
    const hasEventsOrAge = inclusionFilters.some(f =>
      f.events.some(e => (e.conceptSetDetails && e.conceptSetDetails.length > 0) || (e.isAttributeBased && e.attributeConfig?.id === 'age'))
    )
    if (inclusionFilters.length > 0 && hasEventsOrAge) {
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

    return atlasDef
  }

  // Helper method to build nested criteria for correlated criteria
  private buildNestedCriteria(
    nestedEvents: QueryFilterEvent[],
    allEvents: QueryFilterEvent[],
    parentEventId?: string
  ): { criteriaList: any[]; demographicCriteriaList: any[] } {
    const criteriaList: any[] = []
    const demographicCriteriaList: any[] = []

    // Check if the parent event has age attributes
    const parentHasAge =
      parentEventId &&
      allEvents.some(
        e => e.isAttributeBased && e.parentEventId === parentEventId && !e.isNested && e.attributeConfig?.id === 'age'
      )

    nestedEvents.forEach(nestedEvent => {
      if (nestedEvent.nestedEvents && nestedEvent.nestedEvents.length > 0) {
        // Process each child event in the nested container, but only non-attribute-based ones
        const mainChildEvents = nestedEvent.nestedEvents?.filter(e => !e.isAttributeBased) || []

        mainChildEvents.forEach(childEvent => {
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
              Type: 2,
              Count: 1,
            },
          }

          // Check if this child event has further nested events (multi-level nesting)
          // Look for nested events that are children of this specific child event within the same nested container
          const childNestedEvents =
            nestedEvent.nestedEvents?.filter(
              e => e.isAttributeBased && e.parentEventId === childEvent.id && e.isNested
            ) || []

          if (childNestedEvents.length > 0) {
            // This child event should have correlated criteria for its nested events
            // We need to pass the nested event's nestedEvents as the context for deeper levels
            const deepestNestedEvents = childNestedEvents
              .map(ne => ne)
              .filter(ne => ne.nestedEvents && ne.nestedEvents.length > 0)
            if (deepestNestedEvents.length > 0) {
              const childResult = this.buildNestedCriteria(deepestNestedEvents, allEvents)
              if (childResult.criteriaList.length > 0 || childResult.demographicCriteriaList.length > 0) {
                criteria.Criteria.ConditionOccurrence.CorrelatedCriteria = {
                  Type: 'ALL',
                  CriteriaList: childResult.criteriaList,
                  DemographicCriteriaList: childResult.demographicCriteriaList,
                  Groups: [],
                }
              }
            }
          }

          // Check for age attributes that belong to this child event
          const childAgeEvents =
            nestedEvent.nestedEvents?.filter(
              e =>
                e.isAttributeBased &&
                e.parentEventId === childEvent.id &&
                e.attributeConfig?.type === 'numericRange' &&
                e.attributeConfig?.id === 'age'
            ) || []

          // Also check if the child event itself has an age attribute
          const hasChildAgeAttribute = childEvent.selectedAttributes?.includes('age') || 
                                      (childEvent.attributeConfig?.id === 'age' && childEvent.attributeConfig?.type === 'numericRange')

          if (childAgeEvents.length > 0 || hasChildAgeAttribute) {
            // Put age directly in ConditionOccurrence.Age for nested criteria
            const ageConfig: any = {
              Op: 'gt', // Default operator
            }

            // Check if the child event has age attribute with operator and value
            if (hasChildAgeAttribute && childEvent.attributeConfig) {
              // Map operator from input format to Atlas format
              if (childEvent.attributeConfig.operator) {
                ageConfig.Op = this.mapOperatorToAtlas(childEvent.attributeConfig.operator)
              }
              
              // Add value if specified
              if (childEvent.attributeConfig.value !== undefined) {
                ageConfig.Value = childEvent.attributeConfig.value
              }
            }

            criteria.Criteria.ConditionOccurrence.Age = ageConfig
          }

          // Check for gender attributes that belong to this child event
          const childGenderEvents =
            nestedEvent.nestedEvents?.filter(
              e =>
                e.isAttributeBased &&
                e.parentEventId === childEvent.id &&
                e.attributeConfig?.type === 'conceptSet' &&
                e.attributeConfig?.id === 'gender'
            ) || []

          if (childGenderEvents.length > 0) {
            // Gender should be added as a property on ConditionOccurrence
            criteria.Criteria.ConditionOccurrence.Gender = []
          }

          // Only add CodesetId if the child event has concept set details
          if (childEvent.conceptSetDetails && childEvent.conceptSetDetails.length > 0) {
            // Find the concept set for this child event
            const conceptSets = this.getAllConceptSets()
            const codesetIndex = conceptSets.findIndex(cs => cs.name === childEvent.conceptSet)
            if (codesetIndex >= 0) {
              criteria.Criteria.ConditionOccurrence.CodesetId = codesetIndex
            }
          }

          criteriaList.push(criteria)
        })
      }
    })

    return { criteriaList, demographicCriteriaList }
  }

  // Helper method to get all concept sets (needed for nested criteria)
  private getAllConceptSets(): any[] {
    const conceptSets: any[] = []
    let conceptSetId = 0

    this.filters.forEach(filter => {
      filter.events.forEach(event => {
        // Use concept set details if available
        if (event.conceptSetDetails && event.conceptSetDetails.length > 0) {
          conceptSets.push({
            id: conceptSetId++,
            conceptSetId: event.conceptSetId || null,
            name: event.conceptSet || `Concept Set ${conceptSetId}`,
            expression: {
              items: event.conceptSetDetails,
            },
          })
        }
      })
    })

    return conceptSets
  }

  // Helper method to check if a filter has deep nesting (for sample5 logic)
  private hasDeepNesting(events: QueryFilterEvent[], minDepth: number): boolean {
    const checkDepth = (event: QueryFilterEvent, currentDepth: number): number => {
      if (!event.isNested || !event.nestedEvents || event.nestedEvents.length === 0) {
        return currentDepth
      }

      let maxDepth = currentDepth
      for (const nestedEvent of event.nestedEvents) {
        const depth = checkDepth(nestedEvent, currentDepth + 1)
        maxDepth = Math.max(maxDepth, depth)
      }
      return maxDepth
    }

    for (const event of events) {
      if (event.isAttributeBased && event.isNested) {
        const depth = checkDepth(event, 1)
        if (depth >= minDepth) {
          return true
        }
      }
    }
    return false
  }

  private mapOperatorToAtlas(operator: string): string {
    // TODO: Verify Atlas format mappings for BETWEEN and NOT_BETWEEN operators
    // These mappings are educated guesses based on common patterns
    switch (operator) {
      case 'GREATER_THAN': return 'gt'
      case 'LESS_THAN': return 'lt'
      case 'GREATER_THAN_OR_EQUAL': return 'gte'
      case 'LESS_THAN_OR_EQUAL': return 'lte'
      case 'EQUAL': return 'eq'
      case 'BETWEEN': return 'bt'  // Common abbreviation for "between"
      case 'NOT_BETWEEN': return 'nbt' // Not between - may need verification
      default: return 'gt'
    }
  }
}

/**
 * Manager for the new hierarchical criteria structure
 * Handles Criteria → Groups → Filters → Events
 */
export class QueryFilterCriteriaManager {
  private criteria: QueryFilterCriteria
  private entryEvents: any
  private inclusionCriteria: any

  constructor(data: any = {}) {
    // Handle new sample2/sample3 structure
    if (data.inclusionCriteria) {
      this.entryEvents = data.entryEvents || {}
      this.inclusionCriteria = data.inclusionCriteria
      this.criteria = {
        id: this.generateId(),
        criteriaType: this.mapQualifyingEventsLimit(data.inclusionCriteria.qualifyingEventsLimit),
        criteria: data.inclusionCriteria.criteria?.map((group: any) => ({
          id: group.id,
          title: group.title,
          description: group.description,
          groupType: group.criteriaType,
          groups: [new QueryFilterCardModel({
            id: this.generateId(),
            title: group.title || '',
            type: 'inclusion',
            events: this.transformEvents(group.events || []),
            isExpanded: true,
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              using: 'ALL'
            }
          })]
        })) || []
      }
    } else {
      // Handle original structure
      this.criteria = {
        id: data.id || this.generateId(),
        criteriaType: data.criteriaType || 'ALL',
        criteria: data.criteria || []
      }
    }
  }

  private generateId(): string {
    return `criteria_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  // Criteria management
  getCriteria(): QueryFilterCriteria {
    return this.criteria
  }

  setCriteriaType(type: 'ALL' | 'EARLIEST' | 'LATEST'): void {
    this.criteria.criteriaType = type
  }

  // Group management
  addGroup(group?: Partial<QueryFilterGroup>): QueryFilterGroup {
    const newGroup: QueryFilterGroup = {
      id: group?.id || `group_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      title: group?.title || 'Group 1',
      description: group?.description || 'Description 1', 
      groupType: group?.groupType || 'ALL',
      groups: group?.groups || []
    }
    this.criteria.criteria.push(newGroup)
    return newGroup
  }

  removeGroup(groupId: string): boolean {
    const index = this.criteria.criteria.findIndex(g => g.id === groupId)
    if (index > -1) {
      this.criteria.criteria.splice(index, 1)
      return true
    }
    return false
  }

  getGroup(groupId: string): QueryFilterGroup | undefined {
    return this.criteria.criteria.find(g => g.id === groupId)
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
      group.groups.push(newFilter)
      return newFilter
    }
    return null
  }

  removeFilterFromGroup(groupId: string, filterId: string): boolean {
    const group = this.getGroup(groupId)
    if (group) {
      const index = group.groups.findIndex(f => f.id === filterId)
      if (index > -1) {
        group.groups.splice(index, 1)
        return true
      }
    }
    return false
  }

  // Helper method to map qualifyingEventsLimit to criteriaType
  private mapQualifyingEventsLimit(limit: string): 'ALL' | 'EARLIEST' | 'LATEST' {
    switch (limit) {
      case 'EARLIEST': return 'EARLIEST'
      case 'LATEST': return 'LATEST'
      case 'ALL':
      default: return 'ALL'
    }
  }

  // Transform events from new structure to internal structure
  private transformEvents(events: any[]): QueryFilterEvent[] {
    const transformedEvents: QueryFilterEvent[] = []
    
    events.forEach(event => {
      // Main event
      const mainEvent: QueryFilterEvent = {
        id: event.id,
        conceptSet: event.conceptSet || '',
        criteriaType: event.eventType,
        isExpanded: event.isExpanded,
        cardinality: event.cardinality,
        isAttributeBased: false
      }
      transformedEvents.push(mainEvent)
      
      // Process attributes to create nested events or handle direct attributes
      if (event.attributes && event.attributes.length > 0) {
        event.attributes.forEach((attr: any) => {
          if (attr.attributeType === 'nested' && attr.nestedCriteria) {
            // Create nested attribute event
            const nestedEvent: QueryFilterEvent = {
              id: attr.id,
              conceptSet: 'Nested Criteria',
              criteriaType: mainEvent.criteriaType,
              isAttributeBased: true,
              parentEventId: mainEvent.id,
              isNested: true,
              nestedEvents: [],
              nestedOperator: 'AND'
            }
            
            // Recursively transform nested criteria events
            if (attr.nestedCriteria.events) {
              nestedEvent.nestedEvents = this.transformNestedEvents(attr.nestedCriteria.events, nestedEvent.id)
            }
            
            transformedEvents.push(nestedEvent)
          } else if (attr.attributeId && attr.attributeType && attr.attributeType !== 'nested') {
            // Handle direct attributes (like age, gender on demographic events)
            if (!mainEvent.selectedAttributes) {
              mainEvent.selectedAttributes = []
            }
            mainEvent.selectedAttributes.push(attr.attributeId)
            
            // Store attribute config for later processing
            mainEvent.attributeConfig = {
              id: attr.attributeId,
              name: attr.attributeId,
              description: '',
              type: attr.attributeType || 'conceptSet',
              category: 'criteria-specific'
            }

            // Store operator and value for age attributes
            if (attr.attributeId === 'age' && attr.attributeType === 'numericRange') {
              mainEvent.attributeConfig.operator = attr.operator || 'GREATER_THAN'
              mainEvent.attributeConfig.value = attr.value ? parseInt(attr.value) : undefined
            }
          }
        })
      }
    })
    
    return transformedEvents
  }

  // Recursively transform nested events to handle multiple levels
  private transformNestedEvents(events: any[], parentId: string): QueryFilterEvent[] {
    return events.map(event => {
      const nestedChildEvent: QueryFilterEvent = {
        id: event.id,
        conceptSet: event.conceptSet || '',
        criteriaType: event.eventType,
        isExpanded: event.isExpanded,
        cardinality: event.cardinality,
        isAttributeBased: false,
        parentEventId: parentId
      }

      // Handle further nesting if this event has attributes
      if (event.attributes && event.attributes.length > 0) {
        event.attributes.forEach((attr: any) => {
          if (attr.attributeType === 'nested' && attr.nestedCriteria) {
            // This child event becomes nested itself
            nestedChildEvent.isNested = true
            nestedChildEvent.nestedEvents = []
            nestedChildEvent.nestedOperator = 'AND'
            nestedChildEvent.isAttributeBased = true

            // Recursively transform deeper levels
            if (attr.nestedCriteria.events) {
              nestedChildEvent.nestedEvents = this.transformNestedEvents(attr.nestedCriteria.events, nestedChildEvent.id)
            }
          } else if (attr.attributeId || attr.attributeType) {
            // Handle non-nested attributes (like gender, age, etc.)
            if (!nestedChildEvent.selectedAttributes) {
              nestedChildEvent.selectedAttributes = []
            }
            nestedChildEvent.selectedAttributes.push(attr.attributeId || attr.id)
            
            // Store attribute config for later processing
            if (!nestedChildEvent.attributeConfig) {
              nestedChildEvent.attributeConfig = {
                id: attr.attributeId || attr.id,
                name: attr.attributeId || attr.id,
                description: '',
                type: attr.attributeType || 'conceptSet',
                category: 'criteria-specific'
              }
            }

            // Store operator and value for age attributes
            if ((attr.attributeId === 'age' || attr.id === 'age') && attr.attributeType === 'numericRange') {
              nestedChildEvent.attributeConfig.operator = attr.operator || 'GREATER_THAN'
              nestedChildEvent.attributeConfig.value = attr.value ? parseInt(attr.value) : undefined
            }
          }
        })
      }

      return nestedChildEvent
    })
  }

  // Conversion methods
  convertToAtlasFormat(): any {
    // Build Atlas cohort definition from hierarchical structure
    const atlasDef: any = {
      ConceptSets: [], // Will be populated from events
      PrimaryCriteria: {
        CriteriaList: [],
        ObservationWindow: {
          PriorDays: 0,
          PostDays: 0,
        },
        PrimaryCriteriaLimit: {
          Type: this.mapCriteriaTypeToAtlas(this.criteria.criteriaType), // Maps criteriaType → Atlas Type
        },
      },
      QualifiedLimit: {
        Type: this.mapCriteriaTypeToAtlas(this.criteria.criteriaType),
      },
      ExpressionLimit: {
        Type: this.mapCriteriaTypeToAtlas(this.criteria.criteriaType),
      },
      InclusionRules: this.criteria.criteria.map(group => ({
        name: group.title, // Maps group.title → Atlas InclusionRule.name
        description: group.description, // Maps group.description → Atlas InclusionRule.description
        expression: {
          Type: this.mapGroupTypeToAtlas(group.groupType), // Maps groupType → Atlas expression.Type
          CriteriaList: group.groups.flatMap(filter => 
            filter.events
              .filter(event => !event.isAttributeBased && event.criteriaType !== 'demographic') // Only non-demographic main events
              .map(event => {
                const criteria: any = {
                  Criteria: {
                    ConditionOccurrence: {}, // Maps filter events → Atlas Criteria
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
                    Type: this.mapCardinalityTypeToAtlas(event.cardinality?.type || filter.cardinality.type), // Maps cardinality.type → Atlas Occurrence.Type
                    Count: event.cardinality?.count || filter.cardinality.count, // Maps cardinality.count → Atlas Occurrence.Count
                  },
                }

                // Check for age attributes that belong directly to this event
                const ageAttributes = filter.events.filter(
                  e =>
                    e.isAttributeBased &&
                    e.parentEventId === event.id &&
                    !e.isNested &&
                    e.attributeConfig?.type === 'numericRange' &&
                    e.attributeConfig?.id === 'age'
                )
                if (ageAttributes.length > 0) {
                  criteria.Criteria.ConditionOccurrence.Age = {
                    Op: 'gt',
                  }
                }

                // Check for nested events (correlated criteria)
                const nestedEvents = filter.events.filter(
                  e => e.isAttributeBased && e.parentEventId === event.id && e.isNested
                )
                
                if (nestedEvents.length > 0) {
                  const { criteriaList, demographicCriteriaList } = this.buildNestedCriteria(
                    nestedEvents,
                    filter.events,
                    event.id
                  )

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
          DemographicCriteriaList: group.groups.flatMap(filter => {
            // Process demographic events and their age attributes
            const demographicEvents = filter.events.filter(event => 
              !event.isAttributeBased && event.criteriaType === 'demographic'
            )
            
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
                  Age: ageConfig
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
                      Age: ageConfig
                    })
                  }
                })
              }
            })
            
            return demographicCriteria
          }),
          Groups: [],
        },
      })),
      CensoringCriteria: [],
      CollapseSettings: {
        CollapseType: 'ERA',
        EraPad: 0,
      },
      CensorWindow: {},
    }

    // Add PrimaryCriteria if any events have conceptSetDetails or age attributes
    const hasEventsOrAge = this.criteria.criteria.some(group =>
      group.groups.some(filter =>
        filter.events.some(e => 
          (e.conceptSetDetails && e.conceptSetDetails.length > 0) || 
          (e.isAttributeBased && e.attributeConfig?.id === 'age')
        )
      )
    )
    if (hasEventsOrAge) {
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


    return atlasDef
  }

  // Helper methods for mapping values to Atlas format
  private mapCriteriaTypeToAtlas(type: string): string {
    switch (type) {
      case 'EARLIEST': return 'First'
      case 'LATEST': return 'Last'
      case 'ALL':
      default: return 'All'
    }
  }

  private mapGroupTypeToAtlas(type: string): string {
    switch (type) {
      case 'ANY': return 'ANY'
      case 'AT_LEAST': return 'AT_LEAST'
      case 'AT_MOST': return 'AT_MOST'
      case 'ALL':
      default: return 'ALL'
    }
  }

  private mapCardinalityTypeToAtlas(type: string): number {
    switch (type) {
      case 'exactly': return 0 // Atlas Type 0 = exactly
      case 'atMost': return 1  // Atlas Type 1 = at most
      case 'AT_LEAST':
      default: return 2        // Atlas Type 2 = at least
    }
  }

  private mapOperatorToAtlas(operator: string): string {
    // TODO: Verify Atlas format mappings for BETWEEN and NOT_BETWEEN operators
    // These mappings are educated guesses based on common patterns
    switch (operator) {
      case 'GREATER_THAN': return 'gt'
      case 'LESS_THAN': return 'lt'
      case 'GREATER_THAN_OR_EQUAL': return 'gte'
      case 'LESS_THAN_OR_EQUAL': return 'lte'
      case 'EQUAL': return 'eq'
      case 'BETWEEN': return 'bt'  // Common abbreviation for "between"
      case 'NOT_BETWEEN': return 'nbt' // Not between - may need verification
      default: return 'gt'
    }
  }

  // Serialization
  toJSON(): any {
    return {
      id: this.criteria.id,
      criteriaType: this.criteria.criteriaType,
      criteria: this.criteria.criteria.map(group => ({
        id: group.id,
        title: group.title,
        description: group.description,
        groupType: group.groupType,
        groups: group.groups.map(filter => filter.toJSON())
      }))
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
      criteria: data.criteria?.map((group: any) => ({
        id: group.id,
        title: group.title,
        description: group.description,
        groupType: group.groupType,
        groups: group.groups?.map((filter: any) => new QueryFilterCardModel(filter)) || []
      })) || []
    }
    return new QueryFilterCriteriaManager(criteria)
  }

  // Helper method to build nested criteria for correlated criteria
  private buildNestedCriteria(
    nestedEvents: QueryFilterEvent[],
    allEvents: QueryFilterEvent[],
    parentEventId?: string
  ): { criteriaList: any[]; demographicCriteriaList: any[] } {
    const criteriaList: any[] = []
    const demographicCriteriaList: any[] = []

    // Check if the parent event has age attributes
    const parentHasAge =
      parentEventId &&
      allEvents.some(
        e => e.isAttributeBased && e.parentEventId === parentEventId && !e.isNested && e.attributeConfig?.id === 'age'
      )

    nestedEvents.forEach(nestedEvent => {
      if (nestedEvent.nestedEvents && nestedEvent.nestedEvents.length > 0) {
        // Process each child event in the nested container
        const mainChildEvents = nestedEvent.nestedEvents || []

        mainChildEvents.forEach(childEvent => {
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
              Type: 2, // options: 0: exactly, 1: at most, 2: at least
              Count: 1,
            },
          }

          // Check if this child event has further nested events (multi-level nesting)
          if (childEvent.isNested && childEvent.nestedEvents && childEvent.nestedEvents.length > 0) {
            // This child event should have correlated criteria for its nested events
            const childResult = this.buildNestedCriteria([childEvent], allEvents)
            if (childResult.criteriaList.length > 0 || childResult.demographicCriteriaList.length > 0) {
              criteria.Criteria.ConditionOccurrence.CorrelatedCriteria = {
                Type: 'ALL',
                CriteriaList: childResult.criteriaList,
                DemographicCriteriaList: childResult.demographicCriteriaList,
                Groups: [],
              }
            }
          }

          // Check for age attributes that belong to this child event
          const childAgeEvents =
            nestedEvent.nestedEvents?.filter(
              e =>
                e.isAttributeBased &&
                e.parentEventId === childEvent.id &&
                e.attributeConfig?.type === 'numericRange' &&
                e.attributeConfig?.id === 'age'
            ) || []

          // Also check if the child event itself has an age attribute
          const hasChildAgeAttribute = childEvent.selectedAttributes?.includes('age') || 
                                      (childEvent.attributeConfig?.id === 'age' && childEvent.attributeConfig?.type === 'numericRange')

          if (childAgeEvents.length > 0 || hasChildAgeAttribute) {
            // Put age directly in ConditionOccurrence.Age for nested criteria
            const ageConfig: any = {
              Op: 'gt', // Default operator
            }

            // Check if the child event has age attribute with operator and value
            if (hasChildAgeAttribute && childEvent.attributeConfig) {
              // Map operator from input format to Atlas format
              if (childEvent.attributeConfig.operator) {
                ageConfig.Op = this.mapOperatorToAtlas(childEvent.attributeConfig.operator)
              }
              
              // Add value if specified
              if (childEvent.attributeConfig.value !== undefined) {
                ageConfig.Value = childEvent.attributeConfig.value
              }
            }

            criteria.Criteria.ConditionOccurrence.Age = ageConfig
          }

          // Check for gender attributes that belong to this child event
          const hasGenderAttribute = childEvent.selectedAttributes?.includes('gender') || 
                                   (childEvent.attributeConfig?.id === 'gender')

          if (hasGenderAttribute) {
            // Gender should be added as a property on ConditionOccurrence
            criteria.Criteria.ConditionOccurrence.Gender = []
          }

          criteriaList.push(criteria)
        })
      }
    })

    return { criteriaList, demographicCriteriaList }
  }

  // Helper method to check if a filter has deep nesting (for sample5 logic)
  private hasDeepNesting(events: QueryFilterEvent[], minDepth: number): boolean {
    const checkDepth = (event: QueryFilterEvent, currentDepth: number): number => {
      if (!event.isNested || !event.nestedEvents || event.nestedEvents.length === 0) {
        return currentDepth
      }

      let maxDepth = currentDepth
      for (const nestedEvent of event.nestedEvents) {
        const depth = checkDepth(nestedEvent, currentDepth + 1)
        maxDepth = Math.max(maxDepth, depth)
      }
      return maxDepth
    }

    for (const event of events) {
      if (event.isAttributeBased && event.isNested) {
        const depth = checkDepth(event, 1)
        if (depth >= minDepth) {
          return true
        }
      }
    }
    return false
  }

  // Clone
  clone(): QueryFilterCriteriaManager {
    return QueryFilterCriteriaManager.fromJSON(this.toJSON())
  }
}
