import { PrefectAPI } from "../api/PrefectAPI.ts";
import { PrefectDeploymentName, PrefectFlowName } from "../const.ts";
import { CohortGeneratorFlowRunDto } from "../types.ts";

export class CohortService {
  public async createCohortGeneratorFlowRun(
    cohortGeneratorFlowRunDto: CohortGeneratorFlowRunDto,
    token: string
  ) {
    const flowName = PrefectFlowName.COHORT;
    const deploymentName = PrefectDeploymentName.COHORT;
    const parameters = cohortGeneratorFlowRunDto;
    const prefectApi = new PrefectAPI(token);
    const flowRunId = await prefectApi.createFlowRun(
      `Generate Cohort ${parameters.options.cohortJson.name}`,
      deploymentName,
      flowName,
      parameters
    );

    await prefectApi.createInputAuthToken(flowRunId);
    await new Promise((resolve) => {
      setTimeout(async () => {
        await prefectApi.deleteInputAuthToken(flowRunId);
        resolve(`Deleted the input of ${flowRunId}`);
      }, 5000);
    });

    return { flowRunId };
  }
}
