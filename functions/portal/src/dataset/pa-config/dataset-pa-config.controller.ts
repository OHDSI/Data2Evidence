import { BadRequestException, Controller, Get, Middleware, Query } from "@danet/core";
import { DatasetPaConfigService } from "./dataset-pa-config.service.ts";
import { RequestContextMiddleware } from '../../common/request-context.middleware.ts';

@Middleware(RequestContextMiddleware)
@Controller("system-portal/dataset/pa-config")
export class DatasetPaConfigController {
  constructor(
    private readonly datasetPaConfigService: DatasetPaConfigService
  ) {}

  @Get("backend")
  async getDatasetBackendPaConfig(@Query("datasetId") id: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException("Invalid datasetId");
    }
    const timestamp = (new Date()).valueOf();
    console.time(`time-portal-pa-getDatasetBackendPaConfig-${timestamp}`)
    const result = await this.datasetPaConfigService.getDatasetBackendPaConfig(id);
    console.timeEnd(`time-portal-pa-getDatasetBackendPaConfig-${timestamp}`)
    return result;

  }

  @Get("me")
  async getMyDatasetPaConfig(@Query("datasetId") id: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException("Invalid datasetId");
    }
    const timestamp = (new Date()).valueOf();
    console.time(`time-portal-pa-getMyDatasetPaConfig-${timestamp}`)
    const result = await this.datasetPaConfigService.getMyDatasetPaConfig(id);
    console.timeEnd(`time-portal-pa-getMyDatasetPaConfig-${timestamp}`)
    return result;
  }
}
