import { PrefectAPI } from "../api/PrefectAPI.ts";
import {
  FlowRunState,
  FLOW_RUN_STATE_TYPES,
  PrefectDeploymentName,
  PrefectFlowName,
} from "../const.ts";
import {
  ICreateCachedbFileFlowRunDto,
  ICreateFhirCacheFlowRunDto,
} from "../types.ts";

export class CachedbService {
  public async createCachedbFileFlowRun(
    createCachedbFileFlowRunDto: ICreateCachedbFileFlowRunDto,
    token: string
  ) {
    const prefectApi = new PrefectAPI(token);
    const flowName = PrefectFlowName.CACHEDB_CREATE_FILE;
    const deploymentName = PrefectDeploymentName.CACHEDB_CREATE_FILE;
    const parameters = { options: createCachedbFileFlowRunDto };
    console.log(`Parameters: ${JSON.stringify(parameters)}`);
    const flowRunId = await prefectApi.createFlowRun(
      `Run cachedb file creation - ${createCachedbFileFlowRunDto.databaseCode}.${createCachedbFileFlowRunDto.schemaName} as ${createCachedbFileFlowRunDto.snapshotSchemaName}`,
      deploymentName,
      flowName,
      parameters
    );
    return { flowRunId };
  }

  public async createFhirCacheFileFlowRun(
    createFhirCacheFileFlowRunDto: ICreateFhirCacheFlowRunDto,
    token: string
  ) {
    const prefectApi = new PrefectAPI(token);
    const flowRunName = `create-fhir-cache-file-${createFhirCacheFileFlowRunDto.cacheSchemaName}`;
    const flowName = PrefectFlowName.CREATE_FHIR_CACHE_FILE;
    const deploymentName = PrefectDeploymentName.CREATE_FHIR_CACHE_FILE;
    const parameters = { options: createFhirCacheFileFlowRunDto };
    const flowRunId = await prefectApi.createFlowRun(
      flowRunName,
      deploymentName,
      flowName,
      parameters
    );
    return { flowRunId };
  }

  public async getFlowRunResults(flowRunId: string, token: string) {
    const prefectApi = new PrefectAPI(token);
    const flowRun: FlowRunState = await prefectApi.getFlowRun(flowRunId);
    return flowRun;
  }

  public async getCompletedFlowRunId(flowRunId: string, token: string) {
    const prefectApi = new PrefectAPI(token);
    const completedFlowRun = await prefectApi.pollFlowRunCompletion(flowRunId);
    return completedFlowRun.flowRunId;
  }
}
