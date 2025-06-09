

#' Start running the Strategus flow in D2E
#'
#' This function creates a flow run in Prefect in D2E.
#' Internally the flow run starts a network study analysis on the given dataset
#' using the OHDSI Strategus R package.
#'
#' @param analysisSpecification AnalysisSpecification object created by Strategus::createEmptyAnalysisSpecificiations
#' @param executionSettings ExecutionSettings object created by Strategus::createCdmExecutionSettings
#' @return Response object with flow run details, id and status
#' @export
run_strategus_flow <- function(analysisSpecification, executionSettings) {
  # host <- "prefect": "http://${PROJECT_NAME:-d2e}-dataflow-gen-1:41120/api",
  host <- Sys.getenv("TREX__ENDPOINT_URL")
  auth_token <- Sys.getenv("TREX__AUTHORIZATION_TOKEN")
  dataset_id <- Sys.getenv("TREX__DATASET_ID")
  url <- paste0(host, "/jobplugins/prefect/jupyter-kernel/flow-run/strategus")
  
  analysisSpec <- ParallelLogger::convertSettingsToJson(analysisSpecification)
  execSettings <- ParallelLogger::convertSettingsToJson(executionSettings)
  json_graph = list(
        analysisSpecification = analysisSpec,
        executionSettings = execSettings
    )
  options = list(
        mode = 'kernel',
        datasetId = dataset_id
    )
  parameters <- list(
    json_graph = json_graph,
    options = options
  )

  # Send a POST request to the backend
  # add headers "Content-Type":"application/json" and "Authorization": "Bearer XXXXXYZZZZ"
  response <- httr::POST(url, body = parameters, encode = "json", httr::add_headers(
    `Content-Type` = "application/json",
    Authorization = paste0("Bearer ", auth_token)
  ))

  # Check if the request was successful
  if (httr::status_code(response) == 201 || httr::status_code(response) == 200) {
    return(httr::content(response))
  } else {
    # Return an error message
    stop(paste0("Request failed with status code ", httr::status_code(response)))
  }
}

get_deployment <- function(deployment_name = "strategus_plugin", flow_name = "strategus_plugin") {
  error_message <- "Error while getting prefect deployment"
  host <- Sys.getenv("TREX__ENDPOINT_URL")
  url <- paste0(host, "/prefect/api/deployments/name/", flow_name, "/", deployment_name)
  auth_token <- Sys.getenv("TREX__AUTHORIZATION_TOKEN")
  
  response <- tryCatch(
    expr = httr::GET(url, httr::add_headers(
        Authorization=paste0('Bearer ', auth_token)
    )),
    error = function(e) {
      stop(paste0("Error occurred while getting prefect deployment: ", e$message))
    }
  )
  
  if (httr::status_code(response) != 200) {
    stop(paste0(error_message, ": ", httr::status_code(response)))
  }
  
  result <- jsonlite::fromJSON(httr::content(response, "text"))
  
  list(
    deploymentId = result$id,
    infrastructureDocId = result$infrastructure_document_id
  )
}