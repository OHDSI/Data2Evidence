# rD2E.R
# WebR-compatible port of the rD2E package
#
# Original: d2e/services/enterprise-gateway/r-strategus-lib/rD2E/
#
# WebR adaptations:
#   - CirceR (requires Java) -> SQL generation skipped
#   - httr -> replaced with webr::eval_js() + JavaScript fetch()
#   - RJSONIO / jsonlite -> replaced with pure R JSON serializer + JS JSON.parse
#   - ParallelLogger -> replaced with pure R JSON serializer
#   - assertthat -> replaced with base R if/stop
#   - dplyr -> replaced with base R data.frame/rbind

# =============================================================================
# JSON helpers (pure R, no external packages)
# =============================================================================

.rD2E_to_json <- function(x) {
  if (is.null(x)) return("null")
  if (length(x) == 0 && is.list(x)) {
    if (!is.null(names(x))) return("{}")
    return("[]")
  }
  if (is.logical(x) && length(x) == 1) {
    if (is.na(x)) return("null")
    return(if (x) "true" else "false")
  }
  if (is.numeric(x) && length(x) == 1) {
    if (is.na(x)) return("null")
    return(format(x, scientific = FALSE))
  }
  if (is.character(x) && length(x) == 1) {
    if (is.na(x)) return("null")
    s <- x
    s <- gsub("\\", "\\\\", s, fixed = TRUE)
    s <- gsub('"', '\\"', s, fixed = TRUE)
    s <- gsub("\n", "\\n", s, fixed = TRUE)
    s <- gsub("\r", "\\r", s, fixed = TRUE)
    s <- gsub("\t", "\\t", s, fixed = TRUE)
    return(paste0('"', s, '"'))
  }
  # vectors of length > 1
  if (is.atomic(x) && length(x) > 1) {
    items <- vapply(x, .rD2E_to_json, character(1), USE.NAMES = FALSE)
    return(paste0("[", paste(items, collapse = ","), "]"))
  }
  # data.frame -> array of objects
  if (is.data.frame(x)) {
    rows <- lapply(seq_len(nrow(x)), function(i) {
      .rD2E_to_json(as.list(x[i, , drop = FALSE]))
    })
    return(paste0("[", paste(rows, collapse = ","), "]"))
  }
  # named list -> object, unnamed list -> array
  if (is.list(x)) {
    nms <- names(x)
    if (is.null(nms) || all(nms == "")) {
      items <- vapply(x, .rD2E_to_json, character(1), USE.NAMES = FALSE)
      return(paste0("[", paste(items, collapse = ","), "]"))
    } else {
      items <- vapply(seq_along(x), function(i) {
        key <- gsub('"', '\\"', nms[i], fixed = TRUE)
        paste0('"', key, '":', .rD2E_to_json(x[[i]]))
      }, character(1), USE.NAMES = FALSE)
      return(paste0("{", paste(items, collapse = ","), "}"))
    }
  }
  # fallback
  .rD2E_to_json(as.character(x))
}

.rD2E_from_json <- function(text) {
  jsonlite::fromJSON(text, simplifyVector = FALSE)
}

# =============================================================================
# HTTP helpers (webr::eval_js + synchronous XMLHttpRequest)
# =============================================================================

.rD2E_js_escape <- function(s) {
  s <- gsub("\\", "\\\\", s, fixed = TRUE)
  s <- gsub("'", "\\'", s, fixed = TRUE)
  s <- gsub("\n", "\\n", s, fixed = TRUE)
  s <- gsub("\r", "\\r", s, fixed = TRUE)
  s
}

.rD2E_GET <- function(url, headers = list()) {
  js_url <- .rD2E_js_escape(url)

  # Build setRequestHeader calls
  header_lines <- ""
  if (length(headers) > 0) {
    header_lines <- paste0(
      vapply(names(headers), function(k) {
        paste0("xhr.setRequestHeader('",
               .rD2E_js_escape(k), "','",
               .rD2E_js_escape(headers[[k]]), "');")
      }, character(1), USE.NAMES = FALSE),
      collapse = ""
    )
  }

  # Store result in globals to avoid returning JS objects from eval_js
  webr::eval_js(paste0(
    "(function(){",
    "var xhr=new XMLHttpRequest();",
    "xhr.open('GET','", js_url, "',false);",
    "xhr.withCredentials=true;",
    header_lines,
    "xhr.send();",
    "globalThis._rD2E_s=xhr.status;",
    "globalThis._rD2E_b=xhr.responseText;",
    "})()"
  ))
  status <- webr::eval_js("globalThis._rD2E_s")
  body <- webr::eval_js("globalThis._rD2E_b")

  if (status != 200) {
    stop(paste0("HTTP GET failed with status ", status, ": ", body))
  }

  .rD2E_from_json(body)
}

.rD2E_POST <- function(url, headers = list(), body_json = "{}") {
  js_url <- .rD2E_js_escape(url)
  js_body <- .rD2E_js_escape(body_json)

  # Build setRequestHeader calls
  header_lines <- ""
  if (length(headers) > 0) {
    header_lines <- paste0(
      vapply(names(headers), function(k) {
        paste0("xhr.setRequestHeader('",
               .rD2E_js_escape(k), "','",
               .rD2E_js_escape(headers[[k]]), "');")
      }, character(1), USE.NAMES = FALSE),
      collapse = ""
    )
  }

  # Store result in globals to avoid returning JS objects from eval_js
  webr::eval_js(paste0(
    "(function(){",
    "var xhr=new XMLHttpRequest();",
    "xhr.open('POST','", js_url, "',false);",
    "xhr.withCredentials=true;",
    header_lines,
    "xhr.send('", js_body, "');",
    "globalThis._rD2E_s=xhr.status;",
    "globalThis._rD2E_b=xhr.responseText;",
    "})()"
  ))
  status <- webr::eval_js("globalThis._rD2E_s")
  body <- webr::eval_js("globalThis._rD2E_b")

  list(status = status, content = .rD2E_from_json(body))
}

# =============================================================================
# Internal API helpers
# =============================================================================

.rD2E_getCohortDefinition <- function(cohortId) {
  host <- Sys.getenv("TREX__ENDPOINT_URL")
  auth_token <- Sys.getenv("TREX__AUTHORIZATION_TOKEN")
  dataset_id <- Sys.getenv("TREX__DATASET_ID")
  url <- paste0(host, "/d2e-webapi/cohortdefinition/", cohortId)

  .rD2E_GET(url, headers = list(
    Authorization = paste0("Bearer ", auth_token),
    datasetId = dataset_id
  ))
}

.rD2E_getDeployment <- function(deployment_name = "strategus_plugin",
                                 flow_name = "strategus_plugin") {
  host <- Sys.getenv("TREX__ENDPOINT_URL")
  url <- paste0(host, "/prefect/d2e/api/deployments/name/",
                flow_name, "/", deployment_name)
  auth_token <- Sys.getenv("TREX__AUTHORIZATION_TOKEN")

  result <- .rD2E_GET(url, headers = list(
    Authorization = paste0("Bearer ", auth_token)
  ))

  list(
    deploymentId = result$id,
    infrastructureDocId = result$infrastructure_document_id
  )
}

# =============================================================================
# Exported Functions
# =============================================================================

get_cohort_definition_set <- function(cohortIds, generateStats = FALSE) {
  if (length(cohortIds) == 0) {
    stop("Must provide a non-zero length cohortIds vector.")
  }

  cohortDefinitionSet <- data.frame(
    atlasId = integer(),
    cohortId = integer(),
    cohortName = character(),
    sql = character(),
    json = character(),
    logicDescription = character(),
    generateStats = logical(),
    stringsAsFactors = FALSE
  )

  for (i in seq_along(cohortIds)) {
    cohortId <- cohortIds[i]
    message(paste("Fetching cohortId:", cohortId))
    object <- .rD2E_getCohortDefinition(cohortId = cohortId)
    json <- .rD2E_to_json(object$expression)

    sql <- ""

    row <- data.frame(
      atlasId = as.integer(cohortId),
      cohortId = as.integer(cohortId),
      cohortName = as.character(object$name),
      sql = sql,
      json = json,
      logicDescription = ifelse(is.null(object$description),
                                 NA_character_,
                                 as.character(object$description)),
      generateStats = as.logical(generateStats),
      stringsAsFactors = FALSE
    )
    cohortDefinitionSet <- rbind(cohortDefinitionSet, row)
  }
  return(cohortDefinitionSet)
}

create_cohort_definition <- function(name, description, cohort_definition) {
  host <- Sys.getenv("TREX__ENDPOINT_URL")
  auth_token <- Sys.getenv("TREX__AUTHORIZATION_TOKEN")
  dataset_id <- Sys.getenv("TREX__DATASET_ID")
  url <- paste0(host, "/d2e-webapi/cohortdefinition/")
  expression <- NULL
  expressionType <- NULL

  if (is.null(name) || name == "") {
    stop("Name must be provided and cannot be empty.")
  }
  if (is.null(description) || description == "") {
    stop("Description must be provided and cannot be empty.")
  }
  if (is.null(cohort_definition) || length(cohort_definition) == 0) {
    stop("Cohort definition must be provided and cannot be empty.")
  }

  if (is.list(cohort_definition)) {
    cohort_definition <- .rD2E_to_json(cohort_definition)
  } else if (!is.character(cohort_definition)) {
    stop("cohort_definition must be a list or a JSON string.")
  }

  cohort_definition_parsed <- .rD2E_from_json(cohort_definition)
  if (!"expression" %in% names(cohort_definition_parsed)) {
    expression <- cohort_definition_parsed
  } else {
    if (is.null(cohort_definition_parsed$expression)) {
      stop("Cohort definition JSON must contain an 'expression' field.")
    }
    expression <- cohort_definition_parsed$expression
  }

  if (!"expressionType" %in% names(cohort_definition_parsed)) {
    expressionType <- "SIMPLE_EXPRESSION"
  } else {
    expressionType <- cohort_definition_parsed$expressionType
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

  body <- .rD2E_to_json(parameters)
  result <- .rD2E_POST(
    url,
    headers = list(
      "Content-Type" = "application/json",
      Authorization = paste0("Bearer ", auth_token),
      datasetid = dataset_id
    ),
    body_json = body
  )

  if (result$status != 200) {
    message(paste0("Status code: ", result$status))
    stop(paste0(
      "Error occurred while creating cohort definition for cohort: ", name
    ))
  }
  message(paste0("Cohort definition created successfully with id: ",
                  result$content$id))
  return(result$content)
}

run_strategus_flow <- function(analysisSpecification,
                               executionSettings = NULL,
                               options = list()) {
  host <- Sys.getenv("TREX__ENDPOINT_URL")
  auth_token <- Sys.getenv("TREX__AUTHORIZATION_TOKEN")
  url <- paste0(host,
                "/jobplugins/prefect/jupyter-kernel/flow-run/strategus")
  json_graph <- list()

  if (!is.null(analysisSpecification)) {
    json_graph$analysisSpecification <- .rD2E_to_json(analysisSpecification)
  }
  if (!is.null(executionSettings)) {
    json_graph$executionSettings <- .rD2E_to_json(executionSettings)
  }
  if (length(options) == 0) {
    options <- create_options()
  }

  if (options$studyId == "" || is.null(options$studyId)) {
    stop("Error: studyId must be set in options")
  }

  parameters <- list(
    json_graph = json_graph,
    options = options
  )

  body <- .rD2E_to_json(parameters)
  result <- .rD2E_POST(
    url,
    headers = list(
      "Content-Type" = "application/json",
      Authorization = paste0("Bearer ", auth_token)
    ),
    body_json = body
  )

  if (result$status == 200 || result$status == 201) {
    return(result$content)
  } else {
    stop(paste0("Request failed with status code ", result$status))
  }
}

create_options <- function(study_id = "",
                           upload_results = FALSE,
                           update_results_schema = TRUE,
                           run_table1 = FALSE) {
  dataset_id <- Sys.getenv("TREX__DATASET_ID")
  return(list(
    mode = "kernel",
    datasetId = dataset_id,
    uploadResults = upload_results,
    updateResultsSchema = update_results_schema,
    studyId = study_id,
    runTable1 = run_table1
  ))
}
