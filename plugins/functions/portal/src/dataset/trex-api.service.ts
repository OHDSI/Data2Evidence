import { Injectable, SCOPE } from "@danet/core";
import { env } from "../env.ts";
import { createLogger } from "../logger.ts";
import { RequestContextService } from "../common/request-context.service.ts";

@Injectable({ scope: SCOPE.REQUEST })
export class TrexApiService {
  private readonly logger = createLogger(this.constructor.name);
  private readonly authHeader: string;

  constructor(private readonly requestContextService: RequestContextService) {
    this.authHeader = this.requestContextService.getOriginalToken() || "";
  }

  /**
   * Tells trex to (re)attach the given cache_ids and connection_ids.
   * Best-effort: failure is logged but does not throw — the caller's
   * primary work (e.g. dataset creation) must not roll back if this fails.
   */
  async attach(args: { cacheIds?: string[]; connectionIds?: string[] }): Promise<void> {
    try {
      const url = `${env.TREX_API_URL}/trex/attach`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authHeader,
        },
        body: JSON.stringify(args),
      });
      if (!res.ok) {
        this.logger.warn(`trex /attach returned ${res.status}: ${await res.text()}`);
      }
    } catch (e) {
      this.logger.warn(`trex /attach call failed: ${(e as Error).message}`);
    }
  }
}
