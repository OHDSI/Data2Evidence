import { CohortMapping } from "../types";
import { request } from "./request";

const MRI_BASE_URL = "analytics-svc";

export class CohortSurvival {
  constructor(public datasetId: string) {}

  public getCohorts({
    offset,
    limit,
    excludePatientIds,
  }: {
    offset?: number;
    limit?: number;
    excludePatientIds?: boolean;
  }): Promise<{ data: CohortMapping[] }> {
    return request({
      baseURL: MRI_BASE_URL,
      url: `/api/services/cohort`,
      method: "GET",
      params: { datasetId: this.datasetId, offset, limit, excludePatientIds },
    });
  }

  public startKmAnalysis({
    targetCohortId,
    outcomeCohortId,
    competingOutcomeCohortId,
    analysisType,
    strata1,
    strata2,
    strata3,
  }: {
    targetCohortId: number;
    outcomeCohortId: number;
    competingOutcomeCohortId?: number;
    analysisType?: "single_event" | "competing_risk";
    strata1?: { id: number; name: string };
    strata2?: { id: number; name: string };
    strata3?: { id: number; name: string };
  }): Promise<{ flowRunId: string }> {
    const strataCohorts = [strata1, strata2, strata3].filter(Boolean) as {
      id: number;
      name: string;
    }[];
    return request({
      baseURL: MRI_BASE_URL,
      url: `/api/services/kaplan-meier`,
      method: "POST",
      data: {
        targetCohortId,
        outcomeCohortId,
        competingOutcomeCohortId,
        analysisType,
        strataCohorts,
      },
      params: { datasetId: this.datasetId },
    });
  }

  public getKmAnalysisResults(flowRunId: string): Promise<{ data: string }> {
    return request({
      baseURL: MRI_BASE_URL,
      url: `/api/services/kaplan-meier`,
      method: "GET",
      params: { datasetId: this.datasetId, flowRunId },
    });
  }
}
