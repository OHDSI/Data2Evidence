--liquibase formatted sql
--changeset alp:V1.0.0.0.0__create_bi_events_tables
create column table "BI.EVENT"( "ID" VARCHAR (50) not null,
	 "CREATED_AT" TIMESTAMP not null,
	 "STUDY_ID" VARCHAR (50) not null,
	 "TYPE" VARCHAR (50) not null,
	 "DATA_ACTIVITY_TYPE" VARCHAR (50) not null,
	 "DATA_CONSENT_DOCUMENT_KEY" VARCHAR (50) null,
	 "DATA_EVENT_SOURCE" VARCHAR (500) null,
	 "DATA_EVENT_TYPE" VARCHAR (50) null,
	 "DATA_HOSTNAME" VARCHAR (50) null,
	 "DATA_SERVICE_NAME" VARCHAR (50) null,
	 "DATA_SERVICE_VERSION" VARCHAR (50) null,
	 "DATA_TENANT_ID" VARCHAR (50) null,
	 "DATA_TIMESTAMP" TIMESTAMP null,
	 "PERSON_ID" VARCHAR (50) null,
	 primary key ("ID") );


create column table "BI.EVENT_DATA"( "ID" VARCHAR (50) not null,
	 "ATTRIBUTE_GROUP_ID" VARCHAR (50) not null,
	 "ATTRIBUTE" VARCHAR (50) not null,
	 "VALUE" VARCHAR (200) null,
	 FOREIGN KEY("ID") REFERENCES "BI.EVENT");

comment on column "BI.EVENT_DATA"."ID" is 'References BI.EVENT Table';


--rollback drop table "BI.EVENT_DATA";
--rollback drop table "BI.EVENT";