# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(DataQualityDashboard)

#' Execute Data Quality Dashboard checks
#' @param cdmDatabaseSchema Name of the CDM schema
#' @param vocabDatabaseSchema Name of the vocabulary schema
#' @param resultsDatabaseSchema Name of the results schema
#' @param cdmSourceName Name of the CDM source
#' @param numThreads Number of threads to use
#' @param sqlOnly If TRUE, only SQL will be generated, not executed
#' @param outputFolder Folder to write the output to
#' @param outputFile File to write the output to
#' @param writeToTable If TRUE, results will be written to a table
#' @param verboseMode If TRUE, verbose mode will be enabled
#' @param checkLevels Levels of checks to run
#' @param checkNames Names of checks to run
#' @param cohortDefinitionId Cohort definition IDs to use
#' @param cdmVersion Version of the CDM
#' @param cohortDatabaseSchema Name of the cohort schema
#' @param cohortTableName Name of the cohort table
#' @return None

execute_dqd <- function(
        cdmDatabaseSchema,
        vocabDatabaseSchema,
        resultsDatabaseSchema,
        cdmSourceName,
        numThreads,
        sqlOnly,
        outputFolder,
        outputFile,
        writeToTable,
        verboseMode,
        checkLevels,
        checkNames,
        cohortDefinitionId,
        cdmVersion,
        cohortDatabaseSchema,
        cohortTableName) {
    # Run executeDqChecks
    DataQualityDashboard::executeDqChecks(
        connectionDetails = connectionDetails,
        cdmDatabaseSchema = cdmDatabaseSchema,
        resultsDatabaseSchema = resultsDatabaseSchema,
        cdmSourceName = cdmSourceName,
        numThreads = numThreads,
        sqlOnly = sqlOnly,
        outputFolder = outputFolder,
        outputFile = outputFile,
        verboseMode = verboseMode,
        writeToTable = writeToTable,
        checkLevels = checkLevels,
        checkNames = checkNames,
        cdmVersion = cdmVersion,
        cohortDefinitionId = cohortDefinitionId,
        cohortDatabaseSchema = cohortDatabaseSchema,
        cohortTableName = cohortTableName
    )
}