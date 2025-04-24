--liquibase formatted sql
--changeset alp:V1.0.0.0.1__rename_consent_column
RENAME COLUMN "GDM.CONSENT"."PERSON_ID" TO "ALP_ID";

--rollback RENAME COLUMN "GDM.CONSENT"."ALP_ID" TO "PERSON_ID";