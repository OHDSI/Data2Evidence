library(shinylive)

#' Build Shiny Live application assets
#' @param appDir Directory of the Shiny application
#' @param destDir Destination directory for the built assets
#' @return None

build_shiny_live <- function(appDir = "myapp", destDir = "docs") {
    shinylive::export(appdir = appDir, destdir = destDir)
}

# Parse command-line arguments when script is run directly
args <- commandArgs(trailingOnly = TRUE)

if (length(args) == 2) {
    appDir <- args[1]
    destDir <- args[2]
    cat(sprintf("Building Shiny Live assets...\n"))
    cat(sprintf("  App directory: %s\n", appDir))
    cat(sprintf("  Destination directory: %s\n", destDir))
    build_shiny_live(appDir = appDir, destDir = destDir)
    cat("Shiny Live assets built successfully.\n")
} else if (length(args) < 2 || length(args) > 2) {
    stop("Usage: Rscript build_shiny_live.R <appDir> <destDir>")
}

