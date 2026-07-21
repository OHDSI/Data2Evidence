import { request } from "./request";

const D2E_WEBAPI_BASE_URL = "d2e-webapi/";

export interface IMigrateCohortDefinitionResponse {
  successfulMigrations: number;
  totalMigrations: number;
}

export class D2EWebApi {
  public migrateCohortDefinition(): Promise<IMigrateCohortDefinitionResponse> {
    return request<IMigrateCohortDefinitionResponse>({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: "migrate/cohortdefinition",
      method: "POST",
    });
  }
}
