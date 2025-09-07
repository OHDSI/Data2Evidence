#!/usr/bin/env Rscript

args <- commandArgs(trailingOnly = TRUE)
required_packages <- unlist(strsplit(args[1], " "))

# Set variables
renv_version <- "1.1.4"
cran_repo_url <- "https://packagemanager.posit.co/cran/__linux__/noble/latest"
renv_config_sandbox_enabled <- FALSE
renv_paths_library <- "/usr/local/lib/R/site-library"
lockfile_location <- "/app/renv.lock"

# Install remotes to install renv
install.packages("remotes", repos = cran_repo_url)
remotes::install_version("renv", version = renv_version, repos = cran_repo_url)

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
