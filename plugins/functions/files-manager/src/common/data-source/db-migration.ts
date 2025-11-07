import migrationDataSource from "./migration-data-source";

export const runMigrations = async () => {
  const logger = console;

  try {
    logger.info("Running files-manager migrations...");
    await migrationDataSource.initialize();
    await migrationDataSource.runMigrations();
    logger.info("~~~ Migrations files-manager completed! ~~~");
  } catch (err) {
    logger.error("files-manager migrations has failed!", err);
    process.exit(0);
  }
};
