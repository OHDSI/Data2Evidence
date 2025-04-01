DROP TABLE IF EXISTS mimic_etl.cdm_cdm_source;
CREATE TABLE mimic_etl.cdm_cdm_source
(
    cdm_source_name                text not null,
    cdm_source_abbreviation        text,
    cdm_holder                     text,
    source_description             text,
    source_documentation_reference text,
    cdm_etl_reference              text,
    source_release_date            DATE,
    cdm_release_date               DATE,
    cdm_version                    text,
    vocabulary_version             text,
    -- 
    unit_id                        text,
    load_table_id                  text,
    load_row_id                    bigint,
    trace_id                       text
)
;

INSERT INTO mimic_etl.cdm_cdm_source
SELECT 'MIMIC IV'                                                                         AS cdm_source_name,
       'mimiciv'                                                                          AS cdm_source_abbreviation,
       'PhysioNet'                                                                        AS cdm_holder,
       CONCAT('MIMIC-IV is a publicly available database of patients ',
              'admitted to the Beth Israel Deaconess Medical Center in Boston, MA, USA.') AS source_description,
       'https://mimic-iv.mit.edu/docs/'                                                   AS source_documentation_reference,
       'https://github.com/OHDSI/MIMIC/'                                                  AS cdm_etl_reference,
       '2020-09-01'::date                                                                 AS source_release_date, -- to look up
       CURRENT_DATE                                                                       AS cdm_release_date,
       '5.3.1'                                                                            AS cdm_version,
       v.vocabulary_version                                                               AS vocabulary_version,
       --
       'cdm.source'                                                                       AS unit_id,
       'none'                                                                             AS load_table_id,
       1                                                                                  AS load_row_id,
       (SELECT  main.sha1('mimiciv')) AS trace_id

FROM mimic_etl.voc_vocabulary v
WHERE v.vocabulary_id = 'None'
;

