--liquibase formatted sql
--changeset alp:V1.0.0.0.6__alter_consent_table

ALTER TABLE "GDM.CONSENT_DETAIL" ALTER ("GDM_CONSENT_ID" VARCHAR(1000));
