import { PrefectAPI } from "../api/PrefectAPI.ts";
import {
  FlowRunState,
  PrefectDeploymentName,
  PrefectFlowName,
} from "../const.ts";
import { CohortSurvivalFlowRunDto } from "../types.ts";

export class CohortSurvivalService {
  public async createCohortSurvivalFlowRun(
    cohortSurvivalFlowRunDto: CohortSurvivalFlowRunDto,
    token: string
  ) {
    const prefectApi = new PrefectAPI(token);
    const flowName = PrefectFlowName.COHORT_SURVIVAL;
    const deploymentName = PrefectDeploymentName.COHORT_SURVIVAL;
    const parameters = cohortSurvivalFlowRunDto;
    const flowRunId = await prefectApi.createFlowRun(
      `Run Kaplan-Meier analysis`,
      deploymentName,
      flowName,
      parameters
    );
    return { flowRunId };
  }

  public async getCohortSurvivalResults(flowRunId: string, token: string) {
    const prefectApi = new PrefectAPI(token);
    const flowRun: FlowRunState = await prefectApi.getFlowRun(flowRunId);
    return flowRun;
  }
}
