import { request } from "./request";
import {
  IDatabase,
  IDatabaseCredentialsUpdate,
  INewDatabase,
  IDatabaseDetailsUpdate,
  IDatabaseResponse,
  SERVICE_SCOPE_TYPES,
  ITestConnection,
  ITestConnectionResult,
} from "../types";
import omit from "lodash/omit";

const TREX_BASE_URL = "trex/";
const DB_BASE_URL = "gateway/api/db/";

export class DbCredentialsMgr {
  public async getDbList(): Promise<IDatabase[]> {
    const list = await request<IDatabaseResponse[]>({
      baseURL: TREX_BASE_URL,
      url: "db/",
      method: "GET",
    });

    return list.map((d) => ({
      ...omit(d, "db_extra", "authentication_mode", "vocab_schemas"),
      extra: [{ value: d.db_extra, serviceScope: SERVICE_SCOPE_TYPES.INTERNAL }],
      authenticationMode: d.authentication_mode,
      vocabSchemas: d.vocab_schemas,
    }));
  }

  public addDb(db: INewDatabase) {
    return request({
      baseURL: TREX_BASE_URL,
      url: "db/",
      method: "POST",
      data: db,
    });
  }

  public updateDbCredentials(dbCredentials: IDatabaseCredentialsUpdate) {
    return request({
      baseURL: TREX_BASE_URL,
      url: "db/",
      method: "PUT",
      data: dbCredentials,
    });
  }

  public updateDbDetails(db: IDatabaseDetailsUpdate) {
    return request({
      baseURL: TREX_BASE_URL,
      url: "db/",
      method: "PUT",
      data: db,
    });
  }

  public deleteDb(id: string) {
    return request({
      baseURL: TREX_BASE_URL,
      url: `db/${id}`,
      method: "DELETE",
    });
  }
  public async testConnection(params: ITestConnection): Promise<ITestConnectionResult> {
    return await request<ITestConnectionResult>({
      baseURL: DB_BASE_URL,
      url: "test",
      method: "GET",
      params,
    });
  }
}
