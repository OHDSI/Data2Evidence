import { PrefectAPI } from "../api/PrefectAPI.ts";
import {
  FlowRunState,
  PrefectDeploymentName,
  PrefectFlowName,
} from "../const.ts";
import { ICreatePerseusFlowRunDto, IPrefectArtifact } from "../types.ts";

export class PerseusService {
  public async createFlowRun(
    createPerseusFlowRunDto: ICreatePerseusFlowRunDto,
    username: string,
    token: string
  ) {
    const prefectApi = new PrefectAPI(token);
    const flowName = PrefectFlowName.PERSEUS;
    const deploymentName = PrefectDeploymentName.PERSEUS;
    const parameters = {
      options: {
        ...createPerseusFlowRunDto.options,
        headers: {
          username,
          ...createPerseusFlowRunDto.options.headers,
        },
      },
    };

    const flowRunId = await prefectApi.createFlowRun(
      "Run perseus",
      deploymentName,
      flowName,
      parameters
    );
    return { flowRunId };
  }

  public async getFlowRun(flowRunId: string, token: string) {
    const prefectApi = new PrefectAPI(token);
    const flowRun = await prefectApi.getFlowRun(flowRunId);
    return flowRun;
  }

  public async getFlowRunArtifacts(flowRunId: string, token: string) {
    const prefectApi = new PrefectAPI(token);
    const flowRunArtifacts: IPrefectArtifact[] =
      await prefectApi.getFlowRunsArtifactsByFlowRunId(flowRunId);
    return flowRunArtifacts;
  }
}
