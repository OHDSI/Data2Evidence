import { Controller, Get, Middleware, Param, Put } from "@danet/core";
import { Body, Query } from "@danet/zod";
import { z } from "zod";
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";
import { ConfigService } from "./config.service.ts";
import {
  ConfigUpdateDto,
  ConfigUpdateSchema,
  TypesQuerySchema,
  type TypesQuerySchema as TypesQuery,
} from "./dto/config.update.dto.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/config")
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get("types")
  async getConfigValuesByTypes(@Query(TypesQuerySchema) query: TypesQuery) {
    return await this.configService.getRedactedConfigValuesByTypes(
      JSON.parse(query.types)
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
  async getPublicConfigValuesByTypes(
    @Query(TypesQuerySchema) query: TypesQuery
  ) {
    return await this.configService.getPublicConfigValuesByTypes(
      JSON.parse(query.types)
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
  async getSecretConfigValuesByTypes(
    @Query(TypesQuerySchema) query: TypesQuery
  ) {
    return await this.configService.getConfigValuesByTypes(
      JSON.parse(query.types)
    );
  }

  @Get("secret/:type")
  async getSecretConfigByType(@Param("type") type: string) {
    const config = await this.configService.getConfigValuesByTypes([type]);
    return { type, value: config[type] || null };
  }

  @Put()
  async insertOrUpdateConfigs(
    @Body(z.array(ConfigUpdateSchema)) configUpdateDtos: ConfigUpdateDto[]
  ) {
    return await this.configService.insertOrUpdateConfigs(configUpdateDtos);
  }
}
