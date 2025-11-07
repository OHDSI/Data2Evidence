import { Injectable } from "@danet/core";
import { HonoRequest } from "@hono/hono/request";
import { JwtPayload } from "jsonwebtoken";
@Injectable()
export class RequestContextService {
  private request: HonoRequest | null = null;
  private authToken: string | undefined;
  private originalToken: string | undefined;
  setRequest(request: HonoRequest) {
    this.request = request;
  }

  getRequest(): HonoRequest | null {
    return this.request;
  }

  setOriginalToken(token: string) {
    this.originalToken = token;
  }

  getOriginalToken(): string | undefined {
    return this.originalToken;
  }

  setAuthToken(token: JwtPayload) {
    this.authToken = token;
  }

  getAuthToken(): JwtPayload | undefined {
    return this.authToken;
  }

  getHeader(name: string): string | undefined {
    return this.request?.header(name);
  }
}
