import { PrefectAPI } from "../api/PrefectAPI.ts";
import {
  FLOW_RUN_STATE_TYPES,
  PrefectDeploymentName,
  PrefectFlowName,
} from "../const.ts";

export interface ShinyLiveFlowRunDto {
  datasetId: string;
  language: "python";
  appCode: string;
  type: string;
  name: string;
}

export class ShinyLiveService {
  public async createShinyLiveFlowRun(
    shinyLiveFlowRunDto: ShinyLiveFlowRunDto,
    token: string,
  ) {
    const prefectApi = new PrefectAPI(token);

    const { datasetId, language, appCode, type, name } = shinyLiveFlowRunDto;

    if (language !== "python") {
      throw new Error(
        `Language "${language}" is not supported. Only "python" is supported.`,
      );
    }

    const flowRunName = `${name}_${datasetId}_${language}_${type}`;
    const parameters = {
      options: {
        dataset_id: datasetId,
        language: language,
        app_code: appCode,
        config_type: type,
        name: name,
      },
    };

    const flowRunId = await prefectApi.createFlowRun(
      flowRunName,
      PrefectDeploymentName.SHINY_LIVE,
      PrefectFlowName.SHINY_LIVE,
      parameters,
    );

    console.log(
      `Creating auth token for ShinyLive flow run (ShinyLiveService): ${flowRunId}`,
    );
    await prefectApi.createInputAuthToken(flowRunId);

    // Remove the auth token once the flow run reaches a terminal state.
    //
    // This used to be a flat 5-minute timer started at flow-run creation, which
    // deleted the token while the run was still queued whenever the worker was
    // busy, scaling, or pulling a new image. The flow then blocked on an input
    // that no longer existed and died on its own 5-minute wait -- observed with
    // a 15m42s queue delay during an image rollout. The token has to outlive the
    // queue, so tie its lifetime to the run rather than to the clock.
    void this.revokeAuthTokenWhenSettled(prefectApi, flowRunId);

    return { flowRunId };
  }

  // Poll until the flow run settles, then delete its authtoken input. The cap
  // is a backstop so a run that never reports a terminal state cannot leak the
  // token indefinitely.
  private async revokeAuthTokenWhenSettled(
    prefectApi: PrefectAPI,
    flowRunId: string,
  ): Promise<void> {
    const POLL_INTERVAL_MS = 15_000;
    const MAX_WAIT_MS = 1000 * 60 * 60;
    const deadline = Date.now() + MAX_WAIT_MS;
    const terminalStates: string[] = [
      FLOW_RUN_STATE_TYPES.COMPLETED,
      FLOW_RUN_STATE_TYPES.FAILED,
      FLOW_RUN_STATE_TYPES.CRASHED,
      FLOW_RUN_STATE_TYPES.CANCELLED,
      FLOW_RUN_STATE_TYPES.TIMED_OUT,
    ];

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      try {
        let flowRun: any = await prefectApi.getFlowRun(flowRunId);
        if (Array.isArray(flowRun)) {
          flowRun = flowRun[0];
        }
        const stateType = flowRun?.state?.type;
        if (stateType && terminalStates.includes(stateType)) {
          break;
        }
      } catch (error) {
        // A transient read failure must not strand the token; keep polling
        // until the run settles or the cap expires.
        console.error(
          `Could not read ShinyLive flow run ${flowRunId} state while waiting to revoke its auth token`,
          error,
        );
      }
    }

    const msg = "Prefect input authtoken deletion";
    try {
      (await prefectApi.deleteInputAuthToken(flowRunId))
        ? console.log(`${msg} successful`)
        : console.log(`${msg} failed`);
    } catch (error) {
      console.log(`${msg} failed`);
      console.error(error);
    }
  }

  public async getShinyLiveFlowRun(flowRunId: string, token: string) {
    const prefectApi = new PrefectAPI(token);
    return await prefectApi.getFlowRun(flowRunId);
  }

  public async pollShinyLiveFlowRunCompletion(
    flowRunId: string,
    token: string,
  ) {
    const prefectApi = new PrefectAPI(token);
    return await prefectApi.pollFlowRunCompletion(flowRunId);
  }
}
