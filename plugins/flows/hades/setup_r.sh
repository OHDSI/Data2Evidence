#!/usr/bin/env bash
# R package provisioning for the hades group: restores renv.lock (CRAN snapshot
# + OHDSI GitHub packages incl. the d2e forks) into the pixi env's own R
# library so rpy2 finds everything without configuration. Runs as the pixi
# `setup-r` task, cwd = plugin dir; compiles against the conda toolchain.
set -euo pipefail
# R CMD INSTALL runs --vanilla (no R profiles), so rJava's -Xmx512m default
# cannot be aligned with JAVA_TOOL_OPTIONS during package installs; -Xms1g
# would exceed it and abort JVM init at lazy-load (SqlRender). Runtime flow
# processes get the alignment via R_PROFILE_USER (rprofile_java.R).
unset JAVA_TOOL_OPTIONS
R CMD javareconf
Rscript -e 'if (!requireNamespace("renv", quietly = TRUE)) install.packages("renv", repos = "https://packagemanager.posit.co/cran/2025-09-22")'
Rscript -e 'renv::restore(lockfile = "renv.lock", library = .Library, prompt = FALSE)'
