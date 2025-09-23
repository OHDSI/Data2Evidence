export const RESULT_VIEWER_TEMPLATE = `library(OhdsiShinyAppBuilder)
library(OhdsiShinyModules)
library(shiny)
library(future)
library(TreatmentPatterns)
library(CohortSurvival)

resultsDatabaseSchema <- "$DATABASE_SCHEMA"

# Specify the connection to the results database
resultsConnectionDetails <- DatabaseConnector::createConnectionDetails(
  dbms = "postgresql",
  connectionString="$DATABASE_CONNECTION_STRING",
  user = "$DATABASE_USER",
  password = "$DATABASE_PASSWORD",
  pathToDriver = "/app/inst/drivers"
)

# Test database connection before starting
tryCatch({
  conn <- DatabaseConnector::connect(resultsConnectionDetails)
  cat("Database connection successful\n")
  DatabaseConnector::disconnect(conn)
}, error = function(e) {
  cat("Database connection failed:", e$message, "\n")
})

########### Treatment Patterns module ##############################
patternsModuleUI <- function(id) {
  ns <- NS(id)  # Namespace for the module
  fluidPage(
    # Dropdown to choose a dataset or option
    selectInput(
      inputId = ns("dataset"),      # namespaced ID
      label   = "Choose a dataset", # label shown to user
      choices = NULL
    ),
    # Sunburst diagram output
    sunburstR::sunburstOutput(ns("sunburst"))
  )
}

patternsModuleServer <- function(id, resultDatabaseSettings, connectionHandler) {
  moduleServer(id, function(input, output, session) {
    dataset_choices <- reactive({
      conn <- connectionHandler$getConnection()
      res <- DatabaseConnector::querySql(
        conn,
        paste0(
          "SELECT DISTINCT DATABASE_ID
              FROM ", resultsDatabaseSchema, ".tp_metadata"
        )
      )
      return(res$DATABASE_ID)
    })
    observeEvent(dataset_choices(), {
      updateSelectInput(
        session,
        inputId = "dataset",
        choices = dataset_choices(),
        selected = dataset_choices()[1]
      )
    })
    
    output$sunburst <- sunburstR::renderSunburst({
      req(input$dataset)  # Wait for dataset to be selected
      conn <- connectionHandler$getConnection()
      tp_data <- DatabaseConnector::querySql(
          conn,
          paste0(
          "SELECT pathway, freq, index_year, age, sex
              FROM ", resultsDatabaseSchema, ".tp_treatment_pathways
              WHERE database_id = '", input$dataset, "'"
          )
      )
      colnames(tp_data) <- tolower(colnames(tp_data))
      createSunburstPlot(tp_data)
    })
  })
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
  ) |>
  addModuleConfig(
    createModuleConfig(
      moduleId = 'patterns',
      tabName = "TreatmentPatterns",
      shinyModulePackage = NULL,
      shinyModulePackageVersion = NULL,
      moduleUiFunction = patternsModuleUI,
      moduleServerFunction = patternsModuleServer,
      moduleInfoBoxFile = function(){},
      moduleIcon = "info",
      installSource = "CRAN",
      gitHubRepo = NULL
    )
  )

# Set options for base URL
options(shiny.base_url = "/strategus-results/$STUDY_ID/")

connection <- ResultModelManager::ConnectionHandler$new(resultsConnectionDetails)

# now create the shiny app based on the config file and view the results
# based on the connection 
app <- OhdsiShinyAppBuilder::createShinyApp(
  config = shinyConfig, 
  connection = connection,
  resultDatabaseSettings = createDefaultResultDatabaseSettings(schema = resultsDatabaseSchema)
)

shiny::runApp(
  app, 
  host = "0.0.0.0", 
  port = 3838,
  launch.browser = FALSE
)
`;
