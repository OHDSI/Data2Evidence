import { Controller, Get, Middleware } from "@danet/core";
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";
import { SystemService } from "./system.service.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/system")
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get("feature/list")
  async getSystemFeatures() {
    return await this.systemService.getSystemFeatures();
  }
}
