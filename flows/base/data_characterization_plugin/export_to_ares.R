# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(Achilles)

#' Export Achilles results to Ares
#' @param cdmVersion Version of the CDM
#' @param cdmDatabaseSchema Name of the CDM schema
#' @param vocabDatabaseSchema Name of the vocabulary schema
#' @param resultsDatabaseSchema Name of the results schema
#' @param outputPath Path to save the Ares export files
#' @param set_trex_env_string R code string to set TREX environment
#' @param setDBDriverEnv R code string to set DB driver environment
#' @param connectionDetailsString R code string to set connection details
#' @return None

export_to_ares <- function(
    set_trex_env_string,
    setDBDriverEnv,
    connectionDetailsString,
    cdmVersion, 
    cdmDatabaseSchema, 
    vocabDatabaseSchema, 
    resultsDatabaseSchema, 
    outputPath) { 

    # Set TREX and DB driver environment variables and create connection details
    eval(parse(text = set_trex_env_string))
    eval(parse(text = setDBDriverEnv))
    eval(parse(text = connectionDetailsString))
    
    Achilles::exportToAres(
        connectionDetails = connectionDetails,
        cdmDatabaseSchema = cdmDatabaseSchema,
        resultsDatabaseSchema = resultsDatabaseSchema,
        vocabDatabaseSchema = vocabDatabaseSchema,
        outputPath = outputPath,
        reports = c()
    )
}