--liquibase formatted sql
--changeset alp:V1.0.0.0.0__create_uct_tables


CREATE TABLE episode_evidence (
  episode_evidence_id integer NOT NULL,
  episode_evidence_description varchar(10000),
  episode_evidence_category_id integer,
  episode_type_id integer,
  query_table varchar(10000),
  lookup_table varchar(10000),
  episode_event_type_id integer,
  episode_evidence_short_description varchar(10000),
  episode_evidence_detailed_description varchar(10000),
  is_active boolean,
  episode_evidence_query_proc_id integer,
  episode_evidence_query_proc_other varchar(10000),
  episode_evidence_score numeric,
  episode_evidence_score_repeat_number numeric,
  episode_evidence_property_is_evidence_of_episode_outcome boolean,
  episode_evidence_property_is_evidence_of_treatment_start boolean,
  episode_evidence_property_is_evidence_of_ongoing_treatment boolean,
  episode_supporting_evidence_property_can_update_start_date_of_existing_episode boolean,
  episode_negating_evidence_property_negates_all_evidences_timing boolean,
  episode_negating_evidence_property_negates_all_evidences_with_score_less_than numeric,
  episode_negating_evidence_property_negates_specific_evidence_ids varchar(10000),
  episode_evidence_prerequisite_evidences varchar(10000),
  episode_evidence_signed_off_by varchar(10000),
  group_evidences_by_month_during_rollup boolean,
  loop_through_dates_during_rollup boolean,
  date_added_to_table timestamp,
  date_updated timestamp,
  is_deleted boolean,
  date_deleted timestamp
);


CREATE TABLE episode_evidence_query (
  row_id integer NOT NULL,
  episode_evidence_id integer NOT NULL,
  episode_evidence_query_field varchar(10000),
  query_value varchar(10000),
  query_operator varchar(100),
  query_bracket_number integer,
  query_bracket_order integer,
  query_field_to_store varchar(10000)
);


CREATE TABLE episode_evidence_category (
  episode_evidence_category_id integer NOT NULL,
  episode_evidence_category varchar(10000),
  episode_evidence_category_description varchar(100000),
  episode_evidence_category_score numeric
);


CREATE TABLE episode_event_type (
  episode_event_type_id integer NOT NULL,
  episode_event_description varchar(10000),
  episode_event_group varchar(10000)
);


CREATE TABLE episode_evidence_query_proc (
  episode_evidence_query_proc_id integer NOT NULL,
  episode_evidence_query_proc_name varchar(10000),
  episode_evidence_temp_table_name varchar(10000)
);


CREATE TABLE datasources (
  datasource_id integer NOT NULL,
  datasource_name varchar(10000), 
  data_first_added_date date,
  data_last_added_date date,
  encounter_precedence integer,
  datasource_category varchar(10000),
  data_load_frequency varchar(10000),
  datasource_data_type varchar(10000),
  datasource_connection_type varchar(10000)
);


CREATE TABLE pharm_code (
  pharm_code_type varchar(10000),
  pharm_code_level integer,
  pharm_code varchar(10000),
  pharm_description varchar(10000),
  date_added_to_table timestamp,
  date_updated timestamp,
  is_current boolean,
  common_query_indication boolean,
  graph_order integer,
  pharm_teratogen_status_id integer
);


CREATE TABLE #pharm_patient (
  study_patient_id varchar(10000),
  fac_id_transformed varchar(10000),
  datasource_id integer,
  pharm_code_original varchar(10000),
  pharm_description varchar(10000),
  pharm_issue_date date,
  pharm_estimated_duration_days integer,
  pharm_formulation varchar(10000),
  pharm_source_code varchar(10000),
  pharm_source_drug_name varchar(10000)
);


CREATE TABLE episode_evidences (
  study_patient_id varchar(10000),
  episode_event_date date,
  episode_type_id integer,
  episode_type_description varchar(10000),
  episode_evidence_id integer,
  query_bracket_number integer,
  fac_id_perturbed varchar(10000),
  datasource_id integer,
  date_added_to_table timestamp,
  date_updated timestamp,
  is_deleted boolean
);


CREATE TABLE episodes (
  study_patient_id varchar(10000),
  episode_type_id integer,
  episode_short_description varchar(10000),
  episode_start_date date,
  episode_treatment_start_date date,
  episode_last_contact_date date,
  episode_end_date date,
  episode_event_ids varchar(10000),
  episode_events varchar(10000),
  episode_evidence_ids varchar(10000),
  episode_evidence varchar(10000),
  episode_confidence_score numeric
);


--rollback DROP TABLE episode_evidence;
--rollback DROP TABLE episode_evidence_query;
--rollback DROP TABLE episode_evidence_category;
--rollback DROP TABLE episode_event_type;
--rollback DROP TABLE episode_evidence_query_proc;
--rollback DROP TABLE datasource;
--rollback DROP TABLE pharm_code;
--rollback DROP TABLE pharm_patient;
--rollback DROP TABLE episode_patient;
--rollback DROP TABLE episode;

