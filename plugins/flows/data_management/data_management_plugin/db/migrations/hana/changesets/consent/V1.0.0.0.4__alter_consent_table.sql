--liquibase formatted sql
--changeset alp:V1.0.0.0.4__alter_consent_table

ALTER TABLE "GDM.CONSENT" ALTER ("ID" VARCHAR(1000));
