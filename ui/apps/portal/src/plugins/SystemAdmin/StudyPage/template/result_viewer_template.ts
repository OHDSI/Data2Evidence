export const RESULT_VIEWER_TEMPLATE = `library(OhdsiShinyAppBuilder)
library(CohortSurvival)
library(dplyr)
library(future)
library(OhdsiShinyModules)
library(omopgenerics)
library(readr)
library(shiny)
library(TreatmentPatterns)

resultsDatabaseSchema <- "$DATABASE_SCHEMA"
datasetId <- "$DATASET_ID"
studyId <- "$STUDY_ID"

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

########### Survival Analysis module ##############################
survivalModuleUI <- function(id) {
  ns <- NS(id)  # Namespace for the module
  fluidPage(
    # Dropdown to choose a dataset or option
    selectInput(
      inputId = ns("dataset"),      # namespaced ID
      label   = "Choose a dataset", # label shown to user
      choices = NULL
    ),
    # Survival plot output
    plotOutput(ns("km_plot"))
  )
}
survivalModuleServer <- function(id, resultDatabaseSettings, connectionHandler) {
  moduleServer(id, function(input, output, session) {
    dataset_choices <- reactive({
      conn <- connectionHandler$getConnection()
      res <- DatabaseConnector::querySql(
        conn,
        paste0(
          "SELECT DISTINCT cdm_name AS database_id
              from ", resultsDatabaseSchema, ".cs_survival_results
             WHERE cdm_name IS NOT NULL"
        )
      )
      return(res$database_id)
    })
    observeEvent(dataset_choices(), {
      updateSelectInput(
        session,
        inputId = "dataset",
        choices = dataset_choices(),
        selected = dataset_choices()[1]
      )
    })
    output$km_plot <- renderPlot({
        req(input$dataset)  # Wait for dataset to be selected
        conn <- connectionHandler$getConnection()
        sql_query <- paste0(
            "SELECT * FROM ", resultsDatabaseSchema, ".cs_survival_results WHERE cdm_name = '", input$dataset, "' OR cdm_name IS NULL"
        )
        cs_data <- DatabaseConnector::querySql(
            conn,
            sql_query
        )
        cs_data$row_id <- NULL
        colnames(cs_data) <- tolower(colnames(cs_data))
        # Write to temporary CSV file
        temp_file <- tempfile(fileext = ".csv")
        on.exit(unlink(temp_file), add = TRUE)  # Clean up when function exits
        readr::write_csv(cs_data, temp_file)
        # Import using omopgenerics function
        cs_data <- omopgenerics::importSummarisedResult(path = temp_file)
        
        # Check strata information
        strata_names <- unique(cs_data$strata_name)
        # Determine facet parameter based on strata_name
        # Filter out "overall" and find actual strata
        actual_strata <- strata_names[strata_names != "overall"]

        if (length(actual_strata) > 0) {
            strata_type <- actual_strata[1]  # Use first non-overall strata
            facet_var <- strata_type
        } else {
            strata_type <- NULL
            facet_var <- NULL
        }

        # Plot based on detected strata
        if (!is.null(facet_var)) {
            CohortSurvival::plotSurvival(cs_data, facet = facet_var)
        } else {
            surv_plot <- CohortSurvival::plotSurvival(cs_data)
        }
    })
  })
}

################### Table 1 Visualization Module (Shiny) ##########################
table1ModuleUI <- function(id) {
  ns <- NS(id)
  fluidPage(
    fluidRow(
      column(12, div(style = "text-align:left;",
        h4("Select Cohort ID:"),
        div(style = "display:inline-block; min-width:200px;", selectInput(ns("cohort1"), label = NULL, choices = NULL))
      ))
    ),
    br(),
    fluidRow(
      column(12,
        div(
          style = "max-width: 70%; width: 100%; border: 2px solid #b3b3b3; border-radius: 10px; padding: 2vw 2vw 2vw 2vw; margin-bottom: 2vw; box-sizing: border-box; text-align:left;",
          h4("Table 1 for Cohorts", style = "text-align:left; font-size:1.5vw; margin-bottom:1vw;"),
          div(style = "overflow-x:auto; text-align:left; width:100%;",
            tableOutput(ns("table1out")),
            tags$style(HTML(paste0("#", ns("table1out"), " table, #", ns("table1out"), " th, #", ns("table1out"), " td { text-align: center !important; }")))
          )
        )
      )
    )
  )
}

table1ModuleServer <- function(id, connectionHandler, resultDatabaseSettings, cohortTable = "cohort", cdmSchema = "main") {
  moduleServer(id, function(input, output, session) {
    # Get unique cohort IDs from the cohort table

    cohort_choices <- reactive({
        conn <- connectionHandler$getConnection()
        sql <- paste0("SELECT DISTINCT cohort_id FROM ", resultsDatabaseSchema, ".tb1_results where study_id = '", studyId, "' and dataset_id = '", datasetId, "' ;")
        res <- DatabaseConnector::querySql(conn, sql)
        return (res$cohort_id)
    })

    observeEvent(cohort_choices(), {
      choices <- cohort_choices()
        updateSelectInput(session, "cohort1", choices = choices, selected = choices[1])
        updateTextInput(session, "cohort1", value = choices[1])
    })

    table1_data <- reactive({
      req(input$cohort1)
      cohort_id <- input$cohort1
      sql <- paste0("SELECT table1_json FROM ", resultsDatabaseSchema, ".tb1_results WHERE cohort_id = '", cohort_id, "' and study_id = '", studyId, "' and dataset_id = '", datasetId, "' ;")
      conn <- connectionHandler$getConnection()
      res <- DatabaseConnector::querySql(conn, sql)
      if (nrow(res) == 0) {
        cat("No Table 1 output found for cohort ID:", cohort_id, "\n")
        return (NULL)
      }
      json_str <- res$table1_json[1]
      table1 <- ParallelLogger::convertJsonToSettings(json_str)
      return (table1)
    })
    
    output$table1out <- renderTable({
      tbl <- table1_data()
      if (is.data.frame(tbl)) {
        tbl
      } else {
        data.frame(Message = "Invalid Table 1 data - expected a data frame.")
      }
    }, striped = TRUE, bordered = TRUE, hover = TRUE, spacing = 'm', align = 'c')
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
  ) |>
  addModuleConfig(
    createModuleConfig(
      moduleId = 'survival',
      tabName = "SurvivalAnalysis",
      shinyModulePackage = NULL,
      shinyModulePackageVersion = NULL,
      moduleUiFunction = survivalModuleUI,
      moduleServerFunction = survivalModuleServer,
      moduleInfoBoxFile = function(){},
      moduleIcon = "info",
      installSource = "CRAN",
      gitHubRepo = NULL
    )
  ) |>
  addModuleConfig(
    createModuleConfig(
      moduleId = 'table1',
      tabName = "Table 1",
      shinyModulePackage = NULL,
      shinyModulePackageVersion = NULL,
      moduleUiFunction = table1ModuleUI,
      moduleServerFunction = table1ModuleServer,
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
