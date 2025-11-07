import { DanetMiddleware, HttpContext, Injectable } from "@danet/core";
import { RequestContextService } from "./request-context.service.ts";
import { JwtPayload, decode } from "jsonwebtoken";

@Injectable()
export class RequestContextMiddleware implements DanetMiddleware {
  constructor(private readonly requestContextService: RequestContextService) {}

  async action(context: HttpContext, next: () => Promise<void>) {
    const request = context.req;

    this.requestContextService.setRequest(request);

    const authHeader = request.header("authorization");
    if (authHeader) {
      const originalToken = authHeader;
      const token = decode(authHeader.replace(/bearer /i, "")) as JwtPayload;
      this.requestContextService.setAuthToken(token);
      this.requestContextService.setOriginalToken(originalToken);
    }

    await next();
  }
}
