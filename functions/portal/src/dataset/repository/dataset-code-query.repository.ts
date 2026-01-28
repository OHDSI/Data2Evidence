import { Inject, Injectable } from "@danet/core";
import { Repository } from "npm:typeorm";
import { DATABASE } from "../../database/module.ts";
import { PostgresService } from "../../database/postgres.service.ts";
import { DatasetCodeQuery } from "../entity/dataset-code-query.entity.ts";

@Injectable()
export class DatasetCodeQueryRepository extends Repository<DatasetCodeQuery> {
  constructor(@Inject(DATABASE) postgresService: PostgresService) {
    const dataSource = postgresService.getDataSource();
    if (!dataSource || !dataSource.manager) {
      throw new Error("DataSource or DataSource.manager is undefined");
    }
    super(DatasetCodeQuery, dataSource.manager);
  }

  async getDatasetCodeQuery(
    datasetId: string,
    type: string,
    name: string,
  ): Promise<DatasetCodeQuery | null> {
    return await this.createQueryBuilder("dataset_code_query")
      .where("dataset_code_query.datasetId = :datasetId", { datasetId })
      .andWhere("dataset_code_query.type = :type", { type })
      .andWhere("dataset_code_query.name = :name", { name })
      .getOne();
  }

  async upsertDatasetCodeQuery(
    datasetId: string,
    type: string,
    name: string,
    sql: string,
    userId: string,
  ): Promise<DatasetCodeQuery> {
    const existingQuery = await this.getDatasetCodeQuery(datasetId, type, name);

    if (existingQuery) {
      existingQuery.sql = sql;
      existingQuery.modifiedBy = userId;
      return await this.save(existingQuery);
    }

    const query = this.create({
      datasetId,
      type,
      name,
      sql,
      createdBy: userId,
      modifiedBy: userId,
    });
    return await this.save(query);
  }
}
