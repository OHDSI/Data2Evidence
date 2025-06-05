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
    return `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Condition management
  addCondition(condition?: Partial<QueryFilterCondition>): QueryFilterCondition {
    const newCondition: QueryFilterCondition = {
      id: condition?.id || `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conceptSet: condition?.conceptSet || '',
      conceptSetId: condition?.conceptSetId,
      chips: condition?.chips || [],
      isEditing: condition?.isEditing || false,
      operator: condition?.operator || 'OR',
    }
    this.conditions.push(newCondition)
    return newCondition
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
    return this.conditions.find(c => c.id === conditionId)
  }

  // Chip management
  addChipToCondition(conditionId: string, chip: QueryFilterChip): boolean {
    const condition = this.conditions.find(c => c.id === conditionId)
    if (condition) {
      // Ensure unique chip IDs
      if (!chip.id) {
        chip.id = `chip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
      condition.chips.push(chip)
      return true
    }
    return false
  }

  removeChipFromCondition(conditionId: string, chipId: string): boolean {
    const condition = this.conditions.find(c => c.id === conditionId)
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
    const condition = this.conditions.find(c => c.id === conditionId)
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
