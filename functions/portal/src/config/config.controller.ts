import {
  Body,
  Controller,
  Get,
  Middleware,
  Param,
  Put,
  Query,
} from "@danet/core";
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";
import { ConfigService } from "./config.service.ts";
import { ConfigUpdateDto } from "./dto/config.update.dto.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/config")
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get("types")
  async getConfigValuesByTypes(@Query("types") types: string) {
    return await this.configService.getRedactedConfigValuesByTypes(
      JSON.parse(types)
    );
  }

  @Get(":type")
  async getConfigByType(@Param("type") type: string) {
    const config = await this.configService.getRedactedConfigValuesByTypes([
      type,
    ]);
    return { type, value: config[type] || null };
  }

  @Get("public/types")
  async getPublicConfigValuesByTypes(@Query("types") types: string) {
    return await this.configService.getPublicConfigValuesByTypes(
      JSON.parse(types)
    );
  }

  @Get("public/:type")
  async getPublicConfigByType(@Param("type") type: string) {
    const config = await this.configService.getPublicConfigValuesByTypes([
      type,
    ]);
    return { type, value: config[type] || null };
  }

  @Get("secret/types")
  async getSecretConfigValuesByTypes(@Query("types") types: string) {
    return await this.configService.getConfigValuesByTypes(JSON.parse(types));
  }

  @Get("secret/:type")
  async getSecretConfigByType(@Param("type") type: string) {
    const config = await this.configService.getConfigValuesByTypes([type]);
    return { type, value: config[type] || null };
  }

  @Put()
  async insertOrUpdateConfigs(@Body() configUpdateDtos: ConfigUpdateDto[]) {
    return await this.configService.insertOrUpdateConfigs(configUpdateDtos);
  }
}
