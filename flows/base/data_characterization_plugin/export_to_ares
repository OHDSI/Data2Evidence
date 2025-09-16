# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(Achilles)

#' Export Achilles results to Ares
#' @param cdmVersion Version of the CDM
#' @param cdmDatabaseSchema Name of the CDM schema
#' @param vocabDatabaseSchema Name of the vocabulary schema
#' @param resultsDatabaseSchema Name of the results schema
#' @param outputPath Path to save the Ares export files
#' @return None

export_to_ares <- function(
    cdmVersion, 
    cdmDatabaseSchema, 
    vocabDatabaseSchema, 
    resultsDatabaseSchema, 
    outputPath) { 

    Achilles::exportToAres(
        connectionDetails = connectionDetails,
        cdmDatabaseSchema = cdmDatabaseSchema,
        resultsDatabaseSchema = resultsDatabaseSchema,
        vocabDatabaseSchema = vocabDatabaseSchema,
        outputPath = outputPath,
        reports = c()
    )
}