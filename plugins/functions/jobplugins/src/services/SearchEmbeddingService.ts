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
    return { flowRunId };
  }

  public async getSearchEmbeddingResults(flowRunId: string, token: string) {
    const prefectApi = new PrefectAPI(token);
    const flowRun: FlowRunState = await prefectApi.getFlowRun(flowRunId);
    return flowRun;
  }
}
