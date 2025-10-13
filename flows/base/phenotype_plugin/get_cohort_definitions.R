# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(PhenotypeLibrary)
library(CirceR)

#' Create cohort definition sets from Phenotype Library
#'
#' @param cohortsID Either "default" or comma-separated string of cohort IDs
#' @param vocabschemaName Name of the vocabulary schema
#' @param materialize Boolean indicating whether to return R object or list for Python
#' @return Cohort definition set (R dataframe if materialize=TRUE, list if FALSE)
get_cohort_definitions <- function(cohortsID, vocabschemaName, materialize = FALSE) {
    # Convert to character if needed
    cohortsID <- as.character(cohortsID)
    if (cohortsID != "default") {
        cohortsID <- as.integer(c(cohortsID))}
    vocabschemaName <- toString(vocabschemaName)
    library('PhenotypeLibrary')
    library('CirceR')
    create_cohort_definitionsets <- function(cohortsID, vocabschemaName) {
        # CirceR version 1.1.1 does not support cohort 344, and CirceR version 1.3.3 (currently used) does not support cohort 921
        if (is.character(cohortsID) && cohortsID == 'default') {
            cohorts <- PhenotypeLibrary::getPhenotypeLog()
            cohortDefinitionSets <- PhenotypeLibrary::getPlCohortDefinitionSet(cohorts$cohortId[1:nrow(cohorts)])
            cohortDefinitionSets <- cohortDefinitionSets[cohortDefinitionSets$cohortId!=921,]
            for (i in 1:nrow(cohortDefinitionSets)) {
                cohortDefinitionSets$sql[i] <- CirceR::buildCohortQuery(cohortDefinitionSets$json[i], options = CirceR::createGenerateOptions(generateStats = TRUE, vocabularySchema = vocabschemaName))
            }
        } else if (class(cohortsID) == "integer") {
            if (921 %in% cohortsID) {
                cohortsID <- cohortsID[cohortsID!=921]
            }
            cohortDefinitionSets <- PhenotypeLibrary::getPlCohortDefinitionSet(cohortsID)
            for (i in 1:nrow(cohortDefinitionSets)) {
                cohortDefinitionSets$sql[i] <- CirceR::buildCohortQuery(cohortDefinitionSets$json[i], options = CirceR::createGenerateOptions(generateStats = TRUE, vocabularySchema = vocabschemaName))
            }
        }
        return(cohortDefinitionSets)
    }
    
    cohortDefinitionSets <- create_cohort_definitionsets(cohortsID, vocabschemaName)
    
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
