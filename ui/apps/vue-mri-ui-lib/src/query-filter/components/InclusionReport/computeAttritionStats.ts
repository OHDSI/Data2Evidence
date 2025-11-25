import type { InclusionReportResponse } from '@/query-filter/types/InclusionReportTypes'

type AttritionStat = {
  id: number
  name: string
  countSatisfying: number
  percentSatisfying: string
  pctDiff: string
}

/**
 * Count matches in treemap data based on a binary mask pattern
 * Recursively traverses the tree and counts leaf nodes whose names start with the mask
 * Adapted from Ohdsi Atlas codebase
 * @param node - The treemap node to search (can have children or be a leaf)
 * @param mask - Binary string pattern to match (e.g., "11" matches nodes starting with "11")
 * @returns Total count of matching leaf nodes
 */
const countMatch = (node: any, mask: string): number => {
  let count = 0
  if (node.hasOwnProperty('children')) {
    node.children.forEach((c: any) => {
      count += countMatch(c, mask)
    })
  } else {
    count = node.name.startsWith(mask) ? node.size : 0
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
export function computeAttritionStats(report: InclusionReportResponse): AttritionStat[] {
  if (!report) return []
  const treemapData = JSON.parse(report.treemapData)
  const baseCount = report.summary.baseCount

  let priorPct = 1.0
  const stats = report.inclusionRuleStats.map((rule: any, i: number) => {
    const countSatisfying = countMatch(treemapData, '1'.repeat(i + 1))
    const percentSatisfying = baseCount !== 0 ? countSatisfying / baseCount : 0
    const pctDiff = priorPct - percentSatisfying
    priorPct = percentSatisfying

    return {
      id: rule.id,
      name: rule.name,
      countSatisfying,
      percentSatisfying: (percentSatisfying * 100).toFixed(2) + '%',
      pctDiff: (pctDiff * 100).toFixed(2) + '%',
    }
  })

  return stats
}

