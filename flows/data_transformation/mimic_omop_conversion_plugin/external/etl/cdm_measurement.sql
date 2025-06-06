--HINT DISTRIBUTE_ON_KEY(person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_measurement;
CREATE TABLE mimic_etl.cdm_measurement
(
    measurement_id                bigint     not null ,
    person_id                     bigint     not null ,
    measurement_concept_id        bigint     not null ,
    measurement_date              DATE      not null ,
    measurement_datetime          timestamp           ,
    measurement_time              text             ,
    measurement_type_concept_id   bigint     not null ,
    operator_concept_id           bigint              ,
    value_as_number               double precision            ,
    value_as_concept_id           bigint              ,
    unit_concept_id               bigint              ,
    range_low                     double precision            ,
    range_high                    double precision            ,
    provider_id                   bigint              ,
    visit_occurrence_id           bigint              ,
    visit_detail_id               bigint              ,
    measurement_source_value      text             ,
    measurement_source_concept_id bigint              ,
    unit_source_value             text             ,
    value_source_value            text             ,
    -- 
    unit_id                       text,
    load_table_id                 text,
    load_row_id                   bigint,
    trace_id                      text
)
;

-- -------------------------------------------------------------------
-- Rule 1
-- LABS from labevents
-- demo:  115,272 rows from mapped 107,209 rows. Remove duplicates
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_measurement
SELECT
    src.measurement_id                      AS measurement_id,
    per.person_id                           AS person_id,
    COALESCE(src.target_concept_id, 0)      AS measurement_concept_id,
    CAST(src.start_datetime AS DATE)        AS measurement_date,
    src.start_datetime                      AS measurement_datetime,
    CAST(NULL AS text)                    AS measurement_time,
    32856                                   AS measurement_type_concept_id, -- OMOP4976929 Lab
    src.operator_concept_id                 AS operator_concept_id,
    CAST(src.value_as_number AS double precision)    AS value_as_number,  -- to move CAST to mapped/clean
    CAST(NULL AS bigint)                     AS value_as_concept_id,
    src.unit_concept_id                     AS unit_concept_id,
    src.range_low                           AS range_low,
    src.range_high                          AS range_high,
    CAST(NULL AS bigint)                     AS provider_id,
    vis.visit_occurrence_id                 AS visit_occurrence_id,
    CAST(NULL AS bigint)                     AS visit_detail_id,
    src.source_code                         AS measurement_source_value,
    src.source_concept_id                   AS measurement_source_concept_id,
    src.unit_source_value                   AS unit_source_value,
    src.value_source_value                  AS value_source_value,
    --
    CONCAT('measurement.', src.unit_id)     AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM  
    mimic_etl.lk_meas_labevents_mapped src -- 107,209
INNER JOIN
    mimic_etl.cdm_person per -- 110,849
        ON CAST(src.subject_id AS text) = per.person_source_value
INNER JOIN
    mimic_etl.cdm_visit_occurrence vis -- 116,559
        ON  vis.visit_source_value = 
            CONCAT(CAST(src.subject_id AS text), '|',
                COALESCE(CAST(src.hadm_id AS text), CAST(src.date_id AS text)))
WHERE
    src.target_domain_id = 'Measurement' -- 115,272
;

-- -------------------------------------------------------------------
-- Rule 2
-- chartevents
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_measurement
SELECT
    src.measurement_id                      AS measurement_id,
    per.person_id                           AS person_id,
    COALESCE(src.target_concept_id, 0)      AS measurement_concept_id,
    CAST(src.start_datetime AS DATE)        AS measurement_date,
    src.start_datetime                      AS measurement_datetime,
    CAST(NULL AS text)                    AS measurement_time,
    src.type_concept_id                     AS measurement_type_concept_id,
    CAST(NULL AS bigint)                     AS operator_concept_id,
    src.value_as_number                     AS value_as_number,
    src.value_as_concept_id                 AS value_as_concept_id,
    src.unit_concept_id                     AS unit_concept_id,
    CAST(NULL AS bigint)                     AS range_low,
    CAST(NULL AS bigint)                     AS range_high,
    CAST(NULL AS bigint)                     AS provider_id,
    vis.visit_occurrence_id                 AS visit_occurrence_id,
    CAST(NULL AS bigint)                     AS visit_detail_id,
    src.source_code                         AS measurement_source_value,
    src.source_concept_id                   AS measurement_source_concept_id,
    src.unit_source_value                   AS unit_source_value,
    src.value_source_value                  AS value_source_value,
    --
    CONCAT('measurement.', src.unit_id)     AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM  
    mimic_etl.lk_chartevents_mapped src
INNER JOIN
    mimic_etl.cdm_person per
        ON CAST(src.subject_id AS text) = per.person_source_value
INNER JOIN
    mimic_etl.cdm_visit_occurrence vis
        ON  vis.visit_source_value = 
            CONCAT(CAST(src.subject_id AS text), '|', CAST(src.hadm_id AS text))
WHERE
    src.target_domain_id = 'Measurement'
;

-- -------------------------------------------------------------------
-- Rule 3.1
-- Microbiology - organism
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_measurement
SELECT
    src.measurement_id                      AS measurement_id,
    per.person_id                           AS person_id,
    COALESCE(src.target_concept_id, 0)      AS measurement_concept_id,
    CAST(src.start_datetime AS DATE)        AS measurement_date,
    src.start_datetime                      AS measurement_datetime,
    CAST(NULL AS text)                    AS measurement_time,
    src.type_concept_id                     AS measurement_type_concept_id,
    CAST(NULL AS bigint)                     AS operator_concept_id,
    CAST(NULL AS double precision)                   AS value_as_number,
    COALESCE(src.value_as_concept_id, 0)    AS value_as_concept_id,
    CAST(NULL AS bigint)                     AS unit_concept_id,
    CAST(NULL AS bigint)                     AS range_low,
    CAST(NULL AS bigint)                     AS range_high,
    CAST(NULL AS bigint)                     AS provider_id,
    vis.visit_occurrence_id                 AS visit_occurrence_id,
    CAST(NULL AS bigint)                     AS visit_detail_id,
    src.source_code                         AS measurement_source_value,
    src.source_concept_id                   AS measurement_source_concept_id,
    CAST(NULL AS text)                    AS unit_source_value,
    src.value_source_value                  AS value_source_value,
    --
    CONCAT('measurement.', src.unit_id)     AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM  
    mimic_etl.lk_meas_organism_mapped src
INNER JOIN
    mimic_etl.cdm_person per
        ON CAST(src.subject_id AS text) = per.person_source_value
INNER JOIN
    mimic_etl.cdm_visit_occurrence vis -- 116,559
        ON  vis.visit_source_value = 
            CONCAT(CAST(src.subject_id AS text), '|',
                COALESCE(CAST(src.hadm_id AS text), CAST(src.date_id AS text)))
WHERE
    src.target_domain_id = 'Measurement'
;

-- -------------------------------------------------------------------
-- Rule 3.2
-- Microbiology - antibiotics
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_measurement
SELECT
    src.measurement_id                      AS measurement_id,
    per.person_id                           AS person_id,
    COALESCE(src.target_concept_id, 0)      AS measurement_concept_id,
    CAST(src.start_datetime AS DATE)        AS measurement_date,
    src.start_datetime                      AS measurement_datetime,
    CAST(NULL AS text)                    AS measurement_time,
    src.type_concept_id                     AS measurement_type_concept_id,
    src.operator_concept_id                 AS operator_concept_id, -- dilution comparison
    src.value_as_number                     AS value_as_number, -- dilution value
    COALESCE(src.value_as_concept_id, 0)    AS value_as_concept_id, -- resistance (interpretation)
    CAST(NULL AS bigint)                     AS unit_concept_id,
    CAST(NULL AS bigint)                     AS range_low,
    CAST(NULL AS bigint)                     AS range_high,
    CAST(NULL AS bigint)                     AS provider_id,
    vis.visit_occurrence_id                 AS visit_occurrence_id,
    CAST(NULL AS bigint)                     AS visit_detail_id,
    src.source_code                         AS measurement_source_value, -- antibiotic name
    src.source_concept_id                   AS measurement_source_concept_id,
    CAST(NULL AS text)                    AS unit_source_value,
    src.value_source_value                  AS value_source_value, -- resistance source value
    --
    CONCAT('measurement.', src.unit_id)     AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM  
    mimic_etl.lk_meas_ab_mapped src
INNER JOIN
    mimic_etl.cdm_person per
        ON CAST(src.subject_id AS text) = per.person_source_value
INNER JOIN
    mimic_etl.cdm_visit_occurrence vis -- 116,559
        ON  vis.visit_source_value = 
            CONCAT(CAST(src.subject_id AS text), '|',
                COALESCE(CAST(src.hadm_id AS text), CAST(src.date_id AS text)))
WHERE
    src.target_domain_id = 'Measurement'
;

-- -------------------------------------------------------------------
-- cdm_measurement
-- Rule 10 (waveform)
-- wf demo poc: 1,500 rows from 1,500 rows in mapped
-- -------------------------------------------------------------------

/*INSERT INTO mimic_etl.cdm_measurement
SELECT nextval('id_sequence') AS measurement_id, t.*
FROM (SELECT
    per.person_id                           AS person_id,
    COALESCE(src.target_concept_id, 0)      AS measurement_concept_id,
    CAST(src.start_datetime AS DATE)        AS measurement_date,
    src.start_datetime                      AS measurement_datetime,
    CAST(NULL AS text)                    AS measurement_time, -- deprecated, to be removed in later versions
    32817                                   AS measurement_type_concept_id, -- OMOP4976890 EHR
    CAST(NULL AS bigint)                     AS operator_concept_id,
    src.value_as_number                     AS value_as_number,
    CAST(NULL AS bigint)                     AS value_as_concept_id, -- to add values
    src.unit_concept_id                     AS unit_concept_id,
    CAST(NULL AS double precision)                   AS range_low,
    CAST(NULL AS double precision)                   AS range_high,
    CAST(NULL AS bigint)                     AS provider_id,
    vd.visit_occurrence_id                  AS visit_occurrence_id,
    vd.visit_detail_id                      AS visit_detail_id,
    CONCAT(src.source_code)                 AS measurement_source_value,  -- source value is changed
    src.source_concept_id                           AS measurement_source_concept_id,
    src.unit_source_value                   AS unit_source_value,
    CAST(src.value_as_number AS text)     AS value_source_value, -- ?
    -- 
    CONCAT('measurement.', src.unit_id)     AS unit_id,
    src.load_table_id                       AS load_table_id,
    src.load_row_id                         AS load_row_id,
    src.trace_id                            AS trace_id
FROM
    mimic_etl.lk_meas_waveform_mapped src
INNER JOIN
    mimic_etl.cdm_person per
        ON CAST(src.subject_id AS text) = per.person_source_value
INNER JOIN
    mimic_etl.cdm_visit_detail vd
        ON src.reference_id = vd.visit_detail_source_value
WHERE
    src.target_domain_id = 'Measurement') t
;
*/