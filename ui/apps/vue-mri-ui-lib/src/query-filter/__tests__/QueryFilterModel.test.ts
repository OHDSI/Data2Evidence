import { QueryFilterCardModel, QueryFilterManager, QueryFilterChip, QueryFilterCondition } from '../models/QueryFilterModel'

describe('QueryFilterCardModel', () => {
  let model: QueryFilterCardModel

  beforeEach(() => {
    model = new QueryFilterCardModel()
  })

  describe('constructor', () => {
    it('should create with default values', () => {
      expect(model.id).toBeDefined()
      expect(model.title).toBe('')
      expect(model.type).toBe('inclusion')
      expect(model.conditions).toEqual([])
      expect(model.isExpanded).toBe(true)
      expect(model.operator).toBe('AND')
    })

    it('should create with provided values', () => {
      const data = {
        id: 'test-id',
        title: 'Test Filter',
        type: 'exclusion' as const,
        isExpanded: false,
        operator: 'OR' as const,
      }
      const customModel = new QueryFilterCardModel(data)
      
      expect(customModel.id).toBe('test-id')
      expect(customModel.title).toBe('Test Filter')
      expect(customModel.type).toBe('exclusion')
      expect(customModel.isExpanded).toBe(false)
      expect(customModel.operator).toBe('OR')
    })

    it('should generate unique IDs', () => {
      const model1 = new QueryFilterCardModel()
      const model2 = new QueryFilterCardModel()
      expect(model1.id).not.toBe(model2.id)
    })
  })

  describe('condition management', () => {
    it('should add condition with default values', () => {
      const condition = model.addCondition()
      
      expect(condition.id).toBeDefined()
      expect(condition.conceptSet).toBe('')
      expect(condition.chips).toEqual([])
      expect(condition.isEditing).toBe(false)
      expect(condition.operator).toBe('OR')
      expect(model.conditions).toHaveLength(1)
    })

    it('should add condition with custom values', () => {
      const conditionData = {
        conceptSet: 'Test Concept Set',
        conceptSetId: 'cs-123',
        operator: 'AND' as const,
      }
      const condition = model.addCondition(conditionData)
      
      expect(condition.conceptSet).toBe('Test Concept Set')
      expect(condition.conceptSetId).toBe('cs-123')
      expect(condition.operator).toBe('AND')
    })

    it('should remove condition by ID', () => {
      const condition = model.addCondition()
      expect(model.conditions).toHaveLength(1)
      
      const removed = model.removeCondition(condition.id)
      expect(removed).toBe(true)
      expect(model.conditions).toHaveLength(0)
    })

    it('should return false when removing non-existent condition', () => {
      const removed = model.removeCondition('non-existent')
      expect(removed).toBe(false)
    })

    it('should update condition', () => {
      const condition = model.addCondition()
      const updated = model.updateCondition(condition.id, {
        conceptSet: 'Updated Concept Set',
        isEditing: true,
      })
      
      expect(updated).toBe(true)
      expect(condition.conceptSet).toBe('Updated Concept Set')
      expect(condition.isEditing).toBe(true)
    })

    it('should return false when updating non-existent condition', () => {
      const updated = model.updateCondition('non-existent', { conceptSet: 'test' })
      expect(updated).toBe(false)
    })

    it('should get condition by ID', () => {
      const condition = model.addCondition()
      const found = model.getCondition(condition.id)
      expect(found).toBe(condition)
      
      const notFound = model.getCondition('non-existent')
      expect(notFound).toBeUndefined()
    })
  })

  describe('chip management', () => {
    let condition: QueryFilterCondition

    beforeEach(() => {
      condition = model.addCondition()
    })

    it('should add chip to condition', () => {
      const chip: QueryFilterChip = {
        id: 'chip-1',
        label: 'Test Chip',
        value: 'test-value',
      }
      
      const added = model.addChipToCondition(condition.id, chip)
      expect(added).toBe(true)
      expect(condition.chips).toHaveLength(1)
      expect(condition.chips[0]).toBe(chip)
    })

    it('should generate ID for chip if not provided', () => {
      const chip: QueryFilterChip = {
        id: '',
        label: 'Test Chip',
        value: 'test-value',
      }
      
      model.addChipToCondition(condition.id, chip)
      expect(chip.id).toBeDefined()
      expect(chip.id).not.toBe('')
    })

    it('should return false when adding chip to non-existent condition', () => {
      const chip: QueryFilterChip = {
        id: 'chip-1',
        label: 'Test Chip',
        value: 'test-value',
      }
      
      const added = model.addChipToCondition('non-existent', chip)
      expect(added).toBe(false)
    })

    it('should remove chip from condition', () => {
      const chip: QueryFilterChip = {
        id: 'chip-1',
        label: 'Test Chip',
        value: 'test-value',
      }
      
      model.addChipToCondition(condition.id, chip)
      expect(condition.chips).toHaveLength(1)
      
      const removed = model.removeChipFromCondition(condition.id, chip.id)
      expect(removed).toBe(true)
      expect(condition.chips).toHaveLength(0)
    })

    it('should return false when removing non-existent chip', () => {
      const removed = model.removeChipFromCondition(condition.id, 'non-existent')
      expect(removed).toBe(false)
    })

    it('should update chip in condition', () => {
      const chip: QueryFilterChip = {
        id: 'chip-1',
        label: 'Test Chip',
        value: 'test-value',
      }
      
      model.addChipToCondition(condition.id, chip)
      const updated = model.updateChipInCondition(condition.id, chip.id, {
        label: 'Updated Chip',
        color: 'red',
      })
      
      expect(updated).toBe(true)
      expect(chip.label).toBe('Updated Chip')
      expect(chip.color).toBe('red')
    })

    it('should return false when updating chip in non-existent condition', () => {
      const updated = model.updateChipInCondition('non-existent', 'chip-1', { label: 'test' })
      expect(updated).toBe(false)
    })
  })

  describe('utility methods', () => {
    it('should toggle expansion state', () => {
      expect(model.isExpanded).toBe(true)
      model.toggle()
      expect(model.isExpanded).toBe(false)
      model.toggle()
      expect(model.isExpanded).toBe(true)
    })

    it('should check if has conditions', () => {
      expect(model.hasConditions()).toBe(false)
      model.addCondition()
      expect(model.hasConditions()).toBe(true)
    })

    it('should check if has chips', () => {
      expect(model.hasChips()).toBe(false)
      
      const condition = model.addCondition()
      expect(model.hasChips()).toBe(false)
      
      model.addChipToCondition(condition.id, {
        id: 'chip-1',
        label: 'Test',
        value: 'test',
      })
      expect(model.hasChips()).toBe(true)
    })

    it('should count chips across all conditions', () => {
      expect(model.getChipCount()).toBe(0)
      
      const condition1 = model.addCondition()
      const condition2 = model.addCondition()
      
      model.addChipToCondition(condition1.id, { id: 'chip-1', label: 'Test 1', value: 'test1' })
      model.addChipToCondition(condition1.id, { id: 'chip-2', label: 'Test 2', value: 'test2' })
      model.addChipToCondition(condition2.id, { id: 'chip-3', label: 'Test 3', value: 'test3' })
      
      expect(model.getChipCount()).toBe(3)
    })

    it('should clear all chips', () => {
      const condition1 = model.addCondition()
      const condition2 = model.addCondition()
      
      model.addChipToCondition(condition1.id, { id: 'chip-1', label: 'Test 1', value: 'test1' })
      model.addChipToCondition(condition2.id, { id: 'chip-2', label: 'Test 2', value: 'test2' })
      
      expect(model.getChipCount()).toBe(2)
      model.clearAllChips()
      expect(model.getChipCount()).toBe(0)
    })
  })

  describe('cloning and serialization', () => {
    it('should clone model with new ID', () => {
      model.title = 'Original'
      const condition = model.addCondition({ conceptSet: 'Test CS' })
      model.addChipToCondition(condition.id, { id: 'chip-1', label: 'Test', value: 'test' })
      
      const clone = model.clone()
      
      expect(clone.id).not.toBe(model.id)
      expect(clone.title).toBe('Original')
      expect(clone.conditions).toHaveLength(1)
      expect(clone.getChipCount()).toBe(1)
      
      // Ensure deep copy - conditions should be different objects
      expect(clone.conditions[0]).not.toBe(model.conditions[0])
      // But chip content should be the same (toJSON does shallow copy of chips array)
      expect(clone.conditions[0].chips[0]).toEqual(model.conditions[0].chips[0])
    })

    it('should serialize to JSON', () => {
      model.title = 'Test Filter'
      const condition = model.addCondition({ conceptSet: 'Test CS' })
      model.addChipToCondition(condition.id, { id: 'chip-1', label: 'Test', value: 'test' })
      
      const json = model.toJSON()
      
      expect(json.id).toBe(model.id)
      expect(json.title).toBe('Test Filter')
      expect(json.conditions).toHaveLength(1)
      expect(json.conditions[0].chips).toHaveLength(1)
    })
  })
})

describe('QueryFilterManager', () => {
  let manager: QueryFilterManager

  beforeEach(() => {
    manager = new QueryFilterManager()
  })

  describe('constructor', () => {
    it('should create with empty filters', () => {
      expect(manager.getAllFilters()).toEqual([])
      expect(manager.getFilterCount()).toBe(0)
    })

    it('should create with initial filters', () => {
      const filters = [new QueryFilterCardModel({ title: 'Test 1' })]
      const customManager = new QueryFilterManager(filters)
      
      expect(customManager.getFilterCount()).toBe(1)
      expect(customManager.getAllFilters()[0].title).toBe('Test 1')
    })
  })

  describe('filter management', () => {
    it('should add filter with default values', () => {
      const filter = manager.addFilter()
      
      expect(filter).toBeInstanceOf(QueryFilterCardModel)
      expect(manager.getFilterCount()).toBe(1)
      expect(manager.getAllFilters()[0]).toBe(filter)
    })

    it('should add filter with custom values', () => {
      const filter = manager.addFilter({
        title: 'Custom Filter',
        type: 'exclusion',
      })
      
      expect(filter.title).toBe('Custom Filter')
      expect(filter.type).toBe('exclusion')
    })

    it('should remove filter by ID', () => {
      const filter = manager.addFilter()
      expect(manager.getFilterCount()).toBe(1)
      
      const removed = manager.removeFilter(filter.id)
      expect(removed).toBe(true)
      expect(manager.getFilterCount()).toBe(0)
    })

    it('should return false when removing non-existent filter', () => {
      const removed = manager.removeFilter('non-existent')
      expect(removed).toBe(false)
    })

    it('should update filter', () => {
      const filter = manager.addFilter()
      const updated = manager.updateFilter(filter.id, {
        title: 'Updated Filter',
        type: 'exclusion',
      })
      
      expect(updated).toBe(true)
      expect(filter.title).toBe('Updated Filter')
      expect(filter.type).toBe('exclusion')
    })

    it('should move filter to new position', () => {
      const filter1 = manager.addFilter({ title: 'Filter 1' })
      const filter2 = manager.addFilter({ title: 'Filter 2' })
      const filter3 = manager.addFilter({ title: 'Filter 3' })
      
      const moved = manager.moveFilter(filter1.id, 2)
      expect(moved).toBe(true)
      
      const filters = manager.getAllFilters()
      expect(filters[0].title).toBe('Filter 2')
      expect(filters[1].title).toBe('Filter 3')
      expect(filters[2].title).toBe('Filter 1')
    })

    it('should return false when moving filter to invalid position', () => {
      const filter = manager.addFilter()
      
      expect(manager.moveFilter(filter.id, -1)).toBe(false)
      expect(manager.moveFilter(filter.id, 10)).toBe(false)
      expect(manager.moveFilter('non-existent', 0)).toBe(false)
    })
  })

  describe('filter getters', () => {
    beforeEach(() => {
      manager.addFilter({ title: 'Inclusion 1', type: 'inclusion' })
      manager.addFilter({ title: 'Exclusion 1', type: 'exclusion' })
      manager.addFilter({ title: 'Inclusion 2', type: 'inclusion' })
    })

    it('should get filter by ID', () => {
      const filters = manager.getAllFilters()
      const found = manager.getFilter(filters[0].id)
      expect(found).toBe(filters[0])
      
      const notFound = manager.getFilter('non-existent')
      expect(notFound).toBeUndefined()
    })

    it('should get all filters', () => {
      const filters = manager.getAllFilters()
      expect(filters).toHaveLength(3)
      expect(filters[0].title).toBe('Inclusion 1')
    })

    it('should get inclusion filters', () => {
      const inclusionFilters = manager.getInclusionFilters()
      expect(inclusionFilters).toHaveLength(2)
      expect(inclusionFilters.every(f => f.type === 'inclusion')).toBe(true)
    })

    it('should get exclusion filters', () => {
      const exclusionFilters = manager.getExclusionFilters()
      expect(exclusionFilters).toHaveLength(1)
      expect(exclusionFilters[0].title).toBe('Exclusion 1')
    })

    it('should get filter count', () => {
      expect(manager.getFilterCount()).toBe(3)
    })
  })

  describe('condition and chip management', () => {
    let filter: QueryFilterCardModel

    beforeEach(() => {
      filter = manager.addFilter()
    })

    it('should add condition to filter', () => {
      const condition = manager.addConditionToFilter(filter.id, {
        conceptSet: 'Test CS',
      })
      
      expect(condition).not.toBeNull()
      expect(condition!.conceptSet).toBe('Test CS')
      expect(filter.conditions).toHaveLength(1)
    })

    it('should return null when adding condition to non-existent filter', () => {
      const condition = manager.addConditionToFilter('non-existent', {})
      expect(condition).toBeNull()
    })

    it('should remove condition from filter', () => {
      const condition = manager.addConditionToFilter(filter.id, {})!
      expect(filter.conditions).toHaveLength(1)
      
      const removed = manager.removeConditionFromFilter(filter.id, condition.id)
      expect(removed).toBe(true)
      expect(filter.conditions).toHaveLength(0)
    })

    it('should add chip to condition', () => {
      const condition = manager.addConditionToFilter(filter.id, {})!
      const chip: QueryFilterChip = {
        id: 'chip-1',
        label: 'Test Chip',
        value: 'test',
      }
      
      const added = manager.addChipToCondition(filter.id, condition.id, chip)
      expect(added).toBe(true)
      expect(condition.chips).toHaveLength(1)
    })

    it('should remove chip from condition', () => {
      const condition = manager.addConditionToFilter(filter.id, {})!
      const chip: QueryFilterChip = {
        id: 'chip-1',
        label: 'Test Chip',
        value: 'test',
      }
      
      manager.addChipToCondition(filter.id, condition.id, chip)
      expect(condition.chips).toHaveLength(1)
      
      const removed = manager.removeChipFromCondition(filter.id, condition.id, chip.id)
      expect(removed).toBe(true)
      expect(condition.chips).toHaveLength(0)
    })
  })

  describe('bulk operations', () => {
    beforeEach(() => {
      manager.addFilter({ title: 'Filter 1' })
      manager.addFilter({ title: 'Filter 2' })
    })

    it('should clear all filters', () => {
      expect(manager.getFilterCount()).toBe(2)
      manager.clearAllFilters()
      expect(manager.getFilterCount()).toBe(0)
    })

    it('should clear empty filters', () => {
      const filterWithCondition = manager.addFilter()
      filterWithCondition.addCondition()
      
      expect(manager.getFilterCount()).toBe(3)
      manager.clearEmptyFilters()
      expect(manager.getFilterCount()).toBe(1) // Only the one with condition remains
    })

    it('should clear empty conditions', () => {
      const filter = manager.addFilter()
      const condition1 = filter.addCondition()
      const condition2 = filter.addCondition()
      
      // Add chip to only one condition
      filter.addChipToCondition(condition1.id, {
        id: 'chip-1',
        label: 'Test',
        value: 'test',
      })
      
      expect(filter.conditions).toHaveLength(2)
      manager.clearEmptyConditions()
      expect(filter.conditions).toHaveLength(1) // Only condition with chips remains
    })
  })

  describe('validation', () => {
    it('should check if has filters', () => {
      expect(manager.hasFilters()).toBe(false)
      manager.addFilter()
      expect(manager.hasFilters()).toBe(true)
    })

    it('should check if has valid filters', () => {
      expect(manager.hasValidFilters()).toBe(false)
      
      const filter = manager.addFilter()
      expect(manager.hasValidFilters()).toBe(false)
      
      const condition = filter.addCondition()
      expect(manager.hasValidFilters()).toBe(false)
      
      filter.addChipToCondition(condition.id, {
        id: 'chip-1',
        label: 'Test',
        value: 'test',
      })
      expect(manager.hasValidFilters()).toBe(true)
    })

    it('should validate filters and return errors', () => {
      // Empty manager
      let validation = manager.validateFilters()
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toEqual([])
      
      // Filter without title
      const filter1 = manager.addFilter()
      validation = manager.validateFilters()
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain(`Filter ${filter1.id} has no title`)
      
      // Filter with title but no conditions
      filter1.title = 'Test Filter'
      validation = manager.validateFilters()
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Filter "Test Filter" has no conditions')
      
      // Condition without concept set
      const condition = filter1.addCondition()
      validation = manager.validateFilters()
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain(`Condition ${condition.id} in filter "Test Filter" has no concept set`)
      
      // Valid filter
      condition.conceptSet = 'Test Concept Set'
      validation = manager.validateFilters()
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toEqual([])
    })
  })

  describe('serialization and cloning', () => {
    beforeEach(() => {
      const filter1 = manager.addFilter({ title: 'Filter 1' })
      const condition = filter1.addCondition({ conceptSet: 'CS 1' })
      filter1.addChipToCondition(condition.id, {
        id: 'chip-1',
        label: 'Test',
        value: 'test',
      })
      
      manager.addFilter({ title: 'Filter 2', type: 'exclusion' })
    })

    it('should serialize to JSON', () => {
      const json = manager.toJSON()
      
      expect(json).toHaveLength(2)
      expect(json[0].title).toBe('Filter 1')
      expect(json[1].title).toBe('Filter 2')
      expect(json[0].conditions).toHaveLength(1)
    })

    it('should create manager from JSON', () => {
      const json = manager.toJSON()
      const newManager = QueryFilterManager.fromJSON(json)
      
      expect(newManager.getFilterCount()).toBe(2)
      expect(newManager.getAllFilters()[0].title).toBe('Filter 1')
      expect(newManager.getAllFilters()[1].title).toBe('Filter 2')
    })

    it('should clone manager', () => {
      const clone = manager.clone()
      
      expect(clone.getFilterCount()).toBe(2)
      expect(clone.getAllFilters()[0].title).toBe('Filter 1')
      
      // Ensure deep copy
      const originalFilters = manager.getAllFilters()
      const clonedFilters = clone.getAllFilters()
      expect(clonedFilters[0]).not.toBe(originalFilters[0])
      expect(clonedFilters[0].id).not.toBe(originalFilters[0].id)
    })

    it('should get summary statistics', () => {
      const summary = manager.getSummary()
      
      expect(summary.totalFilters).toBe(2)
      expect(summary.inclusionFilters).toBe(1)
      expect(summary.exclusionFilters).toBe(1)
      expect(summary.totalConditions).toBe(1)
      expect(summary.totalChips).toBe(1)
    })
  })
})