--liquibase formatted sql
--changeset alp:V1.0.0.1.0__add_concept_recommended_table

CREATE TABLE CONCEPT_RECOMMENDED
(
    CONCEPT_ID_1 BIGINT,
    CONCEPT_ID_2 bigint,
    RELATIONSHIP_ID character varying(20)
)