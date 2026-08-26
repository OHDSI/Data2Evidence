import { Injectable, SCOPE } from "@danet/core";
import { services } from "../env.ts";
import { UserGroup } from "../types.d.ts";

interface UserGroupResponse extends UserGroup {
  alp_role_study_write_dqd_researcher?: boolean;
}

interface UnresolvedStudyAccessRequest {
  studyId: string;
}

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

  async getDataSourceRoleMemberships(
    userId: string,
    jwt: string,
  ): Promise<{ readStudyIds: string[]; hasWriteAccess: boolean }> {
    const userGroups = await this.getUserGroups(userId, jwt) as UserGroupResponse;
    return {
      readStudyIds: userGroups.alp_role_study_researcher || [],
      hasWriteAccess: Boolean(userGroups.alp_role_study_write_dqd_researcher),
    };
  }

  async getUnresolvedRequestStudyIds(jwt: string): Promise<string[]> {
    const requestConfig = this.getRequestConfig(jwt);
    const url = `${this.url}/study/access-request/me`;
    const result = await this.channel.get(url, requestConfig);
    return (result.data as UnresolvedStudyAccessRequest[]).map(({ studyId }) => studyId);
  }

  async ensureDatasetRole(datasetId: string, tokenStudyCode: string, type: string | undefined, jwt: string) {
    const requestConfig = this.getRequestConfig(jwt);
    const body = JSON.stringify({ datasetId, tokenStudyCode, type });
    const url = `${this.url}/dataset-role`;
    const result = await this.channel.post(url, body, requestConfig);
    return result.data;
  }

  async removeDatasetRole(datasetId: string, tokenStudyCode: string, jwt: string) {
    const requestConfig = this.getRequestConfig(jwt);
    const url = `${this.url}/dataset-role?datasetId=${encodeURIComponent(datasetId)}&tokenStudyCode=${encodeURIComponent(tokenStudyCode)}`;
    const result = await this.channel.delete(url, requestConfig);
    return result.data;
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
