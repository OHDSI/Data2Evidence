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
#' @param strata_cohorts Strata cohorts (nullable). Must be structured as a list of objects,
#'        each containing 'id' and 'name' properties (name can be an empty string).
#'        Example:
#'        - strata_cohorts = list(
#'                        list(id = 14, name = "Male"),
#'                        list(id = 15, name = "Female"),
#'                        list(id = 16, name = "") # Empty name is allowed
#'                      )
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
            # Connect to PostgreSQL
            pg_con <- DBI::dbConnect(RPostgres::Postgres(),
                dbname = pg_dbname,
                host = pg_host,
                port = pg_port,
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

            # Handle strata cohorts if provided
            if (!is.null(strata_cohorts)) {
                # Extract strata cohort IDs (we only need the IDs for the query)
                strata_cohort_ids <- sapply(strata_cohorts, function(sc) sc$id)

                # Construct query for strata cohorts
                strata_cohort_ids_str <- paste(strata_cohort_ids, collapse = ", ")
                print(paste("Strata cohort IDs:", strata_cohort_ids_str))
                strata_cohort_query <- paste0(
                    "SELECT * FROM ", pg_schema, ".cohort ",
                    "WHERE cohort_definition_id IN (", strata_cohort_ids_str, ")"
                )
                strata_cohort_data <- DBI::dbGetQuery(pg_con, strata_cohort_query)
                DBI::dbWriteTable(duck_con, "strata_cohort", strata_cohort_data, overwrite = TRUE)

                # Add strata columns to cohort table
                for (i in seq_along(strata_cohorts)) {
                    strata_item <- strata_cohorts[[i]]
                    strata_id <- strata_item$id
                    strata_name <- strata_item$name
                    # Sanitize strata name: lowercase, remove special chars, replace spaces with _
                    sanitized_strata_name <- tolower(strata_name)
                    sanitized_strata_name <- gsub("[^[:alnum:][:space:]]", "", sanitized_strata_name)
                    sanitized_strata_name <- gsub("\\s+", "_", sanitized_strata_name)
                    strata_column_name <- paste0("strata_", sanitized_strata_name, "_", strata_id)

                    # Create SQL to add the strata column and mark subjects as TRUE if they appear in strata cohort
                    # Only mark TRUE for subjects in the target cohort
                    strata_sql <- paste0(
                        "ALTER TABLE cohort ADD COLUMN ", strata_column_name, " BOOLEAN; ",
                        "UPDATE cohort SET ", strata_column_name, " = EXISTS(SELECT 1 FROM strata_cohort s ",
                        "WHERE s.subject_id = cohort.subject_id ",
                        "AND s.cohort_definition_id = ", strata_id, ") ",
                        "WHERE cohort.cohort_definition_id = ", target_cohort_definition_id, "; ",
                        "UPDATE cohort SET ", strata_column_name, " = FALSE ",
                        "WHERE ", strata_column_name, " IS NULL;"
                    )
                    print("strata_column_name")
                    print(strata_column_name)
                    DBI::dbExecute(duck_con, strata_sql)
                }

                # Print the columns present in the DuckDB cohort table
                cohort_columns <- DBI::dbListFields(duck_con, "cohort")
                print("Columns in DuckDB cohort table:")
                print(cohort_columns)
            }

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
            print("TARGET")
            print(cdm[["cohort"]])
            print("END TARGET")
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
                # Get column names from cohort table
                cohort_cols <- DBI::dbListFields(duck_con, "cohort")
                print("cohort_cols:")
                print(cohort_cols)

                # Find strata columns (those that start with "strata_")
                strata_cols <- cohort_cols[grepl("^strata_", cohort_cols)]

                # Verify that strata columns actually exist in the cohort table
                print("Checking for strata columns in cohort table:")
                for (col in strata_cols) {
                    col_exists <- DBI::dbGetQuery(duck_con, paste0("SELECT COUNT(*) as count FROM pragma_table_info('cohort') WHERE name='", col, "'"))$count > 0
                    print(paste(col, "exists:", col_exists))
                }

                # Set up strata parameter - if strata columns exist, use them; otherwise use NULL
                strata_param <- if (length(strata_cols) > 0) {
                    # Each strata column should be a separate analysis, not all columns together
                    # Convert from list(c("col1", "col2")) to list(c("col1"), c("col2"))
                    lapply(strata_cols, function(col) c(col))
                } else {
                    NULL
                }

                # Proper way to print these values
                print("strata_param:")
                print(strata_param)
                print("strata_cols:")
                print(strata_cols)
                namesInColumns <- all(unlist(strata_param) %>% unique() %in% colnames(cdm[["cohort"]]))
                print("namesInColumns")
                print(namesInColumns)
                print(unlist(strata_param))
                print(colnames(cdm[["cohort"]]))
                survival <- estimateSingleEventSurvival(cdm,
                    targetCohortId = target_cohort_definition_id,
                    outcomeCohortId = outcome_cohort_definition_id,
                    targetCohortTable = "cohort",
                    outcomeCohortTable = "cohort",
                    estimateGap = estimate_gap,
                    strata = strata_param
                )

                # Check if we have strata and apply appropriate plotting
                if (length(strata_cols) > 0) {
                    # Use the first strata column name directly for faceting
                    plot <- plotSurvival(survival, facet = "strata_name")
                } else {
                    # No strata, just plot normally
                    plot <- plotSurvival(survival)
                }
            }
            # return(survival)
            plot_data <- ggplot_build(plot)$data
            # Convert data to a list if not already
            plot_data <- as.list(plot_data)

            # Add a key to the list
            plot_data[["status"]] <- "SUCCESS"
            plot_data_json <- toJSON(plot_data)
            #  return(survival)
            # print(plot_data_json)
            # return(plot_data_json)

            gb <- ggplot_build(plot)
            layout <- gb$layout$layout # Contains PANEL-to-facet mapping
            plot_data2 <- lapply(gb$data, function(layer_data) {
                left_join(layer_data, layout, by = "PANEL")
            })
            print("LAYOUT")
            print(names(layout))
            return(toJSON(plot_data2))
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
