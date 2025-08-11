import { QueryFilterCriteriaManager } from '../models/QueryFilterModel'
import sample1Input from './data/sample1-input'
import sample1Expected from './data/sample1-expected'
import sample2Input from './data/sample2-input'
import sample2Expected from './data/sample2-expected'
import sample3Input from './data/sample3-input'
import sample3Expected from './data/sample3-expected'
import sample4Input from './data/sample4-input'
import sample4Expected from './data/sample4-expected'
import sample5Input from './data/sample5-input'
import sample5Expected from './data/sample5-expected'
import sample6Input from './data/sample6-input'
import sample6Expected from './data/sample6-expected'

describe('QueryFilterCriteriaManager', () => {
  describe('constructor', () => {
    it('should create with default values', () => {
      const manager = new QueryFilterCriteriaManager()

      expect(manager.getCriteria()).toBeDefined()
      expect(manager.getCriteria().criteriaType).toBe('ALL')
      expect(manager.getCriteria().criteria).toEqual([])
    })

    it('should create with inclusionCriteria structure', () => {
      const data = {
        inclusionCriteria: {
          qualifyingEventsLimit: 'EARLIEST',
          criteria: [
            {
              id: 'test-criteria',
              title: 'Test Criteria',
              description: 'Test Description',
              criteriaType: 'ALL',
              events: [],
            },
          ],
        },
      }
      const manager = new QueryFilterCriteriaManager(data)

      expect(manager.getCriteria().criteriaType).toBe('EARLIEST')
      expect(manager.getCriteria().criteria).toHaveLength(1)
      expect(manager.getCriteria().criteria[0].title).toBe('Test Criteria')
    })
  })

  describe('criteria management', () => {
    let manager: QueryFilterCriteriaManager

    beforeEach(() => {
      manager = new QueryFilterCriteriaManager()
    })

    it('should add criteria group', () => {
      const group = {
        title: 'Test Group',
        description: 'Test Description',
        groupType: 'ALL' as const,
      }

      manager.addCriteria(group)

      expect(manager.getCriteria().criteria).toHaveLength(1)
      expect(manager.getCriteria().criteria[0].title).toBe('Test Group')
    })

    it('should remove criteria group', () => {
      const criteria = manager.addCriteria({ title: 'Test Group' })
      expect(manager.getCriteria().criteria).toHaveLength(1)

      const removed = manager.removeGroup(criteria.id)

      expect(removed).toBe(true)
      expect(manager.getCriteria().criteria).toHaveLength(0)
    })

    it('should update criteria group', () => {
      const criteria = manager.addCriteria({ title: 'Original Title' })
      const updates = { title: 'Updated Title', description: 'Updated Description' }

      const updated = manager.updateGroup(criteria.id, updates)

      expect(updated).toBe(true)
      expect(criteria.title).toBe('Updated Title')
      expect(criteria.description).toBe('Updated Description')
    })

    it('should set criteria type', () => {
      expect(manager.getCriteria().criteriaType).toBe('ALL')

      manager.setCriteriaType('EARLIEST')

      expect(manager.getCriteria().criteriaType).toBe('EARLIEST')
    })
  })

  describe('filter management within groups', () => {
    let manager: QueryFilterCriteriaManager

    beforeEach(() => {
      manager = new QueryFilterCriteriaManager()
    })

    it('should manage criteria groups correctly', () => {
      const criteria = manager.addCriteria({ title: 'Test Group' })

      expect(criteria.title).toBe('Test Group')
      expect(criteria.events).toHaveLength(0) // Groups start empty
      expect(criteria.events).toEqual([]) // Should be QueryFilterEvent[] only
    })
  })

  describe('serialization and cloning', () => {
    let manager: QueryFilterCriteriaManager

    beforeEach(() => {
      manager = new QueryFilterCriteriaManager()
    })

    it('should serialize to JSON', () => {
      const group = manager.addCriteria({ title: 'Test Group' })
      const json = manager.toJSON()

      expect(json.inclusionCriteria).toBeDefined()
      expect(json.inclusionCriteria.qualifyingEventsLimit).toBe('ALL')
      expect(json.inclusionCriteria.criteria).toHaveLength(1)
      expect(json.inclusionCriteria.criteria[0].title).toBe('Test Group')
    })

    it('should create manager from JSON', () => {
      manager.addCriteria({ title: 'Test Group' })
      const json = manager.toJSON()
      const restored = QueryFilterCriteriaManager.fromJSON(json)

      expect(restored.getCriteria().criteria).toHaveLength(1)
      expect(restored.getCriteria().criteria[0].title).toBe('Test Group')
    })

    it('should clone manager', () => {
      const criteria = manager.addCriteria({ title: 'Test Group' })
      const clone = manager.clone()

      expect(clone.getCriteria().criteria).toHaveLength(1)
      expect(clone.getCriteria().criteria[0].title).toBe('Test Group')

      // Ensure deep copy
      expect(clone.getCriteria().criteria[0]).not.toBe(criteria)
      expect(clone.getCriteria().criteria[0].id).not.toBe(criteria.id)
    })
  })

  describe('convertToAtlasFormat', () => {
    it('should work for sample 1', () => {
      const manager = QueryFilterCriteriaManager.fromJSON(sample1Input)
      const atlasFormat = manager.convertToAtlasFormat()

      expect(atlasFormat).toEqual(sample1Expected)
    })

    it('should work for sample 2', () => {
      const manager = QueryFilterCriteriaManager.fromJSON(sample2Input)
      const atlasFormat = manager.convertToAtlasFormat()

      expect(atlasFormat).toEqual(sample2Expected)
    })

    it('should work for sample 3', () => {
      const manager = QueryFilterCriteriaManager.fromJSON(sample3Input)
      const atlasFormat = manager.convertToAtlasFormat()

      expect(atlasFormat).toEqual(sample3Expected)
    })

    it('should work for sample 4', () => {
      const manager = QueryFilterCriteriaManager.fromJSON(sample4Input)
      const atlasFormat = manager.convertToAtlasFormat()

      expect(atlasFormat).toEqual(sample4Expected)
    })

    it('should work for sample 5', () => {
      const manager = QueryFilterCriteriaManager.fromJSON(sample5Input)
      const atlasFormat = manager.convertToAtlasFormat()

      expect(atlasFormat).toEqual(sample5Expected)
    })

    it('should work for sample 6', () => {
      const manager = QueryFilterCriteriaManager.fromJSON(sample6Input)
      const atlasFormat = manager.convertToAtlasFormat()

      expect(atlasFormat).toEqual(sample6Expected)
    })
  })
})
