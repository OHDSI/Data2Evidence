import { QueryFilterCriteriaManager } from '../../models/QueryFilterModel'

describe('QueryFilterCriteria Model Tests', () => {
  let criteriaManager: QueryFilterCriteriaManager

  beforeEach(() => {
    // Create a basic criteria manager with sample data
    criteriaManager = new QueryFilterCriteriaManager({
      inclusionCriteria: {
        qualifyingEventsLimit: 'ALL',
        criteria: [
          {
            id: 'criteria_1',
            title: 'Test Criteria 1',
            description: 'Test description',
            criteriaType: 'ALL',
            events: [],
          },
        ],
      },
    })
  })

  it('creates a valid criteria manager', () => {
    expect(criteriaManager).toBeDefined()
    expect(criteriaManager.getCriteria()).toBeDefined()
    expect(criteriaManager.getCriteria().criteriaType).toBe('ALL')
    expect(criteriaManager.getCriteria().criteria).toHaveLength(1)
  })

  it('supports different qualifying events limits', () => {
    expect(criteriaManager.getCriteria().criteriaType).toBe('ALL')

    criteriaManager.updateQualifyingEventsLimit('EARLIEST')
    expect(criteriaManager.getCriteria().criteriaType).toBe('EARLIEST')

    criteriaManager.updateQualifyingEventsLimit('LATEST')
    expect(criteriaManager.getCriteria().criteriaType).toBe('LATEST')

    criteriaManager.updateQualifyingEventsLimit('ALL')
    expect(criteriaManager.getCriteria().criteriaType).toBe('ALL')
  })

  it('manages criteria groups correctly', () => {
    const criteria = criteriaManager.getCriteria()
    const initialCount = criteria.criteria.length

    // Add a new criteria group
    criteriaManager.addCriteriaGroup({
      title: 'New Criteria Group',
      description: 'New description',
      criteriaType: 'ANY',
      events: [],
    })

    expect(criteria.criteria.length).toBe(initialCount + 1)
    expect(criteria.criteria[1].title).toBe('New Criteria Group')
    expect(criteria.criteria[1].criteriaType).toBe('ANY')
  })

  it('updates criteria groups', () => {
    const criteria = criteriaManager.getCriteria()
    const originalGroup = criteria.criteria[0]

    const updatedGroup = {
      ...originalGroup,
      title: 'Updated Title',
      description: 'Updated Description',
      criteriaType: 'ANY' as const,
    }

    criteriaManager.updateCriteriaGroup(0, updatedGroup)

    const updatedCriteria = criteriaManager.getCriteria()
    expect(updatedCriteria.criteria[0].title).toBe('Updated Title')
    expect(updatedCriteria.criteria[0].description).toBe('Updated Description')
    expect(updatedCriteria.criteria[0].criteriaType).toBe('ANY')
  })

  it('removes criteria groups', () => {
    const criteria = criteriaManager.getCriteria()
    const initialCount = criteria.criteria.length

    // Add an extra group first
    criteriaManager.addCriteriaGroup({
      title: 'Temporary Group',
      description: 'To be removed',
      criteriaType: 'ALL',
      events: [],
    })

    expect(criteria.criteria.length).toBe(initialCount + 1)

    // Remove the group
    criteriaManager.removeCriteriaGroup(1)

    expect(criteria.criteria.length).toBe(initialCount)
    expect(criteria.criteria[0].title).toBe('Test Criteria 1')
  })

  it('clears all criteria', () => {
    const criteria = criteriaManager.getCriteria()
    expect(criteria.criteria.length).toBeGreaterThan(0)

    criteriaManager.clearAllCriteria()

    expect(criteria.criteria.length).toBe(0)
  })

  it('supports criteria serialization and deserialization', () => {
    const originalCriteria = criteriaManager.getCriteria()

    // Serialize to JSON
    const json = criteriaManager.toJSON()
    expect(json).toBeDefined()
    expect(json.criteriaType).toBe('ALL')
    expect(json.criteria).toHaveLength(1)

    // Create new manager from JSON
    const newManager = QueryFilterCriteriaManager.fromJSON(json)
    const newCriteria = newManager.getCriteria()

    expect(newCriteria.criteriaType).toBe(originalCriteria.criteriaType)
    expect(newCriteria.criteria.length).toBe(originalCriteria.criteria.length)
    expect(newCriteria.criteria[0].title).toBe(originalCriteria.criteria[0].title)
  })

  it('validates criteria structure', () => {
    const criteria = criteriaManager.getCriteria()

    // Check root structure
    expect(criteria.id).toBeDefined()
    expect(criteria.criteriaType).toBeDefined()
    expect(Array.isArray(criteria.criteria)).toBe(true)

    // Check group structure
    criteria.criteria.forEach(group => {
      expect(group.id).toBeDefined()
      expect(group.title).toBeDefined()
      expect(group.description).toBeDefined()
      expect(group.criteriaType).toBeDefined()
      expect(Array.isArray(group.groups)).toBe(true)
    })
  })

  it('handles empty criteria manager', () => {
    const emptyManager = new QueryFilterCriteriaManager()
    const emptyCriteria = emptyManager.getCriteria()

    expect(emptyCriteria.criteriaType).toBe('ALL')
    expect(emptyCriteria.criteria).toHaveLength(0)
  })

  it('supports manager cloning', () => {
    const originalManager = criteriaManager
    const clonedManager = originalManager.clone()

    expect(clonedManager).not.toBe(originalManager)
    expect(clonedManager.getCriteria().criteriaType).toBe(originalManager.getCriteria().criteriaType)
    expect(clonedManager.getCriteria().criteria.length).toBe(originalManager.getCriteria().criteria.length)

    // Verify deep copy
    const originalCriteria = originalManager.getCriteria()
    const clonedCriteria = clonedManager.getCriteria()

    expect(clonedCriteria).not.toBe(originalCriteria)
    expect(clonedCriteria.criteria[0]).not.toBe(originalCriteria.criteria[0])
  })

  it('handles manager state consistency after operations', () => {
    // Perform multiple operations
    criteriaManager.updateQualifyingEventsLimit('EARLIEST')

    criteriaManager.addCriteriaGroup({
      title: 'Second Group',
      description: 'Second description',
      criteriaType: 'ANY',
      events: [],
    })

    criteriaManager.addCriteriaGroup({
      title: 'Third Group',
      description: 'Third description',
      criteriaType: 'AT_LEAST',
      events: [],
    })

    // Remove middle group
    criteriaManager.removeCriteriaGroup(1)

    const criteria = criteriaManager.getCriteria()
    expect(criteria.criteriaType).toBe('EARLIEST')
    expect(criteria.criteria).toHaveLength(2)
    expect(criteria.criteria[0].title).toBe('Test Criteria 1')
    expect(criteria.criteria[1].title).toBe('Third Group')
    expect(criteria.criteria[1].criteriaType).toBe('AT_LEAST')
  })

  it('converts to Atlas format correctly', () => {
    const atlasFormat = criteriaManager.convertToAtlasFormat()

    expect(atlasFormat).toBeDefined()
    expect(atlasFormat).toHaveProperty('ConceptSets')
    expect(atlasFormat).toHaveProperty('PrimaryCriteria')
    expect(atlasFormat).toHaveProperty('QualifiedLimit')
    expect(atlasFormat).toHaveProperty('InclusionRules')
    expect(atlasFormat).toHaveProperty('EndStrategy')

    expect(atlasFormat.QualifiedLimit.Type).toBe('All')
    expect(atlasFormat.InclusionRules).toHaveLength(1)
    expect(atlasFormat.InclusionRules[0].name).toBe('Test Criteria 1')
    expect(atlasFormat.InclusionRules[0].description).toBe('Test description')
  })
})
