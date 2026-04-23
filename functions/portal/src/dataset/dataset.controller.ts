import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Middleware,
  Param,
  Post,
  Put,
  Query,
} from "@danet/core";
import {
  DATASET_RESEARCHER_ROLE,
  DATASET_SYSTEM_ADMIN_ROLE,
} from "../common/const.ts";
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
  DatasetSnapshotDto,
} from "./dto/index.ts";
import { DatasetQueryService } from "./query/dataset-query.service.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/dataset")
export class DatasetController {
  constructor(
    private readonly datasetQueryService: DatasetQueryService,
    private readonly datasetCommandService: DatasetCommandService,
    private readonly datasetFilterService: DatasetFilterService,
  ) {}

  @Get()
  async getDataset(@Query() queryParams: any): Promise<IDataset> {
    const id = queryParams.datasetId;
    if (!id) {
      console.error(`No datasetId provided ${JSON.stringify(queryParams)}`);
      throw new HttpException(400, "datasetId is required");
    }
    return await this.datasetQueryService.getDataset(id);
  }

  @Get("by-token")
  async getDatasetByToken(@Query() queryParams: any): Promise<IDataset> {
    const tokenDatasetCode = queryParams.tokenDatasetCode;
    if (!tokenDatasetCode) {
      throw new HttpException(400, "tokenDatasetCode is required");
    }
    return await this.datasetQueryService.getDatasetByToken(tokenDatasetCode);
  }

  @Get("exist")
  async hasDataset(@Query() searchParams: any) {
    const dataset = await this.datasetQueryService.hasDataset(searchParams);
    const exist = !!dataset;
    return { exist };
  }

  @Get("list/systemadmin")
  async getSystemAdminDatasets(@Query() queryParams: DatasetQueryDto) {
    return await this.datasetQueryService.getDatasets({
      ...queryParams,
      role: DATASET_SYSTEM_ADMIN_ROLE,
    });
  }

  @Get("list")
  async getResearcherDatasets(@Query() queryParams: DatasetQueryDto) {
    return await this.datasetQueryService.getDatasets({
      ...queryParams,
      role: DATASET_RESEARCHER_ROLE,
    });
  }

  @Get("filter-scopes")
  async getDatasetFilterScopes() {
    return await this.datasetFilterService.getFilterScopes();
  }

  @Put()
  async updateDatasetDetailMetadata(
    @Body() datasetDetailMetadataDto: DatasetDetailMetadataUpdateDto,
  ) {
    return await this.datasetCommandService.updateDatasetDetailMetadata(
      datasetDetailMetadataDto,
    );
  }

  @Post("snapshot")
  async createDatasetSnapshot(@Body() datasetSnapshotDto: DatasetSnapshotDto) {
    return await this.datasetCommandService.createDatasetSnapshot(
      datasetSnapshotDto,
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
    @Body() datasetAttributeDto: DatasetAttributeDto,
  ) {
    return await this.datasetCommandService.updateDatasetAttribute(
      datasetAttributeDto,
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

  @Get("dashboard-code")
  async getDatasetDashboardCode(
    @Query("datasetId") datasetId: string,
    @Query("type") type: string,
    @Query("name") name: string,
  ) {
    return await this.datasetQueryService.getDatasetCode(datasetId, type, name);
  }

  @Put("dashboard-code")
  async updateDatasetDashboardCode(
    @Body()
    datasetCodeDto: {
      datasetId: string;
      code: string;
      type: string;
      name: string;
      language?: string;
    },
  ) {
    return await this.datasetCommandService.updateDatasetDashboardCode(
      datasetCodeDto.datasetId,
      datasetCodeDto.code,
      datasetCodeDto.type,
      datasetCodeDto.name,
      datasetCodeDto.language,
    );
  }

  @Get("dashboard-code-query")
  async getDatasetCodeQuery(
    @Query("datasetId") datasetId: string,
    @Query("type") type: string,
    @Query("name") name: string,
    @Query("queryName") queryName: string,
  ) {
    return await this.datasetQueryService.getDatasetCodeQuery(
      datasetId,
      type,
      name,
      queryName,
    );
  }

  @Put("dashboard-code-query")
  async upsertDatasetCodeQuery(
    @Body()
    dto: {
      datasetId: string;
      type: string;
      name: string;
      queryName: string;
      sql: string;
    },
  ) {
    return await this.datasetCommandService.upsertDatasetCodeQuery(
      dto.datasetId,
      dto.type,
      dto.name,
      dto.queryName,
      dto.sql,
    );
  }

  @Delete("dashboard-code-query")
  async deleteDatasetCodeQuery(
    @Query("datasetId") datasetId: string,
    @Query("type") type: string,
    @Query("name") name: string,
    @Query("queryName") queryName: string,
  ) {
    return await this.datasetCommandService.deleteDatasetCodeQuery(
      datasetId,
      type,
      name,
      queryName,
    );
  }

  @Get("dashboard-codes")
  async getDatasetCodeWithQueries(
    @Query("datasetId") datasetId: string,
    @Query("type") type: string,
  ) {
    return await this.datasetQueryService.getDatasetCodeWithQueries(
      datasetId,
      type,
    );
  }

  @Put("update-database-code")
  async updateDatabaseCode(
    @Body() body: { datasetId: string; databaseCode: string },
  ) {
    return await this.datasetCommandService.updateDatabaseCode(
      body.datasetId,
      body.databaseCode,
    );
  }
}
