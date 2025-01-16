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
}
