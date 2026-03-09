options(
  # Where repos are downloaded from 
  repos = c(
    CRAN = "https://packagemanager.posit.co/cran/__linux__/noble/latest"
    )
)

if (file.exists("/app/init_rjava.R")) {
  tryCatch({
    cat("file exists, initializing rJava", "\n")
    source("/app/init_rjava.R")
  }, error = function(e) {
    cat("Warning: Could not source rJava initialization script:", conditionMessage(e), "\n")
  })
}