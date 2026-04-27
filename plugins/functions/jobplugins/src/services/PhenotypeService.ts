import { PrefectAPI } from "../api/PrefectAPI.ts";
import { PrefectDeploymentName, PrefectFlowName } from "../const.ts";
import { PhenotypeFlowRunDto } from "../types.ts";

export class PhenotypeService {
  public async createPhenotypeFlowRun(
    phenotypeFlowRunDto: PhenotypeFlowRunDto,
    token: string
  ) {
    const flowName = PrefectFlowName.PHENOTYPE;
    const deploymentName = PrefectDeploymentName.PHENOTYPE;
    const parameters = phenotypeFlowRunDto;
    const prefectApi = new PrefectAPI(token);
    const flowRunId = await prefectApi.createFlowRun(
      `Run Phenotype Flow`,
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
