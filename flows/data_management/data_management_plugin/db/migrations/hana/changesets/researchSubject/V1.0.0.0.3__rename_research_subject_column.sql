--liquibase formatted sql
--changeset alp:V1.0.0.0.3__rename_research_subject_column
RENAME COLUMN "GDM.RESEARCH_SUBJECT"."RECORD_ID" TO "ID";

--rollback RENAME COLUMN "GDM.RESEARCH_SUBJECT"."ID" TO "RECORD_ID";