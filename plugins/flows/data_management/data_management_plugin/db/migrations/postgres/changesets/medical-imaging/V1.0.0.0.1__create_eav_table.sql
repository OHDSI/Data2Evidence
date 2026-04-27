--liquibase formatted sql
--changeset alp:V1.0.0.0.1__create_eav_table


CREATE TABLE dicom_file_metadata(
    metadata_id integer NOT NULL,
    data_element_concept_id integer,
    person_id integer,
    value_as_number numeric,
    value_as_concept_id integer,
    measurement_source_value varchar(50),
    metadata_source_name varchar(255),
    metadata_source_keyword varchar(255),
    metadata_source_tag varchar(20) NOT NULL,
    metadata_source_group_number varchar(20),
    metadata_source_value_representation varchar(20),
    metadata_source_value text,
    is_sequence boolean,
    sequence_length integer,
    parent_sequence_id integer,
    is_private boolean,
    private_creator varchar(255),
    sop_instance_id varchar(255),
    instance_number integer,
    image_occurrence_id integer NOT NULL,
    etl_created_datetime timestamp NOT NULL,
    etl_modified_datetime timestamp NOT NULL
);

--rollback DROP TABLE dicom_file_metadata;