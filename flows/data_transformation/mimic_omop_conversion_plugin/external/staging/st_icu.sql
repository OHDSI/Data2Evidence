-- -------------------------------------------------------------------
-- src_procedureevents
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_procedureevents;
CREATE TABLE mimic_etl.src_procedureevents AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT hadm_id                                                             AS hadm_id,
             subject_id                                                          AS subject_id,
             stay_id                                                             AS stay_id,
             itemid                                                              AS itemid,
             starttime                                                           AS starttime,
             value                                                               AS value,
             CAST(0 AS bigint)                                                   AS cancelreason, -- MIMIC IV 2.0 change, the field is removed
             --
             'procedureevents'                                                   AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text || starttime::text)) AS trace_id
      FROM mimiciv_icu.procedureevents) t
;
DROP TABLE mimiciv_icu.procedureevents;

-- -------------------------------------------------------------------
-- src_d_items
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_d_items;
CREATE TABLE mimic_etl.src_d_items AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT itemid                                       AS itemid,
             label                                        AS label,
             linksto                                      AS linksto,
             -- abbreviation 
             -- category
             -- unitname
             -- param_type
             -- lownormalvalue
             -- highnormalvalue
             --
             'd_items'                                    AS load_table_id,
             (SELECT  main.sha1(itemid::text || linksto::text)) AS trace_id
      FROM mimiciv_icu.d_items) t
;
DROP TABLE mimiciv_icu.d_items;

-- -------------------------------------------------------------------
-- src_datetimeevents
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_datetimeevents;
CREATE TABLE mimic_etl.src_datetimeevents AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT subject_id                                                              AS subject_id,
             hadm_id                                                                 AS hadm_id,
             stay_id                                                                 AS stay_id,
             itemid                                                                  AS itemid,
             charttime                                                               AS charttime,
             value                                                                   AS value,
             --
             'datetimeevents'                                                        AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text || stay_id::text || charttime::text)) AS trace_id
      FROM mimiciv_icu.datetimeevents) t
;
DROP TABLE mimiciv_icu.datetimeevents;
-- Flush earlier staged tables to disk before the largest operation.
CHECKPOINT;

-- -------------------------------------------------------------------
-- src_chartevents  (largest ICU table)
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_chartevents;
CREATE TABLE mimic_etl.src_chartevents AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT subject_id                                                              AS subject_id,
             hadm_id                                                                 AS hadm_id,
             stay_id                                                                 AS stay_id,
             itemid                                                                  AS itemid,
             charttime                                                               AS charttime,
             value                                                                   AS value,
             valuenum                                                                AS valuenum,
             valueuom                                                                AS valueuom,
             --
             'chartevents'                                                           AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text || stay_id::text || charttime::text)) AS trace_id
      FROM mimiciv_icu.chartevents) t
;
DROP TABLE mimiciv_icu.chartevents;

-- Flush src_chartevents to disk to reclaim buffer pool memory before continuing.
CHECKPOINT;

-- -------------------------------------------------------------------
-- src_outputevents
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_outputevents;
CREATE TABLE mimic_etl.src_outputevents AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT subject_id                                                              AS subject_id,
             hadm_id                                                                 AS hadm_id,
             stay_id                                                                 AS stay_id,
             itemid                                                                  AS itemid,
             charttime                                                               AS charttime,
             value                                                                   AS value,
             valueuom                                                                AS valueuom,
             storetime                                                               AS storetime,
             --
             'outputevents'                                                          AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text || stay_id::text || charttime::text)) AS trace_id
      FROM mimiciv_icu.outputevents) t
;
DROP TABLE mimiciv_icu.outputevents;
