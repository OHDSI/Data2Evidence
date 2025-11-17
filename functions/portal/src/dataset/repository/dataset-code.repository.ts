import { Inject, Injectable } from "@danet/core";
import { Repository } from "npm:typeorm";
import { DATABASE } from "../../database/module.ts";
import { PostgresService } from "../../database/postgres.service.ts";
import { DatasetCode } from "../entity/dataset-code.entity.ts";

@Injectable()
export class DatasetCodeRepository extends Repository<DatasetCode> {
  constructor(@Inject(DATABASE) postgresService: PostgresService) {
    const dataSource = postgresService.getDataSource();
    if (!dataSource || !dataSource.manager) {
      throw new Error("DataSource or DataSource.manager is undefined");
    }
    super(DatasetCode, dataSource.manager);
  }

  async getDatasetCode(datasetId: string, type: string) {
    return await this.createQueryBuilder("dataset_code")
      .where("dataset_code.datasetId = :datasetId", { datasetId })
      .andWhere("dataset_code.type = :type", { type })
      .getOne();
  }
}
