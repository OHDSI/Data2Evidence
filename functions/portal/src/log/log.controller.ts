import { Body, Get, Controller, Post, Middleware } from "@danet/core";
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";
import { LogService } from "./log.service.ts";
import { LogUserAcceptanceDto } from "./dto/LogUserAcceptanceDto.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/log")
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Post()
  async logUserAcceptance(@Body() logUserAcceptanceDto: LogUserAcceptanceDto) {
    return await this.logService.logUsageAgreementResponse(
      logUserAcceptanceDto.response
    );
  }
}
