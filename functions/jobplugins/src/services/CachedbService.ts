import { PrefectAPI } from "../api/PrefectAPI.ts";
import {
  FLOW_RUN_STATE_TYPES,
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
      FLOW_RUN_STATE_TYPES.SCHEDULED,
      FLOW_RUN_STATE_TYPES.LATE,
      FLOW_RUN_STATE_TYPES.PENDING,
      FLOW_RUN_STATE_TYPES.RUNNING,
      FLOW_RUN_STATE_TYPES.RETRYING,
      FLOW_RUN_STATE_TYPES.AWAITING_RETRY,
    ];

    const failureStates = [
      FLOW_RUN_STATE_TYPES.FAILED,
      FLOW_RUN_STATE_TYPES.CRASHED,
      FLOW_RUN_STATE_TYPES.CANCELLING,
      FLOW_RUN_STATE_TYPES.CANCELLED,
      FLOW_RUN_STATE_TYPES.TIMED_OUT,
      FLOW_RUN_STATE_TYPES.SUSPENDED,
      FLOW_RUN_STATE_TYPES.TIMED_OUT,
    ];

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
