-- -------------------------------------------------------------------
-- cdm_specimen
-- -------------------------------------------------------------------

--HINT DISTRIBUTE_ON_KEY(person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_specimen;
CREATE TABLE mimic_etl.cdm_specimen
(
    specimen_id                 bigint     not null ,
    person_id                   bigint     not null ,
    specimen_concept_id         bigint     not null ,
    specimen_type_concept_id    bigint     not null ,
    specimen_date               DATE      not null ,
    specimen_datetime           timestamp           ,
    quantity                    double precision            ,
    unit_concept_id             bigint              ,
    anatomic_site_concept_id    bigint              ,
    disease_status_concept_id   bigint              ,
    specimen_source_id          text             ,
    specimen_source_value       text             ,
    unit_source_value           text             ,
    anatomic_site_source_value  text             ,
    disease_status_source_value text             ,
    -- 
    unit_id                       text,
    load_table_id                 text,
    load_row_id                   bigint,
    trace_id                      text
)
;


INSERT INTO mimic_etl.cdm_specimen
SELECT
    src.specimen_id                             AS specimen_id,
    per.person_id                               AS person_id,
    COALESCE(src.target_concept_id, 0)          AS specimen_concept_id,
    32856                                       AS specimen_type_concept_id, -- OMOP4976929 Lab
    CAST(src.start_datetime AS DATE)            AS specimen_date,
    src.start_datetime                          AS specimen_datetime,
    CAST(NULL AS double precision)                       AS quantity,
    CAST(NULL AS bigint)                         AS unit_concept_id,
    0                                           AS anatomic_site_concept_id,
    0                                           AS disease_status_concept_id,
    src.trace_id                                AS specimen_source_id,
    src.source_code                             AS specimen_source_value,
    CAST(NULL AS text)                        AS unit_source_value,
    CAST(NULL AS text)                        AS anatomic_site_source_value,
    CAST(NULL AS text)                        AS disease_status_source_value,
    -- 
    CONCAT('specimen.', src.unit_id)    AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM
    mimic_etl.lk_specimen_mapped src
INNER JOIN
    mimic_etl.cdm_person per
        ON CAST(src.subject_id AS text) = per.person_source_value
WHERE
    src.target_domain_id = 'Specimen'
;
