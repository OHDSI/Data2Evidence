# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(Achilles)

# The join condition Achilles uses for its percentile running total: `p.rn <= s.rn`.
PERCENTILE_SELF_JOIN <- "p\\.rn\\s*<=\\s*s\\.rn"

#' Count Achilles percentile self-joins left in a piece of SQL
#' @param sql SQL text
#' @return Number of `p.rn <= s.rn` join conditions
count_percentile_self_joins <- function(sql) {
    lengths(regmatches(sql, gregexpr(PERCENTILE_SELF_JOIN, sql, perl = TRUE)))
}

#' Replace Achilles' percentile self-join with a running SUM() window
#'
#' Achilles' distribution analyses compute the cumulative count behind median/p10..p90 as
#'
#'   SELECT s.k, s.count_value, s.total, sum(p.total) AS accumulated
#'   FROM statsView s
#'   JOIN statsView p ON s.k = p.k AND p.rn <= s.rn
#'   GROUP BY s.k, s.count_value, s.total, s.rn
#'
#' which materialises ~n^2/2 rows per stratum and exhausts HANA's memory (#1898). statsView
#' has one row per (stratum, rn) and rn follows count_value order, so the running total
#'
#'   SUM(s.total) OVER (PARTITION BY s.k ORDER BY s.rn ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
#'
#' yields the same values from a single pass. The select list and FROM clause are kept, the
#' JOIN and GROUP BY go. Blocks whose join condition is anything other than `s.x = p.x`
#' equalities are left untouched. Works on the translated SQL, so it covers HANA reached
#' directly or through the trex passthrough alike.
#' @param sql Translated analysis SQL
#' @return SQL with every recognised self-join rewritten
rewrite_percentile_self_join <- function(sql) {
    # Pieces of the block above; (?is) = case-insensitive, '.' matches newlines.
    equality <- "s\\.\\w+\\s*=\\s*p\\.\\w+" # one `s.col = p.col` join key
    pattern <- paste0(
        "(?is)",
        "sum\\(\\s*p\\.total\\s*\\)", # the self-join aggregate being replaced
        "(\\s+as\\s+accumulated\\b[^;]*?\\bfrom\\s+(\\S+)\\s+s)", # 1: rest of select list + `FROM <table> s`; 2: the table
        "\\s+join\\s+\\2\\s+p\\s+on\\s+", # `JOIN <same table> p ON`
        "((?:", equality, "\\s+and\\s+)*)", # 3: zero or more `s.k = p.k AND` join keys
        PERCENTILE_SELF_JOIN,
        "\\s+group\\s+by\\s+[^();]*" # the GROUP BY list, dropped
    )

    rewrite_block <- function(block) {
        parts <- regmatches(block, regexec(pattern, block, perl = TRUE))[[1]]
        select_and_from <- parts[2]
        join_keys <- regmatches(parts[4], gregexpr(equality, parts[4], perl = TRUE))[[1]]
        lhs <- sub("^s\\.(\\w+).*$", "\\1", join_keys, perl = TRUE)
        rhs <- sub("^.*p\\.(\\w+)$", "\\1", join_keys, perl = TRUE)
        if (!identical(tolower(lhs), tolower(rhs))) {
            return(block) # joined on different columns: not the pattern we know, leave it
        }
        partition_by <- if (length(lhs)) paste0("PARTITION BY ", paste0("s.", lhs, collapse = ", "), " ") else ""
        paste0(
            "SUM(s.total) OVER (", partition_by, "ORDER BY s.rn ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)",
            select_and_from, "\n"
        )
    }

    matches <- gregexpr(pattern, sql, perl = TRUE)
    regmatches(sql, matches) <- list(vapply(regmatches(sql, matches)[[1]], rewrite_block, character(1), USE.NAMES = FALSE))
    sql
}

#' Drop failed analyses from the arguments of Achilles:::.mergeAchillesScratchTables
#'
#' Achilles unions every planned analysis's scratch table, so a single failed analysis - whose
#' table was never created - aborts the whole merge and drops every result of that type (#1898
#' lost all 43 distribution results to two OOM failures). An analysis that completed has a
#' COMPLETE log entry (a row in `logs`); a failed one logs ERROR instead and so has no row.
#' @param args Named argument list of the .mergeAchillesScratchTables call
#' @param logs Output of Achilles:::.parseLogs (needs an `analysisId` column), or NULL
#' @param log_warn Function receiving the warning text when analyses are dropped
#' @return `args` with failed analyses removed from `analysisIds`
drop_failed_from_merge_args <- function(args, logs, log_warn = function(msg) ParallelLogger::logWarn(msg)) {
    if (isTRUE(args$sqlOnly) || is.null(logs) || is.null(logs$analysisId)) {
        return(args)
    }
    completed <- unique(as.integer(stats::na.omit(logs$analysisId)))
    planned <- as.integer(args$resultsTable$analysisIds)
    planned <- planned[planned %in% as.integer(args$analysisIds)]
    failed <- setdiff(planned, completed)
    # An empty COMPLETE set means the log could not be read; keep Achilles' behaviour then.
    if (length(completed) == 0L || length(failed) == 0L) {
        return(args)
    }
    table_type <- if (is.null(args$resultsTable$detailType)) "results" else args$resultsTable$detailType
    log_warn(sprintf(
        "Merging %s without %d failed analyses (no scratch table): %s",
        table_type, length(failed), paste(failed, collapse = ", ")
    ))
    args$analysisIds <- setdiff(as.integer(args$analysisIds), failed)
    args
}

#' Execute Achilles analysis
#' @param cdmVersion Version of the CDM
#' @param cdmDatabaseSchema Name of the CDM schema
#' @param vocabDatabaseSchema Name of the vocabulary schema
#' @param resultsDatabaseSchema Name of the results schema
#' @param outputFolder Folder to write the output to
#' @param numThreads Number of threads to use
#' @param createTable If TRUE, results table will be created
#' @param sqlOnly If TRUE, only SQL will be generated, not executed
#' @param verboseMode If TRUE, verbose mode will be enabled
#' @param createIndices If TRUE, indices will be created on results tables
#' @param set_trex_env_string R code string to set TREX environment
#' @param setDBDriverEnv R code string to set DB driver environment
#' @param connectionDetailsString R code string to set connection details
#' @return None

execute_achilles <- function(
        set_trex_env_string,
        setDBDriverEnv,
        connectionDetailsString,
        cdmVersion,
        cdmDatabaseSchema,
        vocabDatabaseSchema,
        createTable,
        resultsDatabaseSchema,
        outputFolder,
        sqlOnly,
        numThreads,
        verboseMode,
        excludeAnalysisIds,
        createIndices,
        cacheId = NULL,
        translateDialect = NULL,
        tempEmulationSchema = NULL) {

    # Set TREX and DB driver environment variables and create connection details
    eval(parse(text = set_trex_env_string))
    eval(parse(text = setDBDriverEnv))
    eval(parse(text = connectionDetailsString))

    # BigQuery: no temp tables — SqlRender emulates them in this schema.
    if (!is.null(tempEmulationSchema) && nzchar(tempEmulationSchema)) {
        .orig_temp_emulation <- getOption("sqlRenderTempEmulationSchema")
        options(sqlRenderTempEmulationSchema = tempEmulationSchema)
        on.exit(options(sqlRenderTempEmulationSchema = .orig_temp_emulation), add = TRUE)
    }

    .has_cache <- !is.null(cacheId) && nzchar(cacheId)
    .has_dialect <- !is.null(translateDialect) && nzchar(translateDialect)

    # Decouple the SqlRender dialect from the JDBC driver: HANA datasets connect with the
    # postgres driver (to trex pgwire) but must render HANA SQL. Achilles renders its SQL
    # with SqlRender::loadRenderTranslateSql(dbms = connectionDetails$dbms) (e.g.
    # achilles_analysis_ddl.sql), NOT from the open connection, so the dialect override has
    # to live on connectionDetails$dbms. .wire_dbms keeps the real (postgres/pgwire) dbms so
    # .patched_connect can dial the postgres driver; the passthrough ships the HANA SQL to HANA.
    .wire_dbms <- connectionDetails$dbms
    if (.has_dialect) {
        connectionDetails$dbms <- translateDialect
    }

    # Patch DatabaseConnector::connect (Achilles opens many pooled connections) to:
    #  1. Force each connection onto the cache catalog via USE (trex DuckDB), and
    #  2. Restore the wire dbms for the actual JDBC connect (connectionDetails$dbms is the
    #     OHDSI dialect now), then tag the connection's dbms attr so any dbms(connection)
    #     consumers (renderTranslateExecuteSql) also translate to `translateDialect`.
    if (.has_cache || .has_dialect) {
        .ns <- asNamespace("DatabaseConnector")
        .original_connect <- get("connect", envir = .ns)
        .use_sql <- if (.has_cache) sprintf('USE "%s"', gsub('"', '""', cacheId, fixed = TRUE)) else NULL
        .patched_connect <- function(...) {
            args <- list(...)
            if (.has_dialect) {
                if (!is.null(args$connectionDetails)) {
                    args$connectionDetails$dbms <- .wire_dbms
                } else if (length(args) >= 1L && !is.null(args[[1]]$dbms)) {
                    args[[1]]$dbms <- .wire_dbms
                }
            }
            conn <- do.call(.original_connect, args)
            if (.has_dialect) {
                attr(conn, "dbms") <- translateDialect
            }
            if (!is.null(.use_sql)) {
                tryCatch(
                    DatabaseConnector::executeSql(
                        connection = conn,
                        sql = .use_sql,
                        progressBar = FALSE,
                        reportOverallTime = FALSE
                    ),
                    error = function(e) {
                        message(sprintf("[execute_achilles] USE \"%s\" failed: %s", cacheId, conditionMessage(e)))
                    }
                )
            }
            conn
        }
        assignInNamespace("connect", .patched_connect, ns = "DatabaseConnector")
        # rpy2 keeps the R session alive across Prefect tasks; restore the original on exit
        # so the USE/dbms override doesn't leak into later runs in the same worker process.
        on.exit(
            assignInNamespace("connect", .original_connect, ns = "DatabaseConnector"),
            add = TRUE
        )

        # HANA local temporary tables are session-scoped, but the trex pgwire passthrough
        # opens a fresh HANA connection per statement, so Achilles' `#` scratch tables would
        # vanish between statements. Achilles only switches scratchDatabaseSchema to "#" when
        # .supportsTempTables() is TRUE; force it FALSE for HANA so scratch tables stay
        # permanent in scratchDatabaseSchema (defaults to resultsDatabaseSchema).
        if (.has_dialect) {
            # Index creation on the results tables fails through the HANA trex passthrough; indices only optimize queries.
            createIndices <- FALSE

            .ns_ach <- asNamespace("Achilles")
            .original_supports <- get(".supportsTempTables", envir = .ns_ach)
            assignInNamespace(".supportsTempTables", function(...) FALSE, ns = "Achilles")
            on.exit(
                assignInNamespace(".supportsTempTables", .original_supports, ns = "Achilles"),
                add = TRUE
            )

            # Emulate `#temp` tables as permanent; native HANA temp tables don't survive the trex passthrough.
            .orig_temp_emulation <- getOption("sqlRenderTempEmulationSchema")
            options(sqlRenderTempEmulationSchema = resultsDatabaseSchema)
            on.exit(options(sqlRenderTempEmulationSchema = .orig_temp_emulation), add = TRUE)
        }
    }

    # Parse the log leniently (all dialects): a failed analysis's error text can break its 6-column layout and crash .parseLogs.
    .ns_achilles <- asNamespace("Achilles")
    .orig_parse_logs <- get(".parseLogs", envir = .ns_achilles)
    .fn_parse_id <- get(".parseAnalysisId", envir = .ns_achilles)
    .fn_parse_rt <- get(".parseRunTime", envir = .ns_achilles)
    assignInNamespace(".parseLogs", function(outputFolder) {
        logs <- tryCatch(
            utils::read.table(
                file = file.path(outputFolder, "log_achilles.txt"),
                header = FALSE, sep = "\t", stringsAsFactors = FALSE,
                fill = TRUE, quote = "", comment.char = ""
            ),
            error = function(e) NULL
        )
        empty <- data.frame(
            startTime = character(), thread = character(), logType = character(),
            package = character(), packageFunction = character(), comment = character(),
            analysisId = integer(), runTime = numeric(), stringsAsFactors = FALSE
        )
        if (is.null(logs) || ncol(logs) < 6) return(empty)
        logs <- logs[, 1:6]
        names(logs) <- c("startTime", "thread", "logType", "package", "packageFunction", "comment")
        logs <- logs[grepl("COMPLETE", logs$comment), , drop = FALSE]
        if (nrow(logs) == 0) return(empty)
        logs$analysisId <- NA
        logs$runTime <- NA
        for (i in seq_len(nrow(logs))) {
            logs[i, ]$analysisId <- .fn_parse_id(logs[i, ]$comment)
            logs[i, ]$runTime <- .fn_parse_rt(logs[i, ]$comment)
        }
        logs
    }, ns = "Achilles")
    on.exit(assignInNamespace(".parseLogs", .orig_parse_logs, ns = "Achilles"), add = TRUE)

    # HANA is reached either directly (dbms = "hana") or through the trex passthrough
    # (translateDialect = "hana", copied onto connectionDetails$dbms above); both render HANA SQL.
    .is_hana <- identical(tolower(connectionDetails$dbms), "hana")

    # HANA: rewrite the percentile self-join that runs distribution analyses out of memory.
    # achilles() renders every analysis's SQL in this process before dispatching it, so the
    # patch also covers numThreads > 1. The rewrite matches SQL text, so keep score: a self-join
    # left in place (Achilles or SqlRender changed the shape) is the #1898 OOM coming back.
    .rewrite_stats <- new.env()
    .rewrite_stats$analyses <- 0L # analyses that contained the self-join
    .rewrite_stats$rewritten <- 0L # self-joins replaced
    .rewrite_stats$left <- integer(0) # analysis ids with a self-join still in place
    if (.is_hana) {
        .orig_get_analysis_sql <- get(".getAnalysisSql", envir = .ns_achilles)
        assignInNamespace(".getAnalysisSql", function(...) {
            sql <- .orig_get_analysis_sql(...)
            before <- count_percentile_self_joins(sql)
            if (before == 0L) {
                return(sql)
            }
            sql <- rewrite_percentile_self_join(sql)
            after <- count_percentile_self_joins(sql)
            .rewrite_stats$analyses <- .rewrite_stats$analyses + 1L
            .rewrite_stats$rewritten <- .rewrite_stats$rewritten + (before - after)
            if (after > 0L) {
                analysis_id <- as.integer(list(...)$analysisId)
                .rewrite_stats$left <- c(.rewrite_stats$left, analysis_id)
                ParallelLogger::logWarn(sprintf(
                    "Analysis %d: %d percentile self-join(s) not rewritten; it may run HANA out of memory",
                    analysis_id, after
                ))
            }
            sql
        }, ns = "Achilles")
        on.exit(assignInNamespace(".getAnalysisSql", .orig_get_analysis_sql, ns = "Achilles"), add = TRUE)
    }

    # Merge only the scratch tables of analyses that completed (all dialects); see
    # drop_failed_from_merge_args. The lenient .parseLogs above supplies the COMPLETE entries.
    .orig_merge <- get(".mergeAchillesScratchTables", envir = .ns_achilles)
    assignInNamespace(".mergeAchillesScratchTables", function(...) {
        args <- list(...)
        logs <- NULL
        if (!isTRUE(args$sqlOnly) && !is.null(args$outputFolder)) {
            logs <- get(".parseLogs", envir = .ns_achilles)(args$outputFolder)
        }
        do.call(.orig_merge, drop_failed_from_merge_args(args, logs))
    }, ns = "Achilles")
    on.exit(assignInNamespace(".mergeAchillesScratchTables", .orig_merge, ns = "Achilles"), add = TRUE)

    result <- Achilles::achilles(
        connectionDetail = connectionDetails,
        cdmVersion = cdmVersion,
        cdmDatabaseSchema = cdmDatabaseSchema,
        createTable = createTable,
        resultsDatabaseSchema = resultsDatabaseSchema,
        outputFolder = outputFolder,
        sqlOnly = sqlOnly,
        numThreads = numThreads,
        verboseMode = verboseMode,
        excludeAnalysisIds = excludeAnalysisIds,
        createIndices = createIndices
    )

    # Logged here rather than from on.exit: achilles() unregisters its loggers when it returns.
    if (.is_hana) {
        left <- .rewrite_stats$left
        ParallelLogger::logInfo(sprintf(
            "HANA percentile rewrite: %d self-join(s) replaced across %d analyses; %d left unchanged%s",
            .rewrite_stats$rewritten, .rewrite_stats$analyses, length(left),
            if (length(left)) paste0(" (", paste(left, collapse = ", "), ")") else ""
        ))
    }
    result
}