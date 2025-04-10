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

    await prefectApi.createInputAuthToken(flowRunId);

    Promise.any([
      new Promise(() => {
        setTimeout(async () => {
          const msg = "Prefect input authtoken deletion";
          try {
            (await prefectApi.deleteInputAuthToken(flowRunId))
              ? console.log(`${msg} successful`)
              : console.log(`${msg} failed`);
          } catch (error) {
            console.log(`${msg} failed`);
            console.error(error);
          }
        }, 1000 * 60 * 5);
      }),
    ]);

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
