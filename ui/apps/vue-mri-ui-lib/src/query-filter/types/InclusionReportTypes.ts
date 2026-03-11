export interface Summary {
  baseCount: number
  finalCount: number
  lostCount: number
  percentMatched: string
}

export interface InclusionRuleStat {
  id: number
  name: string
  isExclude: boolean
  percentExcluded: string
  percentSatisfying: string
  countSatisfying: number
}

export interface TreemapNode {
  name: string
  size?: number
  children?: TreemapNode[]
}

export interface InclusionReportResponse {
  summary: Summary
  inclusionRuleStats: InclusionRuleStat[]
  treemapData: TreemapNode
}
