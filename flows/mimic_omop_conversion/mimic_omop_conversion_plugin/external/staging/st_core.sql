-- -------------------------------------------------------------------
-- src_patients
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_patients;

CREATE TABLE mimic_etl.src_patients AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT subject_id                      AS subject_id,
             anchor_year                     AS anchor_year,
             anchor_age                      AS anchor_age,
             anchor_year_group               AS anchor_year_group,
             gender                          AS gender,
             --
             'patients'                      AS load_table_id,
             (SELECT  main.sha1(subject_id::text)) AS trace_id
      FROM mimiciv_hosp.patients) t
;

-- -------------------------------------------------------------------
-- src_admissions
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_admissions;

CREATE TABLE mimic_etl.src_admissions AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT hadm_id                                          AS hadm_id,   -- PK
             subject_id                                       AS subject_id,
             admittime                                        AS admittime,
             dischtime                                        AS dischtime,
             deathtime                                        AS deathtime,
             admission_type                                   AS admission_type,
             admission_location                               AS admission_location,
             discharge_location                               AS discharge_location,
             race                                             AS ethnicity, -- MIMIC IV 2.0 change, field race replaced field ethnicity
             edregtime                                        AS edregtime,
             insurance                                        AS insurance,
             marital_status                                   AS marital_status,
             language                                         AS language,
             -- edouttime
             -- hospital_expire_flag
             --
             'admissions'                                     AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text)) AS trace_id
      FROM mimiciv_hosp.admissions) t
;

-- -------------------------------------------------------------------
-- src_transfers
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_transfers;

CREATE TABLE mimic_etl.src_transfers AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT transfer_id                                      AS transfer_id,
             hadm_id                                          AS hadm_id,
             subject_id                                       AS subject_id,
             careunit                                         AS careunit,
             intime                                           AS intime,
             outtime                                          AS outtime,
             eventtype                                        AS eventtype,
             --
             'transfers'                                      AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text)) AS trace_id
      FROM mimiciv_hosp.transfers) t
;
