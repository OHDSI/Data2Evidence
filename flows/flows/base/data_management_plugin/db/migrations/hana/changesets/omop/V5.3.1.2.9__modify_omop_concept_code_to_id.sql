--liquibase formatted sql
--changeset alp:V5.3.1.2.9__modify_concept_code_to_id.sql

CREATE OR REPLACE VIEW "VIEW::OMOP.PATIENT" (
  "PATIENT_ID",
  "BIRTH_DATE",
  "MONTH_OF_BIRTH",
  "YEAR_OF_BIRTH",
  "DEATH_DATE",
  "GENDER",
  "RACE",
  "ETHNICITY",
  "STATE",
  "COUNTY",
  "GENDER_CONCEPT_CODE",
  "RACE_CONCEPT_CODE",
  "ETHNICITY_CONCEPT_CODE",
  "GENDER_CONCEPT_ID",
  "RACE_CONCEPT_ID",
  "ETHNICITY_CONCEPT_ID"
  ) AS
SELECT
  "p_$0"."PERSON_ID" AS "PATIENT_ID",
  TO_DATE (
    (
      (
        TO_VARCHAR ("p_$0"."YEAR_OF_BIRTH") || TO_VARCHAR ("p_$0"."MONTH_OF_BIRTH", '00')
      ) || TO_VARCHAR ("p_$0"."DAY_OF_BIRTH", '00')
    ),
    'yyyymmdd'
  ) AS "BIRTH_DATE",
  "p_$0"."MONTH_OF_BIRTH",
  "p_$0"."YEAR_OF_BIRTH",
  COALESCE ("d_$1"."DEATH_DATE", NULL) AS "DEATH_DATE",
  "gender_c_$2"."CONCEPT_NAME" AS "GENDER",
  "race_c_$3"."CONCEPT_NAME" AS "RACE",
  "ethnicity_c_$4"."CONCEPT_NAME" AS "ETHNICITY",
  "l_$5"."STATE" AS "STATE",
  "l_$5"."COUNTY" AS "COUNTY",
  "gender_c_$2"."CONCEPT_CODE" AS "GENDER_CONCEPT_CODE",
  "race_c_$3"."CONCEPT_CODE" AS "RACE_CONCEPT_CODE",
  "ethnicity_c_$4"."CONCEPT_CODE" AS "ETHNICITY_CONCEPT_CODE",
  "gender_c_$2"."CONCEPT_ID" AS "GENDER_CONCEPT_ID",
  "race_c_$3"."CONCEPT_ID" AS "RACE_CONCEPT_ID",
  "ethnicity_c_$4"."CONCEPT_ID" AS "ETHNICITY_CONCEPT_ID"
FROM
  (
    (
      (
        (
          (
            "PERSON" AS "p_$0"
            LEFT OUTER JOIN "DEATH" AS "d_$1" ON ("d_$1"."PERSON_ID" = "p_$0"."PERSON_ID")
          )
          LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "gender_c_$2" ON (
            "gender_c_$2"."CONCEPT_ID" = "p_$0"."GENDER_CONCEPT_ID"
          )
        )
        LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "race_c_$3" ON (
          "race_c_$3"."CONCEPT_ID" = "p_$0"."RACE_CONCEPT_ID"
        )
      )
      LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "ethnicity_c_$4" ON (
        "ethnicity_c_$4"."CONCEPT_ID" = "p_$0"."ETHNICITY_CONCEPT_ID"
      )
    )
    LEFT OUTER JOIN "LOCATION" AS "l_$5" ON ("l_$5"."LOCATION_ID" = "p_$0"."LOCATION_ID")
  ) 
WITH READ ONLY;