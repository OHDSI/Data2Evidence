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
import { AiConfigService } from "./ai-config.service.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/ai-config")
export class AiConfigController {
  constructor(private readonly service: AiConfigService) {}

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

  @Post(":id/activate")
  async activate(@Param("id") id: string) {
    return await this.service.activate(id);
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
