drop schema "HTTPTEST_SCHEMA" cascade;

create schema "HTTPTEST_SCHEMA";

create table "HTTPTEST_SCHEMA"."bookmark" (
	"ID" VARCHAR(40),
	"BOOKMARK_NAME" VARCHAR(40),
	"BOOKMARK" TEXT,
	"TYPE" VARCHAR(10),
	"VIEW_NAME" VARCHAR(100),
	"MODIFIED" TIMESTAMP(6),
	"STUDY_ID" VARCHAR(40) default 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
	"VERSION" BIGINT,
	"PA_CONFIG_ID" VARCHAR(40),
	"CDM_CONFIG_ID" VARCHAR(40),
	"CDM_CONFIG_VERSION" VARCHAR(40),
	"USER_ID" VARCHAR(40),
	"SHARED" BOOLEAN,
	primary key ("ID")
);

create table "HTTPTEST_SCHEMA"."ConfigDbModels_AssignmentDetail" (
	"HeaderId" VARCHAR(40) not null,
	"ConfigId" VARCHAR(40) not null,
	"ConfigVersion" VARCHAR(20) not null,
	"ConfigType" VARCHAR(20) not null
);

create table "HTTPTEST_SCHEMA"."ConfigDbModels_AssignmentHeader" (
	"Id" VARCHAR(40) not null,
	"Name" VARCHAR(255) default '',
	"EntityType" CHAR(1) not null,
	"EntityValue" VARCHAR(255) not null,
	"Creator" VARCHAR(255) not null,
	"Created" TIMESTAMP(6) not null,
	"Modifier" VARCHAR(255) not null,
	"Modified" TIMESTAMP(6) not null,
	primary key ("Id")
);

create table "HTTPTEST_SCHEMA"."ConfigDbModels_Config" (
	"Id" VARCHAR(40) not null,
	"Version" VARCHAR(20) not null,
	"Status" VARCHAR(20) default '',
	"Name" VARCHAR(255) default '',
	"Type" VARCHAR(100) not null,
	"Data" TEXT not null,
	"ParentId" VARCHAR(40),
	"ParentVersion" VARCHAR(20),
	"Creator" VARCHAR(255) not null,
	"Created" TIMESTAMP(6) not null,
	"Modifier" VARCHAR(255) not null,
	"Modified" TIMESTAMP(6) not null,
	primary key ("Id", "Version")
);

create table "HTTPTEST_SCHEMA"."ConfigDbModels_Template" (
	"Id" VARCHAR(40) not null,
	"System" VARCHAR(40) not null,
	"Data" TEXT,
	"Creator" VARCHAR(256),
	"Created" TIMESTAMP(6),
	"Modifier" VARCHAR(256),
	"Modified" TIMESTAMP(6),
	primary key ("Id")
);

create table "HTTPTEST_SCHEMA"."ConfigDbModels_UserDefaultConfig" (
	"User" VARCHAR(256) not null,
	"ConfigType" VARCHAR(20) not null,
	"ConfigId" VARCHAR(40) not null,
	"ConfigVersion" VARCHAR(20) not null,
	primary key ("User", "ConfigType")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.Org" (
	"OrgID" character varying(100) unique not null,
	"ValidFrom" TIMESTAMP(6) not null,
	"ExternalOrgID" character varying(255),
	"ExternalSource" character varying(5),
	"ValidTo" TIMESTAMP(6),
	"ParentOrgID" character varying(100),
	"OrgName" character varying(5000),
	"Description" character varying(256),
	"Type" character varying(100),
	"Status" character varying(100),
	"Address.StreetName" character varying(200),
	"Address.StreetNumber" character varying(60),
	"Address.PostOfficeBox" character varying(60),
	"Address.City" character varying(100),
	"Address.PostalCode" character varying(60),
	"Address.State" character varying(100),
	"Address.Region" character varying(100),
	"Address.Country.OriginalValue" character varying(100),
	"Address.Country.Code" character varying(100),
	"Address.Country.CodeSystem" character varying(100),
	"Address.Country.CodeSystemVersion" character varying(100),
	"Telecom.Phone" character varying(100),
	"Telecom.Mobile" character varying(100),
	"Telecom.Fax" character varying(100),
	"Telecom.Email" character varying(100),
	"URL" character varying(256),
	"ChangeDetails.CreatedBy" character varying(256),
	"ChangeDetails.CreatedAt" TIMESTAMP(6),
	"ChangeDetails.ChangedBy" character varying(256),
	"ChangeDetails.ChangedAt" TIMESTAMP(6),
	primary key ("OrgID", "ValidFrom")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.OrgAncestors" (
	"OrgID" character varying(100) not null,
	"AncestorOrgID" character varying(100) not null,
	"Distance" INTEGER,
	primary key ("OrgID", "AncestorOrgID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.OrgTexts" (
	"OrgID" character varying(100) not null references "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.Org"("OrgID"),
	"lang" character varying(2) not null,
	"ValidFrom" TIMESTAMP(6) not null,
	"ValidTo" TIMESTAMP(6),
	"Name" character varying(100),
	"Description" character varying(256),
	"ChangeDetails.CreatedBy" character varying(256),
	"ChangeDetails.CreatedAt" TIMESTAMP(6),
	"ChangeDetails.ChangedBy" character varying(256),
	"ChangeDetails.ChangedAt" TIMESTAMP(6),
	primary key ("OrgID", "lang", "ValidFrom")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.UserOrgMapping" (
	"UserName" character varying(256),
	"OrgID" character varying(100) references "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.Org"("OrgID"),
	"ChangeDetails.CreatedBy" character varying(256),
	"ChangeDetails.CreatedAt" TIMESTAMP(6),
	"ChangeDetails.ChangedBy" character varying(256),
	"ChangeDetails.ChangedAt" TIMESTAMP(6)
);

create table "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLogTrace" (
	"AuditLogID" BIGINT not null,
	"LogTraceID" character varying(256) not null,
	"Status" character varying(16),
	"Timestamp" TIMESTAMP(6),
	"Location" character varying(512),
	"Text" character varying(5000),
	primary key ("AuditLogID", "LogTraceID")
);

create table "HTTPTEST_SCHEMA"."pa.db::MRIEntities.Bookmarks" (
	"Id" character varying(40) not null,
	"UserName" character varying(40) not null,
	"BookmarkName" character varying(40) not null,
	"Bookmark" TEXT,
	"Type" character varying(10),
	"ViewName" character varying(100),
	primary key ("UserName", "BookmarkName")
);

create table "HTTPTEST_SCHEMA"."pa.db::MRIEntities.CollectionItems" (
	"Id" character varying(100),
	"ItemType" character varying(1024),
	"CollectionId" character varying(32),
	"CreatedBy" character varying(256),
	"CreatedAt" TIMESTAMP(6),
	"ChangedBy" character varying(256),
	"ChangedAt" TIMESTAMP(6),
	"StatusId" character varying(32)
);

create table "HTTPTEST_SCHEMA"."pa.db::MRIEntities.DynamicViewList" (
	"ViewId" character varying(1024) not null,
	"CreatedBy" character varying(256),
	"CreatedAt" TIMESTAMP(6),
	"Description" character varying(1024),
	primary key ("ViewId")
);

create table "HTTPTEST_SCHEMA"."legacy.ots.internal::Entities.ConceptTranslation" (
	"TypeVocabularyID" character varying(100) not null,
	"TypeCode" character varying(100) not null,
	"FromVocabularyID" character varying(100) not null,
	"FromCode" character varying(100) not null,
	"ToVocabularyID" character varying(100) not null,
	"ToCode" character varying(100) not null,
	"Provider" character varying(100) not null,
	"DWAuditID" BIGINT not null,
	primary key (
		"TypeVocabularyID",
		"TypeCode",
		"FromVocabularyID",
		"FromCode",
		"ToVocabularyID",
		"ToCode"
	)
);

create table "HTTPTEST_SCHEMA"."legacy.ots.internal::Entities.Vocabularies" (
	"ID" character varying(100),
	"ExternalID" character varying(100) not null,
	"Provider" character varying(100) not null,
	"DWAuditID" BIGINT not null,
	primary key ("ExternalID")
);

create table "HTTPTEST_SCHEMA"."legacy.user.db::UserModels.UserInfo" (
	"UserID" character varying(128) not null,
	"FirstName" character varying(5000),
	"LastName" character varying(5000),
	"EmailID" character varying(5000),
	"LastLogin" TIMESTAMP(6),
	"Status" character varying(20),
	"ChangedBy" character varying(5000),
	"ChangedAt" TIMESTAMP(6),
	primary key ("UserID")
);

create table "HTTPTEST_SCHEMA"."MRIEntities_CollectionItems" (
	"Id" VARCHAR(100),
	"ItemType" VARCHAR(1024),
	"CollectionId" VARCHAR(32),
	"CreatedBy" VARCHAR(256),
	"CreatedAt" TIMESTAMP(6),
	"ChangedBy" VARCHAR(256),
	"ChangedAt" TIMESTAMP(6),
	"StatusId" VARCHAR(32)
);

create table "HTTPTEST_SCHEMA"."MRIEntities_DynamicViewList" (
	"ViewId" VARCHAR(1024) not null,
	"CreatedBy" VARCHAR(256),
	"CreatedAt" TIMESTAMP(6),
	"Description" VARCHAR(1024),
	primary key ("ViewId")
);

create table "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.ScheduleSyncHistory" ("LastSyncedAt" TIMESTAMP(6));

create table "HTTPTEST_SCHEMA"."legacy.ots.internal::Entities.Classification" (
	"VocabularyID" character varying(100) not null,
	"Code" character varying(100) not null,
	"Context" character varying(100) not null,
	"ClassVocabularyID" character varying(100) not null,
	"ClassCode" character varying(100) not null,
	"ClassHierarchyLevel" INTEGER,
	"ParentClassVocabularyID" character varying(100),
	"ParentClassCode" character varying(100),
	"Provider" character varying(100) not null,
	"DWAuditID" BIGINT not null,
	primary key (
		"VocabularyID",
		"Code",
		"Context",
		"ClassVocabularyID",
		"ClassCode"
	)
);

create table "HTTPTEST_SCHEMA"."legacy.ots.internal::Entities.ConceptTerms" (
	"ConceptVocabularyID" character varying(100) not null,
	"ConceptCode" character varying(100) not null,
	"ConceptTypeVocabularyID" character varying(100),
	"ConceptTypeCode" character varying(100),
	"TermContext" character varying(100) not null,
	"TermLanguage" character varying(2) not null,
	"TermText" character varying(5000) not null,
	"TermType" character varying(100),
	"TermIsPreferred" BOOLEAN not null,
	"Provider" character varying(100) not null,
	"DWAuditID" BIGINT not null
);

create table "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DISource" (
	"SourceID" character varying(5) not null,
	"Name" character varying(512),
	"Description" character varying(1024),
	"CreatedAt" TIMESTAMP(6),
	"CreatedBy" character varying(512),
	"ModifiedAt" TIMESTAMP(6),
	"ModifiedBy" character varying(512),
	primary key ("SourceID")
);

create table "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DIJobScheduleConfig" (
	"ScheduleConfigID" BIGINT not null,
	"Name" character varying(512),
	"Description" character varying(1024),
	"ScheduleConfigJSON" TEXT,
	"CreatedAt" TIMESTAMP(6),
	"CreatedBy" character varying(512),
	"ModifiedAt" TIMESTAMP(6),
	"ModifiedBy" character varying(512),
	primary key ("ScheduleConfigID")
);

create table "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Template" (
	"Id" character varying(40) not null,
	"System" character varying(40) not null,
	"Data" TEXT,
	"Creator" character varying(256),
	"Created" TIMESTAMP(6),
	"Modifier" character varying(256),
	"Modified" TIMESTAMP(6),
	primary key ("Id")
);

create table "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.AssignmentHeader" (
	"Id" character varying(40) not null,
	"Name" character varying(256) default '',
	"EntityType" character varying(1) not null,
	"EntityValue" character varying(256) not null,
	"Creator" character varying(256) not null,
	"Created" TIMESTAMP(6) not null,
	"Modifier" character varying(256) not null,
	"Modified" TIMESTAMP(6) not null,
	primary key ("Id")
);

create table "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" (
	"Id" character varying(100) not null,
	"ItemType" character varying(1024) not null,
	"Collection.Id" character varying(32) not null,
	"CreatedBy" character varying(256) not null,
	"CreatedAt" TIMESTAMP(6) not null,
	"ChangedBy" character varying(256),
	"ChangedAt" TIMESTAMP(6),
	"Status.Id" character varying(32) not null,
	primary key ("Id", "ItemType", "Collection.Id")
);

create table "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Participant" (
	"HANAUserName" character varying(256) not null,
	"Collection.Id" character varying(32) not null,
	"Privilege.Id" character varying(32) not null,
	"CreatedBy" character varying(256),
	"CreatedAt" TIMESTAMP(6),
	"ChangedBy" character varying(256),
	"ChangedAt" TIMESTAMP(6),
	primary key ("HANAUserName", "Collection.Id")
);

create table "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ParticipantPrivilege" (
	"Id" character varying(32) not null,
	"LanguageIsoCode" character varying(2) not null,
	"Title" character varying(256) not null,
	"Description" character varying(1024),
	primary key ("Id", "LanguageIsoCode")
);

create table "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Status" (
	"Id" character varying(32) not null,
	"Title" character varying(256) not null,
	"Description" character varying(1024) not null,
	"LanguageIsoCode" character varying(2) not null,
	primary key ("Id")
);

create table "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.CollectionType" (
	"Id" character varying(32) not null,
	"TitleKey" character varying(256) not null,
	"DescriptionKey" character varying(4096),
	primary key ("Id")
);

create table "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Comment" (
	"Id" character varying(32) not null,
	"Collection.Id" character varying(32) not null,
	"Item.Id" character varying(100) not null,
	"Text" character varying(1024) not null,
	"Type" character varying(1024) not null,
	"CreatedBy" character varying(256) not null,
	"CreatedAt" TIMESTAMP(6) not null,
	primary key ("Id")
);

create table "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Collection" (
	"Id" character varying(32) not null,
	"Type.Id" character varying(32) not null,
	"Status.Id" character varying(32),
	"Title" character varying(256) not null,
	"Description" character varying(4096),
	"CreatedBy" character varying(256) not null,
	"CreatedAt" TIMESTAMP(6) not null,
	"ChangedBy" character varying(256),
	"ChangedAt" TIMESTAMP(6),
	primary key ("Id")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Ref.Codes" (
	"CodesID" character varying(100) not null,
	"Catalog" character varying(100),
	"Version" character varying(50),
	"Code" character varying(100),
	"Lang" character varying(50),
	"Description" character varying(5000),
	primary key ("CodesID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Ref.PatientBestRecord" (
	"DWDateFrom" TIMESTAMP(6) not null,
	"PatientBestRecordID" character varying(100) not null,
	"DWDateTo" TIMESTAMP(6),
	"DWAuditID" BIGINT not null,
	"FamilyName" character varying(100),
	"GivenName" character varying(100),
	"Title.OriginalValue" character varying(100),
	"Title.Code" character varying(100),
	"Title.CodeSystem" character varying(100),
	"Title.CodeSystemVersion" character varying(100),
	"Gender.OriginalValue" character varying(100),
	"Gender.Code" character varying(100),
	"Gender.CodeSystem" character varying(100),
	"Gender.CodeSystemVersion" character varying(100),
	"BirthDate" TIMESTAMP(6),
	"MultipleBirthOrder" SMALLSERIAL,
	"DeceasedDate" TIMESTAMP(6),
	"MaritalStatus.OriginalValue" character varying(100),
	"MaritalStatus.Code" character varying(100),
	"MaritalStatus.CodeSystem" character varying(100),
	"MaritalStatus.CodeSystemVersion" character varying(100),
	"Nationality.OriginalValue" character varying(100),
	"Nationality.Code" character varying(100),
	"Nationality.CodeSystem" character varying(100),
	"Nationality.CodeSystemVersion" character varying(100),
	"Address.StreetName" character varying(200),
	"Address.StreetNumber" character varying(60),
	"Address.PostOfficeBox" character varying(60),
	"Address.City" character varying(100),
	"Address.PostalCode" character varying(60),
	"Address.State" character varying(100),
	"Address.Region" character varying(100),
	"Address.Country.OriginalValue" character varying(100),
	"Address.Country.Code" character varying(100),
	"Address.Country.CodeSystem" character varying(100),
	"Address.Country.CodeSystemVersion" character varying(100),
	"Telecom.Phone" character varying(100),
	"Telecom.Mobile" character varying(100),
	"Telecom.Fax" character varying(100),
	"Telecom.Email" character varying(100),
	primary key ("DWDateFrom", "PatientBestRecordID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.PropertySet" (
	"SetID" character varying(128) not null,
	"PropertyName" character varying(128) not null,
	"PropertyValue" character varying(256),
	primary key ("SetID", "PropertyName")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Key" (
	"DWID" BYTEA not null,
	"DWSource" character varying(5) not null,
	"DWAuditID" BIGINT not null,
	"PatientID" character varying(100) not null,
	primary key ("DWID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.OrgAttrEAV" (
	"OrgID" character varying(100) not null,
	"ValidFrom" TIMESTAMP(6) not null,
	"ValidTo" TIMESTAMP(6),
	"Attribute" character varying(100) not null,
	"Value" character varying(100),
	"ChangeDetails.CreatedBy" character varying(256),
	"ChangeDetails.CreatedAt" TIMESTAMP(6),
	"ChangeDetails.ChangedBy" character varying(256),
	"ChangeDetails.ChangedAt" TIMESTAMP(6),
	primary key ("OrgID", "ValidFrom", "Attribute")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Attr" (
	"DWDateFrom" TIMESTAMP(6) not null,
	"DWID" BYTEA not null,
	"DWDateTo" TIMESTAMP(6),
	"DWAuditID" BIGINT not null,
	"Title" character varying(1024),
	"Author" character varying(1024),
	"FileName" character varying(256),
	"Type" character varying(128),
	"MIMEType" character varying(256),
	"LanguageCode" character varying(2),
	"CreatedAt" TIMESTAMP(6),
	"CreatedBy" character varying(256),
	"ChangedAt" TIMESTAMP(6),
	"ChangedBy" character varying(256),
	primary key ("DWDateFrom", "DWID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Key" (
	"DWID" BYTEA not null,
	"DWSource" character varying(5) not null,
	"DWAuditID" BIGINT not null,
	"DocumentID" character varying(1024) not null,
	primary key ("DWID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Type" (
	"DWDocumentType" character varying(128) not null,
	"TAConfiguration" character varying(256),
	primary key ("DWDocumentType")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Type_Description" (
	"DWDocumentType" character varying(128) not null,
	"LanguageCode" character varying(2) not null,
	"ShortText" character varying(128),
	primary key ("DWDocumentType", "LanguageCode")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Interaction_Documents_Link" (
	"DWLinkID" BYTEA not null,
	"DWID_Interaction" BYTEA not null,
	"DWID_Document" BYTEA not null,
	"DWDateTo" TIMESTAMP(6),
	"DWAuditID" BIGINT not null,
	primary key ("DWLinkID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Interaction_Documents_Link_Attr" (
	"DWDateFrom" TIMESTAMP(6) not null,
	"DWLinkID" BYTEA not null,
	"DWDateTo" TIMESTAMP(6),
	"DWAuditID" BIGINT not null,
	"LinkType" character varying(256),
	primary key ("DWDateFrom", "DWLinkID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.TA_Document_Interactions_Link" (
	"DWLinkID" BYTEA not null,
	"DWID_Interaction" BYTEA not null,
	"DWID_Document" BYTEA not null,
	"DWDateTo" TIMESTAMP(6),
	"DWAuditID" BIGINT not null,
	"PluginID" character varying(256),
	primary key ("DWLinkID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Condition_Attr" (
	"DWDateFrom" TIMESTAMP(6) not null,
	"DWID" BYTEA not null,
	"DWDateTo" TIMESTAMP(6),
	"DWAuditID" BIGINT not null,
	"ConditionType" character varying(100),
	"Description" character varying(5000),
	primary key ("DWDateFrom", "DWID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Condition_Key" (
	"DWID" BYTEA not null,
	"DWSource" character varying(5) not null,
	"DWAuditID" BIGINT not null,
	"ConditionID" character varying(100) not null,
	primary key ("DWID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Attr" (
	"DWDateFrom" TIMESTAMP(6) not null,
	"DWID" BYTEA not null,
	"DWDateTo" TIMESTAMP(6),
	"DWAuditID" BIGINT not null,
	"DWID_Patient" BYTEA,
	"DWID_ParentInteraction" BYTEA,
	"DWID_Condition" BYTEA,
	"InteractionType.OriginalValue" character varying(100),
	"InteractionType.Code" character varying(100),
	"InteractionType.CodeSystem" character varying(100),
	"InteractionType.CodeSystemVersion" character varying(100),
	"InteractionStatus" character varying(100),
	"PeriodStart" TIMESTAMP(6),
	"PeriodEnd" TIMESTAMP(6),
	"PeriodTimezone" character varying(50),
	"OrgID" character varying(100),
	primary key ("DWDateFrom", "DWID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" (
	"DWID" BYTEA not null,
	"DWSource" character varying(5) not null,
	"DWAuditID" BIGINT not null,
	"InteractionID" character varying(100) not null,
	primary key ("DWID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Observations_Attr" (
	"DWDateFrom" TIMESTAMP(6) not null,
	"DWID" BYTEA not null,
	"DWDateTo" TIMESTAMP(6),
	"DWAuditID" BIGINT not null,
	"DWID_Patient" BYTEA,
	"ObsType" character varying(100),
	"ObsCharValue" character varying(255),
	"ObsNumValue" DECIMAL(34, 10),
	"ObsUnit" character varying(100),
	"ObsTime" TIMESTAMP(6),
	"OrgID" character varying(100),
	primary key ("DWDateFrom", "DWID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Observations_Key" (
	"DWID" BYTEA not null,
	"DWSource" character varying(5) not null,
	"DWAuditID" BIGINT not null,
	"ObsID" character varying(100) not null,
	primary key ("DWID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Attr" (
	"DWDateFrom" TIMESTAMP(6) not null,
	"DWID" BYTEA not null,
	"DWDateTo" TIMESTAMP(6),
	"DWAuditID" BIGINT not null,
	"ValidFrom" DATE not null,
	"ValidTo" DATE,
	"FamilyName" character varying(100),
	"GivenName" character varying(100),
	"Title.OriginalValue" character varying(100),
	"Title.Code" character varying(100),
	"Title.CodeSystem" character varying(100),
	"Title.CodeSystemVersion" character varying(100),
	"Gender.OriginalValue" character varying(100),
	"Gender.Code" character varying(100),
	"Gender.CodeSystem" character varying(100),
	"Gender.CodeSystemVersion" character varying(100),
	"BirthDate" TIMESTAMP(6),
	"MultipleBirthOrder" INTEGER,
	"DeceasedDate" TIMESTAMP(6),
	"MaritalStatus.OriginalValue" character varying(100),
	"MaritalStatus.Code" character varying(100),
	"MaritalStatus.CodeSystem" character varying(100),
	"MaritalStatus.CodeSystemVersion" character varying(100),
	"Nationality.OriginalValue" character varying(100),
	"Nationality.Code" character varying(100),
	"Nationality.CodeSystem" character varying(100),
	"Nationality.CodeSystemVersion" character varying(100),
	"Address.StreetName" character varying(200),
	"Address.StreetNumber" character varying(60),
	"Address.PostOfficeBox" character varying(60),
	"Address.City" character varying(100),
	"Address.PostalCode" character varying(60),
	"Address.State" character varying(100),
	"Address.Region" character varying(100),
	"Address.Country.OriginalValue" character varying(100),
	"Address.Country.Code" character varying(100),
	"Address.Country.CodeSystem" character varying(100),
	"Address.Country.CodeSystemVersion" character varying(100),
	"Telecom.Phone" character varying(100),
	"Telecom.Mobile" character varying(100),
	"Telecom.Fax" character varying(100),
	"Telecom.Email" character varying(100),
	"OrgID" character varying(100),
	primary key ("DWDateFrom", "DWID", "ValidFrom")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link" (
	"DWLinkID" BYTEA not null,
	"DWID_Patient" BYTEA not null,
	"DWID_Practitioner" BYTEA not null,
	"DWDateTo" TIMESTAMP(6),
	"DWAuditID" BIGINT not null,
	primary key ("DWLinkID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link_Attr" (
	"DWDateFrom" TIMESTAMP(6) not null,
	"DWLinkID" BYTEA not null,
	"DWDateTo" TIMESTAMP(6),
	"DWAuditID" BIGINT not null,
	"Role.OriginalValue" character varying(100),
	"Role.Code" character varying(100),
	"Role.CodeSystem" character varying(100),
	"Role.CodeSystemVersion" character varying(100),
	primary key ("DWDateFrom", "DWLinkID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" (
	"DWDateFrom" TIMESTAMP(6) not null,
	"DWID" BYTEA not null,
	"DWDateTo" TIMESTAMP(6),
	"DWAuditID" BIGINT not null,
	"ValidFrom" DATE not null,
	"ValidTo" DATE,
	"OrgID" character varying(100),
	"FamilyName" character varying(100),
	"GivenName" character varying(100),
	"Title.OriginalValue" character varying(100),
	"Title.Code" character varying(100),
	"Title.CodeSystem" character varying(100),
	"Title.CodeSystemVersion" character varying(100),
	"Gender.OriginalValue" character varying(100),
	"Gender.Code" character varying(100),
	"Gender.CodeSystem" character varying(100),
	"Gender.CodeSystemVersion" character varying(100),
	"BirthDate" TIMESTAMP(6),
	"MaritalStatus.OriginalValue" character varying(100),
	"MaritalStatus.Code" character varying(100),
	"MaritalStatus.CodeSystem" character varying(100),
	"MaritalStatus.CodeSystemVersion" character varying(100),
	"Nationality.OriginalValue" character varying(100),
	"Nationality.Code" character varying(100),
	"Nationality.CodeSystem" character varying(100),
	"Nationality.CodeSystemVersion" character varying(100),
	"Address.StreetName" character varying(200),
	"Address.StreetNumber" character varying(60),
	"Address.PostOfficeBox" character varying(60),
	"Address.City" character varying(100),
	"Address.PostalCode" character varying(60),
	"Address.State" character varying(100),
	"Address.Region" character varying(100),
	"Address.Country.OriginalValue" character varying(100),
	"Address.Country.Code" character varying(100),
	"Address.Country.CodeSystem" character varying(100),
	"Address.Country.CodeSystemVersion" character varying(100),
	"Telecom.Phone" character varying(100),
	"Telecom.Mobile" character varying(100),
	"Telecom.Fax" character varying(100),
	"Telecom.Email" character varying(100),
	"Role.OriginalValue" character varying(100),
	"Role.Code" character varying(100),
	"Role.CodeSystem" character varying(100),
	"Role.CodeSystemVersion" character varying(100),
	"Speciality.OriginalValue" character varying(100),
	"Speciality.Code" character varying(100),
	"Speciality.CodeSystem" character varying(100),
	"Speciality.CodeSystemVersion" character varying(100),
	"PreferredLanguage" character varying(100),
	primary key ("DWDateFrom", "DWID", "ValidFrom")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Key" (
	"DWID" BYTEA not null,
	"DWSource" character varying(5) not null,
	"DWAuditID" BIGINT not null,
	"PractitionerID" character varying(100) not null,
	primary key ("DWID")
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" (
	"DWDateFrom" TIMESTAMP(6),
	"DWID" BYTEA,
	"DWAuditID" BIGINT not null,
	"DWDateTo" TIMESTAMP(6),
	"Attribute.OriginalValue" character varying(100),
	"Attribute.Code" character varying(100),
	"Attribute.CodeSystem" character varying(100),
	"Attribute.CodeSystemVersion" character varying(100),
	"Value.OriginalValue" character varying(5000),
	"Value.Code" character varying(100),
	"Value.CodeSystem" character varying(100),
	"Value.CodeSystemVersion" character varying(100),
	"ValueVocabularyID" character varying(100)
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" (
	"DWDateFrom" TIMESTAMP(6),
	"DWID" BYTEA,
	"DWAuditID" BIGINT not null,
	"DWDateTo" TIMESTAMP(6),
	"Attribute.OriginalValue" character varying(100),
	"Attribute.Code" character varying(100),
	"Attribute.CodeSystem" character varying(100),
	"Attribute.CodeSystemVersion" character varying(100),
	"Unit" character varying(100),
	"Value" DECIMAL(34, 10)
);

create table "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" (
	"DWDateFrom" TIMESTAMP(6),
	"DWID" BYTEA,
	"DWAuditID" BIGINT not null,
	"DWDateTo" TIMESTAMP(6),
	"InteractionTextID" character varying(100),
	"Attribute" character varying(100),
	"Value" character varying(5000),
	"Lang" character varying(50)
);

create table "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.CohortsStatusConfig" (
	"Id" character varying(32) not null,
	"CollectionType.Id" character varying(32),
	"ItemType" character varying(1024) default '',
	"TextKey" character varying(1024) not null,
	"IconSource" character varying(256),
	"Language" character varying(32)
);

create table "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.StatusConfiguration" (
	"Id" character varying(32) not null,
	"CollectionType.Id" character varying(32) not null,
	"ItemType" character varying(1024) default '' not null,
	"TextKey" character varying(1024) not null,
	"IconSource" character varying(256),
	primary key ("Id", "CollectionType.Id", "ItemType")
);

create table "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.AssignmentDetail" (
	"Header.Id" character varying(40) not null,
	"Config.Id" character varying(40) not null,
	"Config.Version" character varying(20) not null,
	"Config.Type" character varying(20) not null
);

create table "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config" (
	"Id" character varying(40) not null,
	"Version" character varying(20) not null,
	"Status" character varying(20) default '',
	"Name" character varying(256) default '',
	"Type" character varying(20) not null,
	"Data" TEXT not null,
	"Parent.Id" character varying(40),
	"Parent.Version" character varying(20),
	"Creator" character varying(256) not null,
	"Created" TIMESTAMP(6) not null,
	"Modifier" character varying(256) not null,
	"Modified" TIMESTAMP(6) not null,
	primary key ("Id", "Version")
);

create table "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.UserDefaultConfig" (
	"User" character varying(256) not null,
	"ConfigType" character varying(20) not null,
	"Config.Id" character varying(40) not null,
	"Config.Version" character varying(20) not null,
	primary key ("User", "ConfigType")
);

create table "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" (
	"AuditLogID" BIGINT not null,
	"ParentAuditLogID" BIGINT,
	"ExtensionID" character varying(256),
	"SourceID" character varying(5),
	"ProfileID" BIGINT,
	"Status" character varying(16),
	"ProcessID" character varying(512),
	"ProcessType" character varying(512),
	"StartTime" TIMESTAMP(6),
	"EndTime" TIMESTAMP(6),
	"DocumentID" character varying(1024),
	"DocumentURI" character varying(1024),
	"DocumentName" character varying(512),
	"DocumentSize" character varying(512),
	"DocumentType" character varying(512),
	"Notes" character varying(1024),
	"ProfileJSONParams" TEXT,
	"AdditionalParams" TEXT,
	"ScheduleConfigID" BIGINT,
	"MonitorID" BIGINT,
	"RunBy" character varying(512),
	primary key ("AuditLogID")
);

create table "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DIExtension" (
	"ExtensionID" character varying(256) not null,
	"PluginID" character varying(256),
	"XSJSLibrary" character varying(512),
	"JSONMetadata" TEXT,
	"Provider" character varying(512),
	"Status" character varying(16),
	"CreatedAt" TIMESTAMP(6),
	"CreatedBy" character varying(512),
	"ModifiedAt" TIMESTAMP(6),
	"ModifiedBy" character varying(512),
	"TextBundle" character varying(512),
	"Name" character varying(512),
	"Description" character varying(1024),
	"ExtensionAlias" character varying(64),
	primary key ("ExtensionID")
);

create table "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DIJobScheduleMonitor" (
	"ScheduleConfigID" BIGINT not null,
	"MonitorID" BIGINT not null,
	"XSScheduleID" BIGINT,
	"XSScheduleRunStatus" character varying(16),
	"StartedAt" TIMESTAMP(6),
	"EndedAt" TIMESTAMP(6),
	"ProfileID" BIGINT,
	primary key ("ScheduleConfigID", "MonitorID")
);

create table "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.EmailQueue" (
	"NotificationID" BIGINT not null,
	"Status" character varying(16),
	"UserID" character varying(512),
	"Subject" character varying(1024),
	"EmailText" character varying(1024),
	"AuditLogID" BIGINT,
	"MonitorID" BIGINT,
	primary key ("NotificationID")
);

create table "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.JobProfile" (
	"ProfileID" BIGINT not null,
	"ExtensionID" character varying(256),
	"SourceID" character varying(5),
	"Name" character varying(512),
	"Description" character varying(1024),
	"CreatedAt" TIMESTAMP(6),
	"CreatedBy" character varying(512),
	"ModifiedAt" TIMESTAMP(6),
	"ModifiedBy" character varying(512),
	"Status" character varying(16),
	"LogLevel" INTEGER,
	"ProfileJSONParams" TEXT,
	"AdditionalParams" TEXT,
	"ScheduleConfigID" BIGINT,
	primary key ("ProfileID")
);

create table "HTTPTEST_SCHEMA"."pa.db::MRIEntities.AllowedPatientIdsForExtension_Attr" (
	"DWID" BYTEA not null,
	"DWAuditID" BIGINT,
	"InsertedOn" DATE not null,
	"UserName" character varying(100) not null,
	"DWID_Patient" BYTEA,
	"Patient_Key_Assoc.DWID" BYTEA not null,
	primary key ("DWID", "InsertedOn", "UserName")
);

---------VIEWS--------
create view "HTTPTEST_SCHEMA"."ConfigDbModels_Assignment" as
select
	ah."Id" as "Id",
	ah."Name" as "Name",
	ah."EntityType" as "EntityType",
	ah."EntityValue" as "EntityValue",
	ah."Creator" as "Creator",
	ah."Created" as "Created",
	ah."Modifier" as "Modifier",
	ah."Modified" as "Modified",
	c."Id" as "ConfigId",
	c."Version" as "ConfigVersion",
	c."Type" as "ConfigType"
from
	"HTTPTEST_SCHEMA"."ConfigDbModels_AssignmentDetail" as ad
	inner join "HTTPTEST_SCHEMA"."ConfigDbModels_AssignmentHeader" as ah on ad."HeaderId" = ah."Id"
	inner join "HTTPTEST_SCHEMA"."ConfigDbModels_Config" as c on ad."ConfigId" = c."Id"
	and ad."ConfigVersion" = c."Version"
	and ad."ConfigType" = c."Type";

create view "HTTPTEST_SCHEMA"."ConfigDbModels_DefaultConfig" as
select
	udc."User",
	udc."ConfigType",
	c."Id",
	c."Version",
	c."Name",
	c."Data"
from
	"HTTPTEST_SCHEMA"."ConfigDbModels_UserDefaultConfig" as udc
	inner join "HTTPTEST_SCHEMA"."ConfigDbModels_Config" as c on udc."ConfigId" = c."Id"
	and udc."ConfigVersion" = c."Version";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.V_ORG" as
select
	"Org_$0"."OrgID",
	"Org_$0"."ParentOrgID",
	"Org_$0"."ValidFrom",
	"Org_$0"."ValidTo"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.Org" as "Org_$0"
where
	(
		(timezone('utc', now()) >= "Org_$0"."ValidFrom")
		and (
			(timezone('utc', now()) <= "Org_$0"."ValidTo")
			or ("Org_$0"."ValidTo" is null)
		)
	);

create view "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as
select
	"Vocabularies_$0"."ID",
	"Vocabularies_$0"."ExternalID"
from
	"HTTPTEST_SCHEMA"."legacy.ots.internal::Entities.Vocabularies" as "Vocabularies_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.PatientTD" as
select
	"Patient_Attr_$0"."DWID" as "PatientID",
	"Patient_Key_$2"."PatientID" as "SourcePatientID",
	"Patient_Key_$2"."DWSource" as "Source",
	"Patient_Attr_$0"."ValidFrom",
	"Patient_Attr_$0"."ValidTo",
	"Patient_Attr_$0"."OrgID",
	"Patient_Attr_$0"."FamilyName",
	"Patient_Attr_$0"."GivenName",
	"Patient_Attr_$0"."Title.OriginalValue" as "TitleValue",
	"Patient_Attr_$0"."Title.Code" as "TitleCode",
	"Vocabularies_$5"."ID" as "TitleVocabularyID",
	"Patient_Attr_$0"."Title.CodeSystem" as "TitleCodeSystem",
	"Patient_Attr_$0"."Title.CodeSystemVersion" as "TitleCodeSystemVersion",
	"Patient_Attr_$0"."Gender.OriginalValue" as "GenderValue",
	"Patient_Attr_$0"."Gender.Code" as "GenderCode",
	"Vocabularies_$2"."ID" as "GenderVocabularyID",
	"Patient_Attr_$0"."Gender.CodeSystem" as "GenderCodeSystem",
	"Patient_Attr_$0"."Gender.CodeSystemVersion" as "GenderCodeSystemVersion",
	"Patient_Attr_$0"."BirthDate",
	"Patient_Attr_$0"."MultipleBirthOrder",
	"Patient_Attr_$0"."DeceasedDate",
	"Patient_Attr_$0"."MaritalStatus.OriginalValue" as "MaritalStatusValue",
	"Patient_Attr_$0"."MaritalStatus.Code" as "MaritalStatusCode",
	"Vocabularies_$3"."ID" as "MaritalStatusVocabularyID",
	"Patient_Attr_$0"."MaritalStatus.CodeSystem" as "MaritalStatusCodeSystem",
	"Patient_Attr_$0"."MaritalStatus.CodeSystemVersion" as "MaritalStatusCodeSystemVersion",
	"Patient_Attr_$0"."Nationality.OriginalValue" as "NationalityValue",
	"Patient_Attr_$0"."Nationality.Code" as "NationalityCode",
	"Vocabularies_$4"."ID" as "NationalityVocabularyID",
	"Patient_Attr_$0"."Nationality.CodeSystem" as "NationalityCodeSystem",
	"Patient_Attr_$0"."Nationality.CodeSystemVersion" as "NationalityCodeSystemVersion",
	"Patient_Attr_$0"."Address.StreetName" as "StreetName",
	"Patient_Attr_$0"."Address.StreetNumber" as "StreetNumber",
	"Patient_Attr_$0"."Address.PostOfficeBox" as "PostOfficeBox",
	"Patient_Attr_$0"."Address.City" as "City",
	"Patient_Attr_$0"."Address.PostalCode" as "PostalCode",
	"Patient_Attr_$0"."Address.State" as "State",
	"Patient_Attr_$0"."Address.Region" as "Region",
	"Patient_Attr_$0"."Address.Country.OriginalValue" as "CountryValue",
	"Patient_Attr_$0"."Address.Country.Code" as "CountryCode",
	"Vocabularies_$1"."ID" as "CountryVocabularyID",
	"Patient_Attr_$0"."Address.Country.CodeSystem" as "CountryCodeSystem",
	"Patient_Attr_$0"."Address.Country.CodeSystemVersion" as "CountryCodeSystemVersion",
	"Patient_Attr_$0"."Telecom.Phone" as "Phone",
	"Patient_Attr_$0"."Telecom.Mobile" as "Mobile",
	"Patient_Attr_$0"."Telecom.Fax" as "Fax",
	"Patient_Attr_$0"."Telecom.Email" as "Email"
from
	(
		(
			(
				(
					(
						"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Attr" as "Patient_Attr_$0"
						left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$1" on (
							"Vocabularies_$1"."ExternalID" = "Patient_Attr_$0"."Address.Country.CodeSystem"
						)
						inner join "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Key" as "Patient_Key_$2" on (
							"Patient_Key_$2"."DWID" = "Patient_Attr_$0"."DWID"
						)
					)
					left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$2" on (
						"Vocabularies_$2"."ExternalID" = "Patient_Attr_$0"."Gender.CodeSystem"
					)
				)
				left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$3" on (
					"Vocabularies_$3"."ExternalID" = "Patient_Attr_$0"."MaritalStatus.CodeSystem"
				)
			)
			left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$4" on (
				"Vocabularies_$4"."ExternalID" = "Patient_Attr_$0"."Nationality.CodeSystem"
			)
		)
		left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$5" on (
			"Vocabularies_$5"."ExternalID" = "Patient_Attr_$0"."Title.CodeSystem"
		)
	)
where
	("Patient_Attr_$0"."DWDateTo" is null);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Patient" as
select
	"PatientTD_$0"."PatientID",
	"PatientTD_$0"."SourcePatientID",
	"PatientTD_$0"."Source",
	"PatientTD_$0"."OrgID",
	"PatientTD_$0"."FamilyName",
	"PatientTD_$0"."GivenName",
	"PatientTD_$0"."TitleValue",
	"PatientTD_$0"."TitleCode",
	"PatientTD_$0"."TitleVocabularyID",
	"PatientTD_$0"."TitleCodeSystem",
	"PatientTD_$0"."TitleCodeSystemVersion",
	"PatientTD_$0"."GenderValue",
	"PatientTD_$0"."GenderCode",
	"PatientTD_$0"."GenderVocabularyID",
	"PatientTD_$0"."GenderCodeSystem",
	"PatientTD_$0"."GenderCodeSystemVersion",
	"PatientTD_$0"."BirthDate",
	"PatientTD_$0"."MultipleBirthOrder",
	"PatientTD_$0"."DeceasedDate",
	"PatientTD_$0"."MaritalStatusValue",
	"PatientTD_$0"."MaritalStatusCode",
	"PatientTD_$0"."MaritalStatusVocabularyID",
	"PatientTD_$0"."MaritalStatusCodeSystem",
	"PatientTD_$0"."MaritalStatusCodeSystemVersion",
	"PatientTD_$0"."NationalityValue",
	"PatientTD_$0"."NationalityCode",
	"PatientTD_$0"."NationalityVocabularyID",
	"PatientTD_$0"."NationalityCodeSystem",
	"PatientTD_$0"."NationalityCodeSystemVersion",
	"PatientTD_$0"."StreetName",
	"PatientTD_$0"."StreetNumber",
	"PatientTD_$0"."PostOfficeBox",
	"PatientTD_$0"."City",
	"PatientTD_$0"."PostalCode",
	"PatientTD_$0"."State",
	"PatientTD_$0"."Region",
	"PatientTD_$0"."CountryValue",
	"PatientTD_$0"."CountryCode",
	"PatientTD_$0"."CountryVocabularyID",
	"PatientTD_$0"."CountryCodeSystem",
	"PatientTD_$0"."CountryCodeSystemVersion",
	"PatientTD_$0"."Phone",
	"PatientTD_$0"."Mobile",
	"PatientTD_$0"."Fax",
	"PatientTD_$0"."Email"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.PatientTD" as "PatientTD_$0"
where
	(
		(
			("PatientTD_$0"."ValidFrom" is null)
			or (
				"PatientTD_$0"."ValidFrom" = TO_DATE ('0000-00-00', 'YYYY-MM-DD')
			)
			or (
				"PatientTD_$0"."ValidFrom" <= timezone('utc', now())
			)
		)
		and (
			(
				timezone('utc', now()) < "PatientTD_$0"."ValidTo"
			)
			or ("PatientTD_$0"."ValidTo" is null)
			or (
				"PatientTD_$0"."ValidTo" = TO_DATE ('0000-00-00', 'YYYY-MM-DD')
			)
		)
	);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.CohortAsInteraction" as
select
	"P_$2"."PatientID",
	"P_$2"."PatientID" as "InteractionID",
	(
		("C_$0"."Title" || ' -- ') || "U_$3"."CreatedBy"
	) as "CohortName",
	"U_$3"."CreatedBy" as "CreatedBy",
	"S_$4"."TextKey" as "CohortStatus",
	"I_$1"."Status.Id" as "StatusId",
	"S_$4"."Language",
	"C_$0"."CreatedAt" as "PeriodStart",
	"C_$0"."CreatedAt" as "PeriodEnd"
from
	(
		(
			(
				(
					"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Collection" as "C_$0"
					inner join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" as "I_$1" on ("C_$0"."Id" = "I_$1"."Collection.Id")
				)
				inner join "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Patient" as "P_$2" on (
					"I_$1"."Id" = CONVERT_FROM("P_$2"."PatientID", 'UTF8')
				)
			)
			inner join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Participant" as "U_$3" on ("U_$3"."Collection.Id" = "C_$0"."Id")
		)
		left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.CohortsStatusConfig" as "S_$4" on ("S_$4"."Id" = "I_$1"."Status.Id")
	)
where
	"S_$4"."Language" = 'en';

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.CohortStatusAsObservation" as
select
	"P_$3"."PatientID",
	"S_$2"."TextKey" as "ObsCharValue",
	'COLLECTION_STATUS' as "ObsType",
	"I_$1"."Status.Id" as "ObsID",
	"S_$2"."Language" as "Language"
from
	(
		(
			(
				(
					"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Collection" as "C_$0"
					inner join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" as "I_$1" on ("C_$0"."Id" = "I_$1"."Collection.Id")
				)
				inner join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.CohortsStatusConfig" as "S_$2" on ("S_$2"."Id" = "I_$1"."Status.Id")
			)
			inner join "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Patient" as "P_$3" on (
				"I_$1"."Id" = CONVERT_FROM("P_$3"."PatientID", 'UTF8')
			)
		)
		inner join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Participant" as "U_$4" on ("U_$4"."Collection.Id" = "C_$0"."Id")
	)
where
	"S_$2"."Language" = 'en';

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.CollectionsAsObservation" as
select
	"P_$2"."PatientID",
	(
		("C_$0"."Title" || ' -- ') || "U_$3"."CreatedBy"
	) as "ObsCharValue",
	'COLLECTION' as "ObsType",
	"I_$1"."Status.Id" as "StatusId"
from
	(
		(
			(
				"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Collection" as "C_$0"
				inner join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" as "I_$1" on ("C_$0"."Id" = "I_$1"."Collection.Id")
			)
			inner join "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Patient" as "P_$2" on (
				"I_$1"."Id" = CONVERT_FROM("P_$2"."PatientID", 'UTF8')
			)
		)
		inner join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Participant" as "U_$3" on ("U_$3"."Collection.Id" = "C_$0"."Id")
	);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Condition" as
select
	"Condition_Attr_$0"."DWID" as "ConditionID",
	"Condition_Key_Assoc"."ConditionID" as "SourceConditionID",
	"Condition_Key_Assoc"."DWSource" as "Source",
	"Condition_Attr_$0"."ConditionType",
	"Condition_Attr_$0"."Description"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Condition_Attr" as "Condition_Attr_$0"
	inner join "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Condition_Key" as "Condition_Key_Assoc" on "Condition_Key_Assoc"."DWID" = "Condition_Attr_$0"."DWID"
where
	("Condition_Attr_$0"."DWDateTo" is null);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViewsEAV.Interaction_Details" as
select
	"Interaction_Details_$0"."DWID" as "InteractionID",
	"Interactions_Key_Assoc"."InteractionID" as "SourceInteractionID",
	"Interactions_Key_Assoc"."DWSource" as "Source",
	"Interaction_Details_$0"."Attribute.OriginalValue" as "AttributeValue",
	"Interaction_Details_$0"."Attribute.Code" as "AttributeCode",
	"Vocabularies_$1"."ID" as "AttributeVocabularyID",
	"Interaction_Details_$0"."Attribute.CodeSystem" as "AttributeCodeSystem",
	"Interaction_Details_$0"."Attribute.CodeSystemVersion" as "AttributeCodeSystemVersion",
	"Interaction_Details_$0"."Value.OriginalValue" as "Value",
	"Interaction_Details_$0"."Value.Code" as "ValueCode",
	"Vocabularies_$2"."ID" as "ValueVocabularyID",
	"Interaction_Details_$0"."Value.CodeSystem" as "ValueCodeSystem",
	"Interaction_Details_$0"."Value.CodeSystemVersion" as "ValueCodeSystemVersion"
from
	(
		(
			"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" as "Interaction_Details_$0"
			inner join "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" as "Interactions_Key_Assoc" on (
				"Interactions_Key_Assoc"."DWID" = "Interaction_Details_$0"."DWID"
			)
			left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$1" on (
				"Vocabularies_$1"."ExternalID" = "Interaction_Details_$0"."Attribute.CodeSystem"
			)
		)
		left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$2" on (
			"Vocabularies_$2"."ExternalID" = "Interaction_Details_$0"."Value.CodeSystem"
		)
	)
where
	("Interaction_Details_$0"."DWDateTo" is null);

create view "HTTPTEST_SCHEMA"."legacy.ots::Views.Classification" as
select
	"Classification_$0"."VocabularyID",
	"Classification_$0"."Code",
	"Classification_$0"."ClassVocabularyID",
	"Classification_$0"."ClassCode",
	"Classification_$0"."ClassHierarchyLevel",
	"Classification_$0"."ParentClassVocabularyID",
	"Classification_$0"."ParentClassCode",
	"Classification_$0"."Context"
from
	"HTTPTEST_SCHEMA"."legacy.ots.internal::Entities.Classification" as "Classification_$0";

create view "HTTPTEST_SCHEMA"."legacy.ots::Views.ConceptTerms" as
select
	"ConceptTerms_$0"."ConceptVocabularyID",
	"ConceptTerms_$0"."ConceptCode",
	"ConceptTerms_$0"."ConceptTypeVocabularyID",
	"ConceptTerms_$0"."ConceptTypeCode",
	"ConceptTerms_$0"."TermContext",
	"ConceptTerms_$0"."TermLanguage",
	"ConceptTerms_$0"."TermText",
	"ConceptTerms_$0"."TermType",
	"ConceptTerms_$0"."TermIsPreferred"
from
	"HTTPTEST_SCHEMA"."legacy.ots.internal::Entities.ConceptTerms" as "ConceptTerms_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.InteractionDetailsOTS" as
select
	"details_$0"."InteractionID" as "InteractionID",
	"details_$0"."AttributeValue" as "AttributeValue",
	"details_$0"."AttributeCode" as "AttributeCode",
	"details_$0"."AttributeCodeSystem" as "AttributeCodeSystem",
	"details_$0"."AttributeCodeSystemVersion" as "AttributeCodeSystemVersion",
	"details_$0"."Value" as "Value",
	"details_$0"."ValueCode" as "ValueCode",
	"details_$0"."ValueCodeSystem" as "ValueCodeSystem",
	"details_$0"."ValueCodeSystemVersion" as "ValueCodeSystemVersion",
	"class_$1"."ClassCode" as "TARGET_CODE",
	"class_$1"."ClassVocabularyID" as "TARGET_VOCABULARY_ID",
	"class_$1"."ClassHierarchyLevel" as "HIERARCHY_LEVEL",
	"class_$1"."Context" as "SUBJECT",
	"terms_$2"."TermContext" as "TERM_CONTEXT",
	"terms_$2"."TermText" as "DESCRIPTION",
	"terms_$2"."TermLanguage" as "LANGUAGE"
from
	(
		(
			"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViewsEAV.Interaction_Details" as "details_$0"
			inner join "HTTPTEST_SCHEMA"."legacy.ots::Views.Classification" as "class_$1" on (
				(
					"class_$1"."VocabularyID" = "details_$0"."ValueVocabularyID"
				)
				and ("class_$1"."Code" = "details_$0"."ValueCode")
			)
		)
		inner join "HTTPTEST_SCHEMA"."legacy.ots::Views.ConceptTerms" as "terms_$2" on (
			(
				"terms_$2"."ConceptVocabularyID" = "class_$1"."ClassVocabularyID"
			)
			and (
				"terms_$2"."ConceptCode" = "class_$1"."ClassCode"
			)
		)
	);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Interactions" as
select
	"Interactions_Attr_$0"."DWID" as "InteractionID",
	"Interactions_Key_Assoc"."InteractionID" as "SourceInteractionID",
	"Interactions_Key_Assoc"."DWSource" as "Source",
	"Interactions_Attr_$0"."DWID_Patient" as "PatientID",
	"Interactions_Attr_$0"."DWID_ParentInteraction" as "ParentInteractionID",
	"Interactions_Attr_$0"."DWID_Condition" as "ConditionID",
	"Interactions_Attr_$0"."InteractionType.OriginalValue" as "InteractionTypeValue",
	"Interactions_Attr_$0"."InteractionType.Code" as "InteractionTypeCode",
	"Vocabularies_$1"."ID" as "InteractionTypeVocabularyID",
	"Interactions_Attr_$0"."InteractionType.CodeSystem" as "InteractionTypeCodeSystem",
	"Interactions_Attr_$0"."InteractionType.CodeSystemVersion" as "InteractionTypeCodeSystemVersion",
	"Interactions_Attr_$0"."InteractionStatus",
	"Interactions_Attr_$0"."PeriodStart",
	"Interactions_Attr_$0"."PeriodEnd",
	"Interactions_Attr_$0"."OrgID"
from
	(
		"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Attr" as "Interactions_Attr_$0"
		left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$1" on (
			"Vocabularies_$1"."ExternalID" = "Interactions_Attr_$0"."InteractionType.CodeSystem"
		)
		inner join "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" as "Interactions_Key_Assoc" on (
			"Interactions_Key_Assoc"."DWID" = "Interactions_Attr_$0"."DWID"
		)
	)
where
	("Interactions_Attr_$0"."DWDateTo" is null);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Observations" as
select
	"Observations_Attr_$0"."DWID" as "ObsID",
	"Observations_Key_Assoc"."ObsID" as "SourceObsID",
	"Observations_Key_Assoc"."DWSource" as "Source",
	"Observations_Attr_$0"."ObsType",
	"Observations_Attr_$0"."DWID_Patient" as "PatientID",
	"Observations_Attr_$0"."ObsCharValue",
	"Observations_Attr_$0"."ObsNumValue",
	"Observations_Attr_$0"."ObsUnit",
	"Observations_Attr_$0"."ObsTime",
	"Observations_Attr_$0"."OrgID"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Observations_Attr" as "Observations_Attr_$0"
	inner join "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Observations_Key" as "Observations_Key_Assoc" on "Observations_Key_Assoc"."DWID" = "Observations_Attr_$0"."DWID"
where
	("Observations_Attr_$0"."DWDateTo" is null);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews._Patient_Practitioner_Attr" as
select
	"Patient_Practitioner_Link_Attr_$0"."DWLinkID",
	"Patient_Practitioner_Link_Attr_$0"."Role.OriginalValue" as "RoleValue",
	"Patient_Practitioner_Link_Attr_$0"."Role.Code" as "RoleCode",
	"Vocabularies_$1"."ID" as "RoleVocabularyID",
	"Patient_Practitioner_Link_Attr_$0"."Role.CodeSystem" as "RoleCodeSystem",
	"Patient_Practitioner_Link_Attr_$0"."Role.CodeSystemVersion" as "RoleCodeSystemVersion"
from
	(
		"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link_Attr" as "Patient_Practitioner_Link_Attr_$0"
		left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$1" on (
			"Vocabularies_$1"."ExternalID" = "Patient_Practitioner_Link_Attr_$0"."Role.CodeSystem"
		)
	)
where
	(
		"Patient_Practitioner_Link_Attr_$0"."DWDateTo" is null
	);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Patient_Practitioner" as
select
	"Patient_Practitioner_Link_$0"."DWLinkID" as "ID",
	"Patient_Practitioner_Link_$0"."DWID_Patient" as "PatientID",
	"Patient_Key_Assoc"."PatientID" as "SourcePatientID",
	"Patient_Key_Assoc"."DWSource" as "SourcePatient",
	"Patient_Practitioner_Link_$0"."DWID_Practitioner" as "PractitionerID",
	"Practitioner_Key_Assoc"."PractitionerID" as "SourcePractitionerID",
	"Practitioner_Key_Assoc"."DWSource" as "SourcePractitioner",
	"_Patient_Practitioner_Attr_$1"."RoleValue",
	"_Patient_Practitioner_Attr_$1"."RoleCode",
	"_Patient_Practitioner_Attr_$1"."RoleVocabularyID",
	"_Patient_Practitioner_Attr_$1"."RoleCodeSystem",
	"_Patient_Practitioner_Attr_$1"."RoleCodeSystemVersion"
from
	(
		"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link" as "Patient_Practitioner_Link_$0"
		left outer join "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews._Patient_Practitioner_Attr" as "_Patient_Practitioner_Attr_$1" on (
			"_Patient_Practitioner_Attr_$1"."DWLinkID" = "Patient_Practitioner_Link_$0"."DWLinkID"
		)
		inner join "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Key" as "Patient_Key_Assoc" on "Patient_Key_Assoc"."DWID" = "Patient_Practitioner_Link_$0"."DWID_Patient"
		inner join "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Key" as "Practitioner_Key_Assoc" on "Practitioner_Key_Assoc"."DWID" = "Patient_Practitioner_Link_$0"."DWID_Practitioner"
	)
where
	(
		"Patient_Practitioner_Link_$0"."DWDateTo" is null
	);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.PractitionerTD" as
select
	"Practitioner_Attr_$0"."DWID" as "PractitionerID",
	"Practitioner_Key_Assoc"."PractitionerID" as "SourcePractitionerID",
	"Practitioner_Key_Assoc"."DWSource" as "Source",
	"Practitioner_Attr_$0"."ValidFrom",
	"Practitioner_Attr_$0"."ValidTo",
	"Practitioner_Attr_$0"."OrgID",
	"Practitioner_Attr_$0"."FamilyName",
	"Practitioner_Attr_$0"."GivenName",
	"Practitioner_Attr_$0"."BirthDate",
	"Practitioner_Attr_$0"."Title.OriginalValue" as "TitleValue",
	"Practitioner_Attr_$0"."Title.Code" as "TitleCode",
	"Vocabularies_$7"."ID" as "TitleVocabularyID",
	"Practitioner_Attr_$0"."Title.CodeSystem" as "TitleCodeSystem",
	"Practitioner_Attr_$0"."Title.CodeSystemVersion" as "TitleCodeSystemVersion",
	"Practitioner_Attr_$0"."Gender.OriginalValue" as "GenderValue",
	"Practitioner_Attr_$0"."Gender.Code" as "GenderCode",
	"Vocabularies_$2"."ID" as "GenderVocabularyID",
	"Practitioner_Attr_$0"."Gender.CodeSystem" as "GenderCodeSystem",
	"Practitioner_Attr_$0"."Gender.CodeSystemVersion" as "GenderCodeSystemVersion",
	"Practitioner_Attr_$0"."Role.OriginalValue" as "RoleValue",
	"Practitioner_Attr_$0"."Role.Code" as "RoleCode",
	"Vocabularies_$5"."ID" as "RoleVocabularyID",
	"Practitioner_Attr_$0"."Role.CodeSystem" as "RoleCodeSystem",
	"Practitioner_Attr_$0"."Role.CodeSystemVersion" as "RoleCodeSystemVersion",
	"Practitioner_Attr_$0"."Speciality.OriginalValue" as "SpecialityValue",
	"Practitioner_Attr_$0"."Speciality.Code" as "SpecialityCode",
	"Vocabularies_$6"."ID" as "SpecialityVocabularyID",
	"Practitioner_Attr_$0"."Speciality.CodeSystem" as "SpecialityCodeSystem",
	"Practitioner_Attr_$0"."Speciality.CodeSystemVersion" as "SpecialityCodeSystemVersion",
	"Practitioner_Attr_$0"."MaritalStatus.OriginalValue" as "MaritalStatusValue",
	"Practitioner_Attr_$0"."MaritalStatus.Code" as "MaritalStatusCode",
	"Vocabularies_$3"."ID" as "MaritalStatusVocabularyID",
	"Practitioner_Attr_$0"."MaritalStatus.CodeSystem" as "MaritalStatusCodeSystem",
	"Practitioner_Attr_$0"."MaritalStatus.CodeSystemVersion" as "MaritalStatusCodeSystemVersion",
	"Practitioner_Attr_$0"."Nationality.OriginalValue" as "NationalityValue",
	"Practitioner_Attr_$0"."Nationality.Code" as "NationalityCode",
	"Vocabularies_$4"."ID" as "NationalityVocabularyID",
	"Practitioner_Attr_$0"."Nationality.CodeSystem" as "NationalityCodeSystem",
	"Practitioner_Attr_$0"."Nationality.CodeSystemVersion" as "NationalityCodeSystemVersion",
	"Practitioner_Attr_$0"."Address.StreetName" as "StreetName",
	"Practitioner_Attr_$0"."Address.StreetNumber" as "StreetNumber",
	"Practitioner_Attr_$0"."Address.PostOfficeBox" as "PostOfficeBox",
	"Practitioner_Attr_$0"."Address.City" as "City",
	"Practitioner_Attr_$0"."Address.PostalCode" as "PostalCode",
	"Practitioner_Attr_$0"."Address.State" as "State",
	"Practitioner_Attr_$0"."Address.Region" as "Region",
	"Practitioner_Attr_$0"."Address.Country.OriginalValue" as "CountryValue",
	"Practitioner_Attr_$0"."Address.Country.Code" as "CountryCode",
	"Vocabularies_$1"."ID" as "CountryVocabularyID",
	"Practitioner_Attr_$0"."Address.Country.CodeSystem" as "CountryCodeSystem",
	"Practitioner_Attr_$0"."Address.Country.CodeSystemVersion" as "CountryCodeSystemVersion",
	"Practitioner_Attr_$0"."Telecom.Phone" as "Phone",
	"Practitioner_Attr_$0"."Telecom.Mobile" as "Mobile",
	"Practitioner_Attr_$0"."Telecom.Fax" as "Fax",
	"Practitioner_Attr_$0"."Telecom.Email" as "Email",
	"Practitioner_Attr_$0"."PreferredLanguage"
from
	(
		(
			(
				(
					(
						(
							(
								"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" as "Practitioner_Attr_$0"
								left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$1" on (
									"Vocabularies_$1"."ExternalID" = "Practitioner_Attr_$0"."Address.Country.CodeSystem"
								)
								inner join "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Key" as "Practitioner_Key_Assoc" on "Practitioner_Key_Assoc"."DWID" = "Practitioner_Attr_$0"."DWID"
							)
							left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$2" on (
								"Vocabularies_$2"."ExternalID" = "Practitioner_Attr_$0"."Gender.CodeSystem"
							)
						)
						left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$3" on (
							"Vocabularies_$3"."ExternalID" = "Practitioner_Attr_$0"."MaritalStatus.CodeSystem"
						)
					)
					left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$4" on (
						"Vocabularies_$4"."ExternalID" = "Practitioner_Attr_$0"."Nationality.CodeSystem"
					)
				)
				left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$5" on (
					"Vocabularies_$5"."ExternalID" = "Practitioner_Attr_$0"."Role.CodeSystem"
				)
			)
			left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$6" on (
				"Vocabularies_$6"."ExternalID" = "Practitioner_Attr_$0"."Speciality.CodeSystem"
			)
		)
		left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$7" on (
			"Vocabularies_$7"."ExternalID" = "Practitioner_Attr_$0"."Title.CodeSystem"
		)
	)
where
	("Practitioner_Attr_$0"."DWDateTo" is null);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Practitioner" as
select
	"PractitionerTD_$0"."PractitionerID",
	"PractitionerTD_$0"."SourcePractitionerID",
	"PractitionerTD_$0"."Source",
	"PractitionerTD_$0"."OrgID",
	"PractitionerTD_$0"."FamilyName",
	"PractitionerTD_$0"."GivenName",
	"PractitionerTD_$0"."TitleValue",
	"PractitionerTD_$0"."TitleCode",
	"PractitionerTD_$0"."TitleVocabularyID",
	"PractitionerTD_$0"."TitleCodeSystem",
	"PractitionerTD_$0"."TitleCodeSystemVersion",
	"PractitionerTD_$0"."GenderValue",
	"PractitionerTD_$0"."GenderCode",
	"PractitionerTD_$0"."GenderVocabularyID",
	"PractitionerTD_$0"."GenderCodeSystem",
	"PractitionerTD_$0"."GenderCodeSystemVersion",
	"PractitionerTD_$0"."RoleValue",
	"PractitionerTD_$0"."RoleCode",
	"PractitionerTD_$0"."RoleVocabularyID",
	"PractitionerTD_$0"."RoleCodeSystem",
	"PractitionerTD_$0"."RoleCodeSystemVersion",
	"PractitionerTD_$0"."SpecialityValue",
	"PractitionerTD_$0"."SpecialityCode",
	"PractitionerTD_$0"."SpecialityVocabularyID",
	"PractitionerTD_$0"."SpecialityCodeSystem",
	"PractitionerTD_$0"."SpecialityCodeSystemVersion",
	"PractitionerTD_$0"."BirthDate",
	"PractitionerTD_$0"."MaritalStatusValue",
	"PractitionerTD_$0"."MaritalStatusCode",
	"PractitionerTD_$0"."MaritalStatusVocabularyID",
	"PractitionerTD_$0"."MaritalStatusCodeSystem",
	"PractitionerTD_$0"."MaritalStatusCodeSystemVersion",
	"PractitionerTD_$0"."NationalityValue",
	"PractitionerTD_$0"."NationalityCode",
	"PractitionerTD_$0"."NationalityVocabularyID",
	"PractitionerTD_$0"."NationalityCodeSystem",
	"PractitionerTD_$0"."NationalityCodeSystemVersion",
	"PractitionerTD_$0"."StreetName",
	"PractitionerTD_$0"."StreetNumber",
	"PractitionerTD_$0"."PostOfficeBox",
	"PractitionerTD_$0"."City",
	"PractitionerTD_$0"."PostalCode",
	"PractitionerTD_$0"."State",
	"PractitionerTD_$0"."Region",
	"PractitionerTD_$0"."CountryValue",
	"PractitionerTD_$0"."CountryCode",
	"PractitionerTD_$0"."CountryVocabularyID",
	"PractitionerTD_$0"."CountryCodeSystem",
	"PractitionerTD_$0"."CountryCodeSystemVersion",
	"PractitionerTD_$0"."Phone",
	"PractitionerTD_$0"."Mobile",
	"PractitionerTD_$0"."Fax",
	"PractitionerTD_$0"."Email",
	"PractitionerTD_$0"."PreferredLanguage"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.PractitionerTD" as "PractitionerTD_$0"
where
	(
		(
			("PractitionerTD_$0"."ValidFrom" is null)
			or (
				"PractitionerTD_$0"."ValidFrom" = TO_DATE ('0000-00-00', 'YYYY-MM-DD')
			)
			or (
				"PractitionerTD_$0"."ValidFrom" <= timezone('utc', now())
			)
		)
		and (
			(
				timezone('utc', now()) < "PractitionerTD_$0"."ValidTo"
			)
			or ("PractitionerTD_$0"."ValidTo" is null)
			or (
				"PractitionerTD_$0"."ValidTo" = TO_DATE ('0000-00-00', 'YYYY-MM-DD')
			)
		)
	);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.V_GuardedPatient" as
select
	"PatientTD_$0"."PatientID",
	"PatientTD_$0"."SourcePatientID",
	"PatientTD_$0"."Source",
	"PatientTD_$0"."OrgID",
	"PatientTD_$0"."FamilyName",
	"PatientTD_$0"."GivenName",
	"PatientTD_$0"."TitleValue",
	"PatientTD_$0"."TitleCode",
	"PatientTD_$0"."TitleVocabularyID",
	"PatientTD_$0"."TitleCodeSystem",
	"PatientTD_$0"."TitleCodeSystemVersion",
	"PatientTD_$0"."GenderValue",
	"PatientTD_$0"."GenderCode",
	"PatientTD_$0"."GenderVocabularyID",
	"PatientTD_$0"."GenderCodeSystem",
	"PatientTD_$0"."GenderCodeSystemVersion",
	"PatientTD_$0"."BirthDate",
	"PatientTD_$0"."MultipleBirthOrder",
	"PatientTD_$0"."DeceasedDate",
	"PatientTD_$0"."MaritalStatusValue",
	"PatientTD_$0"."MaritalStatusCode",
	"PatientTD_$0"."MaritalStatusVocabularyID",
	"PatientTD_$0"."MaritalStatusCodeSystem",
	"PatientTD_$0"."MaritalStatusCodeSystemVersion",
	"PatientTD_$0"."NationalityValue",
	"PatientTD_$0"."NationalityCode",
	"PatientTD_$0"."NationalityVocabularyID",
	"PatientTD_$0"."NationalityCodeSystem",
	"PatientTD_$0"."NationalityCodeSystemVersion",
	"PatientTD_$0"."StreetName",
	"PatientTD_$0"."StreetNumber",
	"PatientTD_$0"."PostOfficeBox",
	"PatientTD_$0"."City",
	"PatientTD_$0"."PostalCode",
	"PatientTD_$0"."State",
	"PatientTD_$0"."Region",
	"PatientTD_$0"."CountryValue",
	"PatientTD_$0"."CountryCode",
	"PatientTD_$0"."CountryVocabularyID",
	"PatientTD_$0"."CountryCodeSystem",
	"PatientTD_$0"."CountryCodeSystemVersion",
	"PatientTD_$0"."Phone",
	"PatientTD_$0"."Mobile",
	"PatientTD_$0"."Fax",
	"PatientTD_$0"."Email"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.PatientTD" as "PatientTD_$0"
where
	(
		(
			("PatientTD_$0"."ValidFrom" is null)
			or (
				"PatientTD_$0"."ValidFrom" = TO_DATE ('0000-00-00', 'YYYY-MM-DD')
			)
			or (
				"PatientTD_$0"."ValidFrom" <= timezone('utc', now())
			)
		)
		and (
			(
				timezone('utc', now()) < "PatientTD_$0"."ValidTo"
			)
			or ("PatientTD_$0"."ValidTo" is null)
			or (
				"PatientTD_$0"."ValidTo" = TO_DATE ('0000-00-00', 'YYYY-MM-DD')
			)
		)
	);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViewsEAV.Interaction_Measures" as
select
	"Interaction_Measures_$0"."DWID" as "InteractionID",
	"Interactions_Key_Assoc"."InteractionID" as "SourceInteractionID",
	"Interactions_Key_Assoc"."DWSource" as "Source",
	"Interaction_Measures_$0"."Attribute.OriginalValue" as "AttributeValue",
	"Interaction_Measures_$0"."Attribute.Code" as "AttributeCode",
	"Vocabularies_$1"."ID" as "AttributeVocabularyID",
	"Interaction_Measures_$0"."Attribute.CodeSystem" as "AttributeCodeSystem",
	"Interaction_Measures_$0"."Attribute.CodeSystemVersion" as "AttributeCodeSystemVersion",
	"Interaction_Measures_$0"."Unit",
	"Interaction_Measures_$0"."Value"
from
	(
		"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" as "Interaction_Measures_$0"
		left outer join "HTTPTEST_SCHEMA"."legacy.ots::Views.Vocabularies" as "Vocabularies_$1" on (
			"Vocabularies_$1"."ExternalID" = "Interaction_Measures_$0"."Attribute.CodeSystem"
		)
		inner JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON "Interactions_Key_Assoc"."DWID" = "Interaction_Measures_$0"."DWID"
	)
where
	("Interaction_Measures_$0"."DWDateTo" is null);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViewsEAV.Interaction_Text" as
select
	"Interaction_Text_$0"."InteractionTextID",
	"Interaction_Text_$0"."DWID" as "InteractionID",
	"Interactions_Key_Assoc"."InteractionID" as "SourceInteractionID",
	"Interactions_Key_Assoc"."DWSource" as "Source",
	"Interaction_Text_$0"."Attribute",
	"Interaction_Text_$0"."Value",
	"Interaction_Text_$0"."Lang"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" as "Interaction_Text_$0"
	inner JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON "Interactions_Key_Assoc"."DWID" = "Interaction_Text_$0"."DWID"
where
	("Interaction_Text_$0"."DWDateTo" is null);

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.CODES" as
select
	"ConceptTerms_$0"."ConceptVocabularyID" as "VOCABULARY_ID",
	"ConceptTerms_$0"."TermContext" as "CONTEXT",
	"ConceptTerms_$0"."ConceptCode" as "CODE",
	"ConceptTerms_$0"."TermLanguage" as "LANGUAGE",
	"ConceptTerms_$0"."TermText" as "DESCRIPTION"
from
	"HTTPTEST_SCHEMA"."legacy.ots::Views.ConceptTerms" as "ConceptTerms_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.CONDITION" as
select
	"Condition_$0"."ConditionID" as "CONDITION_ID",
	"Condition_$0"."ConditionType" as "CONDITION_TYPE",
	"Condition_$0"."Description" as "DESCRIPTION"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Condition" as "Condition_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.GUARDED_INTERACTIONS" as
select
	"Interactions_$0"."InteractionID" as "INTERACTION_ID",
	"Interactions_$0"."PatientID" as "PATIENT_ID",
	"Interactions_$0"."InteractionTypeValue" as "INTERACTION_TYPE",
	"Interactions_$0"."InteractionTypeCode" as "INTERACTION_TYPE_CODE",
	"Interactions_$0"."InteractionTypeVocabularyID" as "INTERACTION_TYPE_VOCABULARY_ID",
	"Interactions_$0"."InteractionTypeCodeSystem" as "INTERACTION_TYPE_CODE_SYSTEM",
	"Interactions_$0"."InteractionTypeCodeSystemVersion" as "INTERACTION_TYPE_CODE_SYSTEM_VERSION",
	"Interactions_$0"."ParentInteractionID" as "PARENT_INTERACT_ID",
	"Interactions_$0"."ConditionID" as "CONDITION_ID",
	"Interactions_$0"."PeriodStart" as "START",
	"Interactions_$0"."PeriodEnd" as "END",
	"Interactions_$0"."OrgID" as "ORG_ID"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Interactions" as "Interactions_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.GUARDED_PATIENT" as
select
	"Patient_$0"."PatientID" as "PATIENT_ID",
	"Patient_$0"."SourcePatientID" as "SOURCE_PATIENT_ID",
	"Patient_$0"."Source" as "SOURCE",
	"Patient_$0"."OrgID" as "ORG_ID",
	"Patient_$0"."FamilyName" as "LASTNAME",
	"Patient_$0"."GivenName" as "FIRSTNAME",
	"Patient_$0"."TitleValue" as "TITLE",
	"Patient_$0"."TitleCode" as "TITLE_CODE",
	"Patient_$0"."TitleVocabularyID" as "TITLE_VOCABULARY_ID",
	"Patient_$0"."TitleCodeSystem" as "TITLE_CODE_SYSTEM",
	"Patient_$0"."TitleCodeSystem" as "TITLE_CODE_SYSTEM_VERSION",
	"Patient_$0"."GenderValue" as "GENDER",
	"Patient_$0"."GenderCode" as "GENDER_CODE",
	"Patient_$0"."GenderVocabularyID" as "GENDER_VOCABULARY_ID",
	"Patient_$0"."GenderCodeSystem" as "GENDER_CODE_SYSTEM",
	"Patient_$0"."GenderCodeSystem" as "GENDER_CODE_SYSTEM_VERSION",
	"Patient_$0"."BirthDate" as "DOB",
	"Patient_$0"."MultipleBirthOrder" as "MULTIPLE_BIRTH_ORDER",
	"Patient_$0"."DeceasedDate" as "DOD",
	"Patient_$0"."MaritalStatusValue" as "MARITAL_STATUS",
	"Patient_$0"."MaritalStatusCode" as "MARITAL_STATUS_CODE",
	"Patient_$0"."MaritalStatusVocabularyID" as "MARITAL_STATUS_VOCABULARY_ID",
	"Patient_$0"."MaritalStatusCodeSystem" as "MARITAL_STATUS_CODE_SYSTEM",
	"Patient_$0"."MaritalStatusCodeSystemVersion" as "MARITAL_STATUS_CODE_SYSTEM_VERSION",
	"Patient_$0"."NationalityValue" as "NATIONALITY",
	"Patient_$0"."NationalityCode" as "NATIONALITY_CODE",
	"Patient_$0"."NationalityVocabularyID" as "NATIONALITY_VOCABULARY_ID",
	"Patient_$0"."NationalityCodeSystem" as "NATIONALITY_CODE_SYSTEM",
	"Patient_$0"."NationalityCodeSystemVersion" as "NATIONALITY_CODE_SYSTEM_VERSION",
	"Patient_$0"."StreetName" as "STREET",
	"Patient_$0"."StreetNumber" as "STREET_NUMBER",
	"Patient_$0"."PostOfficeBox" as "POST_OFFICE_BOX",
	"Patient_$0"."City" as "CITY",
	"Patient_$0"."PostalCode" as "POSTCODE",
	"Patient_$0"."State" as "REGION",
	"Patient_$0"."CountryValue" as "COUNTRY",
	"Patient_$0"."CountryCode" as "COUNTRY_CODE",
	"Patient_$0"."CountryVocabularyID" as "COUNTRY_VOCABULARY_ID",
	"Patient_$0"."CountryCodeSystem" as "COUNTRY_CODE_SYSTEM",
	"Patient_$0"."CountryCodeSystemVersion" as "COUNTRY_CODE_SYSTEM_VERSION",
	"Patient_$0"."Phone" as "PHONE",
	"Patient_$0"."Mobile" as "MOBILE",
	"Patient_$0"."Fax" as "FAX",
	"Patient_$0"."Email" as "EMAIL"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Patient" as "Patient_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.GUARDED_PATIENT_TD" as
select
	"PatientTD_$0"."PatientID" as "PATIENT_ID",
	"PatientTD_$0"."SourcePatientID" as "SOURCE_PATIENT_ID",
	"PatientTD_$0"."Source" as "SOURCE",
	"PatientTD_$0"."OrgID" as "ORG_ID",
	"PatientTD_$0"."ValidFrom" as "VALID_FROM",
	"PatientTD_$0"."ValidTo" as "VALID_TO",
	"PatientTD_$0"."FamilyName" as "LASTNAME",
	"PatientTD_$0"."GivenName" as "FIRSTNAME",
	"PatientTD_$0"."TitleValue" as "TITLE",
	"PatientTD_$0"."TitleCode" as "TITLE_CODE",
	"PatientTD_$0"."TitleVocabularyID" as "TITLE_VOCABULARY_ID",
	"PatientTD_$0"."TitleCodeSystem" as "TITLE_CODE_SYSTEM",
	"PatientTD_$0"."TitleCodeSystem" as "TITLE_CODE_SYSTEM_VERSION",
	"PatientTD_$0"."GenderValue" as "GENDER",
	"PatientTD_$0"."GenderCode" as "GENDER_CODE",
	"PatientTD_$0"."GenderVocabularyID" as "GENDER_VOCABULARY_ID",
	"PatientTD_$0"."GenderCodeSystem" as "GENDER_CODE_SYSTEM",
	"PatientTD_$0"."GenderCodeSystem" as "GENDER_CODE_SYSTEM_VERSION",
	"PatientTD_$0"."BirthDate" as "DOB",
	"PatientTD_$0"."MultipleBirthOrder" as "MULTIPLE_BIRTH_ORDER",
	"PatientTD_$0"."DeceasedDate" as "DOD",
	"PatientTD_$0"."MaritalStatusValue" as "MARITAL_STATUS",
	"PatientTD_$0"."MaritalStatusCode" as "MARITAL_STATUS_CODE",
	"PatientTD_$0"."MaritalStatusVocabularyID" as "MARITAL_STATUS_VOCABULARY_ID",
	"PatientTD_$0"."MaritalStatusCodeSystem" as "MARITAL_STATUS_CODE_SYSTEM",
	"PatientTD_$0"."MaritalStatusCodeSystemVersion" as "MARITAL_STATUS_CODE_SYSTEM_VERSION",
	"PatientTD_$0"."NationalityValue" as "NATIONALITY",
	"PatientTD_$0"."NationalityCode" as "NATIONALITY_CODE",
	"PatientTD_$0"."NationalityVocabularyID" as "NATIONALITY_VOCABULARY_ID",
	"PatientTD_$0"."NationalityCodeSystem" as "NATIONALITY_CODE_SYSTEM",
	"PatientTD_$0"."NationalityCodeSystemVersion" as "NATIONALITY_CODE_SYSTEM_VERSION",
	"PatientTD_$0"."StreetName" as "STREET",
	"PatientTD_$0"."StreetNumber" as "STREET_NUMBER",
	"PatientTD_$0"."PostOfficeBox" as "POST_OFFICE_BOX",
	"PatientTD_$0"."City" as "CITY",
	"PatientTD_$0"."PostalCode" as "POSTCODE",
	"PatientTD_$0"."State" as "REGION",
	"PatientTD_$0"."CountryValue" as "COUNTRY",
	"PatientTD_$0"."CountryCode" as "COUNTRY_CODE",
	"PatientTD_$0"."CountryVocabularyID" as "COUNTRY_VOCABULARY_ID",
	"PatientTD_$0"."CountryCodeSystem" as "COUNTRY_CODE_SYSTEM",
	"PatientTD_$0"."CountryCodeSystemVersion" as "COUNTRY_CODE_SYSTEM_VERSION",
	"PatientTD_$0"."Phone" as "PHONE",
	"PatientTD_$0"."Mobile" as "MOBILE",
	"PatientTD_$0"."Fax" as "FAX",
	"PatientTD_$0"."Email" as "EMAIL"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.PatientTD" as "PatientTD_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.INTERACTIONS" as
select
	"Interactions_$0"."InteractionID" as "INTERACTION_ID",
	"Interactions_$0"."PatientID" as "PATIENT_ID",
	"Interactions_$0"."InteractionTypeValue" as "INTERACTION_TYPE",
	"Interactions_$0"."InteractionTypeCode" as "INTERACTION_TYPE_CODE",
	"Interactions_$0"."InteractionTypeVocabularyID" as "INTERACTION_TYPE_VOCABULARY_ID",
	"Interactions_$0"."InteractionTypeCodeSystem" as "INTERACTION_TYPE_CODE_SYSTEM",
	"Interactions_$0"."InteractionTypeCodeSystemVersion" as "INTERACTION_TYPE_CODE_SYSTEM_VERSION",
	"Interactions_$0"."ParentInteractionID" as "PARENT_INTERACT_ID",
	"Interactions_$0"."ConditionID" as "CONDITION_ID",
	"Interactions_$0"."PeriodStart" as "START",
	"Interactions_$0"."PeriodEnd" as "END",
	"Interactions_$0"."OrgID" as "ORG_ID"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Interactions" as "Interactions_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_EAV" as
select
	"Interaction_Details_$0"."InteractionID" as "INTERACTION_ID",
	"Interaction_Details_$0"."AttributeValue" as "ATTRIBUTE",
	"Interaction_Details_$0"."AttributeCode" as "ATTRIBUTE_CODE",
	"Interaction_Details_$0"."AttributeVocabularyID" as "ATTRIBUTE_VOCABULARY_ID",
	"Interaction_Details_$0"."AttributeCodeSystem" as "ATTRIBUTE_CODE_SYSTEM",
	"Interaction_Details_$0"."AttributeCodeSystemVersion" as "ATTRIBUTE_CODE_SYSTEM_VERSION",
	"Interaction_Details_$0"."Value" as "VALUE",
	"Interaction_Details_$0"."ValueCode" as "VALUE_CODE",
	"Interaction_Details_$0"."ValueVocabularyID" as "VALUE_VOCABULARY_ID",
	"Interaction_Details_$0"."ValueCodeSystem" as "VALUE_CODE_SYSTEM",
	"Interaction_Details_$0"."ValueCodeSystemVersion" as "VALUE_CODE_SYSTEM_VERSION"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViewsEAV.Interaction_Details" as "Interaction_Details_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_OTS" as
select
	"InteractionDetailsOTS_$0"."InteractionID" as "INTERACTION_ID",
	"InteractionDetailsOTS_$0"."AttributeValue" as "ATTRIBUTE",
	"InteractionDetailsOTS_$0"."AttributeCode" as "ATTRIBUTE_CODE",
	"InteractionDetailsOTS_$0"."AttributeCodeSystem" as "ATTRIBUTE_CODING_SYSTEM",
	"InteractionDetailsOTS_$0"."AttributeCodeSystemVersion" as "ATTRIBUTE_VERSION",
	"InteractionDetailsOTS_$0"."Value" as "VALUE",
	"InteractionDetailsOTS_$0"."ValueCode" as "VALUE_CODE",
	"InteractionDetailsOTS_$0"."ValueCodeSystem" as "VALUE_CODE_SYSTEM",
	"InteractionDetailsOTS_$0"."ValueCodeSystemVersion" as "VALUE_VERSION",
	"InteractionDetailsOTS_$0"."TARGET_CODE" as "TARGET_CODE",
	"InteractionDetailsOTS_$0"."TARGET_VOCABULARY_ID" as "TARGET_VOCABULARY_ID",
	"InteractionDetailsOTS_$0"."HIERARCHY_LEVEL" as "HIERARCHY_LEVEL",
	"InteractionDetailsOTS_$0"."SUBJECT" as "SUBJECT",
	"InteractionDetailsOTS_$0"."TERM_CONTEXT" as "TERM_CONTEXT",
	"InteractionDetailsOTS_$0"."DESCRIPTION" as "DESCRIPTION",
	"InteractionDetailsOTS_$0"."LANGUAGE" as "LANGUAGE"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.InteractionDetailsOTS" as "InteractionDetailsOTS_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.INTERACTION_MEASURES_EAV" as
select
	"Interaction_Measures_$0"."InteractionID" as "INTERACTION_ID",
	"Interaction_Measures_$0"."AttributeValue" as "ATTRIBUTE",
	"Interaction_Measures_$0"."AttributeCode" as "ATTRIBUTE_CODE",
	"Interaction_Measures_$0"."AttributeVocabularyID" as "ATTRIBUTE_VOCABULARY_ID",
	"Interaction_Measures_$0"."AttributeCodeSystem" as "ATTRIBUTE_CODE_SYSTEM",
	"Interaction_Measures_$0"."AttributeCodeSystemVersion" as "ATTRIBUTE_CODE_SYSTEM_VERSION",
	"Interaction_Measures_$0"."Unit" as "UNIT",
	"Interaction_Measures_$0"."Value" as "VALUE"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViewsEAV.Interaction_Measures" as "Interaction_Measures_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.INTERACTION_TEXT_EAV" as
select
	"Interaction_Text_$0"."InteractionTextID" as "INTERACTION_TEXT_ID",
	"Interaction_Text_$0"."InteractionID" as "INTERACTION_ID",
	"Interaction_Text_$0"."Attribute" as "ATTRIBUTE",
	"Interaction_Text_$0"."Value" as "VALUE",
	"Interaction_Text_$0"."Lang" as "LANG"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViewsEAV.Interaction_Text" as "Interaction_Text_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.OBSERVATIONS" as
select
	"Observations_$0"."ObsID" as "OBS_ID",
	"Observations_$0"."ObsType" as "OBS_TYPE",
	"Observations_$0"."PatientID" as "PATIENT_ID",
	"Observations_$0"."ObsCharValue" as "OBS_CHAR_VAL",
	"Observations_$0"."ObsNumValue" as "OBS_NUM_VAL",
	"Observations_$0"."ObsUnit" as "OBS_UNIT",
	"Observations_$0"."ObsTime" as "OBS_TIME",
	"Observations_$0"."OrgID" as "ORG_ID"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Observations" as "Observations_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.PATIENT" as
select
	"Patient_$0"."PatientID" as "PATIENT_ID",
	"Patient_$0"."SourcePatientID" as "SOURCE_PATIENT_ID",
	"Patient_$0"."Source" as "SOURCE",
	"Patient_$0"."OrgID" as "ORG_ID",
	"Patient_$0"."FamilyName" as "LASTNAME",
	"Patient_$0"."GivenName" as "FIRSTNAME",
	"Patient_$0"."TitleValue" as "TITLE",
	"Patient_$0"."TitleCode" as "TITLE_CODE",
	"Patient_$0"."TitleVocabularyID" as "TITLE_VOCABULARY_ID",
	"Patient_$0"."TitleCodeSystem" as "TITLE_CODE_SYSTEM",
	"Patient_$0"."TitleCodeSystem" as "TITLE_CODE_SYSTEM_VERSION",
	"Patient_$0"."GenderValue" as "GENDER",
	"Patient_$0"."GenderCode" as "GENDER_CODE",
	"Patient_$0"."GenderVocabularyID" as "GENDER_VOCABULARY_ID",
	"Patient_$0"."GenderCodeSystem" as "GENDER_CODE_SYSTEM",
	"Patient_$0"."GenderCodeSystem" as "GENDER_CODE_SYSTEM_VERSION",
	"Patient_$0"."BirthDate" as "DOB",
	"Patient_$0"."MultipleBirthOrder" as "MULTIPLE_BIRTH_ORDER",
	"Patient_$0"."DeceasedDate" as "DOD",
	"Patient_$0"."MaritalStatusValue" as "MARITAL_STATUS",
	"Patient_$0"."MaritalStatusCode" as "MARITAL_STATUS_CODE",
	"Patient_$0"."MaritalStatusVocabularyID" as "MARITAL_STATUS_VOCABULARY_ID",
	"Patient_$0"."MaritalStatusCodeSystem" as "MARITAL_STATUS_CODE_SYSTEM",
	"Patient_$0"."MaritalStatusCodeSystemVersion" as "MARITAL_STATUS_CODE_SYSTEM_VERSION",
	"Patient_$0"."NationalityValue" as "NATIONALITY",
	"Patient_$0"."NationalityCode" as "NATIONALITY_CODE",
	"Patient_$0"."NationalityVocabularyID" as "NATIONALITY_VOCABULARY_ID",
	"Patient_$0"."NationalityCodeSystem" as "NATIONALITY_CODE_SYSTEM",
	"Patient_$0"."NationalityCodeSystemVersion" as "NATIONALITY_CODE_SYSTEM_VERSION",
	"Patient_$0"."StreetName" as "STREET",
	"Patient_$0"."StreetNumber" as "STREET_NUMBER",
	"Patient_$0"."PostOfficeBox" as "POST_OFFICE_BOX",
	"Patient_$0"."City" as "CITY",
	"Patient_$0"."PostalCode" as "POSTCODE",
	"Patient_$0"."State" as "REGION",
	"Patient_$0"."CountryValue" as "COUNTRY",
	"Patient_$0"."CountryCode" as "COUNTRY_CODE",
	"Patient_$0"."CountryVocabularyID" as "COUNTRY_VOCABULARY_ID",
	"Patient_$0"."CountryCodeSystem" as "COUNTRY_CODE_SYSTEM",
	"Patient_$0"."CountryCodeSystemVersion" as "COUNTRY_CODE_SYSTEM_VERSION",
	"Patient_$0"."Phone" as "PHONE",
	"Patient_$0"."Mobile" as "MOBILE",
	"Patient_$0"."Fax" as "FAX",
	"Patient_$0"."Email" as "EMAIL"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.Patient" as "Patient_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.PATIENT_TD" as
select
	"PatientTD_$0"."PatientID" as "PATIENT_ID",
	"PatientTD_$0"."SourcePatientID" as "SOURCE_PATIENT_ID",
	"PatientTD_$0"."Source" as "SOURCE",
	"PatientTD_$0"."OrgID" as "ORG_ID",
	"PatientTD_$0"."ValidFrom" as "VALID_FROM",
	"PatientTD_$0"."ValidTo" as "VALID_TO",
	"PatientTD_$0"."FamilyName" as "LASTNAME",
	"PatientTD_$0"."GivenName" as "FIRSTNAME",
	"PatientTD_$0"."TitleValue" as "TITLE",
	"PatientTD_$0"."TitleCode" as "TITLE_CODE",
	"PatientTD_$0"."TitleVocabularyID" as "TITLE_VOCABULARY_ID",
	"PatientTD_$0"."TitleCodeSystem" as "TITLE_CODE_SYSTEM",
	"PatientTD_$0"."TitleCodeSystem" as "TITLE_CODE_SYSTEM_VERSION",
	"PatientTD_$0"."GenderValue" as "GENDER",
	"PatientTD_$0"."GenderCode" as "GENDER_CODE",
	"PatientTD_$0"."GenderVocabularyID" as "GENDER_VOCABULARY_ID",
	"PatientTD_$0"."GenderCodeSystem" as "GENDER_CODE_SYSTEM",
	"PatientTD_$0"."GenderCodeSystem" as "GENDER_CODE_SYSTEM_VERSION",
	"PatientTD_$0"."BirthDate" as "DOB",
	"PatientTD_$0"."MultipleBirthOrder" as "MULTIPLE_BIRTH_ORDER",
	"PatientTD_$0"."DeceasedDate" as "DOD",
	"PatientTD_$0"."MaritalStatusValue" as "MARITAL_STATUS",
	"PatientTD_$0"."MaritalStatusCode" as "MARITAL_STATUS_CODE",
	"PatientTD_$0"."MaritalStatusVocabularyID" as "MARITAL_STATUS_VOCABULARY_ID",
	"PatientTD_$0"."MaritalStatusCodeSystem" as "MARITAL_STATUS_CODE_SYSTEM",
	"PatientTD_$0"."MaritalStatusCodeSystemVersion" as "MARITAL_STATUS_CODE_SYSTEM_VERSION",
	"PatientTD_$0"."NationalityValue" as "NATIONALITY",
	"PatientTD_$0"."NationalityCode" as "NATIONALITY_CODE",
	"PatientTD_$0"."NationalityVocabularyID" as "NATIONALITY_VOCABULARY_ID",
	"PatientTD_$0"."NationalityCodeSystem" as "NATIONALITY_CODE_SYSTEM",
	"PatientTD_$0"."NationalityCodeSystemVersion" as "NATIONALITY_CODE_SYSTEM_VERSION",
	"PatientTD_$0"."StreetName" as "STREET",
	"PatientTD_$0"."StreetNumber" as "STREET_NUMBER",
	"PatientTD_$0"."PostOfficeBox" as "POST_OFFICE_BOX",
	"PatientTD_$0"."City" as "CITY",
	"PatientTD_$0"."PostalCode" as "POSTCODE",
	"PatientTD_$0"."State" as "REGION",
	"PatientTD_$0"."CountryValue" as "COUNTRY",
	"PatientTD_$0"."CountryCode" as "COUNTRY_CODE",
	"PatientTD_$0"."CountryVocabularyID" as "COUNTRY_VOCABULARY_ID",
	"PatientTD_$0"."CountryCodeSystem" as "COUNTRY_CODE_SYSTEM",
	"PatientTD_$0"."CountryCodeSystemVersion" as "COUNTRY_CODE_SYSTEM_VERSION",
	"PatientTD_$0"."Phone" as "PHONE",
	"PatientTD_$0"."Mobile" as "MOBILE",
	"PatientTD_$0"."Fax" as "FAX",
	"PatientTD_$0"."Email" as "EMAIL"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.PatientTD" as "PatientTD_$0";

create view "HTTPTEST_SCHEMA"."legacy.cdw.db.models::InterfaceViews.PRACTITIONER" as
select
	"PractitionerTD_$0"."PractitionerID" as "PRACTITIONER_ID",
	"PractitionerTD_$0"."SourcePractitionerID" as "SOURCE_PRACTITIONER_ID",
	"PractitionerTD_$0"."Source" as "SOURCE",
	"PractitionerTD_$0"."OrgID" as "ORG_ID",
	"PractitionerTD_$0"."FamilyName" as "LASTNAME",
	"PractitionerTD_$0"."GivenName" as "FIRSTNAME",
	"PractitionerTD_$0"."TitleValue" as "TITLE",
	"PractitionerTD_$0"."TitleCode" as "TITLE_CODE",
	"PractitionerTD_$0"."TitleVocabularyID" as "TITLE_VOCABULARY_ID",
	"PractitionerTD_$0"."TitleCodeSystem" as "TITLE_CODE_SYSTEM",
	"PractitionerTD_$0"."TitleCodeSystem" as "TITLE_CODE_SYSTEM_VERSION",
	"PractitionerTD_$0"."GenderValue" as "GENDER",
	"PractitionerTD_$0"."GenderCode" as "GENDER_CODE",
	"PractitionerTD_$0"."GenderVocabularyID" as "GENDER_VOCABULARY_ID",
	"PractitionerTD_$0"."GenderCodeSystem" as "GENDER_CODE_SYSTEM",
	"PractitionerTD_$0"."GenderCodeSystem" as "GENDER_CODE_SYSTEM_VERSION",
	"PractitionerTD_$0"."BirthDate" as "DOB",
	"PractitionerTD_$0"."MaritalStatusValue" as "MARITAL_STATUS",
	"PractitionerTD_$0"."MaritalStatusCode" as "MARITAL_STATUS_CODE",
	"PractitionerTD_$0"."MaritalStatusVocabularyID" as "MARITAL_STATUS_VOCABULARY_ID",
	"PractitionerTD_$0"."MaritalStatusCodeSystem" as "MARITAL_STATUS_CODE_SYSTEM",
	"PractitionerTD_$0"."MaritalStatusCodeSystemVersion" as "MARITAL_STATUS_CODE_SYSTEM_VERSION",
	"PractitionerTD_$0"."NationalityValue" as "NATIONALITY",
	"PractitionerTD_$0"."NationalityCode" as "NATIONALITY_CODE",
	"PractitionerTD_$0"."NationalityVocabularyID" as "NATIONALITY_VOCABULARY_ID",
	"PractitionerTD_$0"."NationalityCodeSystem" as "NATIONALITY_CODE_SYSTEM",
	"PractitionerTD_$0"."NationalityCodeSystemVersion" as "NATIONALITY_CODE_SYSTEM_VERSION",
	"PractitionerTD_$0"."RoleValue" as "ROLE",
	"PractitionerTD_$0"."RoleCode" as "ROLE_CODE",
	"PractitionerTD_$0"."RoleVocabularyID" as "ROLE_VOCABULARY_ID",
	"PractitionerTD_$0"."RoleCodeSystem" as "ROLE_CODE_SYSTEM",
	"PractitionerTD_$0"."RoleCodeSystemVersion" as "ROLE_CODE_SYSTEM_VERSION",
	"PractitionerTD_$0"."SpecialityValue" as "SPECIALITY",
	"PractitionerTD_$0"."SpecialityCode" as "SPECIALITY_CODE",
	"PractitionerTD_$0"."SpecialityVocabularyID" as "SPECIALITY_VOCABULARY_ID",
	"PractitionerTD_$0"."SpecialityCodeSystem" as "SPECIALITY_CODE_SYSTEM",
	"PractitionerTD_$0"."SpecialityCodeSystemVersion" as "SPECIALITY_CODE_SYSTEM_VERSION",
	"PractitionerTD_$0"."PreferredLanguage" as "LANGUAGE",
	"PractitionerTD_$0"."StreetName" as "STREET",
	"PractitionerTD_$0"."StreetNumber" as "STREET_NUMBER",
	"PractitionerTD_$0"."PostOfficeBox" as "POST_OFFICE_BOX",
	"PractitionerTD_$0"."City" as "CITY",
	"PractitionerTD_$0"."PostalCode" as "POSTCODE",
	"PractitionerTD_$0"."State" as "REGION",
	"PractitionerTD_$0"."CountryValue" as "COUNTRY",
	"PractitionerTD_$0"."CountryCode" as "COUNTRY_CODE",
	"PractitionerTD_$0"."CountryVocabularyID" as "COUNTRY_VOCABULARY_ID",
	"PractitionerTD_$0"."CountryCodeSystem" as "COUNTRY_CODE_SYSTEM",
	"PractitionerTD_$0"."CountryCodeSystemVersion" as "COUNTRY_CODE_SYSTEM_VERSION",
	"PractitionerTD_$0"."Phone" as "PHONE",
	"PractitionerTD_$0"."Mobile" as "MOBILE",
	"PractitionerTD_$0"."Fax" as "FAX",
	"PractitionerTD_$0"."Email" as "EMAIL"
from
	"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWViews.PractitionerTD" as "PractitionerTD_$0";

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.AllCollectionComments" as
select
	"Comment_$0"."Id",
	"Comment_$0"."Collection.Id" as "CollectionId",
	"Comment_$0"."Item.Id" as "ItemId",
	"Comment_$0"."Text",
	"Comment_$0"."Type",
	"Comment_$0"."CreatedBy",
	"Comment_$0"."CreatedAt"
from
	"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Comment" as "Comment_$0"
where
	("Comment_$0"."Item.Id" = '');

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.AllItemComments" as
select
	"Comment_$0"."Id",
	"Comment_$0"."Collection.Id" as "CollectionId",
	"Comment_$0"."Item.Id" as "ItemId",
	"Comment_$0"."Text",
	"Comment_$0"."Type",
	"Comment_$0"."CreatedBy",
	"Comment_$0"."CreatedAt"
from
	"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Comment" as "Comment_$0"
where
	("Comment_$0"."Item.Id" != '');

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.AllItems" as
select
	"Item_$0"."Id",
	"Item_$0"."ItemType",
	"Item_$0"."Collection.Id" as "CollectionId",
	"Item_$0"."CreatedBy",
	"Item_$0"."CreatedAt",
	"Item_$0"."ChangedBy",
	"Item_$0"."ChangedAt",
	"Item_$0"."Status.Id" as "StatusId"
from
	"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" as "Item_$0";

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.AllMyCollections" as
select
	"Collection_$0"."Id",
	"Collection_$0"."Type.Id" as "CollectionType",
	"Collection_$0"."Title",
	"Collection_$0"."Description",
	"Collection_$0"."CreatedBy",
	"Collection_$0"."CreatedAt",
	"Collection_$0"."ChangedBy",
	"Collection_$0"."ChangedAt"
from
	(
		"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Collection" as "Collection_$0"
		left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Participant" as "Participant_$1" on (
			"Participant_$1"."Collection.Id" = "Collection_$0"."Id"
		)
	)
where
	(("Collection_$0"."Type.Id" = '1'));

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.IncludedPatientIds" as
select
	COUNT ("Item_$0"."Status.Id") as "IncludedCount",
	"Item_$0"."Collection.Id" as "CollectionId"
from
	"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" as "Item_$0"
where
	(
		("Item_$0"."ItemType" = 'legacy.tax.Patient')
		and ("Item_$0"."Status.Id" = '2')
	)
group by
	"Item_$0"."Collection.Id";

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ItemIds" as
select
	COUNT ("Item_$0"."Id") as "ItemCount",
	"Item_$0"."Collection.Id" as "CollectionId"
from
	"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" as "Item_$0"
group by
	"Item_$0"."Collection.Id";

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.NoteIds" as
select
	COUNT ("AllCollectionComments_$0"."Id") as "NoteCount",
	"AllCollectionComments_$0"."CollectionId" as "CollectionId"
from
	"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.AllCollectionComments" as "AllCollectionComments_$0"
group by
	"AllCollectionComments_$0"."CollectionId";

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ParticipantIds" as
select
	COUNT ("Participant_$0"."HANAUserName") as "ParticipantCount",
	"Participant_$0"."Collection.Id" as "CollectionId"
from
	"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Participant" as "Participant_$0"
group by
	"Participant_$0"."Collection.Id";

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.AllMyCollections2" as
select
	"Collection_$0"."Id",
	"Collection_$0"."Type.Id" as "CollectionType",
	"Collection_$0"."Title",
	"Collection_$0"."Description",
	"Collection_$0"."CreatedBy",
	"Collection_$0"."CreatedAt",
	"Collection_$0"."ChangedBy",
	"Collection_$0"."ChangedAt",
	"Participant_$4"."Privilege.Id" as "PrivilegeId",
	"ParticipantIds_$5"."ParticipantCount",
	"ItemIds_$2"."ItemCount" as "ItemCount",
	"IncludedPatientIds_$1"."IncludedCount" as "IncludedCount",
	"NoteIds_$3"."NoteCount" as "NoteCount"
from
	(
		(
			(
				(
					(
						"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Collection" as "Collection_$0"
						left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.IncludedPatientIds" as "IncludedPatientIds_$1" on (
							"IncludedPatientIds_$1"."CollectionId" = "Collection_$0"."Id"
						)
					)
					left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ItemIds" as "ItemIds_$2" on (
						"ItemIds_$2"."CollectionId" = "Collection_$0"."Id"
					)
				)
				left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.NoteIds" as "NoteIds_$3" on (
					"NoteIds_$3"."CollectionId" = "Collection_$0"."Id"
				)
			)
			left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Participant" as "Participant_$4" on (
				"Participant_$4"."Collection.Id" = "Collection_$0"."Id"
			)
		)
		left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ParticipantIds" as "ParticipantIds_$5" on (
			"ParticipantIds_$5"."CollectionId" = "Collection_$0"."Id"
		)
	)
where
	(("Collection_$0"."Type.Id" = '1'));

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.AllParticipants" as
select
	"Participant_$0"."Collection.Id" as "CollectionId",
	"Participant_$0"."Privilege.Id" as "PrivilegeId",
	"Participant_$0"."HANAUserName",
	' ' as "CreatorFirstName",
	' ' as "CreatorLastName",
	' ' as "CreatorDefaultEMailAddress",
	' ' as "CreatorDefaultHomepageURL"
from
	"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Participant" as "Participant_$0";

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.AllPrivileges" as
select
	"ParticipantPrivilege_$0"."Id",
	"ParticipantPrivilege_$0"."Title"
from
	"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ParticipantPrivilege" as "ParticipantPrivilege_$0";

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.CollectionItemsByStatus" as
select
	"Item_$0"."Collection.Id" as "CollectionId",
	"Item_$0"."Status.Id" as "StatusId",
	COUNT ("Item_$0"."Id") as "ItemCount"
from
	"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" as "Item_$0"
group by
	"Item_$0"."Status.Id",
	"Item_$0"."Collection.Id";

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.CollectionStatusConfiguration" as
select
	"StatusConfiguration_$0"."Id",
	"StatusConfiguration_$0"."CollectionType.Id" as "CollectionTypeId",
	"StatusConfiguration_$0"."IconSource",
	"StatusConfiguration_$0"."TextKey"
from
	"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.StatusConfiguration" as "StatusConfiguration_$0"
where
	(
		"StatusConfiguration_$0"."ItemType" = 'legacy.tax.Patient'
	);

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ItemNoteIds" as
select
	COUNT ("AllItemComments_$0"."Id") as "NoteCount",
	"AllItemComments_$0"."ItemId",
	"AllItemComments_$0"."CollectionId" as "CollectionId"
from
	"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.AllItemComments" as "AllItemComments_$0"
group by
	"AllItemComments_$0"."CollectionId",
	"AllItemComments_$0"."ItemId";

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ItemsCollectionIds" as
select
	"Item_$0"."Id",
	COUNT ("Item_$0"."Collection.Id") as "CohortCount"
from
	(
		"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" as "Item_$0"
		left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Participant" as "Participant_$1" on (
			"Participant_$1"."Collection.Id" = "Item_$0"."Collection.Id"
		)
	)
group by
	"Item_$0"."Id";

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.PatientItems" as
select
	"Item_$0"."Id",
	"Item_$0"."ItemType",
	"Item_$0"."Collection.Id" as "CollectionId",
	"ItemNoteIds_$4"."NoteCount" as "NoteCount",
	"ItemsCollectionIds_$1"."CohortCount" as "CohortCount",
	"CollectionItemsByStatus_$2"."ItemCount" as "ItemCount",
	"ItemIds_$3"."ItemCount" as "TotalCount",
	"Item_$0"."CreatedBy",
	"Item_$0"."CreatedAt",
	"Item_$0"."ChangedBy",
	"Item_$0"."ChangedAt",
	"Item_$0"."Status.Id" as "StatusId"
from
	(
		(
			(
				(
					"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" as "Item_$0"
					left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ItemsCollectionIds" as "ItemsCollectionIds_$1" on ("ItemsCollectionIds_$1"."Id" = "Item_$0"."Id")
				)
				left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.CollectionItemsByStatus" as "CollectionItemsByStatus_$2" on (
					(
						"CollectionItemsByStatus_$2"."CollectionId" = "Item_$0"."Collection.Id"
					)
					and (
						"CollectionItemsByStatus_$2"."StatusId" = "Item_$0"."Status.Id"
					)
				)
			)
			left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ItemIds" as "ItemIds_$3" on (
				"ItemIds_$3"."CollectionId" = "Item_$0"."Collection.Id"
			)
		)
		left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ItemNoteIds" as "ItemNoteIds_$4" on (
			("ItemNoteIds_$4"."ItemId" = "Item_$0"."Id")
			and (
				"ItemNoteIds_$4"."CollectionId" = "Item_$0"."Collection.Id"
			)
		)
	)
where
	("Item_$0"."ItemType" = 'legacy.tax.Patient');

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.StatusCount" as
select
	"StatusConfiguration_$0"."Id",
	"StatusConfiguration_$0"."TextKey",
	COUNT ("Items"."Id") as "ItemsCount",
	"Items"."Collection.Id" as "CollectionId"
from
	"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.StatusConfiguration" as "StatusConfiguration_$0"
	inner JOIN "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" AS "Items" ON "Items"."Status.Id" = "StatusConfiguration_$0"."Id"
group by
	"StatusConfiguration_$0"."Id",
	"StatusConfiguration_$0"."TextKey",
	"Items"."Collection.Id";

create view "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.UserCollections" as
select
	"Collection_$0"."Id",
	"Collection_$0"."Type.Id" as "CollectionType",
	"Collection_$0"."Title",
	"NoteIds_$3"."NoteCount" as "NoteCount",
	"Collection_$0"."Description",
	"Collection_$0"."CreatedBy",
	"Collection_$0"."CreatedAt",
	"Collection_$0"."ChangedBy",
	"Collection_$0"."ChangedAt",
	"Participant_$4"."Privilege.Id" as "PrivilegeId",
	"ParticipantIds_$5"."ParticipantCount" as "ParticipantCount",
	"ItemIds_$2"."ItemCount" as "PatientCount",
	"ItemIds_$2"."ItemCount" as "ItemCount",
	"IncludedPatientIds_$1"."IncludedCount" as "IncludedCount"
from
	(
		(
			(
				(
					(
						"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Collection" as "Collection_$0"
						left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.IncludedPatientIds" as "IncludedPatientIds_$1" on (
							"IncludedPatientIds_$1"."CollectionId" = "Collection_$0"."Id"
						)
					)
					left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ItemIds" as "ItemIds_$2" on (
						"ItemIds_$2"."CollectionId" = "Collection_$0"."Id"
					)
				)
				left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.NoteIds" as "NoteIds_$3" on (
					"NoteIds_$3"."CollectionId" = "Collection_$0"."Id"
				)
			)
			left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Participant" as "Participant_$4" on (
				"Participant_$4"."Collection.Id" = "Collection_$0"."Id"
			)
		)
		left outer join "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ParticipantIds" as "ParticipantIds_$5" on (
			"ParticipantIds_$5"."CollectionId" = "Collection_$0"."Id"
		)
	);

create view "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Assignment" as
select
	"Header"."Id" as "Id",
	"Header"."Name" as "Name",
	"Header"."EntityType" as "EntityType",
	"Header"."EntityValue" as "EntityValue",
	"Header"."Creator" as "Creator",
	"Header"."Created" as "Created",
	"Header"."Modifier" as "Modifier",
	"Header"."Modified" as "Modified",
	"Config"."Id" as "ConfigId",
	"Config"."Version" as "ConfigVersion",
	"Config"."Type" as "ConfigType"
from
	"HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.AssignmentDetail" as "AssignmentDetail_$0"
	inner JOIN "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config" AS "Config" ON "Config"."Id" = "AssignmentDetail_$0"."Config.Id"
	AND "Config"."Version" = "AssignmentDetail_$0"."Config.Version"
	AND "Config"."Type" = "AssignmentDetail_$0"."Config.Type"
	inner JOIN "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.AssignmentHeader" AS "Header" ON "Header"."Id" = "AssignmentDetail_$0"."Header.Id";

create view "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.DefaultConfig" as
select
	"UserDefaultConfig_$0"."User",
	"UserDefaultConfig_$0"."ConfigType",
	"Config"."Id",
	"Config"."Version",
	"Config"."Name",
	"Config"."Data"
from
	"HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.UserDefaultConfig" as "UserDefaultConfig_$0"
	inner JOIN "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config" AS "Config" ON "Config"."Id" = "UserDefaultConfig_$0"."Config.Id"
	AND "Config"."Version" = "UserDefaultConfig_$0"."Config.Version";

create view "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLogRuns" as
select
	"AuditLog_$0"."AuditLogID",
	"AuditLog_$0"."ParentAuditLogID",
	"AuditLog_$0"."ExtensionID",
	"AuditLog_$0"."DocumentID",
	"AuditLog_$0"."DocumentURI",
	"AuditLog_$0"."SourceID",
	"AuditLog_$0"."ProfileID",
	"AuditLog_$0"."Status",
	"AuditLog_$0"."StartTime",
	"AuditLog_$0"."EndTime",
	"AuditLog_$0"."ScheduleConfigID",
	"AuditLog_$0"."MonitorID"
from
	"HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" as "AuditLog_$0";

create view "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.CompleteduditLogRuns" as
select
	"AuditLog_$0"."AuditLogID",
	"AuditLog_$0"."ParentAuditLogID",
	"AuditLog_$0"."ExtensionID",
	"AuditLog_$0"."DocumentID",
	"AuditLog_$0"."DocumentURI",
	"AuditLog_$0"."SourceID",
	"AuditLog_$0"."ProfileID",
	"AuditLog_$0"."Status",
	"AuditLog_$0"."StartTime",
	"AuditLog_$0"."EndTime",
	"AuditLog_$0"."ScheduleConfigID",
	"AuditLog_$0"."MonitorID"
from
	"HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" as "AuditLog_$0"
where
	("AuditLog_$0"."Status" = 'Completed');

create view "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DWSources" as
select
	"DISource_$0"."SourceID",
	"DISource_$0"."Name",
	"DISource_$0"."Description",
	"DISource_$0"."CreatedAt",
	"DISource_$0"."CreatedBy",
	"DISource_$0"."ModifiedAt",
	"DISource_$0"."ModifiedBy"
from
	"HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DISource" as "DISource_$0";

create view "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.FailedAuditLogRuns" as
select
	"AuditLog_$0"."AuditLogID",
	"AuditLog_$0"."ParentAuditLogID",
	"AuditLog_$0"."ExtensionID",
	"AuditLog_$0"."DocumentID",
	"AuditLog_$0"."DocumentURI",
	"AuditLog_$0"."SourceID",
	"AuditLog_$0"."ProfileID",
	"AuditLog_$0"."Status",
	"AuditLog_$0"."StartTime",
	"AuditLog_$0"."EndTime",
	"AuditLog_$0"."ScheduleConfigID",
	"AuditLog_$0"."MonitorID"
from
	"HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" as "AuditLog_$0"
where
	("AuditLog_$0"."Status" = 'Failed');

create view "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.JobProfiles" as
select
	"JobProfile_$0"."ProfileID",
	"JobProfile_$0"."ExtensionID",
	"JobProfile_$0"."Name" as "ProfileName",
	"JobProfile_$0"."Description" as "Description",
	"JobProfile_$0"."SourceID",
	"DISource_$1"."Name" as "SourceName",
	"DISource_$1"."Description" as "SourceDescription",
	"JobProfile_$0"."CreatedAt",
	"JobProfile_$0"."CreatedBy",
	"JobProfile_$0"."ModifiedAt",
	"JobProfile_$0"."ModifiedBy",
	"JobProfile_$0"."Status",
	"JobProfile_$0"."ProfileJSONParams",
	"JobProfile_$0"."AdditionalParams"
from
	(
		"HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.JobProfile" as "JobProfile_$0"
		left outer join "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DISource" as "DISource_$1" on (
			"JobProfile_$0"."SourceID" = "DISource_$1"."SourceID"
		)
	);

create view "HTTPTEST_SCHEMA"."legacy.ots::Views.ConceptTranslation" as
select
	"ConceptTranslation_$0"."TypeVocabularyID",
	"ConceptTranslation_$0"."TypeCode",
	"ConceptTranslation_$0"."FromVocabularyID",
	"ConceptTranslation_$0"."FromCode",
	"ConceptTranslation_$0"."ToVocabularyID",
	"ConceptTranslation_$0"."ToCode"
from
	"HTTPTEST_SCHEMA"."legacy.ots.internal::Entities.ConceptTranslation" as "ConceptTranslation_$0";