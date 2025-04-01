--liquibase formatted sql
--changeset alp:V1.0.0.0.1__drop_consent_view

DROP VIEW IF EXISTS "VIEW::GDM.CONSENT";

--rollback DROP VIEW "VIEW::GDM.CONSENT_BASE";