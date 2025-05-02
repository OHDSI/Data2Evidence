--liquibase formatted sql
--changeset alp:V1.0.0.0.0__participant_token_research_subject_view

CREATE OR REPLACE VIEW "VIEW::OMOP.PARTICIPANT_TOKEN" AS
SELECT 
    P.ID, 
    P.STUDY_ID, 
    P.EXTERNAL_ID, 
    P.TOKEN, 
    P.CREATED_BY, 
    P.CREATED_DATE, 
    P.MODIFIED_BY, 
    P.MODIFIED_DATE, 
    P.STATUS, 
    P.LAST_DONATION_DATE, 
    P.VALIDATION_DATE,
    R.PERSON_ID
FROM "GDM.PARTICIPANT_TOKEN" AS P
INNER JOIN "VIEW::GDM.RESEARCH_SUBJECT_BASE" AS R
ON P.external_id = R.individual_identifier_value
WITH READ ONLY;

--rollback DROP VIEW "VIEW::OMOP.PARTICIPANT_TOKEN";
