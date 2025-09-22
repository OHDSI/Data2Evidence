import { Injectable, SCOPE } from "@danet/core";
import { RequestContextService } from "../common/request-context.service.ts";

@Injectable({ scope: SCOPE.REQUEST })
export class LogService {
  private readonly userId: string;

  constructor(private readonly requestContextService: RequestContextService) {
    this.userId = this.requestContextService.getAuthToken()?.sub;
  }

  async logUsageAgreementResponse(response: string): Promise<void> {
    console.log(`[${Date.now()}] Usage agreement ${response}: ${this.userId}`);
    return;
  }
}
