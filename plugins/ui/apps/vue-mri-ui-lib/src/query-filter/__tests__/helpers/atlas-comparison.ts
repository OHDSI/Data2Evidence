/**
 * Atlas JSON Comparison Utilities - DEBUGGING ONLY
 *
 * IMPORTANT: These utilities are ONLY for debugging failed tests.
 * Production tests should use strict `toEqual()` without any normalization.
 *
 * Philosophy: If round-trip conversion is correct, the exported JSON should be
 * EXACTLY identical to the imported JSON (no normalization needed).
 *
 * Use findDifferences() to debug test failures and identify specific differences.
 */

/**
 * Finds specific differences between two objects
 * Returns array of human-readable difference descriptions
 *
 * Use this when a test fails with toEqual() to understand what differs.
 *
 * @example
 * ```typescript
 * const differences = findDifferences(original, exported)
 * console.log('Differences:', differences)
 * ```
 */
export function findDifferences(obj1: any, obj2: any, path: string = ''): string[] {
  const differences: string[] = []

  // Type mismatch
  if (typeof obj1 !== typeof obj2) {
    differences.push(`${path || 'root'}: Type mismatch (${typeof obj1} vs ${typeof obj2})`)
    return differences
  }

  // Primitive comparison
  if (obj1 !== obj2 && (typeof obj1 !== 'object' || obj1 === null || obj2 === null)) {
    differences.push(`${path || 'root'}: Value mismatch (${JSON.stringify(obj1)} vs ${JSON.stringify(obj2)})`)
    return differences
  }

  // Array comparison
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      differences.push(`${path || 'root'}: Array length mismatch (${obj1.length} vs ${obj2.length})`)
    }

    const minLength = Math.min(obj1.length, obj2.length)
    for (let i = 0; i < minLength; i++) {
      const itemPath = `${path}[${i}]`
      differences.push(...findDifferences(obj1[i], obj2[i], itemPath))
    }

    return differences
  }

  // Object comparison
  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)

    // Check for missing keys
    const missingInObj2 = keys1.filter(k => !(k in obj2))
    const missingInObj1 = keys2.filter(k => !(k in obj1))

    missingInObj2.forEach(k => {
      differences.push(`${path ? path + '.' : ''}${k}: Missing in exported`)
    })

    missingInObj1.forEach(k => {
      differences.push(`${path ? path + '.' : ''}${k}: Extra in exported`)
    })

    // Compare common keys
    const commonKeys = keys1.filter(k => k in obj2)
    commonKeys.forEach(k => {
      const keyPath = path ? `${path}.${k}` : k
      differences.push(...findDifferences(obj1[k], obj2[k], keyPath))
    })
  }

  return differences
}

/**
 * Formats differences array into readable string for console output
 *
 * @example
 * ```typescript
 * const differences = findDifferences(original, exported)
 * if (differences.length > 0) {
 *   console.error(formatDifferences(differences, original, exported))
 * }
 * ```
 */
export function formatDifferences(differences: string[], obj1?: any, obj2?: any): string {
  const parts: string[] = ['Atlas JSON structures do not match', '']

  if (differences.length > 0) {
    parts.push('Differences:')
    differences.forEach(d => parts.push(`  - ${d}`))
  }

  if (obj1) {
    parts.push('', 'Original:', JSON.stringify(obj1, null, 2))
  }

  if (obj2) {
    parts.push('', 'Exported:', JSON.stringify(obj2, null, 2))
  }

  return parts.join('\n')
}
