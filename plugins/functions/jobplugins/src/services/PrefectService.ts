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
import { env } from "../env.ts";

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

    const prefectApi = new PrefectAPI(token);
    const flowrunId = await prefectApi.createFlowRun(
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
    tokenStudyCode: string,
    uploadResults: boolean | undefined,
    token: string,
  ) {
    const revision =
      await this.analysisflowService.getLastAnalysisflowRevision(id);
    const studyName = revision.canvas.name;
    const prefectParams = this.prefectAnalysisParamsTransformer.transform(
      revision.flow,
    );
    const portalServerApi = new PortalServerAPI(token);
    const dataset = await portalServerApi.getDataset(datasetId);
    const { schemaName, databaseCode } = dataset;
    const cacheId = dataset.cacheId ?? databaseCode;

    this.strategusAnalysisApi = new StrategusAnalysisApi(token);
    await this.strategusAnalysisApi.saveAnalysis(
      tokenStudyCode,
      revision.canvas.name,
      JSON.stringify(prefectParams),
      env.TREX__STRATEGUS_RESULTS_DB_NAME,
      "analysis-ui",
    );

    const prefectDeploymentName = PrefectDeploymentName.ANALYSIS_DATA_FLOW;
    const prefectFlowName = PrefectFlowName.ANALYSIS_DATA_FLOW;
    const prefectApi = new PrefectAPI(token);

    const flowRunId = await prefectApi.createFlowRun(
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
          cacheId,
          studyName,
          tokenStudyCode,
          ...(uploadResults !== undefined ? { uploadResults } : {}),
        },
      },
    );
    console.log(
      `creating auth token for flowrun (PrefectService): ${flowRunId}`,
    );
    await prefectApi.createInputAuthToken(flowRunId);
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
    await this.analysisflowService.createAnalysisflowRun(id, flowRunId);
    return flowRunId;
  }

  public async createAnalaysisRunByJupyterKernel(token, flowRunParams) {
    const { json_graph, options } = flowRunParams;
    const prefectDeploymentName = PrefectDeploymentName.ANALYSIS_DATA_FLOW;
    const prefectFlowName = PrefectFlowName.ANALYSIS_DATA_FLOW;
    const prefectApi = new PrefectAPI(token);
    const portalServerApi = new PortalServerAPI(token);

    // get dataset info to pass databaseCode, which is needed for the analysis flow to know which database to connect to when running the analysis
    const dataset = await portalServerApi.getDataset(options["datasetId"]);
    const { schemaName, databaseCode } = dataset;
    const cacheId = dataset.cacheId ?? databaseCode;

    // Resolve study by token and validate it exists
    this.strategusAnalysisApi = new StrategusAnalysisApi(token);
    const studyDataset = await portalServerApi.getDatasetByToken(options["tokenStudyCode"]);
    const study = await this.strategusAnalysisApi.getStudyByDatasetId(studyDataset.id);
    if (!study) {
      throw new Error(`Study with token ${options["tokenStudyCode"]} does not exist.`);
    }

    await this.strategusAnalysisApi.saveAnalysis(
      options["tokenStudyCode"],
      options["notebookName"],
      json_graph["analysisSpecification"],
      env.TREX__STRATEGUS_RESULTS_DB_NAME,
      options["mode"],
    );

    const flowRunId = await prefectApi.createFlowRun(
      "jupyter-kernel-dataset-analysis",
      prefectDeploymentName,
      prefectFlowName,
      {
        json_graph,
        options: Object.assign(options, {
          schemaName,
          databaseCode,
          cacheId,
        }),
      },
    );

    console.log(
      `creating auth token for flowrun (PrefectService): ${flowRunId}`,
    );
    await prefectApi.createInputAuthToken(flowRunId);
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

    return flowRunId;
  }

  public async uploadResultsFromStorage(
    token: string,
    {
      tokenStudyCode,
      datasetId,
      analysisSpec,
    }: { tokenStudyCode: string; datasetId: string; analysisSpec?: string },
  ) {
    const prefectApi = new PrefectAPI(token);
    const portalServerApi = new PortalServerAPI(token);
    const prefectDeploymentName = PrefectDeploymentName.ANALYSIS_DATA_FLOW;
    const prefectFlowName = PrefectFlowName.ANALYSIS_DATA_FLOW;

    const dataset = await portalServerApi.getDataset(datasetId);
    const { databaseCode } = dataset;
    const cacheId = dataset.cacheId ?? databaseCode;

    const STRATEGUS_RESULTS_BUCKET = "strategus-results";
    let storageFileName: string | undefined;

    try {
      const files = await portalServerApi.listFilesFromStrategusResults(
        STRATEGUS_RESULTS_BUCKET,
        tokenStudyCode,
      );

      if (files && files.length > 0) {
        const fileName = files[0].name.split("/").pop();
        storageFileName = fileName;
        console.log(
          `Found storage file for study ${tokenStudyCode}: ${storageFileName}`,
        );
      } else {
        throw new Error(
          `No files found in storage for study: ${tokenStudyCode}. Please upload a results file first.`,
        );
      }
    } catch (error) {
      console.error("Error querying storage for study %s:", tokenStudyCode, error);
      throw new Error(
        `Failed to find results file in storage for study ${tokenStudyCode}: ${error.message}`,
      );
    }

    const flowRunId = await prefectApi.createFlowRun(
      "strategus-analysis-upload-results",
      prefectDeploymentName,
      prefectFlowName,
      {
        json_graph: {},
        options: Object.assign(
          {},
          {
            mode: "upload-results-from-storage",
            databaseCode: env.TREX__STRATEGUS_RESULTS_DB_NAME,
            cacheId,
            tokenStudyCode,
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
    await prefectApi.createInputAuthToken(flowRunId);
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

    return flowRunId;
  }

  public async dropResultsFromStorage(
    token: string,
    { tokenStudyCode, datasetId }: { tokenStudyCode: string; datasetId: string },
  ) {
    const prefectApi = new PrefectAPI(token);
    const portalServerApi = new PortalServerAPI(token);
    const prefectDeploymentName = PrefectDeploymentName.ANALYSIS_DATA_FLOW;
    const prefectFlowName = PrefectFlowName.ANALYSIS_DATA_FLOW;

    const dataset = await portalServerApi.getDataset(datasetId);
    const { databaseCode } = dataset;
    const cacheId = dataset.cacheId ?? databaseCode;

    const flowRunId = await prefectApi.createFlowRun(
      "strategus-analysis-drop-results",
      prefectDeploymentName,
      prefectFlowName,
      {
        json_graph: {},
        options: Object.assign(
          {},
          {
            mode: "drop-results",
            databaseCode: env.TREX__STRATEGUS_RESULTS_DB_NAME,
            cacheId,
            tokenStudyCode,
            datasetId,
          },
        ),
      },
    );
    return flowRunId;
  }

  public async getFlowRunState(id: string, token) {
    const prefectApi = new PrefectAPI(token);
    const flowRunState = await prefectApi.getFlowRunState(id);
    return flowRunState;
  }

  public async cancelFlowRun(id: string, token) {
    const prefectApi = new PrefectAPI(token);
    return await prefectApi.cancelFlowRun(id);
  }

  public async removeAnalysisResultsSchema(
    token: string,
    { tokenStudyCode }: { tokenStudyCode: string },
  ) {
    const prefectApi = new PrefectAPI(token);
    const prefectDeploymentName = PrefectDeploymentName.ANALYSIS_DATA_FLOW;
    const prefectFlowName = PrefectFlowName.ANALYSIS_DATA_FLOW;

    const flowRunId = await prefectApi.createFlowRun(
      "strategus-analysis-remove-results-schema",
      prefectDeploymentName,
      prefectFlowName,
      {
        json_graph: {},
        options: {
          mode: "drop-results",
          tokenStudyCode,
        },
      },
    );
    return flowRunId;
  }

  public async createInputAuthToken(flowrunId: string, token: string) {
    const prefectApi = new PrefectAPI(token);
    await prefectApi.createInputAuthToken(flowrunId);
  }
  
  public async deleteInputAuthToken(flowrunId: string, token: string) {
    const prefectApi = new PrefectAPI(token);
    await prefectApi.deleteInputAuthToken(flowrunId);
  }
}
