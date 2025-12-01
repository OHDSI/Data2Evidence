export interface Summary {
  baseCount: number
  finalCount: number
  lostCount: number
  percentMatched: string
}

export interface InclusionRuleStat {
  id: number
  name: string
  percentExcluded: string
  percentSatisfying: string
  countSatisfying: number
}

export interface InclusionReportResponse {
  summary: Summary
  inclusionRuleStats: InclusionRuleStat[]
  treemapData: string // JSON string
}
