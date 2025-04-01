--liquibase formatted sql
--changeset alp:V1.0.0.0.1__drop_omop_trace_table


DROP TABLE IF EXISTS
    "OMOP.TRACE"
CASCADE;