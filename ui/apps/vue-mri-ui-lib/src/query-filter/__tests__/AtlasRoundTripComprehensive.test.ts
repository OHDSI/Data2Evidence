/**
 * Comprehensive Atlas Round-Trip Tests
 *
 * These tests verify that Atlas JSON can be imported, loaded into QueryFilterCriteriaManager,
 * and exported back to Atlas format while preserving EXACT structure and data.
 *
 * PHILOSOPHY: The exported JSON should be EXACTLY identical to the imported JSON.
 * No normalization should be needed if the conversion is correct.
 *
 * Test Pattern:
 * 1. Load Atlas JSON fixture
 * 2. Generate mock concept sets from CodesetIds (if any)
 * 3. Import to UI (Atlas → QueryFilterCriteriaManager)
 * 4. Export to Atlas (QueryFilterCriteriaManager → Atlas)
 * 5. STRICT comparison - exported === original (using toEqual)
 *
 * Only use comparison utilities when there are legitimate reasons to ignore fields
 * (e.g., concept set details that require API calls, or truly dynamic fields).
 *
 * See ROUND_TRIP_TEST_CHECKLIST.md for comprehensive coverage tracking.
 */

import { convertAtlasToFilters } from '../utils/AtlasConverter'
import { mockConceptSetsForAtlas } from './helpers/concept-set-mocks'
import { findDifferences, formatDifferences } from './helpers/atlas-comparison'
import { AtlasCohortDefinition } from '../types/AtlasTypes'

describe('Atlas Round-Trip Tests', () => {
  describe('Empty Cohort', () => {
    test('should preserve empty cohort EXACTLY (strict equality)', () => {
      // 1. Load Atlas JSON fixture
      const originalAtlas: AtlasCohortDefinition = require('./data/atlas-fixtures/atlas-empty.json')

      // 2. Generate mock concept sets from CodesetIds (none in this case)
      const mocks = mockConceptSetsForAtlas(originalAtlas)
      expect(mocks).toHaveLength(0) // Empty cohort has no concept sets

      // 3. Import to UI (Atlas → QueryFilterCriteriaManager)
      const manager = convertAtlasToFilters(originalAtlas, mocks)
      expect(manager).toBeDefined()

      // 4. Export to Atlas (QueryFilterCriteriaManager → Atlas)
      const exportedAtlas = manager.convertToAtlasFormat()
      expect(exportedAtlas).toBeDefined()

      // 5. STRICT comparison - should be exactly identical
      // This will fail if there are ANY differences (structure, types, values)
      expect(exportedAtlas).toEqual(originalAtlas)
    })

    test('should have no differences (using debug utility)', () => {
      // This test demonstrates using findDifferences() for debugging
      // In production, just use toEqual() directly (see test above)
      const originalAtlas: AtlasCohortDefinition = require('./data/atlas-fixtures/atlas-empty.json')
      const mocks = mockConceptSetsForAtlas(originalAtlas)
      const manager = convertAtlasToFilters(originalAtlas, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      // Use debug utility to find any differences
      const differences = findDifferences(originalAtlas, exportedAtlas)

      // Log differences for debugging (only if test fails)
      if (differences.length > 0) {
        console.error(formatDifferences(differences, originalAtlas, exportedAtlas))
      }

      // Should have zero differences
      expect(differences).toEqual([])
    })

    test('exported JSON should have cdmVersionRange field', () => {
      // Test that converter adds cdmVersionRange if missing
      const originalAtlas: any = require('./data/atlas-fixtures/atlas-empty.json')

      // This tests that our fixture has cdmVersionRange
      // (or that the converter adds it during export)
      const mocks = mockConceptSetsForAtlas(originalAtlas)
      const manager = convertAtlasToFilters(originalAtlas, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      expect(exportedAtlas.cdmVersionRange).toBeDefined()
    })
  })

  describe('Structural Validation', () => {
    test('empty cohort fixture should have expected minimal structure', () => {
      const originalAtlas: AtlasCohortDefinition = require('./data/atlas-fixtures/atlas-empty.json')

      // Validate the fixture itself has the expected structure
      expect(originalAtlas.ConceptSets).toEqual([])
      expect(originalAtlas.PrimaryCriteria).toBeDefined()
      expect(originalAtlas.PrimaryCriteria.CriteriaList).toEqual([])
      expect(originalAtlas.PrimaryCriteria.ObservationWindow).toEqual({
        PriorDays: 0,
        PostDays: 0,
      })
      expect(originalAtlas.PrimaryCriteria.PrimaryCriteriaLimit.Type).toBe('First')
      expect(originalAtlas.QualifiedLimit.Type).toBe('First')
      expect(originalAtlas.ExpressionLimit.Type).toBe('First')
      expect(originalAtlas.InclusionRules).toEqual([])
      expect(originalAtlas.CensoringCriteria).toEqual([])
      expect(originalAtlas.CollapseSettings).toEqual({
        CollapseType: 'ERA',
        EraPad: 0,
      })
      expect(originalAtlas.CensorWindow).toEqual({})
    })

    test('exported cohort should preserve exact structure and types', () => {
      const originalAtlas: AtlasCohortDefinition = require('./data/atlas-fixtures/atlas-empty.json')
      const mocks = mockConceptSetsForAtlas(originalAtlas)
      const manager = convertAtlasToFilters(originalAtlas, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      // Check that all fields exist with correct types
      expect(Array.isArray(exportedAtlas.ConceptSets)).toBe(true)
      expect(typeof exportedAtlas.PrimaryCriteria).toBe('object')
      expect(typeof exportedAtlas.QualifiedLimit).toBe('object')
      expect(typeof exportedAtlas.ExpressionLimit).toBe('object')
      expect(Array.isArray(exportedAtlas.InclusionRules)).toBe(true)
      expect(Array.isArray(exportedAtlas.CensoringCriteria)).toBe(true)
      expect(typeof exportedAtlas.CollapseSettings).toBe('object')
      expect(typeof exportedAtlas.CensorWindow).toBe('object')

      // Verify exact values match original
      expect(exportedAtlas.ConceptSets).toEqual(originalAtlas.ConceptSets)
      expect(exportedAtlas.PrimaryCriteria).toEqual(originalAtlas.PrimaryCriteria)
      expect(exportedAtlas.QualifiedLimit).toEqual(originalAtlas.QualifiedLimit)
      expect(exportedAtlas.ExpressionLimit).toEqual(originalAtlas.ExpressionLimit)
      expect(exportedAtlas.InclusionRules).toEqual(originalAtlas.InclusionRules)
      expect(exportedAtlas.CensoringCriteria).toEqual(originalAtlas.CensoringCriteria)
      expect(exportedAtlas.CollapseSettings).toEqual(originalAtlas.CollapseSettings)
      expect(exportedAtlas.CensorWindow).toEqual(originalAtlas.CensorWindow)
    })
  })

  describe('cdmVersionRange Handling', () => {
    test('should preserve cdmVersionRange when present', () => {
      const originalAtlas: AtlasCohortDefinition = require('./data/atlas-fixtures/atlas-empty.json')
      expect(originalAtlas.cdmVersionRange).toBe('>=5.0.0')

      const mocks = mockConceptSetsForAtlas(originalAtlas)
      const manager = convertAtlasToFilters(originalAtlas, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      // Should preserve the exact value
      expect(exportedAtlas.cdmVersionRange).toBe('>=5.0.0')
      expect(exportedAtlas).toEqual(originalAtlas)
    })

    test('should NOT add cdmVersionRange when not present', () => {
      const originalAtlas: any = require('./data/atlas-fixtures/atlas-empty-no-cdm.json')
      expect(originalAtlas.cdmVersionRange).toBeUndefined()

      const mocks = mockConceptSetsForAtlas(originalAtlas)
      const manager = convertAtlasToFilters(originalAtlas, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      // Should NOT have cdmVersionRange in export
      expect(exportedAtlas.cdmVersionRange).toBeUndefined()
      expect(exportedAtlas).toEqual(originalAtlas)
    })

    test('should preserve different cdmVersionRange values', () => {
      const atlas530: any = {
        cdmVersionRange: '>=5.3.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [],
          ObservationWindow: { PriorDays: 0, PostDays: 0 },
          PrimaryCriteriaLimit: { Type: 'First' },
        },
        QualifiedLimit: { Type: 'First' },
        ExpressionLimit: { Type: 'First' },
        InclusionRules: [],
        CensoringCriteria: [],
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const mocks = mockConceptSetsForAtlas(atlas530)
      const manager = convertAtlasToFilters(atlas530, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      // Should preserve >=5.3.0 not change to >=5.0.0
      expect(exportedAtlas.cdmVersionRange).toBe('>=5.3.0')
      expect(exportedAtlas).toEqual(atlas530)
    })
  })

  describe('Edge Cases', () => {
    test('should handle repeated round-trips (idempotency)', () => {
      // Test that doing the round-trip multiple times produces the same result
      const originalAtlas: AtlasCohortDefinition = require('./data/atlas-fixtures/atlas-empty.json')
      const mocks = mockConceptSetsForAtlas(originalAtlas)

      // First round-trip
      const manager1 = convertAtlasToFilters(originalAtlas, mocks)
      const exported1 = manager1.convertToAtlasFormat()

      // Second round-trip (using first export as input)
      const manager2 = convertAtlasToFilters(exported1, mocks)
      const exported2 = manager2.convertToAtlasFormat()

      // Both exports should be identical
      expect(exported2).toEqual(exported1)
      expect(exported2).toEqual(originalAtlas)
    })

    test('should handle repeated round-trips WITHOUT cdmVersionRange', () => {
      const originalAtlas: any = require('./data/atlas-fixtures/atlas-empty-no-cdm.json')
      const mocks = mockConceptSetsForAtlas(originalAtlas)

      // First round-trip
      const manager1 = convertAtlasToFilters(originalAtlas, mocks)
      const exported1 = manager1.convertToAtlasFormat()

      // Second round-trip
      const manager2 = convertAtlasToFilters(exported1, mocks)
      const exported2 = manager2.convertToAtlasFormat()

      // Should still NOT have cdmVersionRange
      expect(exported1.cdmVersionRange).toBeUndefined()
      expect(exported2.cdmVersionRange).toBeUndefined()
      expect(exported2).toEqual(exported1)
      expect(exported2).toEqual(originalAtlas)
    })
  })

  describe('Comprehensive Scenarios from circe-be', () => {
    test.skip('all criteria types - from circe-be allCriteriaExpression', () => {
      // SKIPPED: This fixture is very complex with 74KB of test data including:
      // - Observation Period criterion (not fully implemented)
      // - Many advanced attributes (PeriodType, UserDefinedPeriod, AgeAtStart, etc.)
      // - DemographicCriteriaList (infrastructure exists but needs testing/fixes)
      // Source: circe-be/src/test/resources/cohortgeneration/allCriteria/allCriteriaExpression.json
      const originalAtlas: AtlasCohortDefinition = require('./data/atlas-fixtures/atlas-all-criteria.json')
      const mocks = mockConceptSetsForAtlas(originalAtlas)

      const manager = convertAtlasToFilters(originalAtlas, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      expect(exportedAtlas).toEqual(originalAtlas)
    })

    test('inclusion rules - from circe-be simpleInclusionRule', () => {
      // Tests InclusionRules with temporal logic (StartWindow) and cardinality (Occurrence)
      // Source: circe-be/src/test/resources/cohortgeneration/inclusionRules/simpleInclusionRule.json
      const originalAtlas: AtlasCohortDefinition = require('./data/atlas-fixtures/atlas-inclusion-rule-basic.json')
      const mocks = mockConceptSetsForAtlas(originalAtlas)

      const manager = convertAtlasToFilters(originalAtlas, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      // STRICT comparison
      expect(exportedAtlas).toEqual(originalAtlas)
    })

    test.skip('nested groups - from circe-be groupExpression', () => {
      // SKIPPED: AdditionalCriteria field is NOT IMPLEMENTED
      //
      // AdditionalCriteria is a top-level field in Atlas cohort definitions that defines
      // additional qualifying criteria that must be met. It has the same structure as
      // InclusionRules expression (Type, CriteriaList, Groups, DemographicCriteriaList).
      //
      // Source: circe-be/src/test/resources/cohortgeneration/correlatedCriteria/groupExpression.json
      //
      // Implementation needed:
      // 1. Add AdditionalCriteria to AtlasCohortDefinition interface
      // 2. Parse AdditionalCriteria in AtlasConverter (import)
      // 3. Export AdditionalCriteria in QueryFilterModel.convertToAtlasFormat()
      // 4. Store in QueryFilterCriteriaManager model
      //
      // TODO: Implement full AdditionalCriteria support, then enable this test
      const originalAtlas: any = require('./data/atlas-fixtures/atlas-groups-basic.json')
      const mocks = mockConceptSetsForAtlas(originalAtlas)

      const manager = convertAtlasToFilters(originalAtlas, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      expect(exportedAtlas).toEqual(originalAtlas)
    })

    test('exit strategy - from circe-be censorEventExpression', () => {
      // Tests EndStrategy (DateOffset) and CensoringCriteria
      // Source: circe-be/src/test/resources/cohortgeneration/exits/censorEventExpression.json
      //
      // EndStrategy is fully implemented with support for DateOffset, CustomEra, and CONT_OBS
      const originalAtlas: AtlasCohortDefinition = require('./data/atlas-fixtures/atlas-exit-strategy.json')
      const mocks = mockConceptSetsForAtlas(originalAtlas)

      const manager = convertAtlasToFilters(originalAtlas, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      expect(exportedAtlas).toEqual(originalAtlas)
    })

    test('demographics - simple Age and Gender', () => {
      // Tests DemographicCriteriaList with Age (NumericRange) and Gender (Concept[])
      // Simpler focused test for demographics round-trip
      const originalAtlas: AtlasCohortDefinition = require('./data/atlas-fixtures/atlas-demographics-simple.json')
      const mocks = mockConceptSetsForAtlas(originalAtlas)

      const manager = convertAtlasToFilters(originalAtlas, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      expect(exportedAtlas).toEqual(originalAtlas)
    })

    test('groups - basic group in inclusion rule', () => {
      // Tests Groups[] within InclusionRules.expression
      // Group contains CriteriaList with 2 medical events (DrugExposure, ProcedureOccurrence)
      const originalAtlas: AtlasCohortDefinition = require('./data/atlas-fixtures/atlas-groups-inclusion-rule.json')
      const mocks = mockConceptSetsForAtlas(originalAtlas)

      const manager = convertAtlasToFilters(originalAtlas, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      expect(exportedAtlas).toEqual(originalAtlas)
    })

    test('complex nested correlated criteria', () => {
      // Tests deep nesting (3+ levels), CorrelatedCriteria in multiple locations
      // - PrimaryCriteria with CorrelatedCriteria (DemographicCriteriaList + Groups)
      // - InclusionRules with Type: AT_MOST, Count: 0
      // - Deep nesting: Death → CorrelatedCriteria → ObservationPeriod → CorrelatedCriteria → Measurement
      // - Groups inside CorrelatedCriteria
      // - BETWEEN operator (bt) for Age with Extent
      // - ExpressionLimit: Last (LATEST)
      const originalAtlas: AtlasCohortDefinition = require('./data/atlas-fixtures/atlas-complex-nested-correlated.json')
      const mocks = mockConceptSetsForAtlas(originalAtlas)

      const manager = convertAtlasToFilters(originalAtlas, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      expect(exportedAtlas).toEqual(originalAtlas)
    })

    test.skip('comprehensive attributes coverage', () => {
      // Tests extensive attribute types and operators across multiple criteria types
      // New criteria: ConditionEra, VisitOccurrence, VisitDetail, PayerPlanPeriod, Specimen, LocationRegion
      // DateAdjustment: StartWith/EndWith + offsets
      // Date operators: gte, eq, gt, lt, lte, bt, !bt (NOT BETWEEN)
      // Numeric operators: All 7 operators (lt, lte, eq, gte, gt, bt, !bt)
      // Text attribute: ValueAsString with "contains"
      // Boolean: First attribute
      // Occurrence Type 0 (Exactly N): Count 1
      // Occurrence Type 2: Count 5 with IsDistinct + CountColumn
      // IgnoreObservationPeriod flag
      const originalAtlas: AtlasCohortDefinition = require('./data/atlas-fixtures/atlas-comprehensive-attributes.json')
      const mocks = mockConceptSetsForAtlas(originalAtlas)

      const manager = convertAtlasToFilters(originalAtlas, mocks)
      const exportedAtlas = manager.convertToAtlasFormat()

      expect(exportedAtlas).toEqual(originalAtlas)
    })
  })
})
