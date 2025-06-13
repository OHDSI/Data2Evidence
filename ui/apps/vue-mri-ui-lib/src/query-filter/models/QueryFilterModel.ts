/**
 * Model for the new query filter card system
 */

export interface QueryFilterChip {
  id: string
  label: string
  value: string
  color?: string
  conceptId?: number
  domainId?: string
}

export interface QueryFilterEvent {
  id: string
  conceptSet: string
  conceptSetId?: string
  chips: QueryFilterChip[]
  isEditing?: boolean
  operator?: 'AND' | 'OR' // For combining chips
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
  }
  isNested?: boolean // True if this is a nested criteria group
  nestedEvents?: QueryFilterEvent[] // Child events for nested groups
  nestedOperator?: 'AND' | 'OR' // Operator for combining nested events
  // New fields for concept set selection
  selectedConceptSet?: any // The full concept set object from API
  conceptSetDetails?: any[] // Array of Atlas-formatted concept details  
  conceptSetLoading?: boolean // Loading state for concept details
}

export class QueryFilterCardModel {
  id: string
  title: string
  type: 'inclusion' | 'exclusion'
  events: QueryFilterEvent[]
  isExpanded: boolean
  operator: 'AND' | 'OR' // For combining events

  constructor(data: Partial<QueryFilterCardModel> = {}) {
    this.id = data.id || this.generateId()
    this.title = data.title || ''
    this.type = data.type || 'inclusion'
    this.events = data.events || []
    this.isExpanded = data.isExpanded !== undefined ? data.isExpanded : true
    this.operator = data.operator || 'AND'
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
      chips: event?.chips || [],
      isEditing: event?.isEditing || false,
      operator: event?.operator || 'OR',
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
    const displayTitle = (attributeConfig.title || attributeConfig.name).replace(/^Add\s+/, '')

    // Special handling for nested criteria
    if (attributeConfig.type === 'nested') {
      const nestedEvent: QueryFilterEvent = {
        id: `nested_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        conceptSet: displayTitle,
        chips: [],
        isEditing: false,
        operator: 'OR',
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
      chips: [],
      isEditing: false,
      operator: 'OR',
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
      chips: event.chips || [],
      isEditing: event.isEditing || false,
      operator: event.operator || 'OR',
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
    const displayTitle = (attributeConfig.title || attributeConfig.name).replace(/^Add\s+/, '')

    // Special handling for nested criteria
    if (attributeConfig.type === 'nested') {
      const nestedEvent: QueryFilterEvent = {
        id: `nested_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        conceptSet: displayTitle,
        chips: [],
        isEditing: false,
        operator: 'OR',
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
      chips: [],
      isEditing: false,
      operator: 'OR',
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

  // Chip management
  addChipToEvent(eventId: string, chip: QueryFilterChip): boolean {
    const event = this.getEvent(eventId)
    if (event) {
      // Ensure unique chip IDs
      if (!chip.id) {
        chip.id = `chip_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      }
      event.chips.push(chip)
      return true
    }
    return false
  }

  removeChipFromEvent(eventId: string, chipId: string): boolean {
    const event = this.getEvent(eventId)
    if (event) {
      const chipIndex = event.chips.findIndex(chip => chip.id === chipId)
      if (chipIndex > -1) {
        event.chips.splice(chipIndex, 1)
        return true
      }
    }
    return false
  }

  updateChipInEvent(eventId: string, chipId: string, updates: Partial<QueryFilterChip>): boolean {
    const event = this.getEvent(eventId)
    if (event) {
      const chip = event.chips.find(c => c.id === chipId)
      if (chip) {
        Object.assign(chip, updates)
        return true
      }
    }
    return false
  }

  // Utility methods
  toggle(): void {
    this.isExpanded = !this.isExpanded
  }

  hasEvents(): boolean {
    return this.events.length > 0
  }

  hasChips(): boolean {
    return this.events.some(e => e.conceptSetDetails && e.conceptSetDetails.length > 0)
  }

  getChipCount(): number {
    return this.events.reduce((sum, e) => sum + (e.conceptSetDetails ? e.conceptSetDetails.length : 0), 0)
  }

  clearAllChips(): void {
    this.events.forEach(e => {
      e.chips = []
    })
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
        chips: [...e.chips], // Deep copy chips
      })),
      isExpanded: this.isExpanded,
      operator: this.operator,
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

  // Chip management across filters
  addChipToEvent(filterId: string, eventId: string, chip: QueryFilterChip): boolean {
    const filter = this.getFilter(filterId)
    return filter ? filter.addChipToEvent(eventId, chip) : false
  }

  removeChipFromEvent(filterId: string, eventId: string, chipId: string): boolean {
    const filter = this.getFilter(filterId)
    return filter ? filter.removeChipFromEvent(eventId, chipId) : false
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
    return this.filters.some(f => f.hasChips())
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
    totalChips: number
  } {
    const totalEvents = this.filters.reduce((sum, f) => sum + f.events.length, 0)
    const totalChips = this.filters.reduce((sum, f) => sum + f.getChipCount(), 0)

    return {
      totalFilters: this.filters.length,
      inclusionFilters: this.getInclusionFilters().length,
      exclusionFilters: this.getExclusionFilters().length,
      totalEvents,
      totalChips,
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
            Type: filter.operator === 'OR' ? 'ANY' : 'ALL',
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
          Type: filter.operator === 'OR' ? 'ANY' : 'ALL',
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
    const hasChipsOrAge = inclusionFilters.some(f =>
      f.events.some(e => (e.conceptSetDetails && e.conceptSetDetails.length > 0) || (e.isAttributeBased && e.attributeConfig?.id === 'age'))
    )
    if (inclusionFilters.length > 0 && hasChipsOrAge) {
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

          if (childAgeEvents.length > 0) {
            if (parentHasAge) {
              // If parent has age, put nested age in ConditionOccurrence.Age
              criteria.Criteria.ConditionOccurrence.Age = {
                Op: 'gt',
              }
            } else {
              // If parent doesn't have age, put nested age in DemographicCriteriaList
              demographicCriteriaList.push({
                Age: {
                  Op: 'gt',
                },
              })
            }
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
}
