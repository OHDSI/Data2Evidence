CREATE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.achilles_result_concept_count
(
  concept_id int,
  record_count bigint,
  descendant_record_count bigint,
  person_count bigint,
  descendant_person_count bigint
);

CREATE LOCAL TEMPORARY TABLE ${DATA_CHARACTERIZATION_SCHEMA}.#tmp_counts
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
);

CREATE LOCAL TEMPORARY TABLE ${DATA_CHARACTERIZATION_SCHEMA}.#tmp_counts_person
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
counts_person);

CREATE LOCAL TEMPORARY TABLE ${DATA_CHARACTERIZATION_SCHEMA}.#tmp_concepts
AS(
WITH concepts AS (
   SELECT concept_id AS ancestor_id, IFNULL(CAST(ca.descendant_concept_id AS varchar(50)), concept_id) AS descendant_id
  FROM (
    SELECT concept_id FROM ${DATA_CHARACTERIZATION_SCHEMA}.#tmp_counts
      UNION
    -- include any ancestor concept that has a descendant in counts
    SELECT DISTINCT CAST(ancestor_concept_id AS varchar(50)) concept_id
    FROM ${DATA_CHARACTERIZATION_SCHEMA}.#tmp_counts c
    JOIN ${VOCAB_SCHEMA}.concept_ancestor ca ON CAST(ca.descendant_concept_id AS varchar(50)) = c.concept_id
  ) c
  LEFT JOIN ${VOCAB_SCHEMA}.concept_ancestor ca ON c.concept_id = CAST(ca.ancestor_concept_id AS varchar(50))
 )
 SELECT
ancestor_id,
  descendant_id
FROM
concepts);

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
	${DATA_CHARACTERIZATION_SCHEMA}.#tmp_concepts concepts
LEFT JOIN ${DATA_CHARACTERIZATION_SCHEMA}.#tmp_counts c1 ON
	concepts.ancestor_id = c1.concept_id
LEFT JOIN ${DATA_CHARACTERIZATION_SCHEMA}.#tmp_counts c2 ON
	concepts.descendant_id = c2.concept_id
LEFT JOIN ${DATA_CHARACTERIZATION_SCHEMA}.#tmp_counts_person c3 ON
	concepts.ancestor_id = c3.concept_id
LEFT JOIN ${DATA_CHARACTERIZATION_SCHEMA}.#tmp_counts_person c4 ON
	concepts.descendant_id = c4.concept_id
GROUP BY
	concepts.ancestor_id;
