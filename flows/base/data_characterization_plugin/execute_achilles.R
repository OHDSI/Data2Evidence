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
#' @param set_trex_env_string R code string to set TREX environment
#' @param setDBDriverEnv R code string to set DB driver environment
#' @param connectionDetailsString R code string to set connection details
#' @return None

execute_achilles <- function(
        set_trex_env_string,
        setDBDriverEnv,
        connectionDetailsString,
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
            
    # Set TREX and DB driver environment variables and create connection details
    eval(parse(text = set_trex_env_string))
    eval(parse(text = setDBDriverEnv))
    eval(parse(text = connectionDetailsString))

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