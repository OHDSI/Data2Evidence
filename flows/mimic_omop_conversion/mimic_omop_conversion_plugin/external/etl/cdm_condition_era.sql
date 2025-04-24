-- -------------------------------------------------------------------
-- Defining spans of time when the
-- Person is assumed to have a given
-- condition.
-- -------------------------------------------------------------------
DROP TABLE IF EXISTS mimic_etl.tmp_target_condition;
CREATE TABLE mimic_etl.tmp_target_condition
AS SELECT
    co.condition_occurrence_id                                              AS condition_occurrence_id,
    co.person_id                                                            AS person_id,
    co.condition_concept_id                                                 AS condition_concept_id,
    co.condition_start_date                                                 AS condition_start_date,
    COALESCE( co.condition_end_date,
              co.condition_start_date + INTERVAL '1 DAY')           AS condition_end_date
    -- Depending on the needs of data, include more filters in cteConditionTarget
    -- For example
    -- - to exclude unmapped condition_concept_id's (i.e. condition_concept_id = 0)
          -- from being included in same era
    -- - to set condition_era_end_date to same condition_era_start_date
          -- or condition_era_start_date + INTERVAL '1 day', when condition_end_date IS NULL
FROM
    mimic_etl.cdm_condition_occurrence co
WHERE
    co.condition_concept_id != 0
;

DROP TABLE IF EXISTS mimic_etl.tmp_dates_un_condition;
CREATE TABLE mimic_etl.tmp_dates_un_condition
    AS SELECT
        person_id                               AS person_id,
        condition_concept_id                    AS condition_concept_id,
        condition_start_date                    AS event_date,
        -1                                      AS event_type,
        ROW_NUMBER() OVER (
            PARTITION BY
                person_id,
                condition_concept_id
            ORDER BY
                condition_start_date)               AS start_ordinal
    FROM
        mimic_etl.tmp_target_condition
UNION ALL
    SELECT
        person_id                                             AS person_id,
        condition_concept_id                                  AS condition_concept_id,
        condition_end_date + INTERVAL '30 DAYS'        AS event_date,
        1                                                     AS event_type,
        NULL                                                  AS start_ordinal
    FROM
        mimic_etl.tmp_target_condition
;

DROP TABLE IF EXISTS mimic_etl.tmp_dates_rows_condition;
CREATE TABLE mimic_etl.tmp_dates_rows_condition
AS SELECT
    person_id                       AS person_id,
    condition_concept_id            AS condition_concept_id,
    event_date                      AS event_date,
    event_type                      AS event_type,
    MAX(start_ordinal) OVER (
        PARTITION BY
            person_id,
            condition_concept_id
        ORDER BY
            event_date,
            event_type
        ROWS UNBOUNDED PRECEDING)   AS start_ordinal,
        -- this pulls the current START down from the prior rows
        -- so that the NULLs from the END DATES will contain a value we can compare with
    ROW_NUMBER() OVER (
        PARTITION BY
            person_id,
            condition_concept_id
        ORDER BY
            event_date,
            event_type)             AS overall_ord
        -- this re-numbers the inner UNION so all rows are numbered ordered by the event date
FROM
    mimic_etl.tmp_dates_un_condition
;

DROP TABLE IF EXISTS mimic_etl.tmp_enddates_condition;
CREATE TABLE mimic_etl.tmp_enddates_condition
AS SELECT
    person_id                                       AS person_id,
    condition_concept_id                            AS condition_concept_id,
    event_date - INTERVAL '30 DAYS'          AS end_date  -- unpad the end date
FROM
    mimic_etl.tmp_dates_rows_condition e
WHERE
    (2 * e.start_ordinal) - e.overall_ord = 0
;

DROP TABLE IF EXISTS mimic_etl.tmp_conditionends;
CREATE TABLE mimic_etl.tmp_conditionends
AS SELECT
    c.person_id                             AS person_id,
    c.condition_concept_id                  AS condition_concept_id,
    c.condition_start_date                  AS condition_start_date,
    MIN(e.end_date)                         AS era_end_date
FROM
    mimic_etl.tmp_target_condition c
JOIN
    mimic_etl.tmp_enddates_condition e
        ON  c.person_id            = e.person_id
        AND c.condition_concept_id = e.condition_concept_id
        AND e.end_date             >= c.condition_start_date
GROUP BY
    c.condition_occurrence_id,
    c.person_id,
    c.condition_concept_id,
    c.condition_start_date
;

-- -------------------------------------------------------------------
-- Load Table: Condition_era
-- -------------------------------------------------------------------

--HINT DISTRIBUTE_ON_KEY(person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_condition_era;
CREATE TABLE mimic_etl.cdm_condition_era
(
    condition_era_id            bigint     not null ,
    person_id                   bigint     not null ,
    condition_concept_id        bigint     not null ,
    condition_era_start_date    DATE      not null ,
    condition_era_end_date      DATE      not null ,
    condition_occurrence_count  bigint              ,
    -- 
    unit_id                       text,
    load_table_id                 text,
    load_row_id                   bigint
)
;

-- -------------------------------------------------------------------
-- It is derived from the records in
-- the CONDITION_OCCURRENCE table using
-- a standardized algorithm.
-- 30 days window is allowed.
-- -------------------------------------------------------------------
INSERT INTO mimic_etl.cdm_condition_era
SELECT nextval('id_sequence') AS condition_era_id, t.*
FROM (SELECT
    person_id                                       AS person_id,
    condition_concept_id                            AS condition_concept_id,
    MIN(condition_start_date)                       AS condition_era_start_date,
    era_end_date                                    AS condition_era_end_date,
    COUNT(*)                                        AS condition_occurrence_count,
-- --
    'condition_era.condition_occurrence'            AS unit_id,
    CAST(NULL AS text)                            AS load_table_id,
    CAST(NULL AS bigint)                             AS load_row_id
FROM
    mimic_etl.tmp_conditionends
GROUP BY
    person_id,
    condition_concept_id,
    era_end_date
ORDER BY
    person_id,
    condition_concept_id) t
;

-- -------------------------------------------------------------------
-- Drop temporary tables
-- -------------------------------------------------------------------
DROP TABLE IF EXISTS mimic_etl.tmp_conditionends;
DROP TABLE IF EXISTS mimic_etl.tmp_enddates_condition;
DROP TABLE IF EXISTS mimic_etl.tmp_dates_rows_condition;
DROP TABLE IF EXISTS mimic_etl.tmp_dates_un_condition;
DROP TABLE IF EXISTS mimic_etl.tmp_target_condition;
-- -------------------------------------------------------------------
-- Loading finished
-- -------------------------------------------------------------------
