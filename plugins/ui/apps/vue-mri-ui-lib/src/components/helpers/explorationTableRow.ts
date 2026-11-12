import type { D2eExplorationCardStatus } from '@d2e/ui'

export interface ExplorationTableRow {
  id: string
  name: string
  description: string
  status: D2eExplorationCardStatus
  personCount: string
  lastMaterialized: string
  cohortId: string | number
  createdBy: string
  lastUpdated: string
  version: string | number
  bmkId: string | null
}

export const isOpenable = (row: Pick<ExplorationTableRow, 'bmkId'>): boolean => Boolean(row.bmkId)
