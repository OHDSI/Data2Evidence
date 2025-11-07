import { DataSource } from "npm:typeorm";
import { createLogger } from "../../../logger.ts";
import ConfigSeeder from "./config.seeder.ts";
import DatasetAttributeConfigSeeder from "./dataset-attribute-config.seeder.ts";
import UserArtifactSeeder from "./user-artifact.seeder.ts";
import DatasetTagConfigSeeder from "./dataset-tag-config.seeder.ts";

export interface Seeder {
  run(dataSource: DataSource): Promise<void>;
}

// Create a seeder registry
const seeders: Seeder[] = [
  new ConfigSeeder(),
  new DatasetAttributeConfigSeeder(),
  new UserArtifactSeeder(),
  new DatasetTagConfigSeeder(),
];

export const runSeeders = async (dataSource: DataSource) => {
  const logger = createLogger("seeder");

  try {
    logger.info("Running seeders...");

    for (const seeder of seeders) {
      try {
        await seeder.run(dataSource);
        logger.info(`Seeder ${seeder.constructor.name} completed`);
      } catch (error) {
        logger.error(`Seeder ${seeder.constructor.name} failed:`, error);
        throw error;
      }
    }

    logger.info("All seeders completed successfully");
  } catch (error) {
    logger.error("Seeding failed:", error);
    throw error;
  }
};