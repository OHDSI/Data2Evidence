--liquibase formatted sql
--changeset alp:V1.0.0.1.0__create_consolidated_patient_view.sql

CREATE OR REPLACE VIEW "VIEW::OMOP.GDM.PATIENT" AS
SELECT "P".*, "RS".*
FROM "VIEW::OMOP.PATIENT" AS "P"
LEFT JOIN "VIEW::GDM.RESEARCH_SUBJECT_BASE" AS "RS"
ON "P"."PATIENT_ID" = "RS"."PERSON_ID"
WITH READ ONLY;
