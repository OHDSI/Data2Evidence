export const RESULT_VIEWER_TEMPLATE = `
library(OhdsiShinyAppBuilder)
library(OhdsiShinyModules)
library(shiny)
library(future)

resultsDatabaseSchema <- "$DATABASE_SCHEMA"

# Specify the connection to the results database
resultsConnectionDetails <- DatabaseConnector::createConnectionDetails(
  dbms = "postgresql",
  server = "$DATABASE_SERVER",
  user = "$DATABASE_USER",
  password = "$DATABASE_PASSWORD",
  pathToDriver = "/app/inst/drivers"
)

resultsConnectionDetails$finalize <- function() {
  try(DatabaseConnector::disconnect(connection), silent = TRUE)
}

# ADD OR REMOVE MODULES TAILORED TO YOUR STUDY
shinyConfig <- initializeModuleConfig() |>
  addModuleConfig(
    createDefaultAboutConfig()
  )  |>
  addModuleConfig(
    createDefaultDatasourcesConfig()
  )  |>
  addModuleConfig(
    createDefaultCohortGeneratorConfig()
  ) |>
  addModuleConfig(
    createDefaultCohortDiagnosticsConfig()
  ) |>
  addModuleConfig(
    createDefaultCharacterizationConfig()
  ) |>
  addModuleConfig(
    createDefaultPredictionConfig()
  ) |>
  addModuleConfig(
    createDefaultEstimationConfig()
  ) 

# now create the shiny app based on the config file and view the results
# based on the connection 
app <- OhdsiShinyAppBuilder::createShinyApp(
  config = shinyConfig, 
  connection = resultsConnectionDetails,
  resultDatabaseSettings = createDefaultResultDatabaseSettings(schema = resultsDatabaseSchema)
)

# Run the app in the background so the kernel execution can complete
plan(multisession)
future({
  shiny::runApp(app, host = "0.0.0.0", port = 3838)
})

cat("Shiny app started on http://0.0.0.0:3838")`;
