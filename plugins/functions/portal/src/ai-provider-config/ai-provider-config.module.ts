import { Module } from "@danet/core";
import { RequestContextService } from "../common/request-context.service.ts";
import { DatabaseModule } from "../database/module.ts";
import { AiProviderConfigController } from "./ai-provider-config.controller.ts";
import { AiProviderConfigService } from "./ai-provider-config.service.ts";
import { AiProviderConfigRepository } from "./repository/ai-provider-config.repository.ts";

@Module({
  imports: [DatabaseModule],
  controllers: [AiProviderConfigController],
  injectables: [
    AiProviderConfigService,
    AiProviderConfigRepository,
    RequestContextService,
  ],
})
export class AiProviderConfigModule {}
