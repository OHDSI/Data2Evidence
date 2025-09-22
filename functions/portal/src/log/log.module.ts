import { Module } from "@danet/core";
import { RequestContextService } from "../common/request-context.service.ts";
import { LogService } from "./log.service";
import { LogController } from "./log.controller";

@Module({
  imports: [],
  controllers: [LogController],
  injectables: [RequestContextService, LogService],
})
export class LogModule {}
