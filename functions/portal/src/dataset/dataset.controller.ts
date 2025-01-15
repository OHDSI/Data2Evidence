import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HTTP_STATUS,
  Head,
  HttpException,
  Middleware,
  Param,
  Post,
  Put,
  Query,
} from "@danet/core";
// import { transformPipe } from '../common/pipe/TransformPipe.ts'
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";
import { IDataset } from "../types.d.ts";
import { DatasetCommandService } from "./command/dataset-command.service.ts";
import { DatasetFilterService } from "./dataset-filter.service.ts";
import { DatasetDetailMetadataUpdateDto } from "./dto/dataset-detail-metadata.update.dto.ts";
import {
  DatasetAttributeDto,
  DatasetDto,
  DatasetQueryDto,
  DatasetReleaseDto,
  DatasetSearchDto,
  DatasetSnapshotDto,
} from "./dto/index.ts";
import { DatasetQueryService } from "./query/dataset-query.service.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/dataset")
export class DatasetController {
  constructor(
    private readonly datasetQueryService: DatasetQueryService,
    private readonly datasetCommandService: DatasetCommandService,
    private readonly datasetFilterService: DatasetFilterService
  ) {}

  @Get()
  async getDataset(@Query() queryParams: any): Promise<IDataset> {
    const id = queryParams.datasetId
    if (!id) {
      console.error(`No datasetId provided ${JSON.stringify(queryParams)}`);
      throw new BadRequestException("datasetId is required");
    }
    return await this.datasetQueryService.getDataset(id);
  }

  @Get("exist")
  async hasDataset(@Query() searchParams: any) {
    const dataset = await this.datasetQueryService.hasDataset(searchParams);
    const exist = !!dataset;
    return { exist }
  }

  @Get("list")
  async getDatasets(@Query() queryParams: DatasetQueryDto) {
    return await this.datasetQueryService.getDatasets(queryParams);
  }

  @Get("filter-scopes")
  async getDatasetFilterScopes() {
    return await this.datasetFilterService.getFilterScopes();
  }

  @Put()
  async updateDatasetDetailMetadata(
    @Body() datasetDetailMetadataDto: DatasetDetailMetadataUpdateDto
  ) {
    return await this.datasetCommandService.updateDatasetDetailMetadata(
      datasetDetailMetadataDto
    );
  }

  @Post("snapshot")
  async createDatasetSnapshot(@Body() datasetSnapshotDto: DatasetSnapshotDto) {
    return await this.datasetCommandService.createDatasetSnapshot(
      datasetSnapshotDto
    );
  }

  @Post()
  async createDataset(@Body() datasetDto: DatasetDto) {
    return await this.datasetCommandService.createDataset(datasetDto);
  }

  @Delete()
  async offboardDataset(@Query("datasetId") id: string) {
    return await this.datasetCommandService.offboardDataset(id);
  }

  @Put("attribute")
  async updateDatasetAttribute(
    @Body() datasetAttributeDto: DatasetAttributeDto
  ) {
    return await this.datasetCommandService.updateDatasetAttribute(
      datasetAttributeDto
    );
  }

  @Post("release")
  async createRelease(@Body() datasetReleaseDto: DatasetReleaseDto) {
    return await this.datasetCommandService.createRelease(datasetReleaseDto);
  }

  @Get("release/list")
  async getReleases(@Query("datasetId") datasetId: string) {
    return await this.datasetQueryService.getDatasetReleases(datasetId);
  }

  @Get("release/:id")
  async getReleaseById(@Param("id") id: number) {
    return await this.datasetQueryService.getDatasetReleaseById(id);
  }

  @Get("dashboard/:name")
  async getDashboardByName(@Param("name") name) {
    return await this.datasetQueryService.getDatasetDashboardByName(name);
  }

  @Get("dashboards/list")
  async getDashboards() {
    return await this.datasetQueryService.getDashboards();
  }
}
