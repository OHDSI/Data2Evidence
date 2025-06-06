DROP TABLE IF EXISTS mimic_etl.lk_datetimeevents_concept;
DROP TABLE IF EXISTS mimic_etl.lk_proc_event_clean;
DROP TABLE IF EXISTS mimic_etl.lk_datetimeevents_clean;

-- -------------------------------------------------------------------
-- lk_hcpcsevents_clean
-- Rule 1, HCPCS mapping
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_hcpcsevents_clean;
CREATE TABLE mimic_etl.lk_hcpcsevents_clean AS
 SELECT
    src.subject_id      AS subject_id,
    src.hadm_id         AS hadm_id,
    adm.dischtime       AS start_datetime,
    src.seq_num         AS seq_num, --- procedure_type as in condtion_occurrence
    src.hcpcs_cd                            AS hcpcs_cd,
    src.short_description                   AS short_description,
    --
    src.load_table_id                   AS load_table_id,
    src.load_row_id                     AS load_row_id,
    src.trace_id                        AS trace_id
FROM
    mimic_etl.src_hcpcsevents src
INNER JOIN
    mimic_etl.src_admissions adm
        ON src.hadm_id = adm.hadm_id
;

-- -------------------------------------------------------------------
-- lk_procedures_icd_clean
-- Rule 2, ICD mapping
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_procedures_icd_clean;
CREATE TABLE mimic_etl.lk_procedures_icd_clean AS
SELECT
    src.subject_id                              AS subject_id,
    src.hadm_id                                 AS hadm_id,
    adm.dischtime                               AS start_datetime,
    src.icd_code                                AS icd_code,
    src.icd_version                             AS icd_version,
    CASE
        WHEN src.icd_version = 9 THEN 'ICD9Proc'
        WHEN src.icd_version = 10 THEN 'ICD10PCS'
        ELSE 'Unknown'
    END                                         AS source_vocabulary_id,
    REPLACE(src.icd_code, '.', '')              AS source_code, -- to join lk_icd_proc_concept
    --
    src.load_table_id                   AS load_table_id,
    src.load_row_id                     AS load_row_id,
    src.trace_id                        AS trace_id
FROM
    mimic_etl.src_procedures_icd src
INNER JOIN
    mimic_etl.src_admissions adm
        ON src.hadm_id = adm.hadm_id
;

-- -------------------------------------------------------------------
-- lk_proc_d_items_clean from procedureevents
-- Rule 3, d_items custom mapping
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_proc_d_items_clean;
CREATE TABLE mimic_etl.lk_proc_d_items_clean AS
SELECT
    src.subject_id                      AS subject_id,
    src.hadm_id                         AS hadm_id,
    src.starttime                       AS start_datetime,
    src.value                           AS quantity, 
    src.itemid                          AS itemid,
                            -- THEN it stores the duration... this is a warkaround and may be inproved
    --
    'procedureevents'                   AS unit_id,
    src.load_table_id                   AS load_table_id,
    src.load_row_id                     AS load_row_id,
    src.trace_id                        AS trace_id
FROM
    mimic_etl.src_procedureevents src
WHERE
    src.cancelreason = 0 -- not cancelled
;

-- -------------------------------------------------------------------
-- lk_proc_d_items_clean from datetimeevents
-- Rule 4, d_items custom mapping
-- gcpt_datetimeevents_to_concept -> mimiciv_proc_datetimeevents
-- filter out 55 rows where the year is earlier than one year before patient's birth
-- -------------------------------------------------------------------
INSERT INTO mimic_etl.lk_proc_d_items_clean
SELECT
    src.subject_id                      AS subject_id,
    src.hadm_id                         AS hadm_id,
    src.value                           AS start_datetime,
    1                                   AS quantity,
    src.itemid                          AS itemid,
    --
    'datetimeevents'                    AS unit_id,
    src.load_table_id                   AS load_table_id,
    src.load_row_id                     AS load_row_id,
    src.trace_id                        AS trace_id    
FROM
    mimic_etl.src_datetimeevents src -- de
INNER JOIN
    mimic_etl.src_patients pat
        ON  pat.subject_id = src.subject_id
WHERE
    EXTRACT(YEAR FROM src.value) >= pat.anchor_year - pat.anchor_age - 1
;


-- -------------------------------------------------------------------
-- mapping
-- HCPCS Rule 1
-- add gcpt_cpt4_to_concept --> mimiciv_proc_xxx (?)
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_hcpcs_concept;
CREATE TABLE mimic_etl.lk_hcpcs_concept AS
SELECT
    vc.concept_code         AS source_code,
    vc.vocabulary_id        AS source_vocabulary_id,    
    vc.domain_id            AS source_domain_id,
    vc.concept_id           AS source_concept_id,
    vc2.domain_id           AS target_domain_id,
    vc2.concept_id          AS target_concept_id
FROM
    mimic_etl.voc_concept vc
LEFT JOIN
    mimic_etl.voc_concept_relationship vcr
        ON  vc.concept_id = vcr.concept_id_1
        AND vcr.relationship_id = 'Maps to'
LEFT JOIN
    mimic_etl.voc_concept vc2
        ON vc2.concept_id = vcr.concept_id_2
        AND vc2.standard_concept = 'S'
        AND vc2.invalid_reason IS NULL
WHERE
    vc.vocabulary_id IN ('HCPCS', 'CPT4')
;

-- -------------------------------------------------------------------
-- mapping
-- ICD - Rule 2
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_icd_proc_concept;
CREATE TABLE mimic_etl.lk_icd_proc_concept AS
SELECT
    REPLACE(vc.concept_code, '.', '')       AS source_code,
    vc.vocabulary_id                        AS source_vocabulary_id,
    vc.domain_id                            AS source_domain_id,
    vc.concept_id                           AS source_concept_id,
    vc2.domain_id                           AS target_domain_id,
    vc2.concept_id                          AS target_concept_id
FROM
    mimic_etl.voc_concept vc
LEFT JOIN
    mimic_etl.voc_concept_relationship vcr
        ON  vc.concept_id = vcr.concept_id_1
        AND vcr.relationship_id = 'Maps to'
LEFT JOIN
    mimic_etl.voc_concept vc2
        ON vc2.concept_id = vcr.concept_id_2
        AND vc2.standard_concept = 'S'
        AND vc2.invalid_reason IS NULL
WHERE
    vc.vocabulary_id IN ('ICD9Proc', 'ICD10PCS')
;


-- -------------------------------------------------------------------
-- mapping
-- Rule 2, 4 
-- gcpt_procedure_to_concept -> mimiciv_proc_itemid (initially on itemid)
-- gcpt_datetimeevents_to_concept -> mimiciv_proc_datetimeevents (move from label to itemid)
-- can be optimized by including Specimen mapping to lk_itemid_concept
-- -------------------------------------------------------------------

 --- REQUIRED ME TO USE --shm-size FOR docker run TO GET MORE MEMORY

DROP TABLE IF EXISTS mimic_etl.lk_itemid_concept;
CREATE TABLE mimic_etl.lk_itemid_concept AS
SELECT
    d_items.itemid                      AS itemid,
    CAST(d_items.itemid AS text)      AS source_code,
    d_items.label                       AS source_label,
    vc.vocabulary_id                    AS source_vocabulary_id,
    vc.domain_id                        AS source_domain_id,
    vc.concept_id                       AS source_concept_id,
    vc2.domain_id                       AS target_domain_id,
    vc2.concept_id                      AS target_concept_id
FROM
    mimic_etl.src_d_items d_items
LEFT JOIN
    mimic_etl.voc_concept vc
        ON vc.concept_code = CAST(d_items.itemid AS text)
        AND vc.vocabulary_id IN (
            'mimiciv_proc_itemid',
            'mimiciv_proc_datetimeevents'
        )
LEFT JOIN
    mimic_etl.voc_concept_relationship vcr
        ON  vc.concept_id = vcr.concept_id_1
        AND vcr.relationship_id = 'Maps to'
LEFT JOIN
    mimic_etl.voc_concept vc2
        ON vc2.concept_id = vcr.concept_id_2
        AND vc2.standard_concept = 'S'
        AND vc2.invalid_reason IS NULL
WHERE
    d_items.linksto IN (
        'procedureevents',
        'datetimeevents'
    )
;

-- -------------------------------------------------------------------
-- lk_procedure_mapped
-- -------------------------------------------------------------------

-- Rule 1, HCPCS

--- CHANGED: Added cast in source_code column to ensure the created column is large enough for subsequent input

DROP TABLE IF EXISTS mimic_etl.lk_procedure_mapped;
CREATE TABLE mimic_etl.lk_procedure_mapped AS
SELECT
    src.subject_id                          AS subject_id, -- to person
    src.hadm_id                             AS hadm_id, -- to visit
    src.start_datetime                      AS start_datetime,
    32821                                   AS type_concept_id, -- OMOP4976894 EHR billing record
    CAST(1 AS double precision)                      AS quantity,
    CAST(NULL AS bigint)                     AS itemid,
    src.hcpcs_cd::text                            AS source_code,
    CAST(NULL AS text)                    AS source_label,
    lc.source_vocabulary_id                 AS source_vocabulary_id,
    lc.source_domain_id                     AS source_domain_id,
    COALESCE(lc.source_concept_id, 0)       AS source_concept_id,
    lc.target_domain_id                     AS target_domain_id,
    COALESCE(lc.target_concept_id, 0)       AS target_concept_id,
    --
    'proc.hcpcsevents'              AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM
    mimic_etl.lk_hcpcsevents_clean src
LEFT JOIN
    mimic_etl.lk_hcpcs_concept lc
        ON src.hcpcs_cd = lc.source_code
;

-- Rule 2, ICD

INSERT INTO mimic_etl.lk_procedure_mapped
SELECT
    src.subject_id                          AS subject_id, -- to person
    src.hadm_id                             AS hadm_id, -- to visit
    src.start_datetime                      AS start_datetime,
    32821                                   AS type_concept_id, -- OMOP4976894 EHR billing record
    1                                       AS quantity,
    CAST(NULL AS bigint)                     AS itemid,
    src.source_code                         AS source_code,
    CAST(NULL AS text)                    AS source_label,
    src.source_vocabulary_id                AS source_vocabulary_id,
    lc.source_domain_id                     AS source_domain_id,
    COALESCE(lc.source_concept_id, 0)       AS source_concept_id,
    lc.target_domain_id                     AS target_domain_id,
    COALESCE(lc.target_concept_id, 0)       AS target_concept_id,
    --
    'proc.procedures_icd'           AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM
    mimic_etl.lk_procedures_icd_clean src
LEFT JOIN
    mimic_etl.lk_icd_proc_concept lc
        ON  src.source_code = lc.source_code
        AND src.source_vocabulary_id = lc.source_vocabulary_id
;

-- rule 3, "procedureevents" and itemid custom mapping
-- rule 4, "datetimeevents" and itemid custom mapping

INSERT INTO mimic_etl.lk_procedure_mapped
SELECT
    src.subject_id                          AS subject_id, -- to person
    src.hadm_id                             AS hadm_id, -- to visit
    src.start_datetime                      AS start_datetime,
    32833                                   AS type_concept_id, -- OMOP4976906 EHR order
    src.quantity                            AS quantity,
    lc.itemid                               AS itemid,
    CAST(src.itemid AS text)              AS source_code,
    lc.source_label                         AS source_label,
    lc.source_vocabulary_id                 AS source_vocabulary_id,
    lc.source_domain_id                     AS source_domain_id,
    COALESCE(lc.source_concept_id, 0)       AS source_concept_id,
    lc.target_domain_id                     AS target_domain_id,
    COALESCE(lc.target_concept_id, 0)       AS target_concept_id,
    --
    CONCAT('proc.', src.unit_id)    AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM
    mimic_etl.lk_proc_d_items_clean src
LEFT JOIN
    mimic_etl.lk_itemid_concept lc
        ON src.itemid = lc.itemid
;

