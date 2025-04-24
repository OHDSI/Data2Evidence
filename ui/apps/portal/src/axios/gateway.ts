import {
  CopyStudyInput,
  NewStudyInput,
  Study,
  CohortDefinitionList,
  UpdateSchemaInput,
  SchemasVersionInfoResponse,
  NewFhirProjectInput,
} from "../types";
import { request } from "./request";

const GATEWAY_BASE_URL = "gateway/api";

export class Gateway {
  public createDataset(input: NewStudyInput): Promise<Study> {
    return request({
      baseURL: GATEWAY_BASE_URL,
      url: `/dataset`,
      method: "POST",
      data: input,
    });
  }

  public copyDataset(input: CopyStudyInput): Promise<any> {
    return request({
      baseURL: GATEWAY_BASE_URL,
      url: `/dataset/snapshot`,
      method: "POST",
      data: input,
    });
  }

  public getCdmSchemaSnapshotMetadata(sourceDatasetId: string) {
    return request({
      baseURL: GATEWAY_BASE_URL,
      url: `/dataset/cdm-schema/snapshot/metadata`,
      method: "GET",
      params: { datasetId: sourceDatasetId },
    });
  }

  public getAllCohorts(sourceDatasetId: string): Promise<CohortDefinitionList> {
    return request({
      baseURL: GATEWAY_BASE_URL,
      url: `/dataset/cohorts`,
      method: "GET",
      params: { datasetId: sourceDatasetId },
    });
  }

  public getSchemasVersionInformation(
    schemas: string[],
    dialect: string,
    databaseCode: string
  ): Promise<SchemasVersionInfoResponse> {
    return request({
      baseURL: GATEWAY_BASE_URL,
      url: `/db/${dialect}/${databaseCode}/version-info`,
      method: "GET",
      params: {
        schemas: schemas.join(","),
      },
    });
  }

  public updateSchema(input: UpdateSchemaInput): Promise<any> {
    return request({
      baseURL: GATEWAY_BASE_URL,
      url: `/db/schema`,
      method: "PUT",
      data: input,
    });
  }

  public createFhirStaging(input: NewFhirProjectInput): Promise<any> {
    return request({
      baseURL: GATEWAY_BASE_URL,
      url: "/fhir/createProject",
      method: "POST",
      data: input,
    });
  }
}
