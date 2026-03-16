import { PortalServerAPI } from "../api/PortalServerAPI.ts";
import { PrefectAPI } from "../api/PrefectAPI.ts";
import { StrategusAnalysisApi } from "../api/StrategusAnalysis.ts";
import { PrefectDeploymentName, PrefectFlowName } from "../const.ts";
import {
  PrefectAnalysisParamsTransformer,
  PrefectParamsTransformer,
} from "../utils/DataflowParser.ts";
import { AnalysisService } from "./AnalysisService.ts";
import { TransformationService } from "./DataTransformationService.ts";

export class PrefectService {
  private dataflowService;
  private prefectParamsTransformer;
  private prefectAnalysisParamsTransformer;
  private prefectApi;
  private strategusAnalysisApi;
  private analysisflowService;

  constructor() {
    this.dataflowService = new TransformationService();
    this.analysisflowService = new AnalysisService();
    this.prefectParamsTransformer = new PrefectParamsTransformer();
    this.prefectAnalysisParamsTransformer =
      new PrefectAnalysisParamsTransformer();
  }

  public async createFlowrun(id: string, token) {
    const revision = await this.dataflowService.getLatestGraphByCanvasId(id);
    const prefectParams = this.prefectParamsTransformer.transform(
      revision.flow,
    );

    this.prefectApi = new PrefectAPI(token);
    const flowrunId = await this.prefectApi.createFlowRun(
      `Run ${revision.canvas.name}`,
      PrefectDeploymentName.UI_DATA_FLOW,
      PrefectFlowName.UI_DATA_FLOW,
      prefectParams,
    );
    await this.dataflowService.createDataflowRun(id, flowrunId);
    return flowrunId;
  }

  public async createAnalysisFlowRun(
    id: string,
    datasetId: string,
    uploadResults: boolean | undefined,
    token: string,
  ) {
    const revision =
      await this.analysisflowService.getLastAnalysisflowRevision(id);
    const studyName = revision.canvas.name;
    const studyId = revision.canvas.name;
    const prefectParams = this.prefectAnalysisParamsTransformer.transform(
      revision.flow,
    );
    const portalServerApi = new PortalServerAPI(token);
    const { schemaName, databaseCode } =
      await portalServerApi.getDataset(datasetId);

    const prefectDeploymentName = PrefectDeploymentName.ANALYSIS_DATA_FLOW;
    const prefectFlowName = PrefectFlowName.ANALYSIS_DATA_FLOW;
    this.prefectApi = new PrefectAPI(token);

    const flowRunId = await this.prefectApi.createFlowRun(
      revision.canvas.name,
      prefectDeploymentName,
      prefectFlowName,
      {
        ...prefectParams,
        options: {
          ...prefectParams.options,
          datasetId,
          schemaName,
          databaseCode,
          studyName,
          studyId,
          ...(uploadResults !== undefined ? { uploadResults } : {}),
        },
      },
    );
    console.log(
      `creating auth token for flowrun (PrefectService): ${flowRunId}`,
    );
    await this.prefectApi.createInputAuthToken(flowRunId);
    Promise.any([
      new Promise(() => {
        setTimeout(
          async () => {
            const msg = "Prefect input authtoken deletion";
            try {
              (await this.prefectApi.deleteInputAuthToken(flowRunId))
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
    await this.analysisflowService.createAnalysisflowRun(id, flowRunId);
    return flowRunId;
  }

  public async createAnalaysisRunByJupyterKernel(token, flowRunParams) {
    const { json_graph, options } = flowRunParams;
    const prefectDeploymentName = PrefectDeploymentName.ANALYSIS_DATA_FLOW;
    const prefectFlowName = PrefectFlowName.ANALYSIS_DATA_FLOW;
    this.prefectApi = new PrefectAPI(token);
    const portalServerApi = new PortalServerAPI(token);

    // get dataset info to pass databaseCode, which is needed for the analysis flow to know which database to connect to when running the analysis
    const { schemaName, databaseCode } = await portalServerApi.getDataset(
      options["datasetId"],
    );

    // Save analysis specification for researcher workflows
    this.strategusAnalysisApi = new StrategusAnalysisApi(token);
    // if study does not exist, throw error. This ensures that we only create flow runs for valid studies.
    const study = await this.strategusAnalysisApi.getStudy(options["studyId"]);
    if (!study) {
      throw new Error(`Study ${options["studyId"]} does not exist.`);
    }

    await this.strategusAnalysisApi.saveAnalysis(
      options["studyId"],
      options["notebookName"],
      json_graph["analysisSpecification"],
      databaseCode,
    );

    const flowRunId = await this.prefectApi.createFlowRun(
      "jupyter-kernel-dataset-analysis",
      prefectDeploymentName,
      prefectFlowName,
      {
        json_graph,
        options: Object.assign(options, {
          schemaName,
          databaseCode,
        }),
      },
    );

    console.log(
      `creating auth token for flowrun (PrefectService): ${flowRunId}`,
    );
    await this.prefectApi.createInputAuthToken(flowRunId);
    Promise.any([
      new Promise(() => {
        setTimeout(
          async () => {
            const msg = "Prefect input authtoken deletion";
            try {
              (await this.prefectApi.deleteInputAuthToken(flowRunId))
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

    return flowRunId;
  }

  public async uploadResultsFromStorage(
    token: string,
    {
      studyId,
      datasetId,
      analysisSpec,
    }: { studyId: string; datasetId: string; analysisSpec?: string },
  ) {
    this.prefectApi = new PrefectAPI(token);
    const portalServerApi = new PortalServerAPI(token);
    const prefectDeploymentName = PrefectDeploymentName.ANALYSIS_DATA_FLOW;
    const prefectFlowName = PrefectFlowName.ANALYSIS_DATA_FLOW;

    const { databaseCode } = await portalServerApi.getDataset(datasetId);

    const STRATEGUS_RESULTS_BUCKET = "strategus-results";
    let storageFileName: string | undefined;

    try {
      const files = await portalServerApi.listFilesFromStrategusResults(
        STRATEGUS_RESULTS_BUCKET,
        studyId,
      );

      if (files && files.length > 0) {
        const fileName = files[0].name.split("/").pop();
        storageFileName = fileName;
        console.log(
          `Found storage file for study ${studyId}: ${storageFileName}`,
        );
      } else {
        throw new Error(
          `No files found in storage for study: ${studyId}. Please upload a results file first.`,
        );
      }
    } catch (error) {
      console.error("Error querying storage for study %s:", studyId, error);
      throw new Error(
        `Failed to find results file in storage for study ${studyId}: ${error.message}`,
      );
    }

    const flowRunId = await this.prefectApi.createFlowRun(
      "strategus-analysis-upload-results",
      prefectDeploymentName,
      prefectFlowName,
      {
        json_graph: {},
        options: Object.assign(
          {},
          {
            mode: "upload-results-from-storage",
            databaseCode,
            studyId,
            datasetId,
            storageFileName,
            analysisSpec, // Pass analysisSpec to the flow
          },
        ),
      },
    );

    // Create auth token for the flow to access Supabase Storage
    console.log(
      `creating auth token for flowrun (PrefectService): ${flowRunId}`,
    );
    await this.prefectApi.createInputAuthToken(flowRunId);
    Promise.any([
      new Promise(() => {
        setTimeout(
          async () => {
            const msg = "Prefect input authtoken deletion";
            try {
              (await this.prefectApi.deleteInputAuthToken(flowRunId))
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

    return flowRunId;
  }

  public async dropResultsFromStorage(
    token: string,
    { studyId, datasetId }: { studyId: string; datasetId: string },
  ) {
    this.prefectApi = new PrefectAPI(token);
    const portalServerApi = new PortalServerAPI(token);
    const prefectDeploymentName = PrefectDeploymentName.ANALYSIS_DATA_FLOW;
    const prefectFlowName = PrefectFlowName.ANALYSIS_DATA_FLOW;

    const { databaseCode } = await portalServerApi.getDataset(datasetId);

    const flowRunId = await this.prefectApi.createFlowRun(
      "strategus-analysis-drop-results",
      prefectDeploymentName,
      prefectFlowName,
      {
        json_graph: {},
        options: Object.assign(
          {},
          {
            mode: "drop-results",
            databaseCode,
            studyId,
            datasetId,
          },
        ),
      },
    );
    return flowRunId;
  }

  public async getFlowRunState(id: string, token) {
    this.prefectApi = new PrefectAPI(token);
    const flowRunState = await this.prefectApi.getFlowRunState(id);
    return flowRunState;
  }

  public async cancelFlowRun(id: string, token) {
    this.prefectApi = new PrefectAPI(token);
    return await this.prefectApi.cancelFlowRun(id);
  }

  public async removeAnalysisResultsSchema(
    token: string,
    { studyId, datasetId }: { studyId: string; datasetId: string },
  ) {
    this.prefectApi = new PrefectAPI(token);
    const portalServerApi = new PortalServerAPI(token);
    const prefectDeploymentName = PrefectDeploymentName.ANALYSIS_DATA_FLOW;
    const prefectFlowName = PrefectFlowName.ANALYSIS_DATA_FLOW;

    const { databaseCode } = await portalServerApi.getDataset(datasetId);

    const flowRunId = await this.prefectApi.createFlowRun(
      "strategus-analysis-remove-results-schema",
      prefectDeploymentName,
      prefectFlowName,
      {
        json_graph: {},
        options: Object.assign(
          {},
          {
            mode: "drop-results",
            databaseCode,
            studyId,
            datasetId,
          },
        ),
      },
    );
    return flowRunId;
  }
}
