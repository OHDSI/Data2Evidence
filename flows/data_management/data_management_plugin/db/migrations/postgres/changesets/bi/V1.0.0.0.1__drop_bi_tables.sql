--liquibase formatted sql
--changeset alp:V1.0.0.0.1__drop_bi_tables

DROP TABLE IF EXISTS
    "BI.EVENT",
    "BI.EVENT_DATA"
CASCADE;