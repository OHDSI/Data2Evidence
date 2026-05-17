import { Injectable, SCOPE } from "@danet/core";
import axios from "npm:axios";
import { services } from "../env.ts";
import { createLogger } from "../logger.ts";
import { UserGroup } from "../types.d.ts";

const post = async <T = any>(
  url: string,
  data?: any,
  config?: any
): Promise<T> => {
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(data),
    ...config,
  });
  return response.json();
};

@Injectable({ scope: SCOPE.REQUEST })
export class UserMgmtApi {
  private readonly logger = createLogger(this.constructor.name);
  private readonly url: string;
  private readonly channel;

  constructor() {
    if (services.usermgmt) {
      this.url = services.usermgmt;
      this.channel = Trex.tokioChannel("d2e-functions/alp-usermgmt");
    } else {
      throw new Error("No url is set for UserMgmtApi");
    }
  }

  async getUserGroups(userId: string, jwt: string) {
    const requestConfig = this.getRequestConfig(jwt);
    const body = JSON.stringify({ userId });
    const url = `${this.url}/user-group/list`;
    const result = await this.channel.post(url, body, requestConfig);
    return result.data;
  }

  async getPhysionetGrantedDatasetIds(jwt: string): Promise<string[]> {
    const requestConfig = this.getRequestConfig(jwt);
    const url = `${this.url}/me/physionet-granted-dataset-ids`;
    try {
      const result = await this.channel.get(url, requestConfig);
      return result.data?.datasetIds ?? [];
    } catch (error) {
      // Feature flag is off → 404 → fall through to []. Anything else is a real
      // failure we want to surface in logs and propagate to the caller, who can
      // decide whether to fail the whole dataset list or render without
      // provenance info.
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404) return [];
      this.logger.error(
        `getPhysionetGrantedDatasetIds failed (status=${status ?? "n/a"}): ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private getRequestConfig(jwt: string): RequestInit {
    return {
      headers: {
        Authorization: jwt,
        "Content-Type": "application/json",
      },
    };
  }
}
