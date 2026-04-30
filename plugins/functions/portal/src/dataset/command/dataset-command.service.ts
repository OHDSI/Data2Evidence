import { HttpException, Injectable, SCOPE } from "@danet/core";
import { EntityManager, In } from "npm:typeorm";
import { v4 as uuidv4 } from "uuid";
import { TransactionRunner } from "../../common/data-source/transaction-runner.ts";
import { RequestContextService } from "../../common/request-context.service.ts";
import { getDbCredentialsByCode } from "../../env.ts";
import { createLogger } from "../../logger.ts";
import { TenantService } from "../../tenant/tenant.service.ts";
import {
  IDatasetAttribute,
  IDatasetAttributeDto,
  IDatasetDashboardBaseDto,
  IDatasetDetailBaseDto,
  IDatasetDetailMetadataUpdateDto,
  IDatasetDto,
  IDatasetReleaseDto,
  IDatasetSnapshotDto,
} from "../../types.d.ts";
import { WebApiSourceService } from "../../webapi/webapi-source.service.ts";
import { Dataset, DatasetDetail, DatasetTag } from "../entity/index.ts";
import {
  DatasetAttributeRepository,
  DatasetCodeQueryRepository,
  DatasetCodeRepository,
  DatasetDashboardRepository,
  DatasetDetailRepository,
  DatasetReleaseRepository,
  DatasetRepository,
  DatasetTagRepository,
} from "../repository/index.ts";

const SWAP_TO = {
  STUDY: ["dataset", "study"],
  DATASET: ["study", "dataset"],
};

@Injectable({ scope: SCOPE.REQUEST })
export class DatasetCommandService {
  private readonly userId: string;
  private readonly logger = createLogger(this.constructor.name);

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly tenantService: TenantService,
    private readonly datasetRepo: DatasetRepository,
    private readonly releaseRepo: DatasetReleaseRepository,
    private readonly detailRepo: DatasetDetailRepository,
    private readonly dashboardRepo: DatasetDashboardRepository,
    private readonly attributeRepo: DatasetAttributeRepository,
    private readonly tagRepo: DatasetTagRepository,
    private readonly datasetCodeRepo: DatasetCodeRepository,
    private readonly datasetCodeQueryRepo: DatasetCodeQueryRepository,
    private readonly requestContextService: RequestContextService,
    private readonly webApiSourceService: WebApiSourceService,
  ) {
    this.userId = this.requestContextService.getAuthToken()?.sub;
  }

  async createDataset(datasetDto: IDatasetDto) {
    const createDatasetFn = async (
      entityMgr: EntityManager,
      datasetDto: IDatasetDto,
    ) => {
      const tenant = this.tenantService.getTenant();
      if (datasetDto.tenantId !== tenant.id) {
        throw new HttpException(
          400,
          `Invalid tenantId ${datasetDto.tenantId} provided`,
        );
      }
      // if the dialect is hana, vocabSchemaName and resultsSchemaName are required to be in uppercase due to HANA's case sensitivity
      if (datasetDto.dialect === "hana") {
        datasetDto.vocabSchemaName = datasetDto.vocabSchemaName?.toUpperCase();
        datasetDto.resultsSchemaName = datasetDto.resultsSchemaName?.toUpperCase();
      }
      const { detail, dashboards, attributes, tags, ...dataset } = datasetDto;
      const { id } = dataset;

      const entity = this.datasetRepo.create(
        this.swapVariables<Dataset>(dataset, SWAP_TO.DATASET),
      );
      const result = await this.datasetRepo.insertDataset(
        entityMgr,
        this.addOwner(entity, true),
      );

      const detailEntity = this.detailRepo.create({
        id: uuidv4(),
        datasetId: id,
        ...this.addOwner(detail, true),
      });

      await this.detailRepo.insertDetail(entityMgr, detailEntity);

      dashboards.forEach(async (dashboard) => {
        const dashboardEntity = this.dashboardRepo.create({
          id: uuidv4(),
          datasetId: id,
          ...this.addOwner(dashboard, true),
        });
        await this.dashboardRepo.insertDashboard(entityMgr, dashboardEntity);
      });

      attributes.forEach(async (attribute) => {
        const attributeEntity = this.attributeRepo.create({
          datasetId: id,
          ...this.addOwner(attribute, true),
        });
        await this.attributeRepo.insertAttribute(entityMgr, attributeEntity);
      });

      tags.forEach(async (tag) => {
        const tagEntity = this.tagRepo.create({
          datasetId: id,
          name: tag,
        });
        await this.tagRepo.insertTag(entityMgr, this.addOwner(tagEntity, true));
      });

      return result;
    };
    // First sync to WebAPI - fail fast if WebAPI is not accessible
    await this.syncDatasetToWebApi({
      id: datasetDto.id,
      databaseCode: datasetDto.databaseCode,
      dialect: datasetDto.dialect,
      schemaName: datasetDto.schemaName,
      vocabSchemaName: datasetDto.vocabSchemaName,
      resultSchemaName: datasetDto.resultSchemaName,
    }, datasetDto.detail);

    // Then create dataset in database
    const result = await this.transactionRunner.run(createDatasetFn, datasetDto);

    return result;
  }

  async createRelease(datasetReleaseDto: IDatasetReleaseDto) {
    const createReleaseFn = async (
      entityMgr: EntityManager,
      datasetReleaseDto: IDatasetReleaseDto,
    ) => {
      const entity = this.releaseRepo.create(datasetReleaseDto);
      const existingRecord =
        await this.releaseRepo.getReleaseByDatasetIdAndName(
          entity.datasetId,
          entity.name,
        );
      if (existingRecord.length > 0) {
        throw new HttpException(
          400,
          `Dataset with release name '${entity.name}' already exists`,
        );
      }
      const result = await this.releaseRepo.insertRelease(
        entityMgr,
        this.addOwner(entity, true),
      );

      return result;
    };
    return this.transactionRunner.run(createReleaseFn, datasetReleaseDto);
  }

  async offboardDataset(id: string) {
    const deleteDatasetFn = async (entityMgr: EntityManager, id: string) => {
      const result = await entityMgr.getRepository(Dataset).delete(id);
      if (result.affected === 0) {
        throw new HttpException(400, `Invalid dataset ID provided: ${id}`);
      } else {
        return {
          id,
        };
      }
    };
    const result = await this.transactionRunner.run(deleteDatasetFn, id);

    // Delete from WebAPI (fire-and-forget, don't block dataset deletion)
    const authToken = this.requestContextService.getOriginalToken();
    if (authToken) {
      this.webApiSourceService.deleteSourceForDataset(id, authToken)
        .catch((err) => this.logger.error(`WebAPI delete failed for ${id}: ${err}`));
    }

    return result;
  }

  async createDatasetSnapshot(snapshotDto: IDatasetSnapshotDto) {
    // Cache/snapshot datasets do NOT create WebAPI sources - they use the source dataset's WebAPI source
    // The TrexSQL cache is created for the source dataset, not for snapshots

    const createSnapshotFn = async (
      entityMgr: EntityManager,
      snapshotDto: IDatasetSnapshotDto,
    ) => {
      const {
        id: snapshotId,
        sourceDatasetId,
        newDatasetName,
        schemaName,
        vocabSchemaName: newVocabSchemaName,
        resultsSchemaName: newResultsSchemaName,
        timestamp,
        type: newType,
        flowParameters,
      } = snapshotDto;
      const sourceDataset = await this.datasetRepo.getDataset(sourceDatasetId);
      if (!sourceDataset) {
        throw new HttpException(
          400,
          `Dataset with id ${sourceDatasetId} not found`,
        );
      }

      const {
        tenantId,
        databaseCode,
        vocabSchemaName: sourceVocabSchemaName,
        resultsSchemaName: sourceResultsSchemaName,
        tokenDatasetCode,
        paConfigId,
        dataModel,
        dialect,
        plugin,
      } = sourceDataset;

      // Sanitize the new dataset name to create a valid token dataset code
      const sanitizedName = newDatasetName
        .trim()
        .replace(/[^a-zA-Z0-9_]/g, "_") // Replace invalid characters with underscore
        .replace(/_+/g, "_") // Replace multiple underscores with single underscore
        .replace(/^_+|_+$/g, ""); // Remove leading/trailing underscores

      const newTokenDatasetCode =
        `${tokenDatasetCode}_dm_${sanitizedName}`.substring(0, 80);

      // Copy dataset with new schema name

      // Use provided schema names from request, or fall back to source dataset schema names
      const finalVocabSchemaName = newVocabSchemaName || sourceVocabSchemaName;
      const finalResultsSchemaName =
        newResultsSchemaName || sourceResultsSchemaName;

      const datasetSnapshot: Partial<Dataset> = {
        id: snapshotId,
        type: newType,
        tenantId,
        databaseCode,
        dialect,
        schemaName,
        vocabSchemaName: finalVocabSchemaName,
        resultsSchemaName: finalResultsSchemaName,
        tokenDatasetCode: newTokenDatasetCode,
        paConfigId,
        dataModel,
        plugin,
        sourceDatasetId,
        visibilityStatus: "DEFAULT",
        flowParameters: flowParameters ?? null,
      };
      this.logger.info(
        `Create dataset snapshot with id ${snapshotId} from source dataset ${sourceDatasetId}`,
      );
      const datasetEntity = this.datasetRepo.create(datasetSnapshot);
      const newDatasetResult = await this.datasetRepo.insertDataset(
        entityMgr,
        this.addOwner(datasetEntity, true),
      );

      // Copy dataset detail with new dataset name
      const sourceDatasetDetail =
        await this.detailRepo.getDetail(sourceDatasetId);
      const datasetDetail: DatasetDetail = {
        ...sourceDatasetDetail,
        id: uuidv4(),
        datasetId: snapshotId,
        name: newDatasetName,
      };
      this.logger.info(`Copy dataset detail: ${newDatasetName}`);
      await this.detailRepo.insertDetail(
        entityMgr,
        this.addOwner(datasetDetail, true),
      );

      // Create version attribute
      const version = String(timestamp.valueOf());
      const newVersionAttribute: IDatasetAttribute = {
        attributeId: "version",
        // Unix timestamp
        value: version,
      };
      await this.addCustomAttribute(entityMgr, snapshotId, newVersionAttribute);

      // Create source dataset id attribute
      const newDatasetIdAttribute: IDatasetAttribute = {
        attributeId: "source_dataset_id",
        value: sourceDatasetId,
      };
      await this.addCustomAttribute(
        entityMgr,
        snapshotId,
        newDatasetIdAttribute,
      );

      // Create source dataset name attribute
      const newDatasetNameAttribute: IDatasetAttribute = {
        attributeId: "source_dataset_name",
        value: sourceDatasetDetail.name,
      };
      await this.addCustomAttribute(
        entityMgr,
        snapshotId,
        newDatasetNameAttribute,
      );

      // Copy dataset attribute (excluding the ones inserted previously)
      const sourceDatasetAttributes =
        await this.attributeRepo.getAttributeDto(sourceDatasetId);
      const existingAttributes = await this.attributeRepo.getAttributeDto(
        snapshotId,
        entityMgr,
      );
      const existingAttributeIds = existingAttributes.map(
        (att) => att.attributeId,
      );

      for (const attribute of sourceDatasetAttributes.filter(
        (att) => !existingAttributeIds.includes(att.attributeId),
      )) {
        this.logger.info(`Copy dataset attribute: ${attribute.attributeId}`);
        const newAttributes = this.attributeRepo.createAttribute(
          snapshotId,
          attribute,
        );
        await this.attributeRepo.insertAttribute(
          entityMgr,
          this.addOwner(newAttributes, true),
        );
      }

      // Copy dataset tags
      const sourceDatasetTags = await this.tagRepo.getTags(sourceDatasetId);
      for (const datasetTag of sourceDatasetTags) {
        const newTag: Partial<DatasetTag> = {
          datasetId: snapshotId,
          name: datasetTag.name,
        };
        this.logger.info(`Copy dataset tag: ${datasetTag.name}`);
        await this.tagRepo.insertTag(entityMgr, this.addOwner(newTag, true));
      }

      return newDatasetResult;
    };

    const result = await this.transactionRunner.run(createSnapshotFn, snapshotDto);
    return result;
  }

  async updateDatasetDetailMetadata(
    datasetDetailMetadataUpdateDto: IDatasetDetailMetadataUpdateDto,
  ) {
    const updateDatasetDetailMetadataFn = async (
      entityMgr: EntityManager,
      datasetUpdateDto: IDatasetDetailMetadataUpdateDto,
    ) => {
      const {
        id: datasetId,
        detail,
        dashboards,
        tags,
        attributes,
      } = datasetUpdateDto;

      await this.updateDataset(entityMgr, datasetUpdateDto);
      await this.updateDatasetDetail(entityMgr, datasetId, detail);
      await this.updateDatasetDashboards(entityMgr, datasetId, dashboards);
      await this.updateDatasetTags(entityMgr, datasetId, tags);
      await this.updateDatasetAttributes(entityMgr, datasetId, attributes);

      return {
        id: datasetId,
      };
    };
    return this.transactionRunner.run(
      updateDatasetDetailMetadataFn,
      datasetDetailMetadataUpdateDto,
    );
  }

  private async updateDataset(
    entityMgr: EntityManager,
    datasetUpdateDto: IDatasetDetailMetadataUpdateDto,
  ) {
    const {
      id: datasetId,
      type,
      tokenDatasetCode,
      paConfigId,
      visibilityStatus,
      fhir_project_id,
      vocabSchemaName,
      resultsSchemaName,
    } = datasetUpdateDto;

    const currDataset = await this.datasetRepo.getDataset(datasetId);

    if (!currDataset) {
      throw new HttpException(400, `Dataset with id ${datasetId} not found`);
    }
    const dataset: Partial<Dataset> = {
      ...currDataset,
      type,
      tokenDatasetCode,
      visibilityStatus,
      paConfigId,
      fhir_project_id,
    };

    if (vocabSchemaName !== undefined) {
      dataset.vocabSchemaName = vocabSchemaName;
      if (dataset.dialect === "hana") {
        dataset.vocabSchemaName = dataset.vocabSchemaName?.toUpperCase();
      }
    }

    if (resultsSchemaName !== undefined) {
      dataset.resultsSchemaName = resultsSchemaName;
      if (dataset.dialect === "hana") {
        dataset.resultsSchemaName = dataset.resultsSchemaName?.toUpperCase();
      }
    }

    await this.datasetRepo.updateDataset(
      entityMgr,
      datasetId,
      this.addOwner(dataset),
    );
  }

  private async updateDatasetDetail(
    entityMgr: EntityManager,
    datasetId: string,
    detail: IDatasetDetailBaseDto,
  ) {
    const detailEntity = await entityMgr
      .getRepository(DatasetDetail)
      .findOne({ where: { datasetId } });

    if (detailEntity) {
      await entityMgr
        .getRepository(DatasetDetail)
        .update({ datasetId }, this.addOwner(detail));
    } else {
      throw new HttpException(
        400,
        `Dataset detail with datasetId ${datasetId} not found`,
      );
    }
  }

  private async updateDatasetDashboards(
    entityMgr: EntityManager,
    datasetId: string,
    dashboards: IDatasetDashboardBaseDto[],
  ) {
    const { deletedDashboards, newDashboards } =
      await this.filterDashboardChanges(datasetId, dashboards);
    for (const dashboard of deletedDashboards) {
      const { name, url, basePath } = dashboard;
      this.logger.debug(`Delete dataset ${datasetId} dashboard: ${name}`);
      await this.dashboardRepo.deleteDashboard(entityMgr, {
        name,
        url,
        basePath,
      });
    }
    for (const dashboard of newDashboards) {
      const entity = this.dashboardRepo.create({
        datasetId,
        ...dashboard,
        id: uuidv4(),
      });
      this.logger.debug(
        `Create dataset ${datasetId} dashboard ${JSON.stringify(entity)}`,
      );
      await this.dashboardRepo.insertDashboard(
        entityMgr,
        this.addOwner(entity, true),
      );
    }
  }

  private async updateDatasetTags(
    entityMgr: EntityManager,
    datasetId: string,
    tags: string[],
  ) {
    const tagChanges = await this.filterTagChanges(datasetId, tags);
    if (tagChanges.deletedTags) {
      this.logger.debug(
        `Delete dataset ${datasetId} tags: ${JSON.stringify(tagChanges.deletedTags)}`,
      );
      await this.tagRepo.deleteTag(entityMgr, {
        datasetId,
        name: In(tagChanges.deletedTags),
      });
    }
    for (const tag of tagChanges.newTags) {
      const newDatasetTag: Partial<DatasetTag> = {
        datasetId,
        name: tag,
      };
      this.logger.debug(`Create dataset ${datasetId} tag ${tag}`);
      await this.tagRepo.insertTag(
        entityMgr,
        this.addOwner(newDatasetTag, true),
      );
    }
  }

  private async updateDatasetAttributes(
    entityMgr: EntityManager,
    datasetId: string,
    attributes: IDatasetAttribute[],
  ) {
    const { deletedAttributes, newAttributes } =
      await this.filterAttributeChanges(datasetId, attributes);
    for (const attribute of deletedAttributes) {
      const criteria = this.attributeRepo.createAttribute(datasetId, attribute);
      this.logger.debug(
        `Delete dataset ${datasetId} attribute: ${JSON.stringify(criteria)}`,
      );
      await this.attributeRepo.deleteAttribute(entityMgr, criteria);
    }
    for (const attribute of newAttributes) {
      const entity = this.attributeRepo.createAttribute(datasetId, attribute);
      this.logger.debug(
        `Create dataset ${datasetId} attribute ${JSON.stringify(entity)}`,
      );
      await this.attributeRepo.insertAttribute(
        entityMgr,
        this.addOwner(entity, true),
      );
    }
  }

  async updateDatabaseCode(datasetId: string, databaseCode: string) {
    const currDataset = await this.datasetRepo.getDataset(datasetId);

    if (!currDataset) {
      throw new HttpException(400, `Dataset with id ${datasetId} not found`);
    }

    const dataset: Partial<Dataset> = {
      ...currDataset,
      databaseCode,
    };

    const entityMgr = (this.datasetRepo as any).manager as EntityManager;

    await this.datasetRepo.updateDataset(
      entityMgr,
      datasetId,
      this.addOwner(dataset),
    );

    return { id: datasetId };
  }

  async updateDatasetAttribute(datasetAttributeDto: IDatasetAttributeDto) {
    const updateAttributeFn = async (
      _entityMgr: EntityManager,
      datasetAttributeDto: IDatasetAttributeDto,
    ) => {
      const { studyId: datasetId } = datasetAttributeDto;
      const attribute = await this.attributeRepo.getDatasetAttribute(
        datasetId,
        datasetAttributeDto.attributeId,
      );
      const isNewEntity = !attribute;

      const dataAttributeEntity = this.addOwner(
        this.attributeRepo.createAttribute(datasetId, datasetAttributeDto),
        isNewEntity,
      );

      // Add previous user to created entity if is not new entity
      if (!isNewEntity) {
        dataAttributeEntity.createdBy = attribute.createdBy;
      }

      const result = await this.attributeRepo.upsert(dataAttributeEntity, [
        "datasetId",
        "attributeId",
      ]);
      return result.identifiers[0].id;
    };

    return this.transactionRunner.run(updateAttributeFn, datasetAttributeDto);
  }

  async updateDatasetDashboardCode(
    datasetId: string,
    code: string,
    type: string = "dashboard",
    name: string = "",
    language?: string,
  ) {
    const updateDashboardCodeFn = async (
      _entityMgr: EntityManager,
      dto: {
        datasetId: string;
        code: string;
        type: string;
        name: string;
        language?: string;
      },
    ) => {
      const datasetCode = await this.datasetCodeRepo.getDatasetCode(
        dto.datasetId,
        dto.type,
        dto.name,
      );
      const isNewEntity = !datasetCode;

      const datasetCodeEntity = this.addOwner(
        this.datasetCodeRepo.create({
          datasetId: dto.datasetId,
          type: dto.type,
          code: dto.code,
          name: dto.name,
          language: dto.language,
        }),
        isNewEntity,
      );

      // Add previous user to created entity if is not new entity
      if (!isNewEntity) {
        datasetCodeEntity.createdBy = datasetCode.createdBy;
      }

      const result = await this.datasetCodeRepo.upsert(datasetCodeEntity, [
        "datasetId",
        "type",
        "name",
      ]);
      return result.identifiers[0].id;
    };

    return this.transactionRunner.run(updateDashboardCodeFn, {
      datasetId,
      code,
      type,
      name,
      language,
    });
  }

  async upsertDatasetCodeQuery(
    datasetId: string,
    type: string,
    name: string,
    queryName: string,
    sql: string,
  ) {
    const upsertCodeQueryFn = async (
      _entityMgr: EntityManager,
      dto: {
        datasetId: string;
        type: string;
        name: string;
        queryName: string;
        sql: string;
      },
    ) => {
      const result = await this.datasetCodeQueryRepo.upsertDatasetCodeQuery(
        dto.datasetId,
        dto.type,
        dto.name,
        dto.queryName,
        dto.sql,
        this.userId,
      );
      return result.id;
    };

    return this.transactionRunner.run(upsertCodeQueryFn, {
      datasetId,
      type,
      name,
      queryName,
      sql,
    });
  }

  async deleteDatasetCodeQuery(
    datasetId: string,
    type: string,
    name: string,
    queryName: string,
  ) {
    return await this.datasetCodeQueryRepo.deleteDatasetCodeQuery(
      datasetId,
      type,
      name,
      queryName,
    );
  }

  private async addCustomAttribute(
    entityMgr: EntityManager,
    datasetId: string,
    customAttribute: IDatasetAttribute,
  ) {
    const { attributeId, value } = customAttribute;
    this.logger.info(`Create ${attributeId} attribute: ${value}`);
    const entity = this.attributeRepo.createAttribute(
      datasetId,
      customAttribute,
    );
    await this.attributeRepo.insertAttribute(
      entityMgr,
      this.addOwner(entity, true),
    );
  }

  private swapVariables<T>(object: any, swapPair: string[]) {
    const from = swapPair[0];
    const to = swapPair[1];
    const fromCapitalised = from.charAt(0).toUpperCase() + from.slice(1);
    for (const key in object) {
      if (key.includes(from)) {
        const newKey = key.replace(from, to);
        object[newKey] = object[key];
        delete object[key];
      } else if (key.includes(fromCapitalised)) {
        const toCapitalised = to.charAt(0).toUpperCase() + to.slice(1);
        const newKey = key.replace(fromCapitalised, toCapitalised);
        object[newKey] = object[key];
        delete object[key];
      }
    }
    return <T>object;
  }

  private addOwner<T>(object: T, isNewEntity = false) {
    if (isNewEntity) {
      return {
        ...object,
        createdBy: this.userId,
        modifiedBy: this.userId,
      };
    }
    return {
      ...object,
      modifiedBy: this.userId,
    };
  }

  private async filterAttributeChanges(
    datasetId: string,
    attributes: IDatasetAttribute[],
  ): Promise<{ [key: string]: IDatasetAttribute[] }> {
    const currDatasetAttributes =
      await this.attributeRepo.getAttributeDto(datasetId);
    const currAttributes = currDatasetAttributes.reduce<IDatasetAttribute[]>(
      (acc, currDatasetAttribute) => {
        const { studyId: _studyId, ...customAttribute } = currDatasetAttribute;
        acc.push(customAttribute);
        return acc;
      },
      [],
    );

    const isSameAttribute = (a: IDatasetAttribute, b: IDatasetAttribute) =>
      a.attributeId === b.attributeId && a.value === b.value;

    const deletedAttributes =
      this.onlyInLeft<IDatasetAttribute>(
        currAttributes,
        attributes,
        isSameAttribute,
      ) || [];
    const newAttributes =
      this.onlyInLeft<IDatasetAttribute>(
        attributes,
        currAttributes,
        isSameAttribute,
      ) || [];

    return {
      deletedAttributes,
      newAttributes,
    };
  }

  private async filterTagChanges(
    datasetId,
    tags,
  ): Promise<{ [key: string]: string[] }> {
    const currDatasetTags = await this.tagRepo.getTags(datasetId);
    const currTags = currDatasetTags.map((datasetTag) => datasetTag.name);
    const [remainingTags, deletedTags] = currTags.reduce(
      ([remainingTags, deletedTags], tag) => {
        return tags.includes(tag)
          ? [[...remainingTags, tag], deletedTags]
          : [remainingTags, [...deletedTags, tag]];
      },
      [[], []],
    );
    const newTags = tags.filter((tag) => !remainingTags.includes(tag));
    return {
      deletedTags,
      newTags,
    };
  }

  private async filterDashboardChanges(
    datasetId: string,
    dashboards: IDatasetDashboardBaseDto[],
  ): Promise<{ [key: string]: IDatasetDashboardBaseDto[] }> {
    const currDashboards = await this.dashboardRepo.find({
      where: { datasetId },
    });

    const isSameDashboard = (
      a: IDatasetDashboardBaseDto,
      b: IDatasetDashboardBaseDto,
    ) => a.name === b.name && a.url === b.url && a.basePath === b.basePath;

    const deletedDashboards =
      this.onlyInLeft<IDatasetDashboardBaseDto>(
        currDashboards,
        dashboards,
        isSameDashboard,
      ) || [];
    const newDashboards =
      this.onlyInLeft<IDatasetDashboardBaseDto>(
        dashboards,
        currDashboards,
        isSameDashboard,
      ) || [];

    return {
      deletedDashboards,
      newDashboards,
    };
  }

  private onlyInLeft<T>(
    left: T[],
    right: T[],
    compareFunction: (a: T, b: T) => boolean,
  ) {
    return left.filter(
      (leftItems) =>
        !right.some((rightItems) => compareFunction(leftItems, rightItems)),
    );
  }

  private async syncDatasetToWebApi(
    datasetInfo: {
      id: string;
      databaseCode: string;
      dialect?: string;
      schemaName?: string;
      vocabSchemaName?: string;
      resultSchemaName?: string;
    },
    detail: DatasetDetail | { name: string },
  ): Promise<void> {
    const dbCredentials = getDbCredentialsByCode(datasetInfo.databaseCode);
    if (!dbCredentials) {
      throw new HttpException(400, `No database credentials found for ${datasetInfo.databaseCode}`);
    }

    const authToken = this.requestContextService.getOriginalToken();
    if (!authToken) {
      throw new HttpException(401, "No auth token available for WebAPI sync");
    }

    const dataset = {
      id: datasetInfo.id,
      dialect: datasetInfo.dialect,
      schemaName: datasetInfo.schemaName,
      vocabSchemaName: datasetInfo.vocabSchemaName,
      resultSchemaName: datasetInfo.resultSchemaName,
    } as Dataset;

    const detailEntity = "datasetId" in detail
      ? detail as DatasetDetail
      : { name: detail.name } as DatasetDetail;

    try {
      await this.webApiSourceService.syncSourceForDataset(dataset, detailEntity, dbCredentials, authToken);
    } catch (err) {
      this.logger.error(`WebAPI sync failed for ${datasetInfo.id}: ${err}`);
      throw new HttpException(502, `Failed to create WebAPI source: ${err}`);
    }
  }
}
