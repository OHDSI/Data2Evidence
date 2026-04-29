--liquibase formatted sql
--changeset alp:V1.0.0.0.2__alter_consent_table

ALTER TABLE "GDM.CONSENT"
ADD(ETL_UPDATED_AT SECONDDATE NULL);

--rollback ALTER TABLE "GDM.CONSENT" DROP(ETL_UPDATED_AT);