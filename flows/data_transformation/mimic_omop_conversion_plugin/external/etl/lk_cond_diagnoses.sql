-- -------------------------------------------------------------------
-- lk_diagnoses_icd_clean
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_diagnoses_icd_clean;
CREATE TABLE mimic_etl.lk_diagnoses_icd_clean AS
SELECT
    src.subject_id                              AS subject_id,
    src.hadm_id                                 AS hadm_id,
    CASE 
        WHEN src.seq_num > 20 THEN 20
        ELSE src.seq_num
    END                                         AS seq_num, -- to fit "Inpatient detail %" concepts provided by OMOP
    COALESCE(adm.edregtime, adm.admittime)      AS start_datetime, -- always exists
    dischtime                                   AS end_datetime,
    src.icd_code                                AS source_code,
    CASE 
        WHEN src.icd_version = 9 THEN 'ICD9CM'
        WHEN src.icd_version = 10 THEN 'ICD10CM'
        ELSE NULL
    END                                         AS source_vocabulary_id,
    --
    'diagnoses_icd'         AS unit_id,
    src.load_table_id       AS load_table_id,
    src.load_row_id         AS load_row_id,
    src.trace_id            AS trace_id
FROM
    mimic_etl.src_diagnoses_icd src
INNER JOIN
    mimic_etl.src_admissions adm
        ON  src.hadm_id = adm.hadm_id
;

-- -------------------------------------------------------------------
-- lk_djagnoses_icd_mapped
-- Since Condition_occurrence is quite simple, skip creating a separate codes table,
-- but create mapped table, which goes to Condition and Drug as well
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_diagnoses_icd_mapped;
CREATE TABLE mimic_etl.lk_diagnoses_icd_mapped AS
SELECT
    src.subject_id                      AS subject_id,
    src.hadm_id                         AS hadm_id,
    src.seq_num                         AS seq_num,
    src.start_datetime                  AS start_datetime,
    src.end_datetime                    AS end_datetime,
    32821                               AS type_concept_id, -- OMOP4976894 EHR billing record
    --
    src.source_code                     AS source_code,
    src.source_vocabulary_id            AS source_vocabulary_id,
    vc.concept_id                       AS source_concept_id,
    vc.domain_id                        AS source_domain_id,
    vc2.concept_id                      AS target_concept_id,
    vc2.domain_id                       AS target_domain_id,
    --
    CONCAT('cond.', src.unit_id) AS unit_id,
    src.load_table_id       AS load_table_id,
    src.load_row_id         AS load_row_id,
    src.trace_id            AS trace_id  
FROM
    mimic_etl.lk_diagnoses_icd_clean src
LEFT JOIN
    mimic_etl.voc_concept vc
        ON REPLACE(vc.concept_code, '.', '') = REPLACE(TRIM(src.source_code), '.', '')
        AND vc.vocabulary_id = src.source_vocabulary_id
LEFT JOIN
    mimic_etl.voc_concept_relationship vcr
        ON  vc.concept_id = vcr.concept_id_1
        AND vcr.relationship_id = 'Maps to'
LEFT JOIN
    mimic_etl.voc_concept vc2
        ON vc2.concept_id = vcr.concept_id_2
        AND vc2.standard_concept = 'S'
        AND vc2.invalid_reason IS NULL
;

-- -------------------------------------------------------------------
-- gcpt_admissions_diagnosis_to_concept 
--      do not use since there is no diagnosis in core.admissions
-- -------------------------------------------------------------------

-- -------------------------------------------------------------------
-- cleanup
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.tmp_seq_num_to_concept;
