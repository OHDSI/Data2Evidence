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

  @Get(":type")
  async getConfigByType(@Param("type") type: string) {
    return await this.configService.getConfigByType(type);
  }

  @Get("public/types")
  async getConfigValuesByTypes(@Query("types") types: string) {
    return await this.configService.getConfigValuesByTypes(JSON.parse(types));
  }

  @Get("public/:type")
  async getPublicConfigByType(@Param("type") type: string) {
    return await this.configService.getConfigByType(type);
  }

  @Put()
  async insertOrUpdateConfigs(@Body() configUpdateDtos: ConfigUpdateDto[]) {
    return await this.configService.insertOrUpdateConfigs(configUpdateDtos);
  }
}
