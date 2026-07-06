import { PrefectAPI } from "../api/PrefectAPI.ts";
import {
  FlowRunState,
  PrefectDeploymentName,
  PrefectFlowName,
} from "../const.ts";
import { SearchEmbeddingFlowRunDto } from "../types.ts";

export class SearchEmbeddingService {
  public async createSematicEmbeddingsFlowRun(
    searchEmbeddingFlowRunDto: SearchEmbeddingFlowRunDto,
    token: string
  ) {
    const prefectApi = new PrefectAPI(token);
    const flowName = PrefectFlowName.SEARCH_EMBEDDING;
    const deploymentName = PrefectDeploymentName.SEARCH_EMBEDDING;
    const parameters = { options: searchEmbeddingFlowRunDto };
    const flowRunId = await prefectApi.createFlowRun(
      `Create semantic embeddings`,
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

  public async getSearchEmbeddingResults(flowRunId: string, token: string) {
    const prefectApi = new PrefectAPI(token);
    const flowRun: FlowRunState = await prefectApi.getFlowRun(flowRunId);
    return flowRun;
  }
}
