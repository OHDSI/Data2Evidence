import { Injectable, SCOPE } from "@danet/core";
import { RequestContextService } from "../common/request-context.service.ts";

@Injectable({ scope: SCOPE.REQUEST })
export class AuditService {
  constructor(private readonly requestContextService: RequestContextService) {}

  logDisclaimerResponse(response: string) {
    const userId = this.requestContextService.getAuthToken()?.sub;

    // TODO: Persist disclaimer audit records when a portal audit data model is available.
    console.log("Disclaimer response", { userId, response });
  }
}
