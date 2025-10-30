import { request } from "./request";
import { API_PATHS } from "../constants/api";

const MRI_BASE_URL = API_PATHS.ANALYTICS_SVC;

export class CohortMgmt {
  constructor(public datasetId: string) {}

  public getCohorts(offset?: number, limit?: number): Promise<any> {
    return request({
      baseURL: MRI_BASE_URL,
      url: "/api/services/cohort",
      method: "GET",
      params: { datasetId: this.datasetId, offset, limit },
    });
  }

  public getFilteredCohorts(filterColumn: string, filterValue: string, offset?: number, limit?: number): Promise<any> {
    return request({
      baseURL: MRI_BASE_URL,
      url: `/api/services/cohort/${filterColumn}/${filterValue}`,
      method: "GET",
      params: { datasetId: this.datasetId, offset, limit },
    });
  }

  public deleteCohort(cohortDefinitionId: string): Promise<any> {
    return request({
      baseURL: MRI_BASE_URL,
      url: `/api/services/cohort?cohortId=${cohortDefinitionId}`,
      method: "DELETE",
      params: { datasetId: this.datasetId },
    });
  }
}
