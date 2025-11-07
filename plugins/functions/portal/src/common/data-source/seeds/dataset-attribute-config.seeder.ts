import { DataSource } from "npm:typeorm";
import { Seeder } from "./seeder.ts";

import { DatasetAttributeConfig } from "../../../dataset/entity/index.ts";
import {
  ATTRIBUTE_CONFIG_CATEGORIES,
  ATTRIBUTE_CONFIG_DATA_TYPES,
} from "../../const.ts";

export default class DatasetAttributeConfigSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repository = dataSource.getRepository(DatasetAttributeConfig);

    // Only run seeder if dataset_attribute_config table is empty
    const result = await repository
      .createQueryBuilder("attribute_config")
      .getMany();
    if (result.length > 0) {
      return;
    }

    const entities = repository.create([
      {
        id: "publisher",
        name: "Publisher",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.STRING,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "hosting_institutions",
        name: "Hosting institutions",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.STRING,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "version",
        name: "Version",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.STRING,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "schema_version",
        name: "Schema Version",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.STRING,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "latest_schema_version",
        name: "Latest Available Schema Version",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.STRING,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "created_date",
        name: "Created date",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.TIMESTAMP,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "updated_date",
        name: "Updated date",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.TIMESTAMP,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "data_ingestion_date",
        name: "Data Ingestion Date",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.TIMESTAMP,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "metadata_last_fetch_date",
        name: "Metadata Last Fetched Date",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.TIMESTAMP,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "start_date",
        name: "Start date",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.TIMESTAMP,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "end_date",
        name: "End date",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.TIMESTAMP,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "source_dataset_id",
        name: "Source Dataset Id",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.STRING,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "source_dataset_name",
        name: "Source Dataset Name",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.STRING,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "patient_count",
        name: "Patient Count",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.NUMBER,
        isDisplayed: true,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "entity_count",
        name: "Entity Count",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.NUMBER,
        isDisplayed: false,
        createdBy: "system",
        modifiedBy: "system",
      },
      {
        id: "entity_count_distribution",
        name: "Entity Count Distribution",
        category: ATTRIBUTE_CONFIG_CATEGORIES.DATASET,
        dataType: ATTRIBUTE_CONFIG_DATA_TYPES.STRING,
        isDisplayed: false,
        createdBy: "system",
        modifiedBy: "system",
      },
    ]);
    await repository.save(entities);
  }
}
