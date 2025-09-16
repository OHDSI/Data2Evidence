# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(Achilles)

#' Execute Achilles analysis
#' @param cdmVersion Version of the CDM
#' @param cdmDatabaseSchema Name of the CDM schema
#' @param vocabDatabaseSchema Name of the vocabulary schema
#' @param resultsDatabaseSchema Name of the results schema
#' @param outputFolder Folder to write the output to
#' @param numThreads Number of threads to use
#' @param createTable If TRUE, results table will be created
#' @param sqlOnly If TRUE, only SQL will be generated, not executed
#' @param verboseMode If TRUE, verbose mode will be enabled
#' @param createIndices If TRUE, indices will be created on results tables
#' @return None

execute_achilles <- function(
        cdmVersion,
        cdmDatabaseSchema,
        vocabDatabaseSchema,
        createTable,
        resultsDatabaseSchema,
        outputFolder,
        sqlOnly, 
        numThreads, 
        verboseMode,
        excludeAnalysisIds, 
        createIndices) {

    Achilles::achilles(
        connectionDetail = connectionDetails, 
        cdmVersion = cdmVersion, 
        cdmDatabaseSchema = cdmDatabaseSchema, 
        createTable = createTable, 
        resultsDatabaseSchema = resultsDatabaseSchema, 
        outputFolder = outputFolder, 
        sqlOnly = sqlOnly, 
        numThreads = numThreads, 
        verboseMode = verboseMode, 
        excludeAnalysisIds = excludeAnalysisIds, 
        createIndices = createIndices
    )
}