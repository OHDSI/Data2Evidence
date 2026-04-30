/**
 * Concept Set Mocking Utilities for Round-Trip Tests
 *
 * These utilities generate minimal mock concept sets for testing Atlas JSON round-trip conversion.
 * The mocks match the structure expected by convertAtlasToFilters (ConceptSetItemDisplay[]).
 */

import { ConceptSetItemDisplay } from '@/query-filter/types/ConceptSetTypes'
import { AtlasCohortDefinition } from '@/query-filter/types/AtlasTypes'

/**
 * Creates a single mock concept set
 *
 * @param id - Concept set ID (as string for display format)
 * @param name - Concept set name
 * @returns Mock concept set in ConceptSetItemDisplay format
 */
export function createMockConceptSet(id: string | number, name: string): ConceptSetItemDisplay {
  return {
    value: String(id),
    text: name,
    display_value: name,
  }
}

/**
 * Extracts all CodesetId values from an Atlas JSON definition
 *
 * Scans the entire Atlas structure for any CodesetId references:
 * - ConceptSets array (id field)
 * - PrimaryCriteria events
 * - InclusionRules events
 * - CensoringCriteria events
 * - EndStrategy.CustomEra.DrugCodesetId
 *
 * @param atlasJson - Atlas cohort definition
 * @returns Array of unique CodesetId values
 */
export function extractCodesetIds(atlasJson: AtlasCohortDefinition): number[] {
  const codesetIds = new Set<number>()

  // Extract from ConceptSets array
  if (atlasJson.ConceptSets) {
    atlasJson.ConceptSets.forEach(cs => {
      if (cs.id !== undefined) {
        codesetIds.add(cs.id)
      }
    })
  }

  // Helper to recursively scan criteria for CodesetId
  function scanCriteriaList(criteriaList: any[]): void {
    if (!criteriaList) return

    criteriaList.forEach(item => {
      // Scan the criteria object itself
      if (item.Criteria) {
        Object.values(item.Criteria).forEach((criteria: any) => {
          if (criteria && typeof criteria === 'object') {
            // Check for CodesetId at event level
            if (criteria.CodesetId !== undefined) {
              codesetIds.add(criteria.CodesetId)
            }

            // Check for nested CorrelatedCriteria
            if (criteria.CorrelatedCriteria) {
              scanCriteriaList(criteria.CorrelatedCriteria.CriteriaList || [])
              if (criteria.CorrelatedCriteria.Groups) {
                scanGroups(criteria.CorrelatedCriteria.Groups)
              }
            }
          }
        })
      }
    })
  }

  // Helper to recursively scan groups for CodesetId
  function scanGroups(groups: any[]): void {
    if (!groups) return

    groups.forEach(group => {
      scanCriteriaList(group.CriteriaList || [])
      if (group.Groups) {
        scanGroups(group.Groups)
      }
    })
  }

  // Scan PrimaryCriteria
  if (atlasJson.PrimaryCriteria?.CriteriaList) {
    scanCriteriaList(atlasJson.PrimaryCriteria.CriteriaList)
  }

  // Scan InclusionRules
  if (atlasJson.InclusionRules) {
    atlasJson.InclusionRules.forEach(rule => {
      if (rule.expression?.CriteriaList) {
        scanCriteriaList(rule.expression.CriteriaList)
      }
      if (rule.expression?.Groups) {
        scanGroups(rule.expression.Groups)
      }
    })
  }

  // Scan CensoringCriteria
  if (atlasJson.CensoringCriteria) {
    scanCriteriaList(atlasJson.CensoringCriteria)
  }

  // Check EndStrategy.CustomEra
  if (atlasJson.EndStrategy?.CustomEra?.DrugCodesetId !== undefined) {
    codesetIds.add(atlasJson.EndStrategy.CustomEra.DrugCodesetId)
  }

  return Array.from(codesetIds).sort((a, b) => a - b)
}

/**
 * Auto-generates mock concept sets for all CodesetIds in an Atlas JSON
 *
 * This is the main function to use in tests. It:
 * 1. Scans the Atlas JSON for all CodesetId references
 * 2. Generates minimal mock concept sets with auto-generated names
 * 3. Returns array in ConceptSetItemDisplay format
 *
 * @param atlasJson - Atlas cohort definition
 * @param namePrefix - Prefix for auto-generated names (default: "Concept Set")
 * @returns Array of mock concept sets ready for convertAtlasToFilters
 *
 * @example
 * ```typescript
 * const atlasJson = require('./atlas-fixtures/atlas-condition-basic.json')
 * const mocks = mockConceptSetsForAtlas(atlasJson)
 * const manager = convertAtlasToFilters(atlasJson, mocks)
 * ```
 */
export function mockConceptSetsForAtlas(
  atlasJson: AtlasCohortDefinition,
  namePrefix: string = 'Concept Set'
): ConceptSetItemDisplay[] {
  const codesetIds = extractCodesetIds(atlasJson)

  // Check if ConceptSets already has names we can use
  const nameMap = new Map<number, string>()
  if (atlasJson.ConceptSets) {
    atlasJson.ConceptSets.forEach(cs => {
      if (cs.id !== undefined && cs.name) {
        nameMap.set(cs.id, cs.name)
      }
    })
  }

  return codesetIds.map(id => {
    const name = nameMap.get(id) || `${namePrefix} ${id}`
    return createMockConceptSet(id, name)
  })
}

/**
 * Creates a set of commonly used mock concept sets for testing
 *
 * Useful for tests that need predefined concept sets.
 *
 * @returns Array of standard mock concept sets
 */
export function createStandardMockConceptSets(): ConceptSetItemDisplay[] {
  return [
    createMockConceptSet(0, 'Diabetes'),
    createMockConceptSet(1, 'Hypertension'),
    createMockConceptSet(2, 'Metformin'),
    createMockConceptSet(3, 'Statins'),
    createMockConceptSet(4, 'Lab Test - HbA1c'),
  ]
}
