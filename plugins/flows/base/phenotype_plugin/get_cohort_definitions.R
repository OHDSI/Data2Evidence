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
        cohortsID <- as.integer(strsplit(cohortsID, ",")[[1]])
    }
    vocabschemaName <- toString(vocabschemaName)
    library('PhenotypeLibrary')
    library('CirceR')
    # showHidden = TRUE keeps the whole library. The default (FALSE) drops any
    # cohort flagged isReferenceCohort, anything whose status is not "pending" or
    # "accepted", and any name carrying [W] (withdrawn) or [D] (deprecated) --
    # 1100 rows down to 703. We want every status represented so the cohorts can
    # be tagged by it, so ask for the unfiltered log.
    phenotypeLog <- PhenotypeLibrary::getPhenotypeLog(showHidden = TRUE)

    # buildCohortQuery throws on cohorts CirceR cannot render. That was invisible
    # while the default filter hid most of the library; over the full set one bad
    # cohort would abort the whole run, so skip and report instead.
    build_sql_safely <- function(cohortDefinitionSets, vocabschemaName) {
        for (i in 1:nrow(cohortDefinitionSets)) {
            cohortDefinitionSets$sql[i] <- tryCatch(
                CirceR::buildCohortQuery(
                    cohortDefinitionSets$json[i],
                    options = CirceR::createGenerateOptions(generateStats = TRUE, vocabularySchema = vocabschemaName)
                ),
                error = function(e) {
                    warning(sprintf("Skipping cohort %s: CirceR could not build SQL (%s)",
                                    cohortDefinitionSets$cohortId[i], conditionMessage(e)))
                    NA_character_
                }
            )
        }
        return(cohortDefinitionSets[!is.na(cohortDefinitionSets$sql), ])
    }

    create_cohort_definitionsets <- function(cohortsID, vocabschemaName) {
        # CirceR version 1.1.1 does not support cohort 344, and CirceR version 1.3.3 (currently used) does not support cohort 921
        if (is.character(cohortsID) && cohortsID == 'default') {
            cohortDefinitionSets <- PhenotypeLibrary::getPlCohortDefinitionSet(phenotypeLog$cohortId[1:nrow(phenotypeLog)])
            cohortDefinitionSets <- cohortDefinitionSets[cohortDefinitionSets$cohortId!=921,]
            cohortDefinitionSets <- build_sql_safely(cohortDefinitionSets, vocabschemaName)
        } else if (class(cohortsID) == "integer") {
            if (921 %in% cohortsID) {
                cohortsID <- cohortsID[cohortsID!=921]
            }
            cohortDefinitionSets <- PhenotypeLibrary::getPlCohortDefinitionSet(cohortsID)
            cohortDefinitionSets <- build_sql_safely(cohortDefinitionSets, vocabschemaName)
        }

        # getPlCohortDefinitionSet returns only cohortId/cohortName/json/sql; the
        # status lives in the phenotype log, so carry it across for tagging.
        cohortDefinitionSets$status <- phenotypeLog$status[match(cohortDefinitionSets$cohortId, phenotypeLog$cohortId)]
        cohortDefinitionSets$status[is.na(cohortDefinitionSets$status) | cohortDefinitionSets$status == ""] <- "Unspecified"

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
                sql = cohortDefinitionSets$sql[i],
                status = cohortDefinitionSets$status[i]
            )
        }
        return(result_list)
    }
}
