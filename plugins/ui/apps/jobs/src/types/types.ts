export type HistoryJob = {
  flowRunId: string
  flowRunName: string
  schemaName: string
  dataCharacterizationSchema: string
  cohortDefinitionId: string
  type: string
  createdAt: string
  completedAt: string
  status: string
  error: string | null
  datasetId: string | null
  comment: string | null
  databaseCode: string
}
