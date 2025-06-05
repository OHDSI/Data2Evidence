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

export interface QueryFilterCondition {
  id: string
  conceptSet: string
  conceptSetId?: string
  chips: QueryFilterChip[]
  isEditing?: boolean
  operator?: 'AND' | 'OR' // For combining chips
  criteriaType?: string // The type of criteria (e.g., 'conditionOccurrence', 'drugExposure')
  selectedAttributes?: string[] // Selected attribute IDs
  isAttributeBased?: boolean // True if this condition was created from an attribute selection
  parentConditionId?: string // Reference to the parent condition if this is attribute-based
  attributeConfig?: { // Store the original attribute config for attribute-based conditions
    id: string
    name: string
    description: string
    type: string
    category: string
  }
  isNested?: boolean // True if this is a nested criteria group
  nestedConditions?: QueryFilterCondition[] // Child conditions for nested groups
  nestedOperator?: 'AND' | 'OR' // Operator for combining nested conditions
}

export class QueryFilterCardModel {
  id: string
  title: string
  type: 'inclusion' | 'exclusion'
  conditions: QueryFilterCondition[]
  isExpanded: boolean
  operator: 'AND' | 'OR' // For combining conditions

  constructor(data: Partial<QueryFilterCardModel> = {}) {
    this.id = data.id || this.generateId()
    this.title = data.title || ''
    this.type = data.type || 'inclusion'
    this.conditions = data.conditions || []
    this.isExpanded = data.isExpanded !== undefined ? data.isExpanded : true
    this.operator = data.operator || 'AND'
  }

  private generateId(): string {
    return `filter_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  // Condition management
  addCondition(condition?: Partial<QueryFilterCondition>): QueryFilterCondition {
    const newCondition: QueryFilterCondition = {
      id: condition?.id || `condition_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conceptSet: condition?.conceptSet || '',
      conceptSetId: condition?.conceptSetId,
      chips: condition?.chips || [],
      isEditing: condition?.isEditing || false,
      operator: condition?.operator || 'OR',
      criteriaType: condition?.criteriaType,
      selectedAttributes: condition?.selectedAttributes,
      isAttributeBased: condition?.isAttributeBased || false,
      parentConditionId: condition?.parentConditionId,
      attributeConfig: condition?.attributeConfig,
      isNested: condition?.isNested || false,
      nestedConditions: condition?.nestedConditions || [],
      nestedOperator: condition?.nestedOperator || 'AND',
    }
    this.conditions.push(newCondition)
    return newCondition
  }

  // Add attribute-based condition
  addAttributeCondition(parentConditionId: string, attributeConfig: any): QueryFilterCondition {
    const parentCondition = this.getCondition(parentConditionId)
    if (!parentCondition) {
      throw new Error(`Parent condition ${parentConditionId} not found`)
    }

    // Remove "Add " prefix from the title for display
    const displayTitle = (attributeConfig.title || attributeConfig.name).replace(/^Add\s+/, '')
    
    // Special handling for nested criteria
    if (attributeConfig.type === 'nested') {
      const nestedCondition: QueryFilterCondition = {
        id: `nested_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        conceptSet: displayTitle,
        chips: [],
        isEditing: false,
        operator: 'OR',
        criteriaType: parentCondition.criteriaType,
        isAttributeBased: true,
        parentConditionId: parentConditionId,
        isNested: true,
        nestedConditions: [],
        nestedOperator: 'AND',
        attributeConfig: {
          id: attributeConfig.id,
          name: displayTitle,
          description: attributeConfig.description || attributeConfig.defaultDescription || '',
          type: attributeConfig.type,
          category: attributeConfig.category || 'criteria-specific'
        }
      }
      
      // Find the insert position (after parent and its existing attribute children)
      const parentIndex = this.conditions.findIndex(c => c.id === parentConditionId)
      let insertIndex = parentIndex + 1
      
      // Find the last attribute condition that belongs to this parent
      while (insertIndex < this.conditions.length && 
             this.conditions[insertIndex].isAttributeBased && 
             this.conditions[insertIndex].parentConditionId === parentConditionId) {
        insertIndex++
      }
      
      this.conditions.splice(insertIndex, 0, nestedCondition)
      return nestedCondition
    }
    
    // Regular attribute condition
    const newCondition: QueryFilterCondition = {
      id: `attr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conceptSet: displayTitle,
      chips: [],
      isEditing: false,
      operator: 'OR',
      criteriaType: parentCondition.criteriaType,
      isAttributeBased: true,
      parentConditionId: parentConditionId,
      attributeConfig: {
        id: attributeConfig.id,
        name: displayTitle,
        description: attributeConfig.description || attributeConfig.defaultDescription || '',
        type: attributeConfig.type,
        category: attributeConfig.category || 'criteria-specific'
      }
    }
    
    // Find the insert position (after parent and its existing attribute children)
    const parentIndex = this.conditions.findIndex(c => c.id === parentConditionId)
    let insertIndex = parentIndex + 1
    
    // Find the last attribute condition that belongs to this parent
    while (insertIndex < this.conditions.length && 
           this.conditions[insertIndex].isAttributeBased && 
           this.conditions[insertIndex].parentConditionId === parentConditionId) {
      insertIndex++
    }
    
    this.conditions.splice(insertIndex, 0, newCondition)
    return newCondition
  }

  // Get all conditions that belong to a parent (including the parent itself)
  getConditionGroup(parentConditionId: string): QueryFilterCondition[] {
    const conditions: QueryFilterCondition[] = []
    const parent = this.getCondition(parentConditionId)
    if (parent) {
      conditions.push(parent)
      conditions.push(...this.conditions.filter(c => c.parentConditionId === parentConditionId))
    }
    return conditions
  }

  // Check if a condition can be deleted (not the parent condition or has no attribute children)
  canDeleteCondition(conditionId: string): boolean {
    const condition = this.getCondition(conditionId)
    if (!condition) return false
    
    // Can't delete if it's a parent condition with attribute children
    if (!condition.isAttributeBased && this.conditions.some(c => c.parentConditionId === conditionId)) {
      return false
    }
    
    return true
  }

  // Add condition to nested criteria
  addNestedCondition(nestedConditionId: string, condition: Partial<QueryFilterCondition>): QueryFilterCondition {
    const nestedCondition = this.getCondition(nestedConditionId)
    if (!nestedCondition || !nestedCondition.isNested) {
      throw new Error(`Nested condition ${nestedConditionId} not found`)
    }

    const newCondition: QueryFilterCondition = {
      id: condition.id || `nested_child_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conceptSet: condition.conceptSet || '',
      conceptSetId: condition.conceptSetId,
      chips: condition.chips || [],
      isEditing: condition.isEditing || false,
      operator: condition.operator || 'OR',
      criteriaType: condition.criteriaType,
      selectedAttributes: condition.selectedAttributes,
      isAttributeBased: false,
      parentConditionId: nestedConditionId,
      isNested: false,
      nestedConditions: [],
      nestedOperator: 'AND',
    }

    // Use the recursive container logic to ensure we add to the correct nested level
    this.addConditionToNestedContainer(nestedConditionId, newCondition)
    return newCondition
  }

  // Helper method to add a condition to the correct nested container
  private addConditionToNestedContainer(nestedConditionId: string, newCondition: QueryFilterCondition) {
    // First, try to find it in main conditions
    const mainNestedCondition = this.conditions.find(c => c.id === nestedConditionId && c.isNested)
    if (mainNestedCondition) {
      if (!mainNestedCondition.nestedConditions) {
        mainNestedCondition.nestedConditions = []
      }
      mainNestedCondition.nestedConditions.push(newCondition)
      return
    }

    // If not found in main conditions, search recursively in nested structures
    for (const condition of this.conditions) {
      if (condition.isNested && condition.nestedConditions) {
        if (this.addToNestedConditionRecursive(nestedConditionId, newCondition, condition)) {
          return
        }
      }
    }

    throw new Error(`Could not find nested condition ${nestedConditionId} to add to`)
  }

  private addToNestedConditionRecursive(targetId: string, newCondition: QueryFilterCondition, container: QueryFilterCondition): boolean {
    if (!container.nestedConditions) return false

    // Check if target is directly in this container
    const targetCondition = container.nestedConditions.find(c => c.id === targetId && c.isNested)
    if (targetCondition) {
      if (!targetCondition.nestedConditions) {
        targetCondition.nestedConditions = []
      }
      targetCondition.nestedConditions.push(newCondition)
      return true
    }

    // Recursively search deeper
    for (const nestedCondition of container.nestedConditions) {
      if (nestedCondition.isNested && nestedCondition.nestedConditions) {
        if (this.addToNestedConditionRecursive(targetId, newCondition, nestedCondition)) {
          return true
        }
      }
    }

    return false
  }

  // Add attribute-based condition to nested criteria
  addNestedAttributeCondition(parentConditionId: string, attributeConfig: any): QueryFilterCondition {
    // Find the parent condition using recursive search
    const parentCondition = this.getCondition(parentConditionId)
    if (!parentCondition) {
      throw new Error(`Parent condition ${parentConditionId} not found`)
    }

    // Find which nested container holds this parent condition
    const { container, containerPath } = this.findNestedContainer(parentConditionId)
    if (!container) {
      throw new Error(`Could not find container for condition ${parentConditionId}`)
    }

    // Remove "Add " prefix from the title for display
    const displayTitle = (attributeConfig.title || attributeConfig.name).replace(/^Add\s+/, '')
    
    // Special handling for nested criteria
    if (attributeConfig.type === 'nested') {
      const nestedCondition: QueryFilterCondition = {
        id: `nested_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        conceptSet: displayTitle,
        chips: [],
        isEditing: false,
        operator: 'OR',
        criteriaType: parentCondition.criteriaType,
        isAttributeBased: true,
        parentConditionId: parentConditionId,
        isNested: true,
        nestedConditions: [],
        nestedOperator: 'AND',
        attributeConfig: {
          id: attributeConfig.id,
          name: displayTitle,
          description: attributeConfig.description || attributeConfig.defaultDescription || '',
          type: attributeConfig.type,
          category: attributeConfig.category || 'criteria-specific'
        }
      }
      
      this.insertConditionInContainer(nestedCondition, parentConditionId, container)
      return nestedCondition
    }
    
    // Regular attribute condition
    const newCondition: QueryFilterCondition = {
      id: `attr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conceptSet: displayTitle,
      chips: [],
      isEditing: false,
      operator: 'OR',
      criteriaType: parentCondition.criteriaType,
      isAttributeBased: true,
      parentConditionId: parentConditionId,
      attributeConfig: {
        id: attributeConfig.id,
        name: displayTitle,
        description: attributeConfig.description || attributeConfig.defaultDescription || '',
        type: attributeConfig.type,
        category: attributeConfig.category || 'criteria-specific'
      }
    }
    
    this.insertConditionInContainer(newCondition, parentConditionId, container)
    return newCondition
  }

  // Remove condition from nested criteria
  removeNestedCondition(nestedConditionId: string, conditionId: string): boolean {
    const nestedCondition = this.getCondition(nestedConditionId)
    if (!nestedCondition || !nestedCondition.isNested || !nestedCondition.nestedConditions) {
      return false
    }

    const index = nestedCondition.nestedConditions.findIndex(c => c.id === conditionId)
    if (index > -1) {
      nestedCondition.nestedConditions.splice(index, 1)
      return true
    }
    return false
  }

  removeCondition(conditionId: string): boolean {
    const index = this.conditions.findIndex(c => c.id === conditionId)
    if (index > -1) {
      this.conditions.splice(index, 1)
      return true
    }
    return false
  }

  updateCondition(conditionId: string, updates: Partial<QueryFilterCondition>): boolean {
    const condition = this.conditions.find(c => c.id === conditionId)
    if (condition) {
      Object.assign(condition, updates)
      return true
    }
    return false
  }

  getCondition(conditionId: string): QueryFilterCondition | undefined {
    // First check main conditions
    const mainCondition = this.conditions.find(c => c.id === conditionId)
    if (mainCondition) return mainCondition
    
    // Recursively search in nested conditions
    for (const condition of this.conditions) {
      if (condition.isNested && condition.nestedConditions) {
        const found = this.findConditionInNested(conditionId, condition.nestedConditions)
        if (found) return found
      }
    }
    
    return undefined
  }

  // Helper method to recursively search nested conditions
  private findConditionInNested(conditionId: string, nestedConditions: QueryFilterCondition[]): QueryFilterCondition | undefined {
    for (const condition of nestedConditions) {
      if (condition.id === conditionId) return condition
      
      // Recursively search deeper if this condition also has nested conditions
      if (condition.isNested && condition.nestedConditions) {
        const found = this.findConditionInNested(conditionId, condition.nestedConditions)
        if (found) return found
      }
    }
    return undefined
  }

  // Find which nested container holds a specific condition
  private findNestedContainer(conditionId: string): { container: QueryFilterCondition | null, containerPath: string[] } {
    // Check if it's in main conditions
    if (this.conditions.find(c => c.id === conditionId)) {
      return { container: null, containerPath: [] } // Main level
    }

    // Recursively search in nested structures
    for (const condition of this.conditions) {
      if (condition.isNested && condition.nestedConditions) {
        const result = this.findNestedContainerRecursive(conditionId, condition, [condition.id])
        if (result.container) return result
      }
    }

    return { container: null, containerPath: [] }
  }

  private findNestedContainerRecursive(conditionId: string, container: QueryFilterCondition, path: string[]): { container: QueryFilterCondition | null, containerPath: string[] } {
    if (!container.nestedConditions) return { container: null, containerPath: [] }

    // Check if the condition is directly in this container
    if (container.nestedConditions.find(c => c.id === conditionId)) {
      return { container, containerPath: path }
    }

    // Recursively search deeper
    for (const nestedCondition of container.nestedConditions) {
      if (nestedCondition.isNested && nestedCondition.nestedConditions) {
        const result = this.findNestedContainerRecursive(conditionId, nestedCondition, [...path, nestedCondition.id])
        if (result.container) return result
      }
    }

    return { container: null, containerPath: [] }
  }

  // Helper method to insert a condition in the correct container (main or nested)
  private insertConditionInContainer(newCondition: QueryFilterCondition, parentConditionId: string, container: QueryFilterCondition | null) {
    if (container === null) {
      // Insert in main conditions
      const parentIndex = this.conditions.findIndex(c => c.id === parentConditionId)
      let insertIndex = parentIndex + 1
      
      while (insertIndex < this.conditions.length && 
             this.conditions[insertIndex].isAttributeBased && 
             this.conditions[insertIndex].parentConditionId === parentConditionId) {
        insertIndex++
      }
      
      this.conditions.splice(insertIndex, 0, newCondition)
    } else {
      // Insert in nested container
      if (!container.nestedConditions) {
        container.nestedConditions = []
      }
      
      const parentIndex = container.nestedConditions.findIndex(c => c.id === parentConditionId)
      let insertIndex = parentIndex + 1
      
      while (insertIndex < container.nestedConditions.length && 
             container.nestedConditions[insertIndex].isAttributeBased && 
             container.nestedConditions[insertIndex].parentConditionId === parentConditionId) {
        insertIndex++
      }
      
      container.nestedConditions.splice(insertIndex, 0, newCondition)
    }
  }

  // Chip management
  addChipToCondition(conditionId: string, chip: QueryFilterChip): boolean {
    const condition = this.getCondition(conditionId)
    if (condition) {
      // Ensure unique chip IDs
      if (!chip.id) {
        chip.id = `chip_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      }
      condition.chips.push(chip)
      return true
    }
    return false
  }

  removeChipFromCondition(conditionId: string, chipId: string): boolean {
    const condition = this.getCondition(conditionId)
    if (condition) {
      const chipIndex = condition.chips.findIndex(chip => chip.id === chipId)
      if (chipIndex > -1) {
        condition.chips.splice(chipIndex, 1)
        return true
      }
    }
    return false
  }

  updateChipInCondition(conditionId: string, chipId: string, updates: Partial<QueryFilterChip>): boolean {
    const condition = this.getCondition(conditionId)
    if (condition) {
      const chip = condition.chips.find(c => c.id === chipId)
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

  hasConditions(): boolean {
    return this.conditions.length > 0
  }

  hasChips(): boolean {
    return this.conditions.some(c => c.chips.length > 0)
  }

  getChipCount(): number {
    return this.conditions.reduce((sum, c) => sum + c.chips.length, 0)
  }

  clearAllChips(): void {
    this.conditions.forEach(c => {
      c.chips = []
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
      conditions: this.conditions.map(c => ({
        ...c,
        chips: [...c.chips], // Deep copy chips
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

  // Condition management across filters
  addConditionToFilter(filterId: string, condition?: Partial<QueryFilterCondition>): QueryFilterCondition | null {
    const filter = this.getFilter(filterId)
    if (filter) {
      return filter.addCondition(condition)
    }
    return null
  }

  removeConditionFromFilter(filterId: string, conditionId: string): boolean {
    const filter = this.getFilter(filterId)
    return filter ? filter.removeCondition(conditionId) : false
  }

  // Chip management across filters
  addChipToCondition(filterId: string, conditionId: string, chip: QueryFilterChip): boolean {
    const filter = this.getFilter(filterId)
    return filter ? filter.addChipToCondition(conditionId, chip) : false
  }

  removeChipFromCondition(filterId: string, conditionId: string, chipId: string): boolean {
    const filter = this.getFilter(filterId)
    return filter ? filter.removeChipFromCondition(conditionId, chipId) : false
  }

  // Bulk operations
  clearAllFilters(): void {
    this.filters = []
  }

  clearEmptyFilters(): void {
    this.filters = this.filters.filter(f => f.hasConditions())
  }

  clearEmptyConditions(): void {
    this.filters.forEach(filter => {
      filter.conditions = filter.conditions.filter(c => c.chips.length > 0)
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
      if (!filter.hasConditions()) {
        errors.push(`Filter "${filter.title}" has no conditions`)
      }
      filter.conditions.forEach(condition => {
        if (!condition.conceptSet) {
          errors.push(`Condition ${condition.id} in filter "${filter.title}" has no concept set`)
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
    totalConditions: number
    totalChips: number
  } {
    const totalConditions = this.filters.reduce((sum, f) => sum + f.conditions.length, 0)
    const totalChips = this.filters.reduce((sum, f) => sum + f.getChipCount(), 0)

    return {
      totalFilters: this.filters.length,
      inclusionFilters: this.getInclusionFilters().length,
      exclusionFilters: this.getExclusionFilters().length,
      totalConditions,
      totalChips,
    }
  }
}
