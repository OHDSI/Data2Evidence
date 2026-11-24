import { Module } from "@danet/core";
import { RequestContextService } from "../common/request-context.service.ts";
import { DatabaseModule } from "../database/module.ts";
import { AiConfigController } from "./ai-config.controller.ts";
import { AiConfigService } from "./ai-config.service.ts";
import { AiConfigRepository } from "./repository/ai-config.repository.ts";

@Module({
  imports: [DatabaseModule],
  controllers: [AiConfigController],
  injectables: [
    AiConfigService,
    AiConfigRepository,
    RequestContextService,
  ],
})
export class AiConfigModule {}
