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

    return { flowRunId };
  }
}
