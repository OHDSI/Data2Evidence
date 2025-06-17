import { TransformationService } from "./DataTransformationService.ts";
import { AnalysisService } from "./AnalysisService.ts";
import {
  PrefectParamsTransformer,
  PrefectAnalysisParamsTransformer,
} from "../utils/DataflowParser.ts";
import { PrefectAPI } from "../api/PrefectAPI.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";
import { PrefectDeploymentName, PrefectFlowName } from "../const.ts";

export class PrefectService {
  private dataflowService;
  private prefectParamsTransformer;
  private prefectAnalysisParamsTransformer;
  private prefectApi;
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
      revision.flow
    );

    this.prefectApi = new PrefectAPI(token);
    const flowrunId = await this.prefectApi.createFlowRun(
      `Run ${revision.canvas.name}`,
      PrefectDeploymentName.UI_DATA_FLOW,
      PrefectFlowName.UI_DATA_FLOW,
      prefectParams
    );
    await this.dataflowService.createDataflowRun(id, flowrunId);
    return flowrunId;
  }

  public async createAnalysisFlowRun(id: string, token) {
    const revision = await this.analysisflowService.getLastAnalysisflowRevision(
      id
    );
    const prefectParams = this.prefectAnalysisParamsTransformer.transform(
      revision.flow
    );

    const prefectDeploymentName = PrefectDeploymentName.ANALYSIS_DATA_FLOW;
    const prefectFlowName = PrefectFlowName.ANALYSIS_DATA_FLOW;
    this.prefectApi = new PrefectAPI(token);

    const flowRunId = await this.prefectApi.createFlowRun(
      revision.canvas.name,
      prefectDeploymentName,
      prefectFlowName,
      prefectParams
    );
    await this.analysisflowService.createAnalysisflowRun(id, flowRunId);
    return flowRunId;
  }

  public async createAnalaysisRunByJupyterKernel(token, flowRunParams) {
    const { json_graph, options } = flowRunParams;
    const prefectDeploymentName = PrefectDeploymentName.ANALYSIS_DATA_FLOW;
    const prefectFlowName = PrefectFlowName.ANALYSIS_DATA_FLOW;
    this.prefectApi = new PrefectAPI(token);
    const portalServerApi = new PortalServerAPI(token);

    const { schemaName, databaseCode } = await portalServerApi.getDataset(
      options['datasetId']
    );

    const flowRunId = await this.prefectApi.createFlowRun(
      "jupyter-kernel-dataset-analysis",
      prefectDeploymentName,
      prefectFlowName,
      {
        json_graph,
        options: Object.assign(options, {
          schemaName,
          databaseCode
        }, {})
      }
    );
    return flowRunId;
  }

  public async getFlowRunLogs(id: string, token) {
    this.prefectApi = new PrefectAPI(token);
    return await this.prefectApi.getFlowRunLogs(id);
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

  public async removeAnalysisResultsSchema(token: string, { studyId, datasetId }: { studyId: string; datasetId: string }) {
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
        options: Object.assign({}, {
          mode: 'drop-results',
          databaseCode,
          studyId,
          datasetId
        })
      }
    );
    return flowRunId;
  }
}
