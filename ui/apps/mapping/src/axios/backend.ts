import request from "./request";
import { LookupListItem, TableSchemaState } from "../contexts";

const PERSEUS_BACKEND_BASE_ENDPOINT = `backend/api/`;
const JOBPLUGINS_BASE_ENDPOINT = `jobplugins/perseus/`;

export class Backend {
  public getCDMVersions(): Promise<string[]> {
    return request({
      url: `${PERSEUS_BACKEND_BASE_ENDPOINT}get_cdm_versions`,
      method: "GET",
    });
  }

  public async createSourceSchemaByScanReportFlowRun(id: number, fileName: string): Promise<{ flowRunId: string }> {
    const data = {
      options: {
        url: "create_source_schema_by_scan_report",
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          dataId: id,
          fileName,
        },
        method: "POST",
      },
    };
    return request({
      url: `${JOBPLUGINS_BASE_ENDPOINT}flow-run`,
      method: "POST",
      data: data,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  public getCDMSchema(cdmVersion: string) {
    return request<TableSchemaState[]>({
      url: `${PERSEUS_BACKEND_BASE_ENDPOINT}get_cdm_schema`,
      method: "GET",
      params: { cdm_version: cdmVersion },
    });
  }

  public getLookups(lookupType: "source_to_standard") {
    return request<LookupListItem[]>({
      url: `${PERSEUS_BACKEND_BASE_ENDPOINT}lookups`,
      method: "GET",
      params: { lookupType },
    });
  }

  public getLookupSQL(name: string, lookupType: "source_to_standard") {
    return request<string>({
      url: `${PERSEUS_BACKEND_BASE_ENDPOINT}lookup/sql`,
      method: "GET",
      params: { name, lookupType },
    });
  }

  public getFlowRunStatus(flowRunId: string): Promise<{
    state_name: string;
    id: string;
  }> {
    return request({
      url: `${JOBPLUGINS_BASE_ENDPOINT}results/${flowRunId}`,
      method: "GET",
    });
  }

  public getSourceSchemaByFlowRunId(flowRunId: string) {
    return request({
      url: `${JOBPLUGINS_BASE_ENDPOINT}artifacts/${flowRunId}`,
      method: "GET",
    });
  }
}
