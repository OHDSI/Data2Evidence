--liquibase formatted sql
--changeset alp:V1.0.0.0.2__alter_research_subject_table
ALTER TABLE "GDM.RESEARCH_SUBJECT"
ADD(ETL_UPDATED_AT SECONDDATE NULL);

--rollback ALTER TABLE "GDM.RESEARCH_SUBJECT" DROP(ETL_UPDATED_AT);
