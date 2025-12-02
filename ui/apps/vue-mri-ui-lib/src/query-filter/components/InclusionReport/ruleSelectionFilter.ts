/**
 * Helper functions for rule selection filtering in the Inclusion Report
 * These functions handle the logic for filtering treemap rectangles based on
 * selected inclusion rules and the ANY/ALL and PASSED/FAILED criteria
 */

/**
 * Check if all selected rules match the specified criteria
 * @param rectId - The bit string representing which rules passed/failed (e.g., "101")
 * @param selectedRules - Array of rule IDs that are currently selected
 * @param checkForFail - If true, check for failed rules (bit='0'); if false, check for passed rules (bit='1')
 * @returns true if ALL selected rules match the criteria
 */
export function checkRulesAll(rectId: string, selectedRules: number[], checkForFail: boolean): boolean {
  if (selectedRules.length === 0) return false

  for (let i = 0; i < selectedRules.length; i++) {
    const ruleIndex = selectedRules[i]
    if (ruleIndex >= rectId.length) continue
    if (rectId[ruleIndex] !== (checkForFail ? '0' : '1')) {
      return false
    }
  }
  return true
}

/**
 * Check if any selected rule matches the specified criteria
 * @param rectId - The bit string representing which rules passed/failed (e.g., "101")
 * @param selectedRules - Array of rule IDs that are currently selected
 * @param checkForFail - If true, check for failed rules (bit='0'); if false, check for passed rules (bit='1')
 * @returns true if ANY selected rule matches the criteria
 */
export function checkRulesAny(rectId: string, selectedRules: number[], checkForFail: boolean): boolean {
  if (selectedRules.length === 0) return false

  for (let i = 0; i < selectedRules.length; i++) {
    const ruleIndex = selectedRules[i]
    if (ruleIndex >= rectId.length) continue
    if (rectId[ruleIndex] === (checkForFail ? '0' : '1')) {
      return true
    }
  }
  return false
}

/**
 * Determine if a rectangle should be included based on filtering criteria
 * @param rectId - The bit string representing which rules passed/failed (e.g., "101")
 * @param selectedRules - Array of rule IDs that are currently selected
 * @param allAnyOption - Whether to use ALL or ANY logic
 * @param passedFailedOption - Whether to filter for PASSED or FAILED rules
 * @returns true if the rectangle should be included (colored), false if it should be grayed out
 */
export function shouldIncludeRect(
  rectId: string,
  selectedRules: number[],
  allAnyOption: 'ALL' | 'ANY',
  passedFailedOption: 'PASSED' | 'FAILED'
): boolean {
  // If no rules are checked, exclude all rectangles (gray them out)
  if (selectedRules.length === 0) return false

  const checkForFail = passedFailedOption === 'FAILED'

  if (allAnyOption === 'ANY') {
    return checkRulesAny(rectId, selectedRules, checkForFail)
  } else {
    return checkRulesAll(rectId, selectedRules, checkForFail)
  }
}

/**
 * Calculate the filtered summary statistics for the treemap
 * @param node - The root node of the treemap data
 * @param selectedRules - Array of rule IDs that are currently selected
 * @param allAnyOption - Whether to use ALL or ANY logic
 * @param passedFailedOption - Whether to filter for PASSED or FAILED rules
 * @returns Object containing the total value and count of included rectangles
 */
export function calculateFilteredSummary(
  node: any,
  selectedRules: number[],
  allAnyOption: 'ALL' | 'ANY',
  passedFailedOption: 'PASSED' | 'FAILED'
): { value: number; count: number } {
  let totalValue = 0
  let totalCount = 0

  const traverse = (n: any) => {
    if (shouldIncludeRect(n.name, selectedRules, allAnyOption, passedFailedOption)) {
      totalValue += n.value || 0
      totalCount++
    }
    if (n.children && n.children.length > 0) {
      n.children.forEach((child: any) => traverse(child))
    }
  }

  traverse(node)
  return { value: totalValue, count: totalCount }
}

