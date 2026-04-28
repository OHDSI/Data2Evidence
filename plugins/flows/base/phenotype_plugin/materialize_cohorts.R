# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(CohortGenerator)
library(DatabaseConnector)

#' Materialize cohort definitions into database
#'
#' @param cohortDefinitions R dataframe with cohort definitions
#' @param cdmschemaName CDM schema name
#' @param cohortschemaName Cohort schema name  
#' @param cohorttableName Cohort table name
#' @param set_db_driver_env_string R code string to set DB driver environment
#' @param set_connection_string R code string to set connection details
#' @return List with cohortsGenerated and cohortCounts

materialize_cohorts <- function(
    set_db_driver_env_string,
    set_connection_string,
    cohortDefinitions,
    cdmschemaName,
    cohortschemaName,
    cohorttableName
    ) {

    # Setup environment and connection details
    eval(parse(text = set_db_driver_env_string))
    eval(parse(text = set_connection_string))
    connection <- DatabaseConnector::connect(connectionDetails)

    create_replica <- function(connection, cohortschema, cohort_table_name) {
        # Get table names first
        getTablesSQL <- paste0("SELECT tablename FROM pg_tables WHERE schemaname = '", cohortschema, "' AND tablename LIKE '", cohort_table_name, "%'")
        tables <- DatabaseConnector::querySql(connection, getTablesSQL)

        # Set replica identity for each table individually
        for(i in 1:nrow(tables)) {
            tableName <- tables$TABLENAME[i]
            replicaSql <- paste0("ALTER TABLE ", cohortschema, ".", tableName, " REPLICA IDENTITY FULL")
            DatabaseConnector::executeSql(connection, replicaSql)
        }
        print('Complete setting replica identity for phenotype tables')
    }

    tryCatch({
        # Create the cohort tables to hold the cohort generation results
        cohortTableNames <- CohortGenerator::getCohortTableNames(cohortTable = cohorttableName)
        CohortGenerator::createCohortTables(
            connection = connection,
            cohortDatabaseSchema = cohortschemaName,
            cohortTableNames = cohortTableNames
        )

        # Generate the cohorts
        cohortsGenerated <- CohortGenerator::generateCohortSet(
            connection = connection,
            cdmDatabaseSchema = cdmschemaName,
            cohortDatabaseSchema = cohortschemaName,
            cohortTableNames = cohortTableNames,
            cohortDefinitionSet = cohortDefinitions
        )
        # create_replica(connection, cohortschema, cohort_table_name)

        # Get the cohort counts
        cohortCounts <- CohortGenerator::getCohortCounts(
            connection = connection,
            cohortDatabaseSchema = cohortschemaName,
            cohortTable = cohortTableNames$cohortTable
        )

        # Drop cohort statistics tables (cleanup)
        CohortGenerator::dropCohortStatsTables(
            connection = connection,
            cohortDatabaseSchema = cohortschemaName,
            cohortTableNames = cohortTableNames
        )
        
        return(list(cohortsGenerated = cohortsGenerated, cohortCounts = cohortCounts))
        
    }, finally = {
        DatabaseConnector::disconnect(connection)
    })
}
