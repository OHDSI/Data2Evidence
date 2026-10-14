# Tests for the pure helpers in ../execute_achilles.R (base R only):
# rewrite_percentile_self_join() and drop_failed_from_merge_args().
#
#   Rscript tests/test_execute_achilles.R
#
# The last block renders every Achilles analysis to HANA SQL and checks that no percentile
# self-join survives the rewrite; it is skipped when Achilles is not installed (e.g. locally)
# and runs inside the dataflow worker, which has it.

test_dir <- dirname(sub("^--file=", "", grep("^--file=", commandArgs(FALSE), value = TRUE)[1]))
if (is.na(test_dir) || !nzchar(test_dir)) test_dir <- "tests"
plugin_file <- file.path(test_dir, "..", "execute_achilles.R")

# execute_achilles.R attaches Achilles at the top, so pull out just the function definitions.
exprs <- parse(plugin_file)
wanted <- c("PERCENTILE_SELF_JOIN", "count_percentile_self_joins", "rewrite_percentile_self_join", "drop_failed_from_merge_args", "merge_has_survivors", "empty_merge_sql")
for (e in exprs) {
    if (is.call(e) && as.character(e[[1]]) %in% c("<-", "=") && as.character(e[[2]]) %in% wanted) eval(e)
}
stopifnot("helper functions not found in execute_achilles.R" = all(vapply(wanted, exists, logical(1))))

# Independent counter so a broken count_percentile_self_joins() cannot hide a broken rewrite.
count_self_joins <- function(sql) lengths(regmatches(sql, gregexpr("p\\.rn\\s*<=\\s*s\\.rn", sql, perl = TRUE)))
squash <- function(s) tolower(gsub("\\s+", " ", s))
passed <- 0L

check <- function(name, ok) {
    if (!isTRUE(ok)) stop(sprintf("FAILED: %s", name), call. = FALSE)
    passed <<- passed + 1L
}

# --- Achilles 706 shape: two partition keys ------------------------------------------------
sql_706 <- "
priorStats (stratum1_id, stratum2_id, count_value, total, accumulated) as
(
  SELECT s.stratum1_id, s.stratum2_id, s.count_value, s.total, sum(p.total) AS accumulated
  FROM statsView s
  join statsView p on s.stratum1_id = p.stratum1_id and s.stratum2_id = p.stratum2_id and p.rn <= s.rn
  group by s.stratum1_id, s.stratum2_id, s.count_value, s.total, s.rn
)
SELECT 706 as analysis_id FROM overallStats o"
out <- rewrite_percentile_self_join(sql_706)
check("706: self-join removed", count_self_joins(out) == 0L)
check("706: partitions by both keys in order",
      grepl("sum(s.total) over (partition by s.stratum1_id, s.stratum2_id order by s.rn rows between unbounded preceding and current row) as accumulated",
            squash(out), fixed = TRUE))
check("706: select list and FROM kept", grepl("select s.stratum1_id, s.stratum2_id, s.count_value, s.total, sum(s.total) over", squash(out), fixed = TRUE) &&
          grepl("from statsview s", squash(out), fixed = TRUE))
check("706: GROUP BY dropped", !grepl("group by s.stratum1_id", squash(out), fixed = TRUE))
check("706: rest of statement untouched", grepl("select 706 as analysis_id from overallstats o", squash(out), fixed = TRUE))
check("count helper: 1 before, 0 after", count_percentile_self_joins(sql_706) == 1L && count_percentile_self_joins(out) == 0L)

# --- Achilles 105 shape: no partition key, '#' scratch table name --------------------------
sql_105 <- "
priorStats (count_value, total, accumulated) as
(
  select s.count_value, s.total, sum(p.total) as accumulated
  from #statsView_105 s
  join #statsView_105 p on p.rn <= s.rn
  group by s.count_value, s.total, s.rn
)"
out <- rewrite_percentile_self_join(sql_105)
check("105: self-join removed", count_self_joins(out) == 0L)
check("105: no PARTITION BY", grepl("sum(s.total) over (order by s.rn rows between", squash(out), fixed = TRUE) &&
          !grepl("partition by", squash(out), fixed = TRUE))

# --- Achilles 1313 shape: upper case, newlines inside the join condition -------------------
sql_1313 <- "
priorStats (stratum_id, count_value, total, accumulated) AS
(
 SELECT s.stratum_id,
	s.count_value,
	s.total,
	SUM(p.total) AS accumulated
FROM statsView s
JOIN
	statsView p
ON
	s.stratum_id = p.stratum_id
AND
	p.rn <= s.rn
GROUP BY
	s.stratum_id,
	s.count_value,
	s.total,
	s.rn
)"
out <- rewrite_percentile_self_join(sql_1313)
check("1313: self-join removed", count_self_joins(out) == 0L)
check("1313: single partition key", grepl("over (partition by s.stratum_id order by s.rn", squash(out), fixed = TRUE))

# --- Guard rails ---------------------------------------------------------------------------
sql_other_join <- "
  select s.k, s.count_value, s.total, sum(p.total) as accumulated
  from statsView s
  join statsView p on s.k = p.other_k and p.rn <= s.rn
  group by s.k, s.count_value, s.total, s.rn"
check("join on different column names is left alone", identical(rewrite_percentile_self_join(sql_other_join), sql_other_join))

sql_different_tables <- "
  select s.count_value, s.total, sum(p.total) as accumulated
  from statsView s
  join otherView p on p.rn <= s.rn
  group by s.count_value, s.total, s.rn"
check("join to a different table is left alone", identical(rewrite_percentile_self_join(sql_different_tables), sql_different_tables))

sql_plain <- "select count(*) as count_value from cdm.person"
check("SQL without the pattern is returned unchanged", identical(rewrite_percentile_self_join(sql_plain), sql_plain))

two_blocks <- paste(sql_105, sql_1313, sep = ";\n")
check("every block in a multi-statement script is rewritten", count_self_joins(rewrite_percentile_self_join(two_blocks)) == 0L)
check("rewrite is idempotent", identical(rewrite_percentile_self_join(out), out))

# --- drop_failed_from_merge_args: merge survives a failed analysis -------------------------
merge_args <- list(
    resultsTable = list(detailType = "results_dist", tablePrefix = "tmpach_dist", analysisIds = c(103L, 107L, 706L, 1815L)),
    analysisIds = c(0L, 1L, 103L, 107L, 706L, 1815L), # every planned analysis, both result types
    sqlOnly = FALSE, outputFolder = "unused"
)
warned <- character(0)
warn <- function(msg) warned <<- c(warned, msg)

# 107 and 706 failed (no COMPLETE row); NA is a COMPLETE line without an analysis id (merge step).
logs <- data.frame(analysisId = c(0L, 1L, 103L, 1815L, NA), runTime = "1 secs", stringsAsFactors = FALSE)
out <- drop_failed_from_merge_args(merge_args, logs, warn)
check("merge: failed analyses dropped from analysisIds", identical(sort(out$analysisIds), c(0L, 1L, 103L, 1815L)))
check("merge: the rest of the args is untouched", identical(out$resultsTable, merge_args$resultsTable) && identical(out$outputFolder, "unused"))
check("merge: warning names the dropped analyses", length(warned) == 1L && grepl("results_dist without 2 failed analyses .*: 107, 706$", warned))

warned <- character(0)
all_done <- data.frame(analysisId = c(0L, 1L, 103L, 107L, 706L, 1815L), runTime = "1 secs", stringsAsFactors = FALSE)
check("merge: nothing failed -> args unchanged, no warning", identical(drop_failed_from_merge_args(merge_args, all_done, warn), merge_args) && length(warned) == 0L)

# analysisId may come back as character/numeric from the log parser
as_chr <- data.frame(analysisId = c("0", "1", "103", "1815"), stringsAsFactors = FALSE)
check("merge: character ids from the log are handled", identical(sort(drop_failed_from_merge_args(merge_args, as_chr, warn)$analysisIds), c(0L, 1L, 103L, 1815L)))

# Guard rails: an unreadable/empty log or sqlOnly must fall back to Achilles' own behaviour.
warned <- character(0)
empty <- data.frame(analysisId = integer(0), runTime = character(0), stringsAsFactors = FALSE)
check("merge: empty log -> unchanged", identical(drop_failed_from_merge_args(merge_args, empty, warn), merge_args))
check("merge: NULL log -> unchanged", identical(drop_failed_from_merge_args(merge_args, NULL, warn), merge_args))
check("merge: log without analysisId column -> unchanged", identical(drop_failed_from_merge_args(merge_args, data.frame(x = 1), warn), merge_args))
check("merge: sqlOnly -> unchanged", identical(drop_failed_from_merge_args(modifyList(merge_args, list(sqlOnly = TRUE)), logs, warn), modifyList(merge_args, list(sqlOnly = TRUE))))
check("merge: guard rails never warn", length(warned) == 0L)

# Only this result type's analyses count as planned: a failed *count* analysis (1801) must not
# be reported while merging the distribution table, and vice versa.
cross <- modifyList(merge_args, list(analysisIds = c(0L, 1L, 103L, 107L, 706L, 1801L, 1815L)))
out <- drop_failed_from_merge_args(cross, data.frame(analysisId = c(0L, 1L, 103L, 107L, 706L, 1815L)), warn)
check("merge: failures of the other result type are ignored", identical(out, cross))

# No survivors: every distribution analysis failed while the count analyses (0, 1) completed.
none_left <- drop_failed_from_merge_args(merge_args, data.frame(analysisId = c(0L, 1L)), warn)
check("merge: no survivors leaves only the other table's ids", identical(sort(none_left$analysisIds), c(0L, 1L)))
check("merge_has_survivors: FALSE when this table's ids are all gone", !merge_has_survivors(none_left))
check("merge_has_survivors: TRUE with one survivor", merge_has_survivors(out))

# --- Every installed Achilles analysis renders to HANA with no self-join left ---------------
if (requireNamespace("Achilles", quietly = TRUE) && requireNamespace("SqlRender", quietly = TRUE)) {
    dir <- system.file("sql/sql_server/analyses", package = "Achilles")
    files <- list.files(dir, pattern = "^[0-9]+\\.sql$")
    left <- character(0)
    had_join <- 0L
    for (f in files) {
        sql <- suppressMessages(SqlRender::loadRenderTranslateSql(
            sqlFilename = file.path("analyses", f), packageName = "Achilles", dbms = "hana",
            warnOnMissingParameters = FALSE, scratchDatabaseSchema = "#", cdmDatabaseSchema = "CDM",
            resultsDatabaseSchema = "RES", schemaDelim = "s_", tempAchillesPrefix = "tmpach",
            tempEmulationSchema = NULL, source_name = "x", achilles_version = "1.7.2",
            cdmVersion = "5.4", singleThreaded = TRUE
        ))
        if (count_self_joins(sql) == 0L) next
        had_join <- had_join + 1L
        if (count_self_joins(rewrite_percentile_self_join(sql)) > 0L) left <- c(left, f)
    }
    check("Achilles: at least one distribution analysis found", had_join > 0L)
    check(sprintf("Achilles: no analysis keeps a self-join (left: %s)", paste(left, collapse = ",")), length(left) == 0L)
    cat(sprintf("Achilles %s: %d analyses with the pattern, all rewritten\n", packageVersion("Achilles"), had_join))

    # empty_merge_sql renders a valid, typed, empty merge for the dialects D2E runs on.
    dist_schema <- utils::read.csv(system.file("csv", "schemas", "schema_achilles_results_dist.csv", package = "Achilles"))
    empty_args <- list(
        resultsTable = list(detailType = "results_dist", tablePrefix = "tmpach_dist", schema = dist_schema, analysisIds = c(103L, 706L)),
        analysisIds = c(0L, 1L), createTable = TRUE, resultsDatabaseSchema = "RES", tempEmulationSchema = NULL,
        smallCellCount = 5, connectionDetails = list(dbms = "hana")
    )
    for (dbms in c("hana", "postgresql", "bigquery")) {
        empty_args$connectionDetails$dbms <- dbms
        sql <- squash(suppressMessages(empty_merge_sql(empty_args)))
        check(sprintf("empty merge (%s): targets achilles_results_dist", dbms), grepl("res.achilles_results_dist", sql, fixed = TRUE))
        check(sprintf("empty merge (%s): placeholder count_value is -1", dbms), grepl("cast(-1 as", sql, fixed = TRUE))
        check(sprintf("empty merge (%s): placeholder row is filtered out", dbms), grepl("where count_value > 0", sql, fixed = TRUE))
        check(sprintf("empty merge (%s): no empty FROM ( ) Q", dbms), !grepl("from ( ) q", sql, fixed = TRUE))
    }
    check("empty merge (hana): FROM-less select gets FROM DUMMY", grepl("from dummy", squash(suppressMessages(empty_merge_sql(modifyList(empty_args, list(connectionDetails = list(dbms = "hana")))))), fixed = TRUE))
} else {
    cat("Achilles not installed: skipping the full-analysis render check\n")
}

cat(sprintf("OK: %d checks passed\n", passed))
