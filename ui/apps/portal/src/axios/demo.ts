import { IProgressResponse, ISetupResponse } from "../types";
import { request } from "./request";

const DEMO_BASE_URL = "demo/";

export class Demo {
  public setupDb(encryptionKeys: string): Promise<ISetupResponse> {
    return request({
      baseURL: DEMO_BASE_URL,
      url: "setup-db",
      method: "POST",
      data: {
        encryptionKeys,
      },
    });
  }

  public setupDataset(): Promise<ISetupResponse> {
    return request({
      baseURL: DEMO_BASE_URL,
      url: "setup-dataset",
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
