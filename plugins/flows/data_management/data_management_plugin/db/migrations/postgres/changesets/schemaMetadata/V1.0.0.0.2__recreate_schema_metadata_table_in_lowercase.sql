--liquibase formatted sql
--changeset alp:V1.0.0.0.2__recreate_schema_metadata_table_in_lowercase

CREATE TABLE schema_metadata (
  study_name                      varchar(255)	NOT NULL,
  created_at			                timestamp	  default (now() at time zone 'utc'),
  updated_at			                timestamp	  NULL,
  primary key (study_name)
);

--rollback drop table schema_metadata;
