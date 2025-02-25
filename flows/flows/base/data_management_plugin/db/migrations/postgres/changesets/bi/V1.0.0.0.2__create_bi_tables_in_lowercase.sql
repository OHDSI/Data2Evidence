--liquibase formatted sql
--changeset alp:V1.0.0.0.2__create_bi_tables_in_lowercase

CREATE TABLE bi_event (
	id varchar(50) NOT NULL,
	created_at timestamp NOT NULL,
	study_id varchar(50) NOT NULL,
	type varchar(50) NOT NULL,
	data_activity_type varchar(50) NOT NULL,
	data_consent_document_key varchar(50) NULL,
	data_event_source varchar(500) NULL,
	data_event_type varchar(50) NULL,
	data_hostname varchar(50) NULL,
	data_service_name varchar(50) NULL,
	data_service_version varchar(50) NULL,
	data_tenant_id varchar(50) NULL,
	data_timestamp timestamp NULL,
	person_id varchar(50) NULL,
	PRIMARY KEY (id)
);


CREATE TABLE bi_event_data(
	id varchar(50) NOT NULL,
	attribute_group_id varchar(50) NOT NULL,
	attribute varchar(50) NOT NULL,
	value varchar(200) NULL,
	FOREIGN KEY (id) references bi_event
);

COMMENT ON COLUMN bi_event_data.id IS 'REFERENCES bi_event TABLE';