import { IProgressResponse, ISetupResponse } from "../types";
import { request } from "./request";

const DEMO_BASE_URL = "demo/";

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
