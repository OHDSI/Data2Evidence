library(httr)

send_request <- function(analysisSpecification, executionSettings) {
  deployment <- get_deployment()
  # host <- "prefect": "http://${PROJECT_NAME:-d2e}-dataflow-gen-1:41120/api",
  host <- Sys.getenv("TREX__ENDPOINT_URL")
  auth_token <- Sys.getenv("TREX__AUTHORIZATION_TOKEN")
  url <- paste0(host, "/prefect/api/deployments/", deployment['deploymentId'], "/create_flow_run")
  analysisSpec <- ParallelLogger::convertSettingsToJson(analysisSpecification)
  execSettings <- ParallelLogger::convertSettingsToJson(executionSettings)
  json_graph = list(
        analysisSpecification = analysisSpec,
        executionSettings = execSettings
    )
  options = list(
        mode = 'kernel'
    )
  parameters <- list(
    json_graph = ParallelLogger::convertSettingsToJson(json_graph),
    options = options
  )
  data <- list(
    state = list(
        type="SCHEDULED"
    ),
    parameters=parameters,
    empirical_policy = list(
        retries=0,
        retry_delay=0,
        resuming=FALSE
    )
  )

  # Send a POST request to the backend
  # add headers "Content-Type":"application/json" and "Authorization": "Bearer XXXXXYZZZZ"
  response <- httr::POST(url, body = data, encode = "json", add_headers(
    `Content-Type` = "application/json",
    Authorization = paste0("Bearer ", auth_token)
  ))

  # Check if the request was successful
  if (httr::status_code(response) == 201 | httr::status_code(response) == 200) {
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
    expr = httr::GET(url, add_headers(
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