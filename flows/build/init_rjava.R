#!/usr/bin/env Rscript

# Initialize rJava with Java options from JAVA_TOOL_OPTIONS environment variable
# This script must be sourced BEFORE any R packages that depend on rJava are loaded

init_rjava_with_env_options <- function() {
  # Get JAVA_TOOL_OPTIONS from environment
  java_tool_options <- Sys.getenv("JAVA_TOOL_OPTIONS", unset = "")
  
  if (nchar(java_tool_options) == 0) {
    cat("Warning: JAVA_TOOL_OPTIONS not set, using rJava defaults\n")
    return(invisible(NULL))
  }
  
  cat("Initializing rJava with JAVA_TOOL_OPTIONS:", java_tool_options, "\n")
  
  # Parse JAVA_TOOL_OPTIONS into individual parameters
  options_list <- strsplit(java_tool_options, "\\s+")[[1]]
  options_list <- options_list[nchar(options_list) > 0]
  
  if ("package:rJava" %in% search()) {
    cat("Warning: rJava is already loaded. Cannot reinitialize.\n")
    return(invisible(NULL))
  }

  # Load rJava library
  # Initialize JVM with the parsed options
  tryCatch({
    options('java.parameters' = options_list)
    suppressPackageStartupMessages(library(rJava))
    .jinit()
    cat("rJava initialized successfully with custom parameters\n")

    runtime <- .jcall("java/lang/Runtime", "Ljava/lang/Runtime;", "getRuntime")
    max_memory <- .jcall(runtime, "J", "maxMemory")
    total_memory <- .jcall(runtime, "J", "totalMemory")

    cat(sprintf("Java Max Memory: %.2f GB\n", max_memory / (1024^3)))
    cat(sprintf("Java Total Memory: %.2f GB\n", total_memory / (1024^3)))

  }, error = function(e) {
    cat("Error initializing rJava:", conditionMessage(e), "\n")
  })

  invisible(NULL)
}

init_rjava_with_env_options()
