import { InclusionReportResponse } from '@/query-filter/types/QueryFilterTypes'

function tooltipFormatter(bits: string, size: number, inclusionReportResponse: InclusionReportResponse) {
  let pass_count = 0
  let fail_count = 0
  const passed = []
  const failed = []

  for (let b = 0; b < bits.length; b++) {
    if (bits[b] === '1') {
      passed.push(inclusionReportResponse.inclusionRuleStats[b])
      pass_count++
    } else {
      failed.push(inclusionReportResponse.inclusionRuleStats[b])
      fail_count++
    }
  }

  let percentage = 0
  if (inclusionReportResponse.summary.baseCount > 0) {
    percentage = (size / inclusionReportResponse.summary.baseCount) * 100
  }

  return `${size} ${size === 1 ? 'person' : 'people'} (${percentage.toFixed(
    2
  )}%), ${pass_count} criteria passed, ${fail_count} criteria failed.`
}

export function convertTreemapData(data: any, inclusionReportResponse: InclusionReportResponse) {
  if (!data) return null

  const convert = node => {
    const newNode: any = {
      name: node.name,
      value: node.size || 0,
    }

    if (node.children && node.children.length > 0) {
      newNode.children = node.children.map(convert)

      // d3 treemap data doesn't require size for parent nodes
      // If parent node doesn't have a size, set it to the sum of its children
      if (!node.size) {
        newNode.value = newNode.children.reduce((sum: number, child) => sum + child.value, 0)
      }
    }
    newNode.tooltip = tooltipFormatter(node.name, newNode.value, inclusionReportResponse)

    return newNode
  }

  return convert(data)
}

