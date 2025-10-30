import { IProgressResponse, ISetupResponse } from "../types";
import { request } from "./request";
import { API_PATHS } from "../constants/api";

const DEMO_BASE_URL = API_PATHS.DEMO;

export class Demo {
  public setup(encryptionKeys: string): Promise<ISetupResponse> {
    return request({
      baseURL: DEMO_BASE_URL,
      url: "setup",
      method: "POST",
      data: {
        encryptionKeys,
      },
    });
  }

  public setupPhenotype(): Promise<ISetupResponse> {
    return request({
      baseURL: DEMO_BASE_URL,
      url: "setup-phenotype",
      method: "POST",
    });
  }

  public getProgress(id: string): Promise<IProgressResponse> {
    return request({
      baseURL: DEMO_BASE_URL,
      url: `progress/${id}`,
      method: "GET",
    });
  }
}
