
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


#' Create the cohort defintion
#'
#' This function creates cohort defintion compatible to use in R packages.
#' It accepts name, description and a cohort definition JSON string
#' with or without an expression field.
#'
#' @param name a string value indicating the name of the cohort definition
#' @param description a string value indicating the description of the cohort definition
#' @param cohort_definition a list object containing the cohort definition JSON.
#' @return CohortDefinition object
#' @export
create_cohort_definition <- function(name, description, cohort_definition) {
  host <- Sys.getenv("TREX__ENDPOINT_URL")
  auth_token <- Sys.getenv("TREX__AUTHORIZATION_TOKEN")
  dataset_id <- Sys.getenv("TREX__DATASET_ID")
  url <- paste0(host, "/d2e-webapi/cohortdefinition/")
  expression <- NULL
  expressionType <- NULL

  assertthat::assert_that(
    !is.null(name) && name != "",
    msg = "Name must be provided and cannot be empty."
  )
  assertthat::assert_that(
    !is.null(description) && description != "",
    msg = "Description must be provided and cannot be empty."
  )
  assertthat::assert_that(
    !is.null(cohort_definition) && length(cohort_definition) > 0,
    msg = "Cohort definition must be provided and cannot be empty."
  )

  # convert cohort_definition to JSON if it is not already
  if (is.list(cohort_definition)) {
    cohort_definition <- jsonlite::toJSON(cohort_definition, auto_unbox = TRUE)
  } else if (is.character(cohort_definition)) {
    # if it is a string, assume it is already in JSON format
    cohort_definition <- cohort_definition
  } else {
    stop("cohort_definition must be a list or a JSON string.")
  }

  cohort_definition_json <- jsonlite::fromJSON(cohort_definition)
  if (!"expression" %in% names(cohort_definition_json)) {
    expression <- cohort_definition_json
  } else {
    if (is.null(cohort_definition_json$expression)) {
      stop("Cohort definition JSON must contain an 'expression' field.")
    }
    expression <- cohort_definition_json$expression
  }

  if (!"expressionType" %in% names(cohort_definition_json)) {
    expressionType <- "SIMPLE_EXPRESSION"
  } else {
    expressionType <- cohort_definition_json$expressionType
  }

  parameters <- list(
    id = 0,
    name = name,
    description = description,
    expression = expression,
    expressionType = expressionType,
    createdBy = NULL,
    createdDate = as.numeric(Sys.time()),
    modifiedBy = NULL,
    modifiedDate = as.numeric(Sys.time()),
    tags = list("created_by_rD2E")
  )

  body <- jsonlite::toJSON(parameters, auto_unbox = TRUE, null = "null")
  response <- tryCatch(
    expr = httr::POST(
      url,
      body = body,
      encode = "json",
      httr::add_headers(
        `Content-Type` = "application/json",
        Authorization = paste0("Bearer ", auth_token),
        datasetid = dataset_id
      )
    ),
    error = function(e) {
      stop(paste0(
        "Error occurred while saving the cohort definition: ", e$message
      ))
    }
  )

  if (!response$status_code == 200) {
    message(paste0("Status code: ", response$status_code))
    message(httr::content(response))
    stop(paste0(
      "Error occurred while getting cohort definition for cohort: ",
      name
    ))
  }
  response <- httr::content(response)
  message(paste0("Cohort definition created successfully with id: ", response$id))
  return(response)
}