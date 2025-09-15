# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(CohortGenerator)

#' Create a cohort in the database
#' @param cohortJson JSON string of the cohort definition
#' @param schemaName Name of the CDM schema
#' @param cohortName Name of the cohort
#' @param cohortId ID of the cohort
#' @param vocabSchemaName Name of the vocabulary schema
#' @return None

create_cohort <- function(cohortJson, schemaName, vocabSchemaName, cohortName, cohortId) {
    cohortJson <- '{cohort_json_expression}'
    schemaName <- '{schema_name}'
    vocabSchemaName <- '{vocab_schema_name}'
    cohortName <- '{cohort_name}'
    cohortId <- {cohort_definition_id}
    
    cat("Generating cohort sql from cohort expression from json")
    cohortExpression <- CirceR::cohortExpressionFromJson(cohortJson)
    options <- CirceR::createGenerateOptions(generateStats = FALSE, vocabularySchema = vocabSchemaName);
    cohortSql <- CirceR::buildCohortQuery(cohortExpression, options = options)
    
    cat("Creating tempoary cohort stats table names")
    cohortTableNames <- list()
    cohortTableNames[["cohortTable"]] <- "cohort"
    cohortTableNames[["cohortInclusionTable"]] <- sprintf("cohort_inclusion_%s", cohortId)
    cohortTableNames[["cohortInclusionResultTable"]] <- sprintf("cohort_inclusion_result_%s", cohortId)
    cohortTableNames[["cohortInclusionStatsTable"]] <- sprintf("cohort_inclusion_stats_%s", cohortId)
    cohortTableNames[["cohortSummaryStatsTable"]] <- sprintf("cohort_summary_stats_%s", cohortId)
    cohortTableNames[["cohortCensorStatsTable"]] <- sprintf("cohort_censor_stats_%s", cohortId)
    
    cat("Creating tempoary cohort stats tables")
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