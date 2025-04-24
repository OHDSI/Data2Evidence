import { FlowRunJobStateTypes } from "../plugins/SystemAdmin/Jobs/types";

export interface Flow {
  id: string;
  created: string;
  updated: string;
  name: string;
  tags: string[];
}

export interface Deployment {
  id: string;
  name: string;
  tags: string[];
}

export interface MetaData {
  createdBy: string;
  created_date: string;
  modifiedBy: string;
  modified_date: string;
  flowId: string;
  name: string;
  type: string;
  entryPoint: string;
  datamodels: string[];
  url: string;
  others?: {};
}

interface BaseGenerateFlowRun {
  datasetId: string;
  comment: string;
  releaseId?: string;
  vocabSchemaName?: string;
}

export interface GenerateDataQualityFlowRun extends BaseGenerateFlowRun {
  cohortDefinitionId?: string;
}

export interface GenerateDataCharacterizationFlowRun extends BaseGenerateFlowRun {}

export interface ExecuteFlowRunByDeployment {
  flowRunName: string;
  flowName: string;
  deploymentName: string;
  params: object;
  schedule: string | null;
}

export interface CreateDqdFlowRun {
  datasetId: string | undefined;
  comment?: string;
  vocabSchemaName?: string;
  cohortDefinitionId?: string;
  releaseId?: string;
}

export interface CreateDcFlowRun {
  datasetId: string | undefined;
  comment?: string;
  releaseId?: string;
  excludeAnalysisIds?: string;
}

export interface CreateFlowRunByMetadata {
  type: string;
  flowRunName?: string;
  datamodels?: string[];
  flowId?: string;
  options?: object;
}

export interface CreateGetVersionInfoFlowRun {
  flowRunName: string;
  options?: object;
}

export interface FlowRunFilters {
  startDate?: Date | null;
  endDate?: Date | null;
  states?: FlowRunJobStateTypes[];
  flowIds?: string[];
  tags?: string[];
}

export interface CreateCacheFlowRun {
  datasetId: string | undefined;
}
