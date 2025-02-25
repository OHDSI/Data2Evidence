import request from "./request";
import { LookupListItem, TableSchemaState } from "../contexts";

const PERSEUS_BACKEND_BASE_ENDPOINT = `backend/api/`;

export class Backend {
  public getCDMVersions(): Promise<string[]> {
    return request({
      url: `${PERSEUS_BACKEND_BASE_ENDPOINT}get_cdm_versions`,
      method: "GET",
    });
  }

  public createSourceSchemaByScanReport(id: number, fileName: string) {
    return request({
      url: `${PERSEUS_BACKEND_BASE_ENDPOINT}create_source_schema_by_scan_report`,
      method: "POST",
      data: {
        dataId: id,
        fileName,
      },
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
}
