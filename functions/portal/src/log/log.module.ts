import { Module } from "@danet/core";
import { RequestContextService } from "../common/request-context.service.ts";
import { LogService } from "./log.service.ts";
import { LogController } from "./log.controller.ts";

@Module({
  imports: [],
  controllers: [LogController],
  injectables: [RequestContextService, LogService],
})
export class LogModule {}
