#!/usr/bin/env Rscript

args <- commandArgs(trailingOnly = TRUE)
required_packages <- unlist(strsplit(args[1], " "))

# Set variables
renv_config_sandbox_enabled <- FALSE
renv_paths_library <- "/usr/local/lib/R/site-library"
lockfile_location <- "/app/renv.lock"

Sys.setenv(RENV_CONFIG_SANDBOX_ENABLED = renv_config_sandbox_enabled)
Sys.setenv(RENV_PATHS_LIBRARY = renv_paths_library)
.libPaths(renv_paths_library)
renv::restore(lockfile = lockfile_location, library = renv_paths_library, prompt = FALSE)

installed <- rownames(installed.packages())
missing <- setdiff(required_packages, installed)
if (length(missing) > 0) {
stop(paste('Missing packages:', paste(missing, collapse = ', ')))
} else {
  cat('All required packages are installed.\n')
}
