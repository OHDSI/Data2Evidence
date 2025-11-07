import { PrefectAPI } from "../api/PrefectAPI.ts";
import { PrefectDeploymentName, PrefectFlowName } from "../const.ts";
import { DatasetAttributesFlowRunDto, DBSvcFlowRunDto } from "../types.ts";

export class DbSvcService {
  public async createDbSvcFlowRun(
    dbSvcFlowRunDto: DBSvcFlowRunDto,
    token: string
  ) {
    const dbSvcFlowName = PrefectFlowName.DB_SVC;
    const dbSvcDeploymentName = PrefectDeploymentName.DB_SVC;
    const flowRunName = dbSvcFlowRunDto.dbSvcOperation;
    const requestType = dbSvcFlowRunDto.requestType;
    const requestUrl = dbSvcFlowRunDto.requestUrl;
    const requestBody = dbSvcFlowRunDto.requestBody;
    const prefectApi = new PrefectAPI(token);
    const parameters = {
      options: {
        requestType,
        requestUrl,
        requestBody,
      },
    };
    return await prefectApi.createFlowRun(
      flowRunName,
      dbSvcDeploymentName,
      dbSvcFlowName,
      parameters
    );
  }

  public async updateDatasetAttributes(
    datasetAttributesDto: DatasetAttributesFlowRunDto,
    token: string
  ) {
    const flowName = PrefectFlowName.DATASET_ATTRIBUTE;
    const deploymentName = PrefectDeploymentName.DATASET_ATTRIBUTE;
    const versionInfo = datasetAttributesDto.versionInfo;
    const datasetSchemaMapping = datasetAttributesDto.datasetSchemaMapping;
    const prefectApi = new PrefectAPI(token);

    const parameters = {
      options: {
        versionInfo: versionInfo,
        datasetSchemaMapping: datasetSchemaMapping,
      },
    };
    let flowrunId = await prefectApi.createFlowRun(
      "update_dataset_attributes",
      deploymentName,
      flowName,
      parameters
    );

    await prefectApi.createInputAuthToken(flowrunId);
    Promise.any([
      new Promise(() => {
        setTimeout(async () => {
          const msg = "Prefect input authtoken deletion";
          try {
            (await prefectApi.deleteInputAuthToken(flowrunId))
              ? console.log(`${msg} successful`)
              : console.log(`${msg} failed`);
          } catch (error) {
            console.log(`${msg} failed`);
            console.error(error);
          }
        }, 1000 * 60 * 5);
      }),
    ]);

    return flowrunId;
  }
}
