// Builds the R bootstrap that restores d2e's rD2E support on top of the
// upstream react-notebook WebR kernel. The upstream library (trex-notebook
// `notebook` branch) made the kernel generic: it no longer bundles rD2E or
// lists it in its library() shim. So we define the rD2E functions here (from
// the app's rD2E.R, injected at build time as __RD2E_SOURCE__) and make
// `library(rD2E)` / `require(rD2E)` succeed — mirroring how pyqeBootstrap layers
// d2e's pyqe onto the generic Pyodide kernel.
//
// __RD2E_SOURCE__ is provided by the app's Vite `define` (see vite.config.ts);
// it reads src/kernels/rD2E.R as a JSON string so R escape sequences survive
// (a `?raw` import would corrupt them via template-literal interpolation).
declare const __RD2E_SOURCE__: string

const rD2ESource: string =
  typeof __RD2E_SOURCE__ !== 'undefined' ? __RD2E_SOURCE__ : ''

// Functions defined by rD2E.R that get attached to the search path under the
// "rD2E" name (kept in sync with the top-level defs in src/kernels/rD2E.R).
const RD2E_FUNCTIONS = [
  'get_cohort_definition_set',
  'create_cohort_definition',
  'run_strategus_flow',
  'create_options',
  '.rD2E_to_json',
  '.rD2E_from_json',
  '.rD2E_js_escape',
  '.rD2E_GET',
  '.rD2E_POST',
  '.rD2E_getCohortDefinition',
  '.rD2E_getDeployment',
]

/**
 * Build the R code that loads rD2E into a freshly-connected WebR session.
 *
 * NOTE: the WebR kernel's execute() pre-scans code for `library(...)` /
 * `require(...)` calls and tries to install them. This bootstrap deliberately
 * contains no such literal calls (it only ever references "library"/"require"
 * as quoted binding names) so it does not trigger spurious installs.
 */
export function buildRD2EBootstrapCode(): string {
  const fnVector = RD2E_FUNCTIONS.map((f) => `"${f}"`).join(', ')
  return `
# --- d2e rD2E bootstrap (app-level) -----------------------------------------
# 0) Ensure jsonlite (rD2E's only external dependency, used by .rD2E_from_json)
#    is installed + loaded. The refactored upstream kernel installs checkmate
#    but no longer jsonlite. This literal call is intentional: the kernel's
#    pre-install scanner installs it from the (mirrored) repo OUTSIDE captureR.
library(jsonlite)

# 1) Define the rD2E functions in the global environment.
${rD2ESource}

# 2) Attach them to the search path under the name "rD2E".
local({
  fns <- c(${fnVector})
  e <- new.env(parent = emptyenv())
  for (fn in fns) {
    if (exists(fn, envir = .GlobalEnv)) assign(fn, get(fn, envir = .GlobalEnv), envir = e)
  }
  if (!"rD2E" %in% search()) attach(e, name = "rD2E")
})

# 3) Make rD2E recognised by the package loaders and the namespace operators.
#    The upstream shim knows the Strategus packages but not rD2E; wrap each so
#    rD2E short-circuits (loaders no-op; rD2E::fn / rD2E:::fn resolve from the
#    global env where rD2E.R was sourced) and every other package delegates
#    unchanged (match.call preserves the literal symbols).
local({
  baseEnv <- as.environment("package:base")
  prevLib <- get("library", envir = baseEnv)
  prevReq <- get("require", envir = baseEnv)
  prevDcolon <- get("::", envir = baseEnv)
  prevTcolon <- get(":::", envir = baseEnv)

  libShim <- function(package, ...) {
    nm <- tryCatch(as.character(substitute(package)), error = function(e) "")
    if (identical(nm, "rD2E")) return(invisible("rD2E"))
    mc <- match.call(); mc[[1L]] <- prevLib; eval(mc, parent.frame())
  }
  reqShim <- function(package, ...) {
    nm <- tryCatch(as.character(substitute(package)), error = function(e) "")
    if (identical(nm, "rD2E")) return(invisible(TRUE))
    mc <- match.call(); mc[[1L]] <- prevReq; eval(mc, parent.frame())
  }
  resolveRD2E <- function(name_str) {
    specific <- paste0(".rD2E_", name_str)
    if (exists(specific, envir = .GlobalEnv)) return(get(specific, envir = .GlobalEnv))
    if (exists(name_str, envir = .GlobalEnv)) return(get(name_str, envir = .GlobalEnv))
    stop("rD2E has no exported object '", name_str, "'")
  }
  dcolonShim <- function(pkg, name) {
    pkg_str <- tryCatch(as.character(substitute(pkg)), error = function(e) "")
    if (identical(pkg_str, "rD2E")) return(resolveRD2E(as.character(substitute(name))))
    mc <- match.call(); mc[[1L]] <- prevDcolon; eval(mc, parent.frame())
  }
  tcolonShim <- function(pkg, name) {
    pkg_str <- tryCatch(as.character(substitute(pkg)), error = function(e) "")
    if (identical(pkg_str, "rD2E")) return(resolveRD2E(as.character(substitute(name))))
    mc <- match.call(); mc[[1L]] <- prevTcolon; eval(mc, parent.frame())
  }

  unlockBinding("library", baseEnv); assign("library", libShim, envir = baseEnv); lockBinding("library", baseEnv)
  unlockBinding("require", baseEnv); assign("require", reqShim, envir = baseEnv); lockBinding("require", baseEnv)
  unlockBinding("::", baseEnv); assign("::", dcolonShim, envir = baseEnv); lockBinding("::", baseEnv)
  unlockBinding(":::", baseEnv); assign(":::", tcolonShim, envir = baseEnv); lockBinding(":::", baseEnv)
})
# --- end rD2E bootstrap ------------------------------------------------------
`
}
