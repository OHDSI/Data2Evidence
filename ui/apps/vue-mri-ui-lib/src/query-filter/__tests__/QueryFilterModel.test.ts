import { QueryFilterCardModel, QueryFilterCriteriaManager } from '../models/QueryFilterModel'
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

describe('QueryFilterCardModel', () => {
  describe('constructor', () => {
    it('should create with default values', () => {
      const model = new QueryFilterCardModel()

      expect(model.id).toBeDefined()
      expect(model.title).toBe('')
      expect(model.type).toBe('inclusion')
      expect(model.isExpanded).toBe(true)
      expect(model.events).toEqual([])
      expect(model.cardinality).toEqual({
        type: 'AT_LEAST',
        count: 1,
        using: 'ALL',
      })
    })

    it('should create with provided values', () => {
      const data = {
        id: 'test-id',
        title: 'Test Filter',
        type: 'exclusion' as const,
        isExpanded: false,
        events: [],
        cardinality: {
          type: 'exactly' as const,
          count: 2,
          using: 'ALL' as const,
        },
      }

      const model = new QueryFilterCardModel(data)

      expect(model.id).toBe('test-id')
      expect(model.title).toBe('Test Filter')
      expect(model.type).toBe('exclusion')
      expect(model.isExpanded).toBe(false)
      expect(model.cardinality).toEqual(data.cardinality)
    })

    it('should generate unique IDs', () => {
      const model1 = new QueryFilterCardModel()
      const model2 = new QueryFilterCardModel()

      expect(model1.id).not.toBe(model2.id)
    })
  })

  describe('event management', () => {
    let model: QueryFilterCardModel

    beforeEach(() => {
      model = new QueryFilterCardModel({ title: 'Test Filter' })
    })

    it('should add event with default values', () => {
      const event = model.addEvent()

      expect(model.events).toHaveLength(1)
      expect(event.id).toBeDefined()
      expect(event.conceptSet).toBe('')
      expect(event.conceptSetDetails).toEqual([])
      expect(event.isEditing).toBe(false)
      expect(event.criteriaType).toBeUndefined()
    })

    it('should add event with custom values', () => {
      const eventData = {
        conceptSet: 'Test Concept Set',
        criteriaType: 'conditionOccurrence',
        conceptSetDetails: [
          {
            concept: {
              CONCEPT_ID: 1,
              CONCEPT_NAME: 'Test',
              STANDARD_CONCEPT: 'S',
              STANDARD_CONCEPT_CAPTION: 'Standard',
              INVALID_REASON: 'V',
              INVALID_REASON_CAPTION: 'Valid',
              CONCEPT_CODE: 'TEST1',
              DOMAIN_ID: 'Condition',
              VOCABULARY_ID: 'SNOMED',
              CONCEPT_CLASS_ID: 'Clinical Finding',
            },
            isExcluded: false,
            includeDescendants: true,
            includeMapped: false,
          },
        ],
      }

      const event = model.addEvent(eventData)

      expect(event.conceptSet).toBe('Test Concept Set')
      expect(event.criteriaType).toBe('conditionOccurrence')
      expect(event.conceptSetDetails).toEqual([
        {
          concept: {
            CONCEPT_ID: 1,
            CONCEPT_NAME: 'Test',
            STANDARD_CONCEPT: 'S',
            STANDARD_CONCEPT_CAPTION: 'Standard',
            INVALID_REASON: 'V',
            INVALID_REASON_CAPTION: 'Valid',
            CONCEPT_CODE: 'TEST1',
            DOMAIN_ID: 'Condition',
            VOCABULARY_ID: 'SNOMED',
            CONCEPT_CLASS_ID: 'Clinical Finding',
          },
          isExcluded: false,
          includeDescendants: true,
          includeMapped: false,
        },
      ])
    })

    it('should remove event by ID', () => {
      const event = model.addEvent()
      expect(model.events).toHaveLength(1)

      const removed = model.removeEvent(event.id)

      expect(removed).toBe(true)
      expect(model.events).toHaveLength(0)
    })

    it('should return false when removing non-existent event', () => {
      const removed = model.removeEvent('non-existent')

      expect(removed).toBe(false)
    })

    it('should update event', () => {
      const event = model.addEvent()
      const updates = {
        conceptSet: 'Updated Concept Set',
        criteriaType: 'drugExposure',
      }

      const updated = model.updateEvent(event.id, updates)

      expect(updated).toBe(true)
      expect(event.conceptSet).toBe('Updated Concept Set')
      expect(event.criteriaType).toBe('drugExposure')
    })

    it('should return false when updating non-existent event', () => {
      const updated = model.updateEvent('non-existent', { conceptSet: 'Test' })

      expect(updated).toBe(false)
    })

    it('should get event by ID', () => {
      const addedEvent = model.addEvent({ conceptSet: 'Test' })
      const foundEvent = model.getEvent(addedEvent.id)

      expect(foundEvent).toBe(addedEvent)
      expect(foundEvent?.conceptSet).toBe('Test')
    })
  })

  describe('concept set management', () => {
    let model: QueryFilterCardModel

    beforeEach(() => {
      model = new QueryFilterCardModel({ title: 'Test Filter' })
    })

    it('should handle concept set details', () => {
      const event = model.addEvent()
      const conceptSetDetails = [
        {
          concept: {
            CONCEPT_ID: 1,
            CONCEPT_NAME: 'Diabetes',
            STANDARD_CONCEPT: 'S',
            STANDARD_CONCEPT_CAPTION: 'Standard',
            INVALID_REASON: 'V',
            INVALID_REASON_CAPTION: 'Valid',
            CONCEPT_CODE: 'E11',
            DOMAIN_ID: 'Condition',
            VOCABULARY_ID: 'SNOMED',
            CONCEPT_CLASS_ID: 'Clinical Finding',
          },
          isExcluded: false,
          includeDescendants: true,
          includeMapped: false,
        },
        {
          concept: {
            CONCEPT_ID: 2,
            CONCEPT_NAME: 'Hypertension',
            STANDARD_CONCEPT: 'S',
            STANDARD_CONCEPT_CAPTION: 'Standard',
            INVALID_REASON: 'V',
            INVALID_REASON_CAPTION: 'Valid',
            CONCEPT_CODE: 'I10',
            DOMAIN_ID: 'Condition',
            VOCABULARY_ID: 'SNOMED',
            CONCEPT_CLASS_ID: 'Clinical Finding',
          },
          isExcluded: false,
          includeDescendants: true,
          includeMapped: false,
        },
      ]

      model.updateEvent(event.id, { conceptSetDetails })

      expect(event.conceptSetDetails).toHaveLength(2)
      expect(event.conceptSetDetails).toEqual(conceptSetDetails)
    })

    it('should handle concept set loading state', () => {
      const event = model.addEvent()

      model.updateEvent(event.id, { conceptSetLoading: true })
      expect(event.conceptSetLoading).toBe(true)

      model.updateEvent(event.id, { conceptSetLoading: false })
      expect(event.conceptSetLoading).toBe(false)
    })

    it('should handle selected concept set', () => {
      const event = model.addEvent()
      const selectedConceptSet = {
        value: 1,
        text: 'Test Concept Set',
        display_value: 'Test Concept Set',
        conceptIds: [1],
        concepts: [
          {
            id: 1,
            useMapped: false,
            isExcluded: false,
            useDescendants: true,
          },
        ],
        shared: false,
        userName: 'test',
        createdDate: '2024-01-01T00:00:00.000Z',
        modifiedDate: '2024-01-01T00:00:00.000Z',
      }

      model.updateEvent(event.id, { selectedConceptSet })

      expect(event.selectedConceptSet).toEqual(selectedConceptSet)
    })
  })

  describe('utility methods', () => {
    let model: QueryFilterCardModel

    beforeEach(() => {
      model = new QueryFilterCardModel({ title: 'Test Filter' })
    })

    it('should toggle expansion state', () => {
      expect(model.isExpanded).toBe(true)

      model.toggle()
      expect(model.isExpanded).toBe(false)

      model.toggle()
      expect(model.isExpanded).toBe(true)
    })

    it('should check if has events', () => {
      expect(model.hasEvents()).toBe(false)

      model.addEvent()
      expect(model.hasEvents()).toBe(true)
    })
  })

  describe('cloning and serialization', () => {
    it('should clone model with new ID', () => {
      const model = new QueryFilterCardModel({ title: 'Original' })
      const event = model.addEvent({ conceptSet: 'Test Concept Set' })

      // Add conceptSetDetails to the event
      model.updateEvent(event.id, {
        conceptSetDetails: [
          {
            concept: {
              CONCEPT_ID: 1,
              CONCEPT_NAME: 'Test',
              STANDARD_CONCEPT: 'S',
              STANDARD_CONCEPT_CAPTION: 'Standard',
              INVALID_REASON: 'V',
              INVALID_REASON_CAPTION: 'Valid',
              CONCEPT_CODE: 'TEST1',
              DOMAIN_ID: 'Condition',
              VOCABULARY_ID: 'SNOMED',
              CONCEPT_CLASS_ID: 'Clinical Finding',
            },
            isExcluded: false,
            includeDescendants: true,
            includeMapped: false,
          },
        ],
      })

      const clone = model.clone()

      expect(clone.id).not.toBe(model.id)
      expect(clone.title).toBe('Original')
      expect(clone.events).toHaveLength(1)
      expect(clone.events[0].conceptSetDetails).toHaveLength(1)

      // Ensure deep copy - events should be different objects
      expect(clone.events[0]).not.toBe(model.events[0])
      expect(clone.events[0].id).not.toBe(model.events[0].id)
      expect(clone.events[0].conceptSetDetails![0]).toEqual(model.events[0].conceptSetDetails![0])
    })

    it('should serialize to JSON', () => {
      const model = new QueryFilterCardModel({ title: 'Test Filter' })
      const event = model.addEvent({ conceptSet: 'Test Concept Set' })

      const json = model.toJSON()

      expect(json.title).toBe('Test Filter')
      expect(json.events).toHaveLength(1)
      expect(json.events[0].conceptSet).toBe('Test Concept Set')
    })
  })
})

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

    it('should add event to criteria', () => {
      const criteria = manager.addCriteria({ title: 'Test Group' })
      const filterData = { title: 'Test Filter', type: 'inclusion' as const }

      const filter = manager.addFilterToGroup(criteria.id, filterData)

      expect(filter).not.toBeNull()
      expect(filter?.title).toBe('Test Filter')
      expect(criteria.events).toHaveLength(1) // Added filter
    })

    it('should return null when adding filter to non-existent group', () => {
      const filter = manager.addFilterToGroup('non-existent', {})

      expect(filter).toBeNull()
    })

    it('should remove filter from group', () => {
      const criteria = manager.addCriteria({ title: 'Test Group' })
      const filter = manager.addFilterToGroup(criteria.id, {})!

      const removed = manager.removeFilterFromGroup(criteria.id, filter.id)

      expect(removed).toBe(true)
      expect(criteria.events).toHaveLength(0) // No filters remain
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
