# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(CDMConnector)
library(CohortSurvival)
library(dplyr)
library(ggplot2)
library(rjson)
library(tools)
library(RPostgres)
library(DBI)
library(duckdb)

#' Run cohort survival analysis
#'
#' @param target_cohort_definition_id The target cohort ID
#' @param outcome_cohort_definition_id The outcome cohort ID
#' @param analysis_type Type of analysis ("single_event" or "competing_risk")
#' @param competing_outcome_cohort_definition_id The competing outcome cohort ID (for competing_risk analysis)
#' @param pg_host PostgreSQL host
#' @param pg_port PostgreSQL port
#' @param pg_dbname PostgreSQL database name
#' @param pg_user PostgreSQL user
#' @param pg_password PostgreSQL password
#' @param pg_schema PostgreSQL schema
#' @param estimate_gap Gap between estimates in days
#' @return JSON string with plot data
run_cohort_survival <- function(
    target_cohort_definition_id,
    outcome_cohort_definition_id,
    analysis_type = "single_event",
    competing_outcome_cohort_definition_id = NULL,
    pg_host,
    pg_port,
    pg_dbname,
    pg_user,
    pg_password,
    pg_schema,
    estimate_gap = 30) {
    pg_con <- NULL
    duck_con <- NULL

    tryCatch(
        {
            # Connect to PostgreSQL
            pg_con <- DBI::dbConnect(RPostgres::Postgres(),
                dbname = pg_dbname,
                host = pg_host,
                user = pg_user,
                password = pg_password,
                options = sprintf("-c search_path=%s", pg_schema)
            )

            # Create in-memory DuckDB connection
            duck_con <- DBI::dbConnect(duckdb::duckdb(), dbdir = ":memory:")

            # Query and copy only relevant cohort data from PostgreSQL
            cohort_ids <- paste0(target_cohort_definition_id, ", ", outcome_cohort_definition_id)
            if (!is.null(competing_outcome_cohort_definition_id)) {
                cohort_ids <- paste0(cohort_ids, ", ", competing_outcome_cohort_definition_id)
            }

            cohort_query <- paste0(
                "SELECT * FROM ", pg_schema, ".cohort ",
                "WHERE cohort_definition_id IN (", cohort_ids, ")"
            )
            cohort_data <- DBI::dbGetQuery(pg_con, cohort_query)
            DBI::dbWriteTable(duck_con, "cohort", cohort_data, overwrite = TRUE)

            # Extract unique subject_ids from cohort data
            subject_ids <- unique(cohort_data$subject_id)
            subject_ids_str <- paste(subject_ids, collapse = ",")

            # Query person data for matching subject_ids
            person_query <- paste0(
                "SELECT * FROM ", pg_schema, ".person ",
                "WHERE person_id IN (", subject_ids_str, ")"
            )
            person_data <- DBI::dbGetQuery(pg_con, person_query)
            DBI::dbWriteTable(duck_con, "person", person_data, overwrite = TRUE)

            # Query observation_period data for matching subject_ids
            obs_period_query <- paste0(
                "SELECT * FROM ", pg_schema, ".observation_period ",
                "WHERE person_id IN (", subject_ids_str, ")"
            )
            obs_period_data <- DBI::dbGetQuery(pg_con, obs_period_query)
            DBI::dbWriteTable(duck_con, "observation_period", obs_period_data, overwrite = TRUE)

            # Create CDM object using DuckDB connection
            cdm <- CDMConnector::cdm_from_con(
                con = duck_con,
                cdm_schema = "main", # Using "main" schema for DuckDB
                write_schema = "main", # Using "main" schema for DuckDB
                cohort_tables = c("cohort"),
                .soft_validation = TRUE
            )

            # Choose the appropriate survival analysis method based on analysis_type
            if (analysis_type == "competing_risk") {
                survival <- estimateCompetingRiskSurvival(cdm,
                    targetCohortId = target_cohort_definition_id,
                    outcomeCohortId = outcome_cohort_definition_id,
                    targetCohortTable = "cohort",
                    outcomeCohortTable = "cohort",
                    competingOutcomeCohortTable = "cohort",
                    competingOutcomeCohortId = competing_outcome_cohort_definition_id,
                    estimateGap = estimate_gap
                )
                plot <- plotSurvival(survival, cumulativeFailure = TRUE)
            } else {
                survival <- estimateSingleEventSurvival(cdm,
                    targetCohortId = target_cohort_definition_id,
                    outcomeCohortId = outcome_cohort_definition_id,
                    targetCohortTable = "cohort",
                    outcomeCohortTable = "cohort",
                    estimateGap = estimate_gap
                )
                plot <- plotSurvival(survival)
            }

            plot_data <- ggplot_build(plot)$data[[1]]
            # Convert data to a list if not already
            plot_data <- as.list(plot_data)

            # Add a key to the list
            plot_data[["status"]] <- "SUCCESS"
            plot_data_json <- toJSON(plot_data)

            print(plot_data_json)
            cdm_disconnect(cdm)
            return(plot_data_json)
        },
        error = function(e) {
            print(e)
            data <- list(status = "ERROR", message = e$message)
            return(toJSON(data))
        },
        finally = {
            # Clean up connections
            if (!is.null(duck_con)) {
                DBI::dbDisconnect(duck_con, shutdown = TRUE)
                print("Disconnected the DuckDB database.")
            }
            if (!is.null(pg_con)) {
                DBI::dbDisconnect(pg_con)
                print("Disconnected the PostgreSQL database.")
            }
        }
    )
}
