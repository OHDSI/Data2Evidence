local({
  ns <- getNamespace("TreatmentPatterns")
  cls <- get("CDMInterface", envir = ns)

  patched <- function(cohorts, cohortTableName, andromeda, andromedaTableName, minEraDuration) {
    targetCohortId <- getCohortIds(cohorts, "target")
    n <- unlist(lapply(cohortTableName, function(cohortTable) {
      as.numeric(unlist(DatabaseConnector::renderTranslateQuerySql(
        connection = private$.connection,
        sql = "\n        SELECT COUNT(*)\n        FROM @resultSchema.@cohortTable\n        WHERE cohort_definition_id IN (@cohortIds)\n        GROUP BY subject_id;",
        resultSchema = private$.resultSchema, cohortTable = cohortTable, cohortIds = cohorts$cohortId
      )))
    }))
    private$dbAppendAttrition(n, andromeda, sort(cohorts$cohortId))

    sql <- lapply(cohortTableName, function(tableName) {
      SqlRender::loadRenderTranslateSql(
        sqlFilename = "selectData.sql", packageName = "TreatmentPatterns",
        dbms = private$.connection@dbms, tempEmulationSchema = private$.tempEmulationSchema,
        resultSchema = private$.resultSchema, cdmSchema = private$.cdmSchema,
        cohortTable = tableName, cohortIds = cohorts$cohortId, minEraDuration = minEraDuration
      )
    })

    # FIX: loadRenderTranslateSql appends a trailing semicolon. Embedding it directly
    # into sprintf("FROM (\n  %s\n) a") places the semicolon inside the subquery, which
    # causes splitSql to split mid-statement producing an incomplete CREATE TEMP TABLE.
    sql <- lapply(sql, function(s) trimws(sub(";[[:space:]]*$", "", s)))

    renderedSql <- paste(sql, collapse = "\nUNION ALL\n")
    DatabaseConnector::renderTranslateExecuteSql(
      connection = private$.connection, oracleTempSchema = private$.tempEmulationSchema,
      sql = sprintf("DROP TABLE IF EXISTS #tp_dbc_cohort_table;\n\n          SELECT *\n          INTO #tp_dbc_cohort_table\n          FROM (\n            %s\n          ) a;", renderedSql),
      tempEmulationSchema = private$.tempEmulationSchema
    )

    DatabaseConnector::renderTranslateQuerySqlToAndromeda(
      connection = private$.connection, andromeda = andromeda,
      andromedaTableName = andromedaTableName, tempEmulationSchema = private$.tempEmulationSchema,
      sql = "\n        SELECT\n          #tp_dbc_cohort_table.cohort_definition_id AS cohort_definition_id,\n          #tp_dbc_cohort_table.subject_id AS subject_id,\n          #tp_dbc_cohort_table.cohort_start_date,\n          #tp_dbc_cohort_table.cohort_end_date,\n          #tp_dbc_cohort_table.age,\n          #tp_dbc_cohort_table.sex,\n          #tp_dbc_cohort_table.subject_id_origin\n        FROM #tp_dbc_cohort_table\n        INNER JOIN (\n          SELECT #tp_dbc_cohort_table.subject_id\n          FROM #tp_dbc_cohort_table\n          WHERE #tp_dbc_cohort_table.cohort_definition_id IN (@targetCohortId)\n        ) AS cross_sec\n        ON cross_sec.subject_id = #tp_dbc_cohort_table.subject_id",
      targetCohortId = targetCohortId
    )

    names(andromeda[[andromedaTableName]]) <- tolower(names(andromeda[[andromedaTableName]]))
    if (inherits(private$.connection, "DatabaseConnectorJdbcConnection") &&
        private$.connection@dbms == "postgresql") {
      andromeda[[andromedaTableName]] <- andromeda[[andromedaTableName]] %>%
        dplyr::mutate(
          cohort_start_date = dplyr::sql("datediff('day', DATE '1970-01-01', cohort_start_date)"),
          cohort_end_date   = dplyr::sql("datediff('day', DATE '1970-01-01', cohort_end_date)")
        )
    } else {
      andromeda[[andromedaTableName]] <- andromeda[[andromedaTableName]] %>%
        dplyr::mutate(
          cohort_start_date = as.integer(.data$cohort_start_date),
          cohort_end_date   = as.integer(.data$cohort_end_date)
        )
    }

    n <- andromeda[[andromedaTableName]] %>%
      dplyr::group_by(.data$subject_id) %>% dplyr::summarise(n = dplyr::n()) %>% dplyr::pull()
    appendAttrition(
      toAdd = data.frame(number_records = sum(n), number_subjects = length(n), reason_id = 2,
        reason = sprintf("Removing records < minEraDuration (%s)", minEraDuration),
        time_stamp = as.numeric(Sys.time())),
      andromeda = andromeda
    )
    return(andromeda)
  }

  cls$set("private", "dbconFetchCohortTable", patched, overwrite = TRUE)
  message("Patched TreatmentPatterns::CDMInterface$dbconFetchCohortTable (trailing semicolon fix)")
})
