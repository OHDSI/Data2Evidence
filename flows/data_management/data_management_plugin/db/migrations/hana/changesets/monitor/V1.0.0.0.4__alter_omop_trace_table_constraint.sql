--liquibase formatted sql
--changeset alp:V1.0.0.0.4__alter_omop_trace_table_constraint
ALTER TABLE "OMOP.TRACE" 
ADD CONSTRAINT pk_omop_trace PRIMARY KEY ("OMOP_ENTITY_ID", "OMOP_ENTITY_TYPE");