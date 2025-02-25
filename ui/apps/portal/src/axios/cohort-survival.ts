import { CohortMapping } from "../types";
import { request } from "./request";

const MRI_BASE_URL = "analytics-svc";

export class CohortSurvival {
  constructor(public datasetId: string) {}

  public getCohorts(offset?: number, limit?: number): Promise<{ data: CohortMapping[] }> {
    return request({
      baseURL: MRI_BASE_URL,
      url: `/api/services/cohort`,
      method: "GET",
      params: { datasetId: this.datasetId, offset, limit },
    });
  }

  public startKmAnalysis(targetCohortId: number, outcomeCohortId: number): Promise<{ flowRunId: string }> {
    return request({
      baseURL: MRI_BASE_URL,
      url: `/api/services/kaplan-meier`,
      method: "POST",
      data: { targetCohortId, outcomeCohortId },
      params: { datasetId: this.datasetId },
    });
  }

  public getKmAnalysisResults(flowRunId: string): Promise<{ result: string }> {
    return request({
      baseURL: MRI_BASE_URL,
      url: `/api/services/kaplan-meier`,
      method: "GET",
      params: { datasetId: this.datasetId, flowRunId },
    });
  }
}
