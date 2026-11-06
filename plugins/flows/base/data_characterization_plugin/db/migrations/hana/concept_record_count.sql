CREATE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.achilles_result_concept_count
(
  concept_id int,
  record_count bigint,
  descendant_record_count bigint,
  person_count bigint,
  descendant_person_count bigint
);

CREATE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts
AS(
WITH counts AS (
   SELECT stratum_1 AS concept_id, MAX (count_value) AS agg_count_value
  FROM ${DATA_CHARACTERIZATION_SCHEMA}.achilles_results
  WHERE analysis_id IN (2, 4, 5, 201, 225, 301, 325, 401, 425, 501, 505, 525, 601, 625, 701, 725, 801, 825,
    826, 827, 901, 1001, 1201, 1203, 1425, 1801, 1825, 1826, 1827, 2101, 2125, 2301)
  GROUP BY stratum_1
    UNION ALL
   SELECT stratum_2 AS concept_id, SUM (count_value) AS agg_count_value
  FROM ${DATA_CHARACTERIZATION_SCHEMA}.achilles_results
  WHERE analysis_id IN (405, 605, 705, 805, 807, 1805, 1807, 2105)
  GROUP BY stratum_2
   )
 SELECT
concept_id,
  agg_count_value
FROM
counts
) WITH NO DATA;
-- The helper tables are only dropped at the end of this script, and execute_sql_script ignores
-- HANA's duplicate-table error. On a retry after a mid-script failure the CREATE is skipped and
-- the INSERT would append to the previous attempt's rows, so clear each helper before filling it.
TRUNCATE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts;
INSERT INTO ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts
WITH counts AS (
   SELECT stratum_1 AS concept_id, MAX (count_value) AS agg_count_value
  FROM ${DATA_CHARACTERIZATION_SCHEMA}.achilles_results
  WHERE analysis_id IN (2, 4, 5, 201, 225, 301, 325, 401, 425, 501, 505, 525, 601, 625, 701, 725, 801, 825,
    826, 827, 901, 1001, 1201, 1203, 1425, 1801, 1825, 1826, 1827, 2101, 2125, 2301)
  GROUP BY stratum_1
    UNION ALL
   SELECT stratum_2 AS concept_id, SUM (count_value) AS agg_count_value
  FROM ${DATA_CHARACTERIZATION_SCHEMA}.achilles_results
  WHERE analysis_id IN (405, 605, 705, 805, 807, 1805, 1807, 2105)
  GROUP BY stratum_2
   )
 SELECT
concept_id,
  agg_count_value
FROM
counts;

CREATE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts_person
AS(
WITH counts_person AS (
   SELECT stratum_1 AS concept_id, MAX (count_value) AS agg_count_value
  FROM ${DATA_CHARACTERIZATION_SCHEMA}.achilles_results
  WHERE analysis_id IN (200, 240, 400, 440, 540, 600, 640, 700, 740, 800, 840, 900, 1000, 1300, 1340, 1800, 1840, 2100, 2140, 2200)
  GROUP BY stratum_1
 )
 SELECT
concept_id,
  agg_count_value
FROM
counts_person) WITH NO DATA;
TRUNCATE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts_person;
INSERT INTO ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts_person
WITH counts_person AS (
   SELECT stratum_1 AS concept_id, MAX (count_value) AS agg_count_value
  FROM ${DATA_CHARACTERIZATION_SCHEMA}.achilles_results
  WHERE analysis_id IN (200, 240, 400, 440, 540, 600, 640, 700, 740, 800, 840, 900, 1000, 1300, 1340, 1800, 1840, 2100, 2140, 2200)
  GROUP BY stratum_1
 )
 SELECT
concept_id,
  agg_count_value
FROM
counts_person;

CREATE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.tmp_concepts
AS(
WITH concepts AS (
   SELECT concept_id AS ancestor_id, IFNULL(CAST(ca.descendant_concept_id AS varchar(50)), concept_id) AS descendant_id
  FROM (
    SELECT concept_id FROM ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts
      UNION
    -- include any ancestor concept that has a descendant in counts
    SELECT DISTINCT CAST(ancestor_concept_id AS varchar(50)) concept_id
    FROM ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts c
    JOIN ${VOCAB_SCHEMA}.concept_ancestor ca ON CAST(ca.descendant_concept_id AS varchar(50)) = c.concept_id
  ) c
  LEFT JOIN ${VOCAB_SCHEMA}.concept_ancestor ca ON c.concept_id = CAST(ca.ancestor_concept_id AS varchar(50))
 )
 SELECT
ancestor_id,
  descendant_id
FROM
concepts) WITH NO DATA;
TRUNCATE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.tmp_concepts;
-- Fill tmp_concepts the lean way for HANA's in-memory engine (#1898). The small side
-- (tmp_counts) is cast to INTEGER once so the joins run on concept_ancestor's own integer
-- columns instead of casting the largest vocabulary table to varchar. Only descendants that
-- carry a record or person count are expanded: uncounted ones add nothing to the sums below.
-- One placeholder row per ancestor keeps every ancestor in the result. Its descendant is NULL
-- (adds nothing), or the concept itself when it has no hierarchy rows at all, matching the
-- IFNULL(..., concept_id) of the original query.
-- No semicolons in comments: run_sql_statements splits the script on every one.
INSERT INTO ${DATA_CHARACTERIZATION_SCHEMA}.tmp_concepts
WITH counted_concepts AS (
  SELECT DISTINCT CAST(concept_id AS INTEGER) AS concept_id
  FROM ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts
),
concepts_with_any_count AS (
  SELECT concept_id FROM counted_concepts
    UNION
  SELECT CAST(concept_id AS INTEGER)
  FROM ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts_person
),
ancestor_concepts AS (
  SELECT concept_id FROM counted_concepts
    UNION
  -- include any ancestor concept that has a descendant in counts
  SELECT ca.ancestor_concept_id
  FROM ${VOCAB_SCHEMA}.concept_ancestor ca
  JOIN counted_concepts c ON ca.descendant_concept_id = c.concept_id
)
SELECT
  CAST(ca.ancestor_concept_id AS varchar(50)) AS ancestor_id,
  CAST(ca.descendant_concept_id AS varchar(50)) AS descendant_id
FROM ${VOCAB_SCHEMA}.concept_ancestor ca
JOIN ancestor_concepts a ON ca.ancestor_concept_id = a.concept_id
JOIN concepts_with_any_count d ON ca.descendant_concept_id = d.concept_id
  UNION ALL
SELECT
  CAST(a.concept_id AS varchar(50)) AS ancestor_id,
  CASE
    WHEN EXISTS (SELECT 1 FROM ${VOCAB_SCHEMA}.concept_ancestor ca WHERE ca.ancestor_concept_id = a.concept_id)
    THEN NULL
    ELSE CAST(a.concept_id AS varchar(50))
  END AS descendant_id
FROM ancestor_concepts a;

INSERT
	INTO
	${DATA_CHARACTERIZATION_SCHEMA}.achilles_result_concept_count (concept_id,
	record_count,
	descendant_record_count,
	person_count,
	descendant_person_count)
SELECT
	DISTINCT
    CAST(concepts.ancestor_id AS int) AS concept_id,
	IFNULL(max(c1.agg_count_value), 0) AS record_count,
	IFNULL(sum(c2.agg_count_value), 0) AS descendant_record_count,
	IFNULL(max(c3.agg_count_value), 0) AS person_count,
	IFNULL(sum(c4.agg_count_value), 0) AS descendant_person_count
FROM
	${DATA_CHARACTERIZATION_SCHEMA}.tmp_concepts concepts
LEFT JOIN ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts c1 ON
	concepts.ancestor_id = c1.concept_id
LEFT JOIN ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts c2 ON
	concepts.descendant_id = c2.concept_id
LEFT JOIN ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts_person c3 ON
	concepts.ancestor_id = c3.concept_id
LEFT JOIN ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts_person c4 ON
	concepts.descendant_id = c4.concept_id
GROUP BY
	concepts.ancestor_id;


-- Drop the working tables. Formerly HANA #-prefixed LOCAL TEMPORARY tables, but the
-- trex pgwire passthrough's parser rejects '#', so they are plain schema-qualified
-- tables that must be cleaned up explicitly (this is the final DC step).
DROP TABLE ${DATA_CHARACTERIZATION_SCHEMA}.tmp_concepts;

DROP TABLE ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts;

DROP TABLE ${DATA_CHARACTERIZATION_SCHEMA}.tmp_counts_person;
