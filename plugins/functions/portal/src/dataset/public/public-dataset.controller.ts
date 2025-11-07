import { Controller, Get, Query } from "@danet/core";
import { PublicDatasetQueryService } from "./public-dataset-query.service.ts";
import { PublicDatasetQueryDto } from "../dto/public-dataset.query.dto.ts";

@Controller("system-portal/dataset/public")
export class PublicDatasetController {
  constructor(
    private readonly publicDatasetQueryService: PublicDatasetQueryService
  ) {}

  @Get("list")
  async getDatasets(@Query() queryParams: PublicDatasetQueryDto) {
    return await this.publicDatasetQueryService.getDatasets(queryParams);
  }
}
