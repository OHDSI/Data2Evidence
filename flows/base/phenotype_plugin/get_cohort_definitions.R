# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(PhenotypeLibrary)
library(CirceR)

#' Create cohort definition sets from Phenotype Library
#'
#' @param cohorts_id Either "default" or comma-separated string of cohort IDs
#' @param vocabschema_name Name of the vocabulary schema
#' @param materialize Boolean indicating whether to return R object or list for Python
#' @return Cohort definition set (R dataframe if materialize=TRUE, list if FALSE)
get_cohort_definitions <- function(cohorts_id, vocabschema_name, materialize = FALSE) {
    # Convert to character if needed
    cohorts_id <- as.character(cohorts_id)
    if (cohorts_id != "default") {
        cohorts_id <- as.integer(c(cohorts_id))}
    vocabschema_name <- toString(vocabschema_name)
    library('PhenotypeLibrary')
    library('CirceR')
    create_cohort_definitionsets <- function(cohorts_id, vocabschema_name) {
        # CirceR version 1.1.1 does not support cohort 344, and CirceR version 1.3.3 (currently used) does not support cohort 921
        if (is.character(cohorts_id) && cohorts_id == 'default') {
            cohorts <- PhenotypeLibrary::getPhenotypeLog()
            cohortDefinitionSets <- PhenotypeLibrary::getPlCohortDefinitionSet(cohorts$cohortId[1:nrow(cohorts)])
            cohortDefinitionSets <- cohortDefinitionSets[cohortDefinitionSets$cohortId!=921,]
            for (i in 1:nrow(cohortDefinitionSets)) {
                cohortDefinitionSets$sql[i] <- CirceR::buildCohortQuery(cohortDefinitionSets$json[i], options = CirceR::createGenerateOptions(generateStats = TRUE, vocabularySchema = vocabschema_name))
            }
        } else if (class(cohorts_id) == "integer") {
            if (921 %in% cohorts_id) {
                cohorts_id <- cohorts_id[cohorts_id!=921]
            }
            cohortDefinitionSets <- PhenotypeLibrary::getPlCohortDefinitionSet(cohorts_id)
            for (i in 1:nrow(cohortDefinitionSets)) {
                cohortDefinitionSets$sql[i] <- CirceR::buildCohortQuery(cohortDefinitionSets$json[i], options = CirceR::createGenerateOptions(generateStats = TRUE, vocabularySchema = vocabschema_name))
            }
        }
        return(cohortDefinitionSets)
    }
    
    cohortDefinitionSets <- create_cohort_definitionsets(cohorts_id, vocabschema_name)
    
    if (materialize) {
        return(cohortDefinitionSets)
    } else {
    # Convert to list for Python consumption
        result_list <- list()
        for(i in 1:nrow(cohortDefinitionSets)) {
            result_list[[i]] <- list(
                cohortId = cohortDefinitionSets$cohortId[i],
                cohortName = cohortDefinitionSets$cohortName[i],
                json = cohortDefinitionSets$json[i],
                sql = cohortDefinitionSets$sql[i]
            )
        }
        return(result_list)
    }
}
