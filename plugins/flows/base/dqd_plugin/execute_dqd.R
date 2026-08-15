# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(DataQualityDashboard)

#' Execute Data Quality Dashboard checks
#' @param cdmDatabaseSchema Name of the CDM schema
#' @param vocabDatabaseSchema Name of the vocabulary schema
#' @param resultsDatabaseSchema Name of the results schema
#' @param cdmSourceName Name of the CDM source
#' @param numThreads Number of threads to use
#' @param sqlOnly If TRUE, only SQL will be generated, not executed
#' @param outputFolder Folder to write the output to
#' @param outputFile File to write the output to
#' @param writeToTable If TRUE, results will be written to a table
#' @param verboseMode If TRUE, verbose mode will be enabled
#' @param checkLevels Levels of checks to run
#' @param checkNames Names of checks to run
#' @param cohortDefinitionId Cohort definition IDs to use
#' @param cdmVersion Version of the CDM
#' @param cohortDatabaseSchema Name of the cohort schema
#' @param cohortTableName Name of the cohort table
#' @param set_trex_env_string R code string to set TREX environment
#' @param setDBDriverEnv R code string to set DB driver environment
#' @param connectionDetailsString R code string to set connection details
#' @return None

execute_dqd <- function(
        set_trex_env_string,
        setDBDriverEnv,
        connectionDetailsString,
        cdmDatabaseSchema,
        vocabDatabaseSchema,
        resultsDatabaseSchema,
        cdmSourceName,
        numThreads,
        sqlOnly,
        outputFolder,
        outputFile,
        writeToTable,
        verboseMode,
        checkLevels,
        checkNames,
        cohortDefinitionId,
        cdmVersion,
        cohortDatabaseSchema,
        cohortTableName,
        translateDialect = NULL) {

    # Set TREX and DB driver environment variables and create connection details
    eval(parse(text = set_trex_env_string))
    eval(parse(text = setDBDriverEnv))
    eval(parse(text = connectionDetailsString))

    # Decouple the SqlRender dialect from the JDBC driver: HANA datasets connect with the
    # postgres driver (to trex pgwire) but must render HANA SQL. dbms() in DatabaseConnector
    # reads attr(connection, "dbms"), so overriding it on every connection DQD opens makes
    # SqlRender translate to `translateDialect` while the wire stays postgres/pgwire (the
    # passthrough ships the HANA SQL to HANA). No direct HANA driver, no pgt.
    if (!is.null(translateDialect) && nzchar(translateDialect)) {
        .ns <- asNamespace("DatabaseConnector")
        .original_connect <- get("connect", envir = .ns)
        .patched_connect <- function(...) {
            conn <- .original_connect(...)
            attr(conn, "dbms") <- translateDialect
            conn
        }
        assignInNamespace("connect", .patched_connect, ns = "DatabaseConnector")
        # rpy2 keeps the R session alive across Prefect tasks; restore the original on exit
        # so the dbms override doesn't leak into later runs in the same worker process.
        on.exit(
            assignInNamespace("connect", .original_connect, ns = "DatabaseConnector"),
            add = TRUE
        )
    }

    # Run executeDqChecks
    DataQualityDashboard::executeDqChecks(
        connectionDetails = connectionDetails,
        cdmDatabaseSchema = cdmDatabaseSchema,
        resultsDatabaseSchema = resultsDatabaseSchema,
        cdmSourceName = cdmSourceName,
        numThreads = numThreads,
        sqlOnly = sqlOnly,
        outputFolder = outputFolder,
        outputFile = outputFile,
        verboseMode = verboseMode,
        writeToTable = writeToTable,
        checkLevels = checkLevels,
        checkNames = checkNames,
        cdmVersion = cdmVersion,
        cohortDefinitionId = cohortDefinitionId,
        cohortDatabaseSchema = cohortDatabaseSchema,
        cohortTableName = cohortTableName
    )
}