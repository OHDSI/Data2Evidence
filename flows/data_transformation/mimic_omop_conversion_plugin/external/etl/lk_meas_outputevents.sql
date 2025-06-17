DROP TABLE IF EXISTS mimic_etl.lk_outputevents_clean;
CREATE TABLE mimic_etl.lk_outputevents_clean AS
SELECT
    src.subject_id                  AS subject_id,
    src.hadm_id                     AS hadm_id,
    src.stay_id                     AS stay_id,
    src.itemid                      AS itemid,
    CAST(src.itemid AS STRING)      AS source_code,
    di.label                        AS source_label,
    src.charttime                   AS start_datetime,
    src.value                       AS valuenum,
    src.valueuom                    AS valueuom,
    'outputevents'           AS unit_id,
    src.load_table_id       AS load_table_id,
    src.load_row_id         AS load_row_id,
    src.trace_id            AS trace_id
FROM
    mimic_etl.src_outputevents src
INNER JOIN
    mimic_etl.src_d_items di
        ON  src.itemid = di.itemid
;

CREATE OR REPLACE TABLE mimic_etl.lk_outputevents_mapped AS
SELECT nextval('id_sequence') AS measurement_id, t.*
FROM (
    SELECT
        src.subject_id                                  AS subject_id,
        src.hadm_id                                     AS hadm_id,
        src.stay_id                                     AS stay_id,
        src.start_datetime                              AS start_datetime,
        32817                                           AS type_concept_id,  -- OMOP4976890 EHR
        src.itemid                                      AS itemid,
        src.source_code                                 AS source_code,
        src.source_label                                AS source_label,
        vc.vocabulary_id                                 AS vocabulary_id,
        vc.domain_id                                     AS source_domain_id,
        vc.concept_id                                    AS source_concept_id,
        vc2.domain_id                                    AS target_domain_id,
        vc2.concept_id                                   AS target_concept_id,
        CAST(src.valuenum AS STRING)                    AS value_source_value,
        0                                               AS value_as_concept_id,
        CASE
            WHEN src.itemid = 227488 THEN -src.valuenum
            ELSE src.valuenum
        END                                             AS value_as_number,
        src.valueuom                                    AS unit_source_value,
        IF(src.valueuom IS NOT NULL,
            COALESCE(uc.target_concept_id, 0), NULL)    AS unit_concept_id,
        --
        CONCAT('meas.', src.unit_id)                    AS unit_id,
        src.load_table_id                               AS load_table_id,
        src.load_row_id                                 AS load_row_id,
        src.trace_id                                    AS trace_id
    FROM
        mimic_etl.lk_outputevents_clean src
    LEFT JOIN  mimic_etl.voc_concept vc
        ON src.source_code = vc.concept_code AND vc.vocabulary_id = 'mimiciv_outputevents'
    LEFT JOIN  mimic_etl.voc_concept_relationship vcr
        ON  vc.concept_id = vcr.concept_id_1
    LEFT JOIN  mimic_etl.voc_concept vc2
        ON vcr.concept_id_2 = vc2.concept_id
        AND vc2.standard_concept = 'S'
        AND vc2.invalid_reason IS NULL
    LEFT JOIN  mimic_etl.lk_meas_unit_concept uc
        ON  src.valueuom = uc.source_code
    ) t
;