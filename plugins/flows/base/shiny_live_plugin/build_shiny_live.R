library(shinylive)

# R dashboards run in the browser through webR, so every package an app uses
# needs a WebAssembly build, which repo.r-wasm.org provides. shinylive::export()
# can bundle these, but it works out an app's dependencies from the packages
# installed locally, and the flow worker does not have dashboard packages such
# as echarts4r or reactable installed, so the build fails.
#
# Instead, bundle_wasm_packages() resolves the app's packages and their
# dependencies from the repo's own package index and downloads them into the
# export, the way Python Shinylive bundles from Pyodide's package list. The
# dashboard is then self-contained: viewers' browsers do not need to reach
# repo.r-wasm.org.
#
# The bundle layout and metadata.rds format copy what shinylive 0.3.0 writes
# itself (download_wasm_packages() in its R/packages.R), which is not a public
# API. shinylive is pinned in plugins/flows/base/renv.lock and
# renv.aarch64.lock; check this still matches when upgrading it.

WASM_REPO <- "https://repo.r-wasm.org"

#' Bundle the WebAssembly builds of an app's packages into destDir
#' @param appDir Directory of the Shiny application
#' @param destDir Destination directory for the built assets
#' @return None. Stops if a package has no WebAssembly build.
bundle_wasm_packages <- function(appDir, destDir) {
    r_version <- sub("\\.[^.]+$", "", shinylive:::WEBR_R_VERSION)
    contrib <- sprintf("%s/bin/emscripten/contrib/%s", WASM_REPO, r_version)

    index <- utils::available.packages(contriburl = contrib)
    if (nrow(index) == 0) {
        stop(sprintf("Could not read the WebAssembly package list from %s", contrib))
    }
    # The index's "webr" entry is an unrelated CRAN package with a large
    # dependency tree. The Wasm builds that import webr (e.g. httpuv) mean
    # webR's own package, which is built into the runtime, so drop it.
    index <- index[rownames(index) != "webr", , drop = FALSE]

    with_dependencies <- function(pkgs) {
        deps <- tools::package_dependencies(
            pkgs, db = index, which = c("Depends", "Imports"), recursive = TRUE)
        unique(c(pkgs, unlist(deps, use.names = FALSE)))
    }

    # Already part of the webR runtime that shinylive ships, as in shinylive's
    # own export: base R packages and shiny, bslib and renv with their
    # dependencies.
    built_in <- c(
        rownames(utils::installed.packages(priority = "base")),
        "webr",
        with_dependencies(c("shiny", "bslib", "renv"))
    )

    app_packages <- unique(renv::dependencies(appDir, quiet = TRUE)$Package)
    app_packages <- setdiff(app_packages, built_in)

    unavailable <- setdiff(app_packages, rownames(index))
    if (length(unavailable) > 0) {
        stop(sprintf(
            "These packages aren't available for R dashboards: %s. Dashboards run in the browser, so they can only use packages published at %s.",
            paste(sort(unavailable), collapse = ", "), WASM_REPO))
    }

    to_bundle <- setdiff(with_dependencies(app_packages), built_in)
    cat(sprintf("Bundling %d WebAssembly packages: %s\n",
        length(to_bundle), paste(sort(to_bundle), collapse = ", ")))

    packages_dir <- file.path(destDir, "shinylive", "webr", "packages")
    dir.create(packages_dir, recursive = TRUE, showWarnings = FALSE)

    metadata <- list()
    for (pkg in to_bundle) {
        version <- index[pkg, "Version"]
        filename <- sprintf("%s_%s.tgz", pkg, version)
        url <- sprintf("%s/%s", contrib, filename)
        dir.create(file.path(packages_dir, pkg), showWarnings = FALSE)
        utils::download.file(url, file.path(packages_dir, pkg, filename),
            mode = "wb", quiet = TRUE)
        metadata[[pkg]] <- list(
            name = pkg,
            version = version,
            ref = sprintf("%s@%s", pkg, version),
            type = "package",
            cached = TRUE,
            assets = list(list(filename = filename, url = url)),
            path = sprintf("packages/%s/%s", pkg, filename)
        )
    }
    saveRDS(metadata, file.path(packages_dir, "metadata.rds"))
}

#' Build Shiny Live application assets
#' @param appDir Directory of the Shiny application
#' @param destDir Destination directory for the built assets
#' @return None

build_shiny_live <- function(appDir = "myapp", destDir = "docs") {
    bundle_wasm_packages(appDir = appDir, destDir = destDir)
    # The packages are bundled above, so shinylive must not try to bundle them
    # from the local library.
    shinylive::export(appdir = appDir, destdir = destDir, wasm_packages = FALSE)
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
