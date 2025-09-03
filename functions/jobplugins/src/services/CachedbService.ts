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

    // Poll every 1 min up to 5 mins
    const POLL_INTERVAL_MS = 60000;
    const MAX_ATTEMPTS = 5;
    let attempts = 0;

    let flowRun = await prefectApi.getFlowRun(flowRunId);

    // If the flowRun is an array, get the first object
    if (Array.isArray(flowRun)) {
      flowRun = flowRun[0];
    }

    const pollingStates = [
      FlowRunState.SCHEDULED,
      FlowRunState.LATE,
      FlowRunState.PENDING,
      FlowRunState.RUNNING,
    ];

    const failureStates = [FlowRunState.FAILED, FlowRunState.CANCELLED];

    while (
      pollingStates.includes(flowRun.state_type) &&
      attempts < MAX_ATTEMPTS
    ) {
      // Early exit if flowRun enters a failure state
      if (failureStates.includes(flowRun.state_type)) {
        throw new Error(
          `Flow run failed or was cancelled. Final state: ${flowRun.state_type}`
        );
      }
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
    throw new Error(
      `Flow run did not complete within the polling window. Final state: ${flowRun.state_type}`
    );
  }
}
