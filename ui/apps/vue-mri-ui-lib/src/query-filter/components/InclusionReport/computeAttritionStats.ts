import { type InclusionReportResponse, parseTreemapData } from '@/query-filter/types/InclusionReportTypes'

export type AttritionStat = {
  id: number
  name: string
  isExclude: boolean
  countSatisfying: number
  percentSatisfying: string
  pctDiff: string
}

/**
 * Count matches in treemap data based on rule IDs
 * Recursively traverses the tree and counts leaf nodes where all specified rules pass
 * Adapted from Ohdsi Atlas codebase
 * @param node - The treemap node to search (can have children or be a leaf)
 * @param ruleIds - Array of rule IDs to check (positions in the binary string that must be '1')
 * @param totalRuleCount - Total number of rules (unused but kept for API consistency)
 * @returns Total count of matching leaf nodes
 */
const countMatch = (node: any, ruleIds: number[], totalRuleCount: number): number => {
  let count = 0
  if (node.hasOwnProperty('children')) {
    node.children.forEach((c: any) => {
      count += countMatch(c, ruleIds, totalRuleCount)
    })
  } else {
    const name = node.name as string
    // Check if ALL rules in ruleIds have '1' at their original position
    const allPass = ruleIds.every(ruleId => name.charAt(ruleId) === '1')
    count = allPass ? node.size : 0
  }
  return count
}

/**
 * Compute attrition statistics from treemap data
 * Calculates cumulative counts and percentages for each inclusion rule
 * Adapted from Ohdsi Atlas codebase
 * @param report - The inclusion report containing treemap data and rule definitions
 * @returns Array of attrition statistics, one for each inclusion rule
 */
export function computeAttritionStats(report: InclusionReportResponse, order?: number[]): AttritionStat[] {
  if (!report) return []

  const treemapData = parseTreemapData(report.treemapData)
  const baseCount = report.summary.baseCount
  const ruleOrder: number[] = order || report.inclusionRuleStats.map(rule => rule.id)

  let priorPct = 1.0
  const stats = ruleOrder.map((ruleId: number) => {
    const rule = report.inclusionRuleStats.find(r => r.id === ruleId)
    if (!rule) {
      throw new Error(`Invalid rule ID: ${ruleId}`)
    }
    const rulesToCheck = ruleOrder.slice(0, ruleOrder.indexOf(ruleId) + 1)
    const countSatisfying = countMatch(treemapData, rulesToCheck, report.inclusionRuleStats.length)
    const percentSatisfying = baseCount !== 0 ? countSatisfying / baseCount : 0
    const pctDiff = priorPct - percentSatisfying
    priorPct = percentSatisfying

    return {
      id: rule.id,
      name: rule.name,
      isExclude: rule.isExclude,
      countSatisfying,
      percentSatisfying: (percentSatisfying * 100).toFixed(2) + '%',
      pctDiff: (pctDiff * 100).toFixed(2) + '%',
    }
  })

  return stats as AttritionStat[]
}
