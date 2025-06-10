-- -------------------------------------------------------------------
-- cdm_drug_exposure
-- -------------------------------------------------------------------

--HINT DISTRIBUTE_ON_KEY(person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_drug_exposure;
CREATE TABLE mimic_etl.cdm_drug_exposure
(
    drug_exposure_id              bigint       not null ,
    person_id                     bigint       not null ,
    drug_concept_id               bigint       not null ,
    drug_exposure_start_date      DATE        not null ,
    drug_exposure_start_datetime  timestamp             ,
    drug_exposure_end_date        DATE        not null ,
    drug_exposure_end_datetime    timestamp             ,
    verbatim_end_date             DATE                 ,
    drug_type_concept_id          bigint       not null ,
    stop_reason                   text               ,
    refills                       bigint                ,
    quantity                      double precision              ,
    days_supply                   bigint                ,
    sig                           text               ,
    route_concept_id              bigint                ,
    lot_number                    text               ,
    provider_id                   bigint                ,
    visit_occurrence_id           bigint                ,
    visit_detail_id               bigint                ,
    drug_source_value             text               ,
    drug_source_concept_id        bigint                ,
    route_source_value            text               ,
    dose_unit_source_value        text               ,
    -- 
    unit_id                       text,
    load_table_id                 text,
    load_row_id                   bigint,
    trace_id                      text
)
;

INSERT INTO mimic_etl.cdm_drug_exposure
SELECT nextval('id_sequence') AS drug_exposure_id, t.*
FROM (SELECT
    per.person_id                               AS person_id,
    src.target_concept_id                       AS drug_concept_id,
    CAST(src.start_datetime AS DATE)            AS drug_exposure_start_date,
    src.start_datetime                          AS drug_exposure_start_datetime,
    CAST(src.end_datetime AS DATE)              AS drug_exposure_end_date,
    src.end_datetime                            AS drug_exposure_end_datetime,
    CAST(NULL AS DATE)                          AS verbatim_end_date,
    src.type_concept_id                         AS drug_type_concept_id,
    CAST(NULL AS text)                        AS stop_reason,
    CAST(NULL AS bigint)                         AS refills,
    src.quantity                                AS quantity,
    CAST(NULL AS bigint)                         AS days_supply,
    CAST(NULL AS text)                        AS sig,
    src.route_concept_id                        AS route_concept_id,
    CAST(NULL AS text)                        AS lot_number,
    CAST(NULL AS bigint)                         AS provider_id,
    vis.visit_occurrence_id                     AS visit_occurrence_id,
    CAST(NULL AS bigint)                         AS visit_detail_id,
    src.source_code                             AS drug_source_value,
    src.source_concept_id                       AS drug_source_concept_id,
    src.route_source_code                       AS route_source_value,
    src.dose_unit_source_code                   AS dose_unit_source_value,
    -- 
    CONCAT('drug.', src.unit_id)    AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM
    mimic_etl.lk_drug_mapped src
INNER JOIN
    mimic_etl.cdm_person per
        ON CAST(src.subject_id AS text) = per.person_source_value
INNER JOIN
    mimic_etl.cdm_visit_occurrence vis
        ON  vis.visit_source_value = 
            CONCAT(CAST(src.subject_id AS text), '|', CAST(src.hadm_id AS text))
WHERE
    src.target_domain_id = 'Drug') t
;
