import { Controller, Get, Middleware } from "@danet/core";
import { PatientAnalyticsConfigService } from "./pa-config.service.ts";
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/pa-config")
export class PatientAnalyticsConfigController {
  constructor(
    private readonly paConfigService: PatientAnalyticsConfigService
  ) {}

  @Get("metadata/list")
  async getList() {
    return await this.paConfigService.getList();
  }
}
