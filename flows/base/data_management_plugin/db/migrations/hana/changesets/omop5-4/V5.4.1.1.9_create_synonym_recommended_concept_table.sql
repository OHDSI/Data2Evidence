--liquibase formatted sql
--changeset alp:V5.4.1.1.9_create_synonym_recommended_concept_table.sql

ALTER TABLE CONCEPT_SYNONYM DROP SYSTEM VERSIONING;

ALTER TABLE CONCEPT_SYNONYM ALTER (CONCEPT_SYNONYM_NAME NVARCHAR(2000) FUZZY SEARCH INDEX ON);
CREATE FULLTEXT INDEX index_on_concept_synonym_name ON CONCEPT_SYNONYM(CONCEPT_SYNONYM_NAME);

ALTER TABLE "CONCEPT_SYNONYM" ADD SYSTEM VERSIONING HISTORY TABLE "CONCEPT_SYNONYM_HISTORY";


CREATE TABLE concept_recommended
(
    concept_id_1 bigint,
    concept_id_2 bigint,
    relationship_id character varying(20)
)
