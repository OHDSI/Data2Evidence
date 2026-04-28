-- -------------------------------------------------------------------
-- cdm_person
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.tmp_person;
CREATE TABLE mimic_etl.tmp_person AS
SELECT per.*
FROM 
    mimic_etl.cdm_person per
INNER JOIN
    mimic_etl.cdm_observation_period op
        ON  per.person_id = op.person_id
;

TRUNCATE TABLE mimic_etl.cdm_person;

INSERT INTO mimic_etl.cdm_person
SELECT per.*
FROM
    mimic_etl.tmp_person per
;

DROP TABLE IF EXISTS mimic_etl.tmp_person;
