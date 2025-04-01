import { PrefectAPI } from "../api/PrefectAPI.ts";
import {
  FlowRunState,
  PrefectDeploymentName,
  PrefectFlowName,
} from "../const.ts";
import { ICreateWhiteRabbitFlowRunDto } from "../types.ts";

export class WhiteRabbitService {
  public async createFlowRun(
    createWhiteRabbitFlowRunDto: ICreateWhiteRabbitFlowRunDto,
    username: string,
    token: string
  ) {
    const prefectApi = new PrefectAPI(token);
    const flowName = PrefectFlowName.WHITE_RABBIT;
    const deploymentName = PrefectDeploymentName.WHITE_RABBIT;
    const parameters = {
      options: {
        ...createWhiteRabbitFlowRunDto.options,
        headers: {
          username,
          ...createWhiteRabbitFlowRunDto.options.headers,
        },
      },
    };

    const flowRunId = await prefectApi.createFlowRun(
      "Run white rabbit",
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
    const flowRunArtifacts = await prefectApi.getFlowRunsArtifactsByFlowRunId(
      flowRunId
    );
    return flowRunArtifacts;
  }
}
