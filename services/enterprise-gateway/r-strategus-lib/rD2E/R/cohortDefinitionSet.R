
#' Get the cohort defintion set by a list of cohort Ids
#'
#' This function fetches cohort defintions and converts them
#' to cohort definition set object, compatible to use in
#' OHDSI Strategus and Cohort Generator R packages. It also uses
#' Circe package for converting the cohort JSON to Sql
#'
#' @param cohortIds a list of cohortIds
#' @param generateStats a booloean to generate statistics
#' @return CohortDefinitionSet object
#' @export
get_cohort_definition_set <- function(cohortIds, generateStats = FALSE) {
    if (length(cohortIds) == 0) {
      stop("Must provide a non-zero length cohortIds vector.")
    }
    cohortDefinitionSet <- dplyr::tibble(
      atlasId = integer(),
      cohortId = integer(),
      cohortName = character(),
      sql = character(),
      json = character(),
      logicDescription = character(),
      generateStats = logical()
    )

    for (i in (1:length(cohortIds))) {
      cohortId <- cohortIds[i]
      message(paste("Fetching cohortId:", cohortId))
      object <-
        getCohortDefinition(cohortId = cohortId)
      json <- .toJSON(object$expression, pretty = TRUE)
      sql <- CirceR::buildCohortQuery(json,
        options = CirceR::createGenerateOptions(generateStats = generateStats))

      cohortDefinitionSet <- dplyr::bind_rows(
        cohortDefinitionSet,
        dplyr::tibble(
          atlasId = cohortId,
          cohortId = cohortId,
          cohortName = object$name,
          sql = sql,
          json = json,
          logicDescription = 
            ifelse(is.null(object$description), NA, object$description),
          generateStats = as.logical(generateStats)
        )
      )
    }
    return(cohortDefinitionSet)
}

getCohortDefinition <- function(cohortId) {

  host <- Sys.getenv("TREX__ENDPOINT_URL")
  auth_token <- Sys.getenv("TREX__AUTHORIZATION_TOKEN")
  dataset_id <- Sys.getenv("TREX__DATASET_ID")
  url <- paste0(host, "/d2e-webapi/cohortdefinition/", cohortId)

  response <- tryCatch(
    expr = httr::GET(url, httr::add_headers(
        Authorization=paste0("Bearer ", auth_token), 
        datasetId = dataset_id
    )),
    error = function(e) {
      stop(paste0(
        "Error occurred while getting cohort definition: ", e$message
      ))
    }
  )
  if (!response$status_code == 200) {
    message(paste0("Status code: ", response$status_code))
    message(httr::content(response))
    stop(paste0(
      "Error occurred while getting cohort definition for cohortId: ",
      cohortId
    ))
  }
  response <- httr::content(response)
  return(response)
}

.toJSON <- function(x, pretty = FALSE) {
  return(RJSONIO::toJSON(x = x, digits = 23, pretty = pretty))
}