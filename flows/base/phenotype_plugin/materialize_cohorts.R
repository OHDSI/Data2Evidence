# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(CohortGenerator)
library(DatabaseConnector)

#' Materialize cohort definitions into database
#'
#' @param cohort_definitions R dataframe with cohort definitions
#' @param cdmschema_name CDM schema name
#' @param cohortschema_name Cohort schema name  
#' @param cohorttable_name Cohort table name
#' @return List with cohortsGenerated and cohortCounts
materialize_cohorts <- function(cohort_definitions, 
                               cdmschema_name, 
                               cohortschema_name, 
                               cohorttable_name) {
    
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
        cohortTableNames <- CohortGenerator::getCohortTableNames(cohortTable = cohorttable_name)
        CohortGenerator::createCohortTables(
            connection = connection,
            cohortDatabaseSchema = cohortschema_name,
            cohortTableNames = cohortTableNames
        )

        # Generate the cohorts
        cohortsGenerated <- CohortGenerator::generateCohortSet(
            connection = connection,
            cdmDatabaseSchema = cdmschema_name,
            cohortDatabaseSchema = cohortschema_name,
            cohortTableNames = cohortTableNames,
            cohortDefinitionSet = cohort_definitions
        )
        # create_replica(connection, cohortschema, cohort_table_name)

        # Get the cohort counts
        cohortCounts <- CohortGenerator::getCohortCounts(
            connection = connection,
            cohortDatabaseSchema = cohortschema_name,
            cohortTable = cohortTableNames$cohortTable
        )

        # Drop cohort statistics tables (cleanup)
        CohortGenerator::dropCohortStatsTables(
            connection = connection,
            cohortDatabaseSchema = cohortschema_name,
            cohortTableNames = cohortTableNames
        )
        
        return(list(cohortsGenerated = cohortsGenerated, cohortCounts = cohortCounts))
        
    }, finally = {
        DatabaseConnector::disconnect(connection)
    })
}
