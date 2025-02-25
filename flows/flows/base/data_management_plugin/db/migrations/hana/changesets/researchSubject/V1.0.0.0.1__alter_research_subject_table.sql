--liquibase formatted sql
--changeset alp:V1.0.0.0.1__alter_research_subject_table
ALTER TABLE "GDM.RESEARCH_SUBJECT"
ADD(RECORD_ID VARCHAR(1000) NULL);

--rollback ALTER TABLE "GDM.RESEARCH_SUBJECT" DROP(RECORD_ID);