import { PrefectAPI } from "../api/PrefectAPI.ts";
import {
  FlowRunState,
  PrefectDeploymentName,
  PrefectFlowName,
} from "../const.ts";
import { ICreateCachedbFileFlowRunDto } from "../types.ts";

export class CachedbService {
  public async createCachedbFileFlowRun(
    createCachedbFileFlowRunDto: ICreateCachedbFileFlowRunDto,
    token: string
  ) {
    const prefectApi = new PrefectAPI(token);
    const flowName = PrefectFlowName.CACHEDB_CREATE_FILE;
    const deploymentName = PrefectDeploymentName.CACHEDB_CREATE_FILE;
    const parameters = { options: createCachedbFileFlowRunDto };
    const flowRunId = await prefectApi.createFlowRun(
      "Run cachedb file creation",
      deploymentName,
      flowName,
      parameters
    );
    return { flowRunId };
  }

  public async getFlowRunResults(flowRunId: string, token: string) {
    const prefectApi = new PrefectAPI(token);

    const POLL_INTERVAL_MS = 2000;
    const MAX_ATTEMPTS = 60; // 2 minutes max
    let attempts = 0;

    let flowRun = await prefectApi.getFlowRun(flowRunId);

    // If the flowRun is an array, get the first object
    if (Array.isArray(flowRun)) {
      flowRun = flowRun[0];
    }

    while (
      flowRun.state_type === FlowRunState.RUNNING &&
      attempts < MAX_ATTEMPTS
    ) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      flowRun = await prefectApi.getFlowRun(flowRunId);
      if (Array.isArray(flowRun)) {
        flowRun = flowRun[0];
      }
      attempts++;
    }

    if (flowRun.state_type === FlowRunState.COMPLETED) {
      return flowRun.id;
    }
    return flowRun;
  }
}
