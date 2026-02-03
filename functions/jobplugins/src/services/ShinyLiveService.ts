import { PrefectAPI } from "../api/PrefectAPI.ts";
import { PrefectDeploymentName, PrefectFlowName } from "../const.ts";

export interface ShinyLiveFlowRunDto {
  datasetId: string;
  language: "python" | "r";
  appCode: string;
  type: string;
  name: string;
}

export class ShinyLiveService {
  public async createShinyLiveFlowRun(
    shinyLiveFlowRunDto: ShinyLiveFlowRunDto,
    token: string,
  ) {
    const prefectApi = new PrefectAPI(token);

    const { datasetId, language, appCode, type, name } = shinyLiveFlowRunDto;

    const flowRunName = `ShinyLive_${datasetId}_${language}`;
    const parameters = {
      options: {
        dataset_id: datasetId,
        language: language,
        app_code: appCode,
        config_type: type,
        name: name,
      },
    };

    const flowRunId = await prefectApi.createFlowRun(
      flowRunName,
      PrefectDeploymentName.SHINY_LIVE,
      PrefectFlowName.SHINY_LIVE,
      parameters,
    );

    console.log(
      `Creating auth token for ShinyLive flow run (ShinyLiveService): ${flowRunId}`,
    );
    await prefectApi.createInputAuthToken(flowRunId);

    // Delete auth token after 5 minutes
    Promise.any([
      new Promise(() => {
        setTimeout(
          async () => {
            const msg = "Prefect input authtoken deletion";
            try {
              (await prefectApi.deleteInputAuthToken(flowRunId))
                ? console.log(`${msg} successful`)
                : console.log(`${msg} failed`);
            } catch (error) {
              console.log(`${msg} failed`);
              console.error(error);
            }
          },
          1000 * 60 * 5,
        );
      }),
    ]);

    return { flowRunId };
  }

  public async getShinyLiveFlowRun(flowRunId: string, token: string) {
    const prefectApi = new PrefectAPI(token);
    return await prefectApi.getFlowRun(flowRunId);
  }

  public async pollShinyLiveFlowRunCompletion(
    flowRunId: string,
    token: string,
  ) {
    const prefectApi = new PrefectAPI(token);
    return await prefectApi.pollFlowRunCompletion(flowRunId);
  }
}
