import { InclusionReportResponse } from '@/query-filter/types/QueryFilterTypes'

type TooltipData = {
  count: string
  summary: string
  passed: string[]
  failed: string[]
}

// Color mapping based on number of failed rules
const RULE_FAILURE_COLORS = {
  allFailedOr5Plus: '#fabfb4',
  threeToFour: '#fcdab6',
  two: '#dedcab',
  one: '#cdd99e',
  allPassed: '#53bead',
}

// Helper function to calculate pass and fail counts from binary string
function calculateRuleCounts(bits: string): { passCount: number; failCount: number } {
  let passCount = 0
  let failCount = 0

  for (let b = 0; b < bits.length; b++) {
    if (bits[b] === '1') {
      passCount++
    } else {
      failCount++
    }
  }

  return { passCount, failCount }
}

// Helper function to get color based on number of failed rules
function getColorByFailureCount(failCount: number): string {
  if (failCount === 0) {
    return RULE_FAILURE_COLORS.allPassed
  } else if (failCount === 1) {
    return RULE_FAILURE_COLORS.one
  } else if (failCount === 2) {
    return RULE_FAILURE_COLORS.two
  } else if (failCount < 5) {
    return RULE_FAILURE_COLORS.threeToFour
  } else {
    // 5+ failed or all failed
    return RULE_FAILURE_COLORS.allFailedOr5Plus
  }
}

// Helper function to compute and format treemap tooltips
function computeTooltipData(bits: string, size: number, inclusionReportResponse: InclusionReportResponse) {
  const { passCount, failCount } = calculateRuleCounts(bits)
  const passed = []
  const failed = []

  for (let b = 0; b < bits.length; b++) {
    const rule = inclusionReportResponse.inclusionRuleStats[b]
    if (!rule) continue

    if (bits[b] === '1') {
      passed.push(`${b + 1}. ${rule.name}`)
    } else {
      failed.push(`${b + 1}. ${rule.name}`)
    }
  }

  let percentage = 0
  if (inclusionReportResponse.summary.baseCount > 0) {
    percentage = (size / inclusionReportResponse.summary.baseCount) * 100
  }

  return {
    count: `${size} ${size === 1 ? 'person' : 'people'} (${percentage.toFixed(2)}%)`,
    summary: `${passCount} criteria passed, ${failCount} criteria failed`,
    passed,
    failed,
  }
}

// Helper function to format treemap tooltip HTML
export function formatTreemapTooltip(tooltipData: TooltipData): string {
  if (!tooltipData) return ''

  let html = `<div style="max-width: 400px; line-height: 1.5; word-wrap: break-word; word-break: break-word; white-space: normal;">`

  // Add count and summary
  html += `<div>${tooltipData.count}</div>`
  html += `<div>${tooltipData.summary}</div>`

  // Add passed criteria
  if (tooltipData.passed && tooltipData.passed.length > 0) {
    html += `<div style="margin-top: 8px; color: var(--color-feedback-success); font-weight: bold;">Passed:</div>`
    tooltipData.passed.forEach((rule: string) => {
      html += `<div style="margin-left: 8px;">${rule}</div>`
    })
  }

  // Add failed criteria
  if (tooltipData.failed && tooltipData.failed.length > 0) {
    html += `<div style="margin-top: 8px; color: var(--color-feedback-error); font-weight: bold;">Failed:</div>`
    tooltipData.failed.forEach((rule: string) => {
      html += `<div style="margin-left: 8px;">${rule}</div>`
    })
  }

  html += `</div>`
  return html
}

// Convert treemap data to format expected by ECharts
export function convertTreemapData(data: any, inclusionReportResponse: InclusionReportResponse) {
  if (!data) return null

  const convert = (node: any) => {
    const newNode: any = {
      name: node.name,
      value: node.size || 0,
    }

    if (node.children && node.children.length > 0) {
      newNode.children = node.children.map(convert)

      // d3 treemap data doesn't require size for parent nodes
      // If parent node doesn't have a size, set it to the sum of its children
      if (!node.size) {
        newNode.value = newNode.children.reduce((sum: number, child: any) => sum + child.value, 0)
      }
    }
    newNode.tooltip = computeTooltipData(node.name, newNode.value, inclusionReportResponse)

    // Calculate number of failed rules based on the binary string name
    const { failCount } = calculateRuleCounts(node.name)
    newNode.itemStyle = {
      color: getColorByFailureCount(failCount),
    }

    return newNode
  }

  return convert(data)
}

