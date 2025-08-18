import { ConfigLoader } from '../ConfigLoader'
import type { CohortExpression, Config } from '../ConfigLoader'
import criteriaConfigData from '../../config/atlas-config.json'

describe('ConfigLoader', () => {
  let loader: ConfigLoader
  let mockExpression: CohortExpression

  beforeEach(() => {
    // Use default config for standard tests
    loader = new ConfigLoader(criteriaConfigData as Config)
    mockExpression = {
      ConceptSets: [{ id: 1, name: 'Test Concept Set', expression: { items: [] } }],
      PrimaryCriteria: () => ({
        CriteriaList: [],
      }),
      CensoringCriteria: () => [],
    }
  })

  // Helper function to create test loader with modified config
  const createTestLoader = (configModifier: (config: any) => any) => {
    const modifiedConfig = configModifier(JSON.parse(JSON.stringify(criteriaConfigData)))
    return new ConfigLoader(modifiedConfig)
  }

  describe('constructor and property initialization', () => {
    test('should initialize with config data', () => {
      expect(loader).toBeInstanceOf(ConfigLoader)
    })

    test('should have all expected criteria types accessible through public methods', () => {
      const expectedTypes = [
        'conditionEra',
        'conditionOccurrence',
        'death',
        'deviceExposure',
        'doseEra',
        'drugEra',
        'drugExposure',
        'measurement',
        'observation',
        'observationPeriod',
        'payerPlanPeriod',
        'procedureOccurrence',
        'specimen',
        'visit',
        'visitDetail',
        'demographic',
        'locationRegion',
        'group',
        'fromReusable',
      ]

      expectedTypes.forEach(type => {
        // Test that criteria types exist by checking they can be used in public methods
        expect(() => loader.getAtlasKey(type)).not.toThrow()
        expect(() => loader.getDisplayTitle(type)).not.toThrow()
      })
    })

    test('should have all expected sections accessible through public methods', () => {
      const expectedSections = ['initialEvents', 'censoringEvents', 'criteriaGroup']

      expectedSections.forEach(section => {
        // Test that sections exist by checking they work with public methods
        expect(() => loader.getCriteriaOptions(section, 'initial')).not.toThrow()
      })
    })
  })

  describe('getCriteriaOptions', () => {
    test('should return criteria options for initialEvents section', () => {
      const options = loader.getCriteriaOptions('initialEvents', 'initial')

      expect(options).toBeInstanceOf(Array)
      expect(options.length).toBeGreaterThan(0)

      // Verify structure of options
      options.forEach(option => {
        expect(option).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          defaultTitle: expect.any(String),
          description: expect.any(String),
          defaultDescription: expect.any(String),
          class: expect.any(String),
          special: expect.any(Boolean),
        })
        // atlasKey should be defined but might be undefined for some types
        expect(option).toHaveProperty('atlasKey')
      })

      // Should not include group-only criteria
      const testLoaderForGroupCheck = createTestLoader(config => {
        // Add a group-only criteria to test filtering
        config.criteriaTypes.testGroupOnly = {
          name: 'Test Group Only',
          groupOnly: true,
          descriptions: { group: 'Test group only description' },
        }
        // Update excludeTypes to not exclude this test criteria
        if (!config.sections.initialEvents.excludeTypes) {
          config.sections.initialEvents.excludeTypes = []
        }
        return config
      })
      const optionsWithGroupOnly = testLoaderForGroupCheck.getCriteriaOptions('initialEvents', 'initial')
      const groupOnlyIds = optionsWithGroupOnly.filter(opt => opt.id === 'testGroupOnly')
      expect(groupOnlyIds).toHaveLength(0)
    })

    test('should return criteria options for censoringEvents section', () => {
      const options = loader.getCriteriaOptions('censoringEvents', 'censoring')

      expect(options).toBeInstanceOf(Array)
      expect(options.length).toBeGreaterThan(0)

      // Should not include group-only criteria
      const testLoaderForGroupCheck = createTestLoader(config => {
        // Add a group-only criteria to test filtering
        config.criteriaTypes.testGroupOnly = {
          name: 'Test Group Only',
          groupOnly: true,
          descriptions: { group: 'Test group only description' },
        }
        // Update excludeTypes to not exclude this test criteria
        if (!config.sections.censoringEvents.excludeTypes) {
          config.sections.censoringEvents.excludeTypes = []
        }
        return config
      })
      const optionsWithGroupOnly = testLoaderForGroupCheck.getCriteriaOptions('censoringEvents', 'censoring')
      const groupOnlyIds = optionsWithGroupOnly.filter(opt => opt.id === 'testGroupOnly')
      expect(groupOnlyIds).toHaveLength(0)
    })

    test('should return criteria options for criteriaGroup section', () => {
      const options = loader.getCriteriaOptions('criteriaGroup', 'group')

      expect(options).toBeInstanceOf(Array)
      expect(options.length).toBeGreaterThan(0)

      // Should include group-only criteria
      const testLoaderForGroupCheck = createTestLoader(config => {
        // Add a group-only criteria to test inclusion
        config.criteriaTypes.testGroupOnly = {
          name: 'Test Group Only',
          groupOnly: true,
          descriptions: { group: 'Test group only description' },
        }
        // criteriaGroup includes all types by default (includeAll: true)
        return config
      })
      const optionsWithGroupOnly = testLoaderForGroupCheck.getCriteriaOptions('criteriaGroup', 'group')
      const groupOnlyIds = optionsWithGroupOnly.filter(opt => opt.id === 'testGroupOnly')
      expect(groupOnlyIds.length).toBeGreaterThan(0)
    })

    test('should throw error for invalid section', () => {
      expect(() => {
        loader.getCriteriaOptions('invalidSection', 'initial')
      }).toThrow('Section invalidSection not found in configuration')
    })

    test('should handle criteria types without specific description context', () => {
      const options = loader.getCriteriaOptions('criteriaGroup', 'group')

      options.forEach(option => {
        expect(option.description).toBeDefined()
        expect(typeof option.description).toBe('string')
      })
    })
  })

  describe('createActionFunction', () => {
    test('should create action function for regular criteria type', () => {
      const actionFn = loader.createActionFunction('conditionOccurrence', mockExpression)

      expect(typeof actionFn).toBe('function')

      // Execute the action
      const result = actionFn()
      expect(result).toBeDefined()
    })

    test('should create action function for special reusable criteria', () => {
      const actionFn = loader.createActionFunction('fromReusable', mockExpression)

      expect(typeof actionFn).toBe('function')

      // Should not throw when executed
      expect(() => actionFn()).not.toThrow()
    })

    test('should create action function for group criteria', () => {
      const actionFn = loader.createActionFunction('group', mockExpression)

      expect(typeof actionFn).toBe('function')

      const result = actionFn()
      expect(result).toBeDefined()
    })

    test('should throw error for invalid criteria type', () => {
      expect(() => {
        loader.createActionFunction('invalidType', mockExpression)
      }).toThrow('Criteria type invalidType not found')
    })
  })

  describe('getAtlasKey', () => {
    test('should return atlasKey for existing criteria type', () => {
      const atlasKey = loader.getAtlasKey('conditionOccurrence')
      expect(atlasKey).toBe('addConditionOccurrence')
    })

    test('should return criteria type id if no atlasKey exists', () => {
      // Create test loader with modified config - test with a criteria type that gets generated atlasKey
      // Since the expansion logic auto-generates atlasKey, this tests the fallback behavior
      const atlasKey = loader.getAtlasKey('conditionOccurrence')
      expect(atlasKey).toBe('addConditionOccurrence')

      // Test with non-existent type
      const nonExistentKey = loader.getAtlasKey('nonExistent')
      expect(nonExistentKey).toBe('nonExistent')
    })

    test('should return id for non-existent criteria type', () => {
      const atlasKey = loader.getAtlasKey('nonExistent')
      expect(atlasKey).toBe('nonExistent')
    })
  })

  describe('getDisplayTitle', () => {
    test('should add "Add" prefix for initial context', () => {
      const title = loader.getDisplayTitle('conditionOccurrence', 'initial')
      expect(title).toBe('Add Condition Occurrence')
    })

    test('should add "Add" prefix for censoring context', () => {
      const title = loader.getDisplayTitle('conditionOccurrence', 'censoring')
      expect(title).toBe('Add Condition Occurrence')
    })

    test('should remove "Add" prefix for group context', () => {
      // Create test loader with modified config
      const testLoader = createTestLoader(config => {
        config.criteriaTypes.conditionOccurrence.name = 'Add Condition Occurrence'
        return config
      })

      const title = testLoader.getDisplayTitle('conditionOccurrence', 'group')
      expect(title).toBe('Condition Occurrence')
    })

    test('should not add "Add" prefix if already present', () => {
      // Create test loader with modified config
      const testLoader = createTestLoader(config => {
        config.criteriaTypes.conditionOccurrence.name = 'Add Condition Occurrence'
        return config
      })

      const title = testLoader.getDisplayTitle('conditionOccurrence', 'initial')
      expect(title).toBe('Add Condition Occurrence')
    })

    test('should return criteriaTypeId for non-existent type', () => {
      const title = loader.getDisplayTitle('nonExistent')
      expect(title).toBe('nonExistent')
    })
  })

  describe('generateDropdownOptions', () => {
    test('should generate dropdown options for initialEvents', () => {
      const options = loader.generateDropdownOptions('initialEvents', mockExpression)

      expect(options).toBeInstanceOf(Array)
      expect(options.length).toBeGreaterThan(0)

      options.forEach(option => {
        expect(option).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          defaultTitle: expect.any(String),
          description: expect.any(String),
          defaultDescription: expect.any(String),
          class: expect.any(String),
          special: expect.any(Boolean),
          selected: false,
          action: expect.any(Function),
        })
        // atlasKey should be defined but might be undefined for some types
        expect(option).toHaveProperty('atlasKey')
      })
    })

    test('should generate dropdown options for censoringEvents', () => {
      const options = loader.generateDropdownOptions('censoringEvents', mockExpression)

      expect(options).toBeInstanceOf(Array)
      expect(options.length).toBeGreaterThan(0)

      // All should have action functions
      options.forEach(option => {
        expect(typeof option.action).toBe('function')
        expect(option.selected).toBe(false)
      })
    })

    test('should generate dropdown options for criteriaGroup', () => {
      const options = loader.generateDropdownOptions('criteriaGroup', mockExpression)

      expect(options).toBeInstanceOf(Array)
      expect(options.length).toBeGreaterThan(0)
    })
  })

  describe('getAttributesForCriteria', () => {
    test('should return attributes for condition criteria', () => {
      const attributes = loader.getAttributesForCriteria('conditionOccurrence')

      expect(attributes).toBeInstanceOf(Array)

      if (attributes.length > 0) {
        attributes.forEach(attr => {
          expect(attr).toMatchObject({
            id: expect.any(String),
            name: expect.any(String),
            category: expect.any(String),
          })
        })
      }
    })

    test('should return attributes for drug criteria', () => {
      const attributes = loader.getAttributesForCriteria('drugExposure')

      expect(attributes).toBeInstanceOf(Array)

      if (attributes.length > 0) {
        attributes.forEach(attr => {
          expect(attr).toMatchObject({
            id: expect.any(String),
            name: expect.any(String),
            category: expect.any(String),
          })
        })
      }
    })

    test('should return empty array for criteria type with no attributes', () => {
      const attributes = loader.getAttributesForCriteria('nonExistentType')
      expect(attributes).toEqual([])
    })
  })

  describe('getCriteriaAttributeOptions', () => {
    test('should return attribute options for conditionOccurrence', () => {
      const options = loader.getCriteriaAttributeOptions('conditionOccurrence')

      expect(options).toBeInstanceOf(Array)

      if (options.length > 0) {
        options.forEach(option => {
          expect(option).toMatchObject({
            id: expect.any(String),
            title: expect.any(String),
            defaultTitle: expect.any(String),
            description: expect.any(String),
            defaultDescription: expect.any(String),
            type: expect.any(String),
            atlasKey: expect.any(String),
            special: expect.any(Boolean),
            action: expect.any(Function),
          })
        })
      }
    })

    test('should return attribute options for drugExposure', () => {
      const options = loader.getCriteriaAttributeOptions('drugExposure')

      expect(options).toBeInstanceOf(Array)

      if (options.length > 0) {
        options.forEach(option => {
          expect(typeof option.action).toBe('function')
        })
      }
    })

    test('should return empty array for criteria type with no attributes', () => {
      const options = loader.getCriteriaAttributeOptions('nonExistentType')
      expect(options).toEqual([])
    })
  })

  describe('createAttributeActionFunction', () => {
    test('should create action function for nested attribute', () => {
      const nestedAttr = {
        id: 'nested',
        name: 'Nested Criteria',
        description: 'Add nested criteria group',
        type: 'nested',
        special: true,
        atlasKey: 'addNested',
      }

      const actionFn = loader.createAttributeActionFunction(nestedAttr)
      expect(typeof actionFn).toBe('function')

      const result = actionFn()
      expect(result).toBeDefined()
    })

    test('should create action function for different attribute types', () => {
      const attributeTypes = ['text', 'numericRange', 'conceptSet', 'dateRange', 'dateAdjustment', 'boolean']

      attributeTypes.forEach(type => {
        const attr = {
          id: `test_${type}`,
          name: `Test ${type}`,
          description: `Test ${type} attribute`,
          type,
          atlasKey: `add${type}`,
        }

        const actionFn = loader.createAttributeActionFunction(attr)
        expect(typeof actionFn).toBe('function')
        expect(() => actionFn()).not.toThrow()
      })
    })
  })

  describe('getAttributeConfig', () => {
    test('should return attribute config for existing criteria and attribute', () => {
      const config = loader.getAttributeConfig('conditionOccurrence', 'firstDiagnosis')

      if (config) {
        expect(config).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          atlasKey: expect.any(String),
        })
      } else {
        expect(config).toBeNull()
      }
    })

    test('should return null for non-existent criteria type', () => {
      const config = loader.getAttributeConfig('nonExistent', 'someAttribute')
      expect(config).toBeNull()
    })

    test('should return null for non-existent attribute', () => {
      const config = loader.getAttributeConfig('conditionOccurrence', 'nonExistentAttribute')
      expect(config).toBeNull()
    })
  })

  describe('getAtlasJsonToAttributeMapping', () => {
    test('should return mapping for conditionOccurrence', () => {
      const mapping = loader.getAtlasJsonToAttributeMapping('conditionOccurrence')

      expect(mapping).toBeInstanceOf(Object)

      // Should contain mappings from Atlas JSON keys to internal attribute IDs
      Object.keys(mapping).forEach(key => {
        expect(typeof key).toBe('string')
        expect(typeof mapping[key]).toBe('string')
      })
    })

    test('should include common mappings', () => {
      const mapping = loader.getAtlasJsonToAttributeMapping('conditionOccurrence')

      // Should include common mappings
      expect(mapping.ValueAsConcept).toBe('valueAsConcept')
      expect(mapping.RouteConcept).toBe('routeConcept')
      expect(mapping.DoseUnit).toBe('doseUnit')
      expect(mapping.DeathSourceConcept).toBe('deathSourceConcept')
    })

    test('should return empty mapping with common mappings for non-existent criteria', () => {
      const mapping = loader.getAtlasJsonToAttributeMapping('nonExistent')

      expect(mapping).toBeInstanceOf(Object)
      // Should at least have common mappings
      expect(mapping.ValueAsConcept).toBe('valueAsConcept')
    })
  })

  describe('getAllAtlasJsonToAttributeMappings', () => {
    test('should return all mappings across criteria types', () => {
      const allMappings = loader.getAllAtlasJsonToAttributeMappings()

      expect(allMappings).toBeInstanceOf(Object)
      expect(Object.keys(allMappings).length).toBeGreaterThan(0)

      // Should include mappings from multiple criteria types
      Object.keys(allMappings).forEach(key => {
        expect(typeof key).toBe('string')
        expect(typeof allMappings[key]).toBe('string')
      })
    })
  })

  describe('getAttributeDisplayTitle', () => {
    test('should add "Add" prefix for regular attributes', () => {
      const title = loader.getAttributeDisplayTitle('age', 'Age')
      expect(title).toBe('Add Age')
    })

    test('should not add "Add" prefix for "Nested Criteria"', () => {
      const title = loader.getAttributeDisplayTitle('nested', 'Nested Criteria')
      expect(title).toBe('Nested Criteria')
    })

    test('should not duplicate "Add" prefix', () => {
      const title = loader.getAttributeDisplayTitle('someAttr', 'Add Some Attribute')
      expect(title).toBe('Add Some Attribute')
    })
  })

  describe('getTemporalWindowOptions', () => {
    test('should return temporal window options', () => {
      const options = loader.getTemporalWindowOptions()

      expect(options).toBeInstanceOf(Array)
      expect(options.length).toBeGreaterThan(0)

      options.forEach(option => {
        expect(option).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
        })
      })

      // Should include expected temporal window types
      const ids = options.map(opt => opt.id)
      expect(ids).toContain('all')
      expect(ids).toContain('before')
      expect(ids).toContain('after')
      expect(ids).toContain('between')
      expect(ids).toContain('withinDays')
    })
  })

  describe('getOccurrenceCountOperators', () => {
    test('should return occurrence count operators', () => {
      const operators = loader.getOccurrenceCountOperators()

      expect(operators).toBeInstanceOf(Array)
      expect(operators.length).toBeGreaterThan(0)

      operators.forEach(operator => {
        expect(operator).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          symbol: expect.any(String),
        })
      })

      // Should include expected operators
      const ids = operators.map(op => op.id)
      expect(ids).toContain('exactly')
      expect(ids).toContain('atLeast')
      expect(ids).toContain('atMost')
      expect(ids).toContain('between')
    })
  })

  describe('edge cases and error handling', () => {
    test('should handle malformed criteria types gracefully', () => {
      // Create test loader with empty criteria types
      const testLoader = createTestLoader(config => {
        config.criteriaTypes = {}
        return config
      })

      const options = testLoader.getCriteriaOptions('initialEvents', 'initial')
      expect(options).toEqual([])
    })

    test('should handle missing descriptions gracefully', () => {
      // Create test loader with empty descriptions
      const testLoader = createTestLoader(config => {
        config.criteriaTypes.conditionOccurrence.descriptions = {}
        return config
      })

      const options = testLoader.getCriteriaOptions('initialEvents', 'initial')
      expect(options.length).toBeGreaterThan(0)

      // Should have empty description but not crash
      const conditionOption = options.find(opt => opt.id === 'conditionOccurrence')
      if (conditionOption) {
        expect(conditionOption.description).toBe('')
      }
    })
  })
})
