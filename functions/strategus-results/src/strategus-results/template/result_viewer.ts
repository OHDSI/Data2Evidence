export const RESULT_VIEWER_TEMPLATE = `
library(ShinyAppBuilder)
library(OhdsiShinyModules)

resultsDatabaseSchema <- $DATABASE_SCHEMA
resultsConnectionDetails <- DatabaseConnector::createConnectionDetails(
  dbms = "postgresql",
  server = $DATABASE_SERVER,
  user = $DATABASE_USER,
  password = $DATABASE_PASSWORD
)\n`;
