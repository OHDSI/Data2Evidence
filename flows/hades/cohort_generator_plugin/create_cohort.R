# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(CohortGenerator)

#' Create a cohort in the database
#' @param cohortJson JSON string of the cohort definition
#' @param schemaName Name of the CDM schema
#' @param cohortName Name of the cohort
#' @param cohortId int ID of the cohort
#' @param vocabSchemaName Name of the vocabulary schema
#' @param set_db_driver_env_string R code string to set DB driver environment
#' @param set_connection_string R code string to set connection details
#' @return None

create_cohort <- function(
    set_db_driver_env_string,
    set_connection_string,
    cohortJson, 
    schemaName, 
    vocabSchemaName, 
    cohortName, 
    cohortId) {
        
    # Setup environment and connection details
    eval(parse(text = set_db_driver_env_string))
    eval(parse(text = set_connection_string))
    
    cat("Generating cohort sql from cohort expression from json")
    cohortExpression <- CirceR::cohortExpressionFromJson(cohortJson)
    options <- CirceR::createGenerateOptions(generateStats = FALSE, vocabularySchema = vocabSchemaName);
    cohortSql <- CirceR::buildCohortQuery(cohortExpression, options = options)
    
    cat("Creating temporary cohort stats table names")
    cohortTableNames <- list()
    cohortTableNames[["cohortTable"]] <- "cohort"
    cohortTableNames[["cohortInclusionTable"]] <- sprintf("cohort_inclusion_%s", cohortId)
    cohortTableNames[["cohortInclusionResultTable"]] <- sprintf("cohort_inclusion_result_%s", cohortId)
    cohortTableNames[["cohortInclusionStatsTable"]] <- sprintf("cohort_inclusion_stats_%s", cohortId)
    cohortTableNames[["cohortSummaryStatsTable"]] <- sprintf("cohort_summary_stats_%s", cohortId)
    cohortTableNames[["cohortCensorStatsTable"]] <- sprintf("cohort_censor_stats_%s", cohortId)
    
    cat("Creating temporary cohort stats tables")
    CohortGenerator::createCohortTables(connectionDetails = connectionDetails,
                            cohortDatabaseSchema = schemaName,
                            cohortTableNames = cohortTableNames,
                            incremental=TRUE)
                            

    cat("Creating cohorts")
    cohortsToCreate <- CohortGenerator::createEmptyCohortDefinitionSet()
    cohortsToCreate <- rbind(cohortsToCreate, data.frame(cohortId = cohortId,
                                        cohortName = cohortName, 
                                        sql = cohortSql,
                                        stringsAsFactors = FALSE))       
    cohortsGenerated <- CohortGenerator::generateCohortSet(connectionDetails = connectionDetails,
                                        cdmDatabaseSchema = schemaName,
                                        cohortDatabaseSchema = schemaName,
                                        cohortTableNames = cohortTableNames,
                                        cohortDefinitionSet = cohortsToCreate)


    cat("Dropping tempoary cohort stats tables")
    CohortGenerator::dropCohortStatsTables(
    connectionDetails = connectionDetails,
    cohortDatabaseSchema = schemaName,
    cohortTableNames = cohortTableNames
    )
}