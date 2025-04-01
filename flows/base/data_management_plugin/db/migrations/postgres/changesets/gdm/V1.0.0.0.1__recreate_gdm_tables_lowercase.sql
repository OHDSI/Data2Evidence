--liquibase formatted sql
--changeset alp:V1.0.0.0.1__recreate_gdm_tables_lowercase



/*
    "GDM.ITEM_QUESTIONNAIRE",
    "GDM.QUESTIONNAIRE",
*/


--previously under consent changeset folder
CREATE TABLE gdm_consent (
	id varchar(1000) NOT NULL,
	person_id int8 NOT NULL,
	status varchar(50) NOT NULL,
	created_at timestamp NOT NULL,
	etl_source_table varchar(500) NOT NULL,
	etl_source_table_record_id int8 NOT NULL,
	etl_source_table_record_created_at timestamp NOT NULL,
	etl_session_id varchar(50) NOT NULL,
	etl_started_at timestamp NOT NULL,
	etl_created_at timestamp NULL default (now() at time zone 'utc'::text),
	etl_updated_at timestamp NULL,
	PRIMARY KEY (id)
);

--previously under consent changeset folder
CREATE TABLE gdm_consent_detail (
	id varchar(50) NOT NULL,
	gdm_consent_id varchar(1000) NOT NULL,
	parent_consent_detail_id varchar(50) NULL,
	type varchar(50) NOT NULL,
	etl_started_at timestamp NOT NULL,
	etl_created_at timestamp NULL default (now() at time zone 'utc'::text),
	PRIMARY KEY (id),
	FOREIGN KEY (gdm_consent_id) REFERENCES gdm_consent (id) ON DELETE CASCADE
);

--previously under consent changeset folder
CREATE TABLE gdm_consent_value (
	gdm_consent_detail_id varchar(50) NOT NULL,
	attribute_group_id varchar(50) NULL,
	attribute varchar(100) NOT NULL,
	value varchar(500) NOT NULL,
	etl_started_at timestamp NOT NULL,
	etl_created_at timestamp NULL default (now() at time zone 'utc'::text),
	FOREIGN KEY (gdm_consent_detail_id) REFERENCES gdm_consent_detail (id) ON DELETE CASCADE
);

-- previously under researchSubject changeset folder
CREATE TABLE gdm_research_subject (
	alp_id varchar(50) NOT NULL,
	id varchar(1000) NULL,
	person_id int8 NOT NULL,
	status varchar(50) NULL,
	period_start timestamp NULL,
	period_end timestamp NULL,
	study_reference varchar(500) NULL,
	study_type varchar(500) NULL,
	study_identifier_use varchar(50) NULL,
	study_identifier_type varchar(500) NULL,
	study_identifier_system varchar(500) NULL,
	study_identifier_value varchar(500) NULL,
	study_identifier_period_start timestamp NULL,
	study_identifier_period_end timestamp NULL,
	study_display varchar(5000) NULL,
	individual_reference varchar(500) NULL,
	individual_type varchar(500) NULL,
	individual_identifier_use varchar(50) NULL,
	individual_identifier_type varchar(500) NULL,
	individual_identifier_system varchar(500) NULL,
	individual_identifier_value varchar(500) NULL,
	individual_identifier_period_start timestamp NULL,
	individual_identifier_period_end timestamp NULL,
	individual_display varchar(5000) NULL,
	assigned_arm varchar(500) NULL,
	actual_arm varchar(500) NULL,
	etl_source_table varchar(500) NOT NULL,
	etl_source_table_record_id int8 NOT NULL,
	etl_source_table_record_created_at timestamp NOT NULL,
	etl_session_id varchar(50) NOT NULL,
	etl_started_at timestamp NOT NULL,
	etl_created_at timestamp NULL default (now() at time zone 'utc'::text),
	etl_updated_at timestamp NULL,
	source_individual_identifier_value varchar(500) NULL,
	extension_url varchar(500) NULL,
	extension_valuestring varchar(10) NULL,
	PRIMARY KEY (alp_id)
);

-- previously under questionnaireResponse changeset folder
CREATE TABLE gdm_participant_token (
	id varchar(50) NOT NULL,
	study_id varchar(50) NOT NULL,
	external_id varchar(255) NULL,
	token varchar(255) NULL,
	created_by varchar(255) NULL,
	created_date timestamp NULL default (now() at time zone 'utc'::text),
	modified_by varchar(255) NULL,
	modified_date timestamp NULL,
	status varchar(255) NULL,
	last_donation_date timestamp NULL,
	validation_date timestamp NULL,
	PRIMARY KEY (id)
);

-- previously under questionnaireResponse changeset folder
CREATE TABLE gdm_questionnaire_response (
	id varchar(1000) NOT NULL,
	person_id int8 NOT NULL,
	language varchar(50) NULL,
	questionnaire_reference varchar(1000) NULL,
	questionnaire_version varchar(50) NULL,
	status varchar(50) NULL,
	authored timestamp NULL,
	etl_source_table varchar(500) NOT NULL,
	etl_source_table_record_id int8 NOT NULL,
	etl_source_table_record_created_at timestamp NOT NULL,
	etl_session_id varchar(50) NOT NULL,
	etl_started_at timestamp NOT NULL,
	etl_created_at timestamp NULL default (now() at time zone 'utc'::text),
	etl_updated_at timestamp NULL,
	extension_effective_date_url varchar(500) NULL,
	extension_valuedate varchar(50) NULL,
	PRIMARY KEY (id)
);

-- previously under questionnaireResponse changeset folder
CREATE TABLE gdm_item (
	id varchar(50) NOT NULL,
	gdm_questionnaire_response_id varchar(1000) NOT NULL,
	parent_item_id varchar(50) NULL,
	parent_answer_id varchar(50) NULL,
	link_id varchar(50) NULL,
	text varchar(5000) NULL,
	definition varchar(500) NULL,
	etl_started_at timestamp NOT NULL,
	etl_created_at timestamp NULL default (now() at time zone 'utc'::text),
	PRIMARY KEY (id),
  	FOREIGN KEY (gdm_questionnaire_response_id) REFERENCES gdm_questionnaire_response (id) ON DELETE CASCADE
);

-- previously under questionnaireResponse changeset folder
CREATE TABLE gdm_answer (
	id varchar(50) NOT NULL,
	gdm_item_id varchar(50) NOT NULL,
	value_type varchar(50) NULL,
	value varchar(5000) NULL,
	valueattachment_contenttype varchar(500) NULL,
	valueattachment_language varchar(50) NULL,
	valueattachment_data bytea NULL,
	valueattachment_url varchar(500) NULL,
	valueattachment_size varchar(50) NULL,
	valueattachment_hash bytea NULL,
	valueattachment_title varchar(500) NULL,
	valueattachment_creation timestamp NULL,
	valuecoding_system varchar(500) NULL,
	valuecoding_version varchar(50) NULL,
	valuecoding_code varchar(100) NULL,
	valuecoding_display varchar(5000) NULL,
	valuecoding_userselected varchar(50) NULL,
	valuequantity_value varchar(50) NULL,
	valuequantity_comparator varchar(50) NULL,
	valuequantity_unit varchar(100) NULL,
	valuequantity_system varchar(500) NULL,
	valuequantity_code varchar(100) NULL,
	valuereference_reference varchar(500) NULL,
	valuereference_type varchar(500) NULL,
	valuereference_identifier varchar(500) NULL,
	valuereference_display varchar(5000) NULL,
	etl_started_at timestamp NOT NULL,
	etl_created_at timestamp NULL default (now() at time zone 'utc'::text),
	PRIMARY KEY (id),
	FOREIGN KEY (gdm_item_id) REFERENCES gdm_item (id) ON DELETE CASCADE
);

-- previously under questionnaire changeset folder
CREATE TABLE gdm_questionnaire (
	id varchar(1000) NOT NULL,
	identifier varchar(500) NOT NULL,
	uri varchar(500) NULL,
	version varchar(50) NULL,
	name varchar(100) NULL,
	title varchar(100) NULL,
	derivedfrom varchar(500) NULL,
	status varchar(100) NOT NULL,
	experimental varchar(50) NULL,
	subjecttype varchar(100) NULL,
	contact varchar(5000) NOT NULL,
	date varchar(50) NULL,
	publisher varchar(500) NULL,
	description varchar(500) NULL,
	use_context varchar(5000) NULL,
	jurisdiction varchar(5000) NULL,
	purpose varchar(500) NULL,
	copyright varchar(500) NULL,
	copyright_label varchar(500) NULL,
	approval_date varchar(50) NULL,
	last_review_date varchar(50) NULL,
	effective_period varchar(500) NULL,
	code varchar(5000) NULL,
	created_at timestamp NULL default (now() at time zone 'utc'::text),
	PRIMARY KEY (id)
);

-- previously under questionnaire changeset folder
CREATE TABLE gdm_item_questionnaire (
	id varchar(1000) NOT NULL,
	gdm_questionnaire_id varchar(1000) NULL,
	gdm_item_quesionnaire_parent_id varchar(1000) NULL,
	linkid varchar(50) NOT NULL,
	definition varchar(50) NULL,
	code varchar(5000) NULL,
	prefix varchar(50) NULL,
	text varchar(500) NULL,
	type varchar(500) NOT NULL,
	enable_when varchar(5000) NOT NULL,
	enable_behavior varchar(100) NULL,
	disabled_display varchar(100) NULL,
	required varchar(50) NULL,
	repeats varchar(50) NULL,
	readonly varchar(50) NULL,
	maxlength int4 NULL,
	answer_constraint varchar(100) NULL,
	answer_option varchar(5000) NULL,
	answer_valueset varchar(500) NULL,
	initial_value varchar(5000) NOT NULL,
	created_at timestamp NULL default (now() at time zone 'utc'::text),
	PRIMARY KEY (id)
);

