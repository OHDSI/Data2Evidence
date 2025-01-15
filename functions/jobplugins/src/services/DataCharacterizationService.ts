import { AnalyticsSvcAPI } from "../api/AnalyticsAPI.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";
import { PrefectAPI } from "../api/PrefectAPI.ts";
import {
  FLOW_RUN_STATE_TYPES,
  PrefectDeploymentName,
  PrefectFlowName,
  PrefectTagNames,
} from "../const.ts";
import {
  DataCharacterizationFlowRunDto,
  DataCharacterizationOptions,
} from "../types.ts";
import { parseCdmVersionForOhdsi } from "../utils/OhdsiParser.ts";

export class DataCharacterizationService {
  public async getDataCharacterizationResults(
    flowRunId: string,
    sourceKey: string,
    token: string
  ) {
    const analyticsSvcApi = new AnalyticsSvcAPI(token);
    const prefectApi = new PrefectAPI(token);
    const dcFlowRun = await prefectApi.getFlowRun(flowRunId);
    const dcFlowRunOptions: DataCharacterizationOptions =
      dcFlowRun.parameters.options;
    const { resultsSchema, databaseCode, vocabSchemaName, datasetId } =
      dcFlowRunOptions;

    return await analyticsSvcApi.getDataCharacterizationResults(
      databaseCode,
      resultsSchema,
      sourceKey,
      vocabSchemaName,
      datasetId
    );
  }

  public async getDataCharacterizationResultsDrilldown(
    flowRunId: string,
    sourceKey: string,
    conceptId: string,
    token: string
  ) {
    const analyticsSvcApi = new AnalyticsSvcAPI(token);
    const prefectApi = new PrefectAPI(token);
    const dcFlowRun = await prefectApi.getFlowRun(flowRunId);
    const dcFlowRunOptions: DataCharacterizationOptions =
      dcFlowRun.parameters.options;
    const { resultsSchema, databaseCode, vocabSchemaName, datasetId } =
      dcFlowRunOptions;

    return await analyticsSvcApi.getDataCharacterizationResultsDrilldown(
      databaseCode,
      resultsSchema,
      sourceKey,
      conceptId,
      vocabSchemaName,
      datasetId
    );
  }

  public async getLatestDataCharacterizationFlowRun(
    datasetId: string,
    token: string
  ) {
    const prefectApi = new PrefectAPI(token);
    const portalServerApi = new PortalServerAPI(token);
    const { schemaName, databaseCode } = await portalServerApi.getDataset(
      datasetId
    );

    const flowRuns = await prefectApi.getFlowRunsByDataset(
      databaseCode,
      schemaName,
      PrefectTagNames.DATA_CHARACTERIZATION
    );

    if (flowRuns.length === 0) {
      return null;
    }

    return flowRuns[0];
  }

  public async getReleaseFlowRun(
    datasetId: string,
    releaseId: number,
    token: string
  ) {
    const prefectApi = new PrefectAPI(token);
    const portalServerApi = new PortalServerAPI(token);
    const { schemaName, databaseCode } = await portalServerApi.getDataset(
      datasetId
    );
    const flowRuns = await prefectApi.getFlowRunsByDataset(
      databaseCode,
      schemaName,
      PrefectTagNames.DATA_CHARACTERIZATION
    );
    return flowRuns.find(
      (run) => run.parameters.options.releaseId === releaseId.toString()
    );
  }

  public async createDataCharacterizationFlowRun(
    dataCharacterizationFlowRunDto: DataCharacterizationFlowRunDto,
    token: string
  ) {
    const analyticsSvcApi = new AnalyticsSvcAPI(token);
    const prefectApi = new PrefectAPI(token);
    const portalServerApi = new PortalServerAPI(token);
    const datasetId = dataCharacterizationFlowRunDto.datasetId;
    const comment = dataCharacterizationFlowRunDto.comment;
    const releaseId = dataCharacterizationFlowRunDto.releaseId;
    const excludeAnalysisIds =
      dataCharacterizationFlowRunDto.excludeAnalysisIds ?? "";

    const { dialect, databaseCode, schemaName, vocabSchemaName } =
      await portalServerApi.getDataset(datasetId);

    let dataCharacterizationResultsSchema = `${schemaName}_DC_${Date.now()}`;

    if (dialect === "hana") {
      dataCharacterizationResultsSchema =
        dataCharacterizationResultsSchema.toUpperCase();
    } else if (dialect === "postgres") {
      dataCharacterizationResultsSchema =
        dataCharacterizationResultsSchema.toLowerCase();
    }

    const releaseDate = (await this.getReleaseDate(releaseId, token)).split(
      "T"
    )[0];

    const cdmVersionNumber = await analyticsSvcApi.getCdmVersion(datasetId);

    const name = `${databaseCode}.${schemaName}`;
    const parameters = {
      options: {
        schemaName,
        databaseCode,
        datasetId,
        cdmVersionNumber: parseCdmVersionForOhdsi(cdmVersionNumber),
        vocabSchemaName,
        comment,
        resultsSchema: dataCharacterizationResultsSchema,
        excludeAnalysisIds,
        releaseId,
        releaseDate,
      },
    };

    const flowRunId = await prefectApi.createFlowRun(
      name,
      PrefectDeploymentName.DATA_CHARACTERIZATION,
      PrefectFlowName.DATA_CHARACTERIZATION,
      parameters
    );

    await prefectApi.createInputAuthToken(flowRunId);

    await Promise.any([
      new Promise((resolve) => {
        setTimeout(async () => {
          await prefectApi.deleteInputAuthToken(flowRunId);
          resolve(`Deleted the input of ${flowRunId}`);
        }, 5000);
      }),
    ]);

    return { flowRunId };
  }

  public async getSchemaMappingList(token: string) {
    const prefectApi = new PrefectAPI(token);
    const dcFlowRuns = await prefectApi.getFlowRunsByDeploymentNames([
      PrefectDeploymentName.DATA_CHARACTERIZATION,
    ]);

    // Filter out the completed flow runs
    const completedDcFlowRuns = dcFlowRuns.filter(
      (flowRun) => flowRun.state_type === FLOW_RUN_STATE_TYPES.COMPLETED
    );

    // Get unique flow runs by schemaName using reduce
    const uniqueDcFlowRunsBySchemaName = completedDcFlowRuns.reduce(
      (acc, current) => {
        const existing = acc.find(
          (flowRun) =>
            flowRun.parameters.options.schemaName ===
            current.parameters.options.schemaName
        );
        if (!existing) {
          acc.push(current);
        }
        return acc;
      },
      [] as typeof completedDcFlowRuns
    );

    // Map over unique flow runs to extract schema mapping
    const schemaMapping = uniqueDcFlowRunsBySchemaName.map((dcFlowRun) => {
      const dcFlowRunOptions: DataCharacterizationOptions =
        dcFlowRun.parameters.options;
      return { [dcFlowRunOptions.schemaName]: dcFlowRunOptions.resultsSchema };
    });

    return schemaMapping;
  }

  private async getReleaseDate(
    releaseId: string | undefined,
    token: string
  ): Promise<string> {
    const portalServerApi = new PortalServerAPI(token);
    if (releaseId) {
      const datasetRelease = await portalServerApi.getDatasetReleaseById(
        releaseId
      );
      return datasetRelease.releaseDate;
    }
    return new Date().toISOString();
  }
}
