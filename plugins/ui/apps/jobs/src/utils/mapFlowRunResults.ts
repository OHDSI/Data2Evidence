import { HistoryJob } from '@/types/types'

export const mapFlowRunResults = (result: any): HistoryJob => {
  const mappedResult: HistoryJob = {
    flowRunId: result.id,
    flowRunName: result.name,
    schemaName: result.parameters.options?.schemaName,
    dataCharacterizationSchema: result.parameters.options?.resultsSchema,
    cohortDefinitionId: result.parameters.options?.cohortDefinitionId,
    type: result.tags,
    createdAt: result.startTime,
    completedAt: result.endTime,
    status: result.stateName,
    error: '',
    datasetId: result.parameters.options?.datasetId,
    comment: result.parameters.options?.comment,
    databaseCode: result.parameters.options?.databaseCode
  }

  return mappedResult
}
