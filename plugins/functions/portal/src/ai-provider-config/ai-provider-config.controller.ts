import {
  Body,
  Controller,
  Delete,
  Get,
  Middleware,
  Param,
  Post,
  Put,
} from "@danet/core";
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";
import { AiProviderConfigService } from "./ai-provider-config.service.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/ai-provider-config")
export class AiProviderConfigController {
  constructor(private readonly service: AiProviderConfigService) {}

  @Get()
  async list() {
    return await this.service.list();
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return await this.service.get(id);
  }

  @Post()
  async create(@Body() body: Record<string, unknown>) {
    return await this.service.create(body);
  }

  @Post(":id/select")
  async select(@Param("id") id: string) {
    return await this.service.select(id);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return await this.service.update(id, body);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return await this.service.delete(id);
  }
}
