import { Injectable, SCOPE } from "@danet/core";
import { UserMgmtApi } from "./user-mgmt.api.ts";
import { RequestContextService } from "../common/request-context.service.ts";
import { createLogger } from "../logger.ts";

@Injectable({ scope: SCOPE.REQUEST })
export class UserMgmtService {
  private readonly logger = createLogger(this.constructor.name);
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

  // PhysioNet provenance is non-essential metadata for the dataset list — the
  // user can still browse datasets without it. The API throws on non-404
  // failures so they end up in usermgmt logs; here we log + fall back to []
  // so a usermgmt hiccup doesn't break the dataset list.
  async getPhysionetGrantedDatasetIds(): Promise<string[]> {
    try {
      return await this.userMgmtApi.getPhysionetGrantedDatasetIds(this.jwt);
    } catch (error) {
      this.logger.warn(
        `getPhysionetGrantedDatasetIds fell back to []: ${(error as Error).message}`,
      );
      return [];
    }
  }
}
