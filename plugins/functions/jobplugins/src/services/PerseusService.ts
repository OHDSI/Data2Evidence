import { PrefectAPI } from "../api/PrefectAPI.ts";
import { IPrefectArtifact } from "../types.ts";

export class PerseusService {
  public async getFlowRunArtifacts(flowRunId: string, token: string) {
    const prefectApi = new PrefectAPI(token);
    const flowRunArtifacts: IPrefectArtifact[] =
      await prefectApi.getFlowRunsArtifactsByFlowRunId(flowRunId);
    return flowRunArtifacts;
  }
}
