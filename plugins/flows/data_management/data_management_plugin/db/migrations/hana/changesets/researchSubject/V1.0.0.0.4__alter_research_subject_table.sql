--liquibase formatted sql
--changeset alp:V1.0.0.0.4__alter_research_subject_table
ALTER TABLE "GDM.RESEARCH_SUBJECT"
ADD(PERSON_ID BIGINT NOT NULL);

--rollback ALTER TABLE "GDM.RESEARCH_SUBJECT" DROP(PERSON_ID);
