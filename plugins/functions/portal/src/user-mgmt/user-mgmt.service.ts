import { Injectable, SCOPE } from "@danet/core";
import { UserMgmtApi } from "./user-mgmt.api.ts";
import { RequestContextService } from "../common/request-context.service.ts";

@Injectable({ scope: SCOPE.REQUEST })
export class UserMgmtService {
  private readonly jwt: string;
  constructor(
    private readonly userMgmtApi: UserMgmtApi,
    private readonly requestContextService: RequestContextService
  ) {
    this.jwt = this.requestContextService.getOriginalToken() || "";
  }

  async getResearcherDatasetIds(userId: string) {
    const userGroups = await this.userMgmtApi.getUserGroups(userId, this.jwt);
    return userGroups.alp_role_study_researcher;
  }
}
