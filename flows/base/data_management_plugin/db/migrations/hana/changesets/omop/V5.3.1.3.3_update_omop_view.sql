--liquibase formatted sql
--changeset alp:V5.3.1.3.3_update_omop_view.sql

CREATE OR REPLACE VIEW "VIEW::OMOP.DRUG_EXP" (
    "DRUG_EXPOSURE_ID",
    "PATIENT_ID",
    "DRUG_CONCEPT_ID",
    "DRUG_NAME",
    "DRUG_EXPOSURE_START_DATE",
    "DRUG_EXPOSURE_END_DATE",
    "DRUG_EXPOSURE_START_DATETIME",
    "DRUG_EXPOSURE_END_DATETIME",
    "VERBATIM_END_DATE",
    "DRUG_TYPE_CONCEPT_ID",
    "DRUG_TYPE_NAME",
    "STOP_REASON",
    "REFILLS",
    "DAYS_SUPPLY",
    "SIG",
    "ROUTE_CONCEPT_ID",
    "ROUTE_NAME",
    "LOT_NUMBER",
    "PROVIDER_ID",
    "VISIT_OCCURRENCE_ID",
    "DRUG_CONCEPT_CODE",
    "DRUG_TYPE_CONCEPT_CODE",
    "ROUTE_CONCEPT_CODE"
  ) AS
SELECT
  "de_$0"."DRUG_EXPOSURE_ID",
  "p_$1"."PATIENT_ID",
  "de_$0"."DRUG_CONCEPT_ID",
  "c_$2"."CONCEPT_NAME" AS "DRUG_NAME",
  "de_$0"."DRUG_EXPOSURE_START_DATE",
  "de_$0"."DRUG_EXPOSURE_END_DATE",
  "de_$0"."DRUG_EXPOSURE_START_DATETIME",
  "de_$0"."DRUG_EXPOSURE_END_DATETIME",
  "de_$0"."VERBATIM_END_DATE",
  "de_$0"."DRUG_TYPE_CONCEPT_ID",
  "ct_$3"."CONCEPT_NAME" AS "DRUG_TYPE_NAME",
  "de_$0"."STOP_REASON",
  "de_$0"."REFILLS",
  "de_$0"."DAYS_SUPPLY",
  "de_$0"."SIG",
  "de_$0"."ROUTE_CONCEPT_ID",
  "r_$4"."CONCEPT_NAME" AS "ROUTE_NAME",
  "de_$0"."LOT_NUMBER",
  "de_$0"."PROVIDER_ID",
  "de_$0"."VISIT_OCCURRENCE_ID",
  "c_$2"."CONCEPT_CODE" AS "DRUG_CONCEPT_CODE",
  "ct_$3"."CONCEPT_CODE" AS "DRUG_TYPE_CONCEPT_CODE",
  "r_$4"."CONCEPT_CODE" AS "ROUTE_CONCEPT_CODE"
FROM
  (
    (
      (
        (
          "DRUG_EXPOSURE" AS "de_$0"
          INNER JOIN "VIEW::OMOP.PATIENT" AS "p_$1" ON ("de_$0"."PERSON_ID" = "p_$1"."PATIENT_ID")
        )
        INNER JOIN "CONCEPT" AS "c_$2" ON (
          "c_$2"."CONCEPT_ID" = "de_$0"."DRUG_CONCEPT_ID"
        )
      )
      INNER JOIN "CONCEPT" AS "ct_$3" ON (
        "ct_$3"."CONCEPT_ID" = "de_$0"."DRUG_TYPE_CONCEPT_ID"
      )
    )
    LEFT JOIN "CONCEPT" AS "r_$4" ON (
      "r_$4"."CONCEPT_ID" = "de_$0"."ROUTE_CONCEPT_ID"
    )
  ) 
WITH READ ONLY;
