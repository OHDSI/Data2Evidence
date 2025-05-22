# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(CDMConnector)
library(CohortSurvival)
library(dplyr)
library(ggplot2)
library(rjson)
library(RPostgres)
library(DBI)
library(duckdb)

#' Run cohort survival analysis
#'
#' @param target_cohort_definition_id Target cohort ID
#' @param outcome_cohort_definition_id Outcome cohort ID
#' @param analysis_type "single_event" or "competing_risk"
#' @param competing_outcome_cohort_definition_id Competing outcome cohort ID (for competing_risk)
#' @param pg_host,pg_port,pg_dbname,pg_user,pg_password,pg_schema PostgreSQL connection params
#' @param estimate_gap Gap between estimates in days
#' @param strata_cohorts List of cohorts for stratification, each with 'id' and 'name'
#'        Example: list(list(id = 14, name = "Male"), list(id = 15, name = "Female"))
#' @return JSON string with plot data
run_cohort_survival <- function(target_cohort_definition_id,
                                outcome_cohort_definition_id,
                                analysis_type = "single_event",
                                competing_outcome_cohort_definition_id = NULL,
                                pg_host,
                                pg_port,
                                pg_dbname,
                                pg_user,
                                pg_password,
                                pg_schema,
                                estimate_gap = 30,
                                strata_cohorts = NULL) {
    pg_con <- NULL
    duck_con <- NULL

    tryCatch(
        {
            # Connect to databases
            pg_con <- DBI::dbConnect(RPostgres::Postgres(),
                dbname = pg_dbname, host = pg_host, port = pg_port,
                user = pg_user, password = pg_password,
                options = sprintf("-c search_path=%s", pg_schema)
            )
            duck_con <- DBI::dbConnect(duckdb::duckdb(), dbdir = ":memory:")

            # Get relevant cohort data
            cohort_ids <- paste0(target_cohort_definition_id, ", ", outcome_cohort_definition_id)
            if (!is.null(competing_outcome_cohort_definition_id)) {
                cohort_ids <- paste0(cohort_ids, ", ", competing_outcome_cohort_definition_id)
            }

            cohort_data <- DBI::dbGetQuery(
                pg_con,
                paste0("SELECT * FROM ", pg_schema, ".cohort WHERE cohort_definition_id IN (", cohort_ids, ")")
            )
            DBI::dbWriteTable(duck_con, "cohort", cohort_data, overwrite = TRUE)

            # Process strata cohorts if provided
            if (!is.null(strata_cohorts)) {
                # Get strata cohort data
                strata_cohort_ids <- sapply(strata_cohorts, function(sc) sc$id)
                strata_cohort_ids_str <- paste(strata_cohort_ids, collapse = ", ")
                strata_cohort_data <- DBI::dbGetQuery(
                    pg_con,
                    paste0("SELECT * FROM ", pg_schema, ".cohort WHERE cohort_definition_id IN (", strata_cohort_ids_str, ")")
                )
                DBI::dbWriteTable(duck_con, "strata_cohort", strata_cohort_data, overwrite = TRUE)

                # Add strata columns to cohort table
                for (i in seq_along(strata_cohorts)) {
                    strata_item <- strata_cohorts[[i]]
                    strata_id <- strata_item$id
                    strata_name <- strata_item$name

                    # Sanitize strata name
                    sanitized_name <- tolower(strata_name)
                    sanitized_name <- gsub("[^[:alnum:][:space:]]", "", sanitized_name)
                    sanitized_name <- gsub("\\s+", "_", sanitized_name)
                    column_name <- paste0("strata_", sanitized_name, "_", strata_id)

                    # Add strata column and mark subjects
                    strata_sql <- paste0(
                        "ALTER TABLE cohort ADD COLUMN ", column_name, " BOOLEAN; ",
                        "UPDATE cohort SET ", column_name, " = EXISTS(SELECT 1 FROM strata_cohort s ",
                        "WHERE s.subject_id = cohort.subject_id AND s.cohort_definition_id = ", strata_id, ") ",
                        "WHERE cohort.cohort_definition_id = ", target_cohort_definition_id, "; ",
                        "UPDATE cohort SET ", column_name, " = FALSE WHERE ", column_name, " IS NULL;"
                    )
                    DBI::dbExecute(duck_con, strata_sql)
                }
            }

            # Get person and observation period data
            subject_ids <- unique(cohort_data$subject_id)
            subject_ids_str <- paste(subject_ids, collapse = ",")

            # Get person data
            person_data <- DBI::dbGetQuery(
                pg_con,
                paste0("SELECT * FROM ", pg_schema, ".person WHERE person_id IN (", subject_ids_str, ")")
            )
            DBI::dbWriteTable(duck_con, "person", person_data, overwrite = TRUE)

            # Get observation period data
            obs_period_data <- DBI::dbGetQuery(
                pg_con,
                paste0("SELECT * FROM ", pg_schema, ".observation_period WHERE person_id IN (", subject_ids_str, ")")
            )
            DBI::dbWriteTable(duck_con, "observation_period", obs_period_data, overwrite = TRUE)

            # Create CDM object
            cdm <- CDMConnector::cdm_from_con(
                con = duck_con,
                cdm_schema = "main",
                write_schema = "main",
                cohort_tables = c("cohort"),
                .soft_validation = TRUE
            )

            # Prepare strata parameters
            cohort_cols <- DBI::dbListFields(duck_con, "cohort")
            strata_cols <- cohort_cols[grepl("^strata_", cohort_cols)]
            strata_param <- if (length(strata_cols) > 0) {
                lapply(strata_cols, function(col) c(col))
            } else {
                NULL
            }
            # Run survival analysis based on type
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
                    estimateGap = estimate_gap,
                    strata = strata_param
                )

                # Apply appropriate plotting based on strata
                plot <- if (length(strata_cols) > 0) {
                    plotSurvival(survival, facet = "strata_name")
                } else {
                    plotSurvival(survival)
                }
            }
            # Return plot data as JSON
            return(toJSON(plot$data))
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
