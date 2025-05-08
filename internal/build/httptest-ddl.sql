CREATE SCHEMA HTTPTEST_SCHEMA;

CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."bookmark" ("ID" VARCHAR(40),
"BOOKMARK_NAME" VARCHAR(40),
"BOOKMARK" TEXT SYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0,
"TYPE" VARCHAR(10),
"VIEW_NAME" VARCHAR(100),
"MODIFIED" LONGDATE CS_LONGDATE,
"STUDY_ID" VARCHAR(40) DEFAULT 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
"VERSION" INTEGER CS_INT,
"PA_CONFIG_ID" VARCHAR(40),
"CDM_CONFIG_ID" VARCHAR(40),
"CDM_CONFIG_VERSION" VARCHAR(40),
"USER_ID" VARCHAR(40),
"SHARED" BOOLEAN CS_INT,
PRIMARY KEY ("ID")) UNLOAD PRIORITY 5 AUTO MERGE;

CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."ConfigDbModels_AssignmentDetail" ("HeaderId" VARCHAR(40) NOT NULL ,
"ConfigId" VARCHAR(40) NOT NULL ,
"ConfigVersion" VARCHAR(20) NOT NULL ,
"ConfigType" VARCHAR(20) NOT NULL ) UNLOAD PRIORITY 5 AUTO MERGE;

CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."ConfigDbModels_AssignmentHeader" ("Id" VARCHAR(40) NOT NULL ,
"Name" VARCHAR(255) DEFAULT '',
"EntityType" CHAR(1) CS_FIXEDSTRING NOT NULL ,
"EntityValue" VARCHAR(255) NOT NULL ,
"Creator" VARCHAR(255) NOT NULL ,
"Created" LONGDATE CS_LONGDATE NOT NULL ,
"Modifier" VARCHAR(255) NOT NULL ,
"Modified" LONGDATE CS_LONGDATE NOT NULL ,
PRIMARY KEY ("Id")) UNLOAD PRIORITY 5 AUTO MERGE;

CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."ConfigDbModels_Config" ("Id" VARCHAR(40) NOT NULL ,
"Version" VARCHAR(20) NOT NULL ,
"Status" VARCHAR(20) DEFAULT '',
"Name" VARCHAR(255) DEFAULT '',
"Type" VARCHAR(100) NOT NULL ,
"Data" NCLOB MEMORY THRESHOLD 1000 NOT NULL ,
"ParentId" VARCHAR(40),
"ParentVersion" VARCHAR(20),
"Creator" VARCHAR(255) NOT NULL ,
"Created" LONGDATE CS_LONGDATE NOT NULL ,
"Modifier" VARCHAR(255) NOT NULL ,
"Modified" LONGDATE CS_LONGDATE NOT NULL ,
PRIMARY KEY ("Id",
"Version")) UNLOAD PRIORITY 5 AUTO MERGE;

CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."ConfigDbModels_Template" ("Id" VARCHAR(40) NOT NULL ,
"System" VARCHAR(40) NOT NULL ,
"Data" TEXT SYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0,
"Creator" VARCHAR(256),
"Created" LONGDATE CS_LONGDATE,
"Modifier" VARCHAR(256),
"Modified" LONGDATE CS_LONGDATE,
PRIMARY KEY ("Id")) UNLOAD PRIORITY 5 AUTO MERGE;

CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."ConfigDbModels_UserDefaultConfig" ("User" VARCHAR(256) NOT NULL ,
"ConfigType" VARCHAR(20) NOT NULL ,
"ConfigId" VARCHAR(40) NOT NULL ,
"ConfigVersion" VARCHAR(20) NOT NULL ,
PRIMARY KEY ("User",
"ConfigType")) UNLOAD PRIORITY 5 AUTO MERGE;

CREATE TYPE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.ChangeLog" AS TABLE ( "CreatedBy" NVARCHAR(256) CS_STRING,
"CreatedAt" LONGDATE CS_LONGDATE,
"ChangedBy" NVARCHAR(256) CS_STRING,
"ChangedAt" LONGDATE CS_LONGDATE );

CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.Org" ("OrgID" NVARCHAR(100) NOT NULL ,
"ValidFrom" LONGDATE CS_LONGDATE NOT NULL ,
"ExternalOrgID" NVARCHAR(255),
"ExternalSource" NVARCHAR(5),
"ValidTo" LONGDATE CS_LONGDATE,
"ParentOrgID" NVARCHAR(100),
"OrgName" NVARCHAR(5000),
"Description" NVARCHAR(256),
"Type" NVARCHAR(100),
"Status" NVARCHAR(100),
"Address.StreetName" NVARCHAR(200),
"Address.StreetNumber" NVARCHAR(60),
"Address.PostOfficeBox" NVARCHAR(60),
"Address.City" NVARCHAR(100),
"Address.PostalCode" NVARCHAR(60),
"Address.State" NVARCHAR(100),
"Address.Region" NVARCHAR(100),
"Address.Country.OriginalValue" NVARCHAR(100),
"Address.Country.Code" NVARCHAR(100),
"Address.Country.CodeSystem" NVARCHAR(100),
"Address.Country.CodeSystemVersion" NVARCHAR(100),
"Telecom.Phone" NVARCHAR(100),
"Telecom.Mobile" NVARCHAR(100),
"Telecom.Fax" NVARCHAR(100),
"Telecom.Email" NVARCHAR(100),
"URL" NVARCHAR(256),
"ChangeDetails.CreatedBy" NVARCHAR(256),
"ChangeDetails.CreatedAt" LONGDATE CS_LONGDATE,
"ChangeDetails.ChangedBy" NVARCHAR(256),
"ChangeDetails.ChangedAt" LONGDATE CS_LONGDATE,
PRIMARY KEY ("OrgID",
"ValidFrom")) UNLOAD PRIORITY 5 AUTO MERGE;

CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.OrgAncestors" ("OrgID" NVARCHAR(100) NOT NULL ,
"AncestorOrgID" NVARCHAR(100) NOT NULL ,
"Distance" INTEGER CS_INT,
PRIMARY KEY ("OrgID",
"AncestorOrgID")) UNLOAD PRIORITY 5 AUTO MERGE;

CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.OrgAttrEAV" ("OrgID" NVARCHAR(100) NOT NULL ,
"ValidFrom" LONGDATE CS_LONGDATE NOT NULL ,
"ValidTo" LONGDATE CS_LONGDATE,
"Attribute" NVARCHAR(100) NOT NULL ,
"Value" NVARCHAR(100),
"ChangeDetails.CreatedBy" NVARCHAR(256),
"ChangeDetails.CreatedAt" LONGDATE CS_LONGDATE,
"ChangeDetails.ChangedBy" NVARCHAR(256),
"ChangeDetails.ChangedAt" LONGDATE CS_LONGDATE,
PRIMARY KEY ("OrgID",
"ValidFrom",
"Attribute")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.Org" AS "Org_Assoc" ON "Org_Assoc"."OrgID" = "OrgID") UNLOAD PRIORITY 5 AUTO MERGE;

CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.OrgTexts" ("OrgID" NVARCHAR(100) NOT NULL ,
"lang" NVARCHAR(2) NOT NULL ,
"ValidFrom" LONGDATE CS_LONGDATE NOT NULL ,
"ValidTo" LONGDATE CS_LONGDATE,
"Name" NVARCHAR(100),
"Description" NVARCHAR(256),
"ChangeDetails.CreatedBy" NVARCHAR(256),
"ChangeDetails.CreatedAt" LONGDATE CS_LONGDATE,
"ChangeDetails.ChangedBy" NVARCHAR(256),
"ChangeDetails.ChangedAt" LONGDATE CS_LONGDATE,
PRIMARY KEY ("OrgID",
"lang",
"ValidFrom")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.Org" AS "Org_Assoc" ON "Org_Assoc"."OrgID" = "OrgID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.UserOrgMapping" ("UserName" NVARCHAR(256),
"OrgID" NVARCHAR(100),
"ChangeDetails.CreatedBy" NVARCHAR(256),
"ChangeDetails.CreatedAt" LONGDATE CS_LONGDATE,
"ChangeDetails.ChangedBy" NVARCHAR(256),
"ChangeDetails.ChangedAt" LONGDATE CS_LONGDATE) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.Org" AS "Org_Assoc" ON "Org_Assoc"."OrgID" = "OrgID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
"DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"Title" NVARCHAR(1024),
"Author" NVARCHAR(1024),
"FileName" NVARCHAR(256),
"Type" NVARCHAR(128),
"MIMEType" NVARCHAR(256),
"LanguageCode" NVARCHAR(2),
"CreatedAt" LONGDATE CS_LONGDATE,
"CreatedBy" NVARCHAR(256),
"ChangedAt" LONGDATE CS_LONGDATE,
"ChangedBy" NVARCHAR(256),
PRIMARY KEY ("DWDateFrom",
"DWID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON "Audit_Assoc"."AuditLogID" = "DWAuditID", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Key" AS "Document_Key_Assoc" ON "Document_Key_Assoc"."DWID" = "DWID", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Type" AS "Document_Type_Assoc" ON "Document_Type_Assoc"."DWDocumentType" = "Type") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWDocuments.Document_Attr.fti_title" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Attr" ("Title") ASYNC LANGUAGE DETECTION ('en') PHRASE INDEX RATIO 0.200000 FUZZY SEARCH INDEX ON
SEARCH ONLY ON
FAST PREPROCESS OFF TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWDocuments.Document_Attr.fti_author" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Attr" ("Author") ASYNC LANGUAGE DETECTION ('en') PHRASE INDEX RATIO 0.200000 FUZZY SEARCH INDEX ON
SEARCH ONLY ON
FAST PREPROCESS OFF TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWDocuments.Document_Attr.fti_filename" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Attr" ("FileName") ASYNC LANGUAGE DETECTION ('en') PHRASE INDEX RATIO 0.200000 FUZZY SEARCH INDEX ON
SEARCH ONLY ON
FAST PREPROCESS OFF TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"DocumentID" NVARCHAR(1024) NOT NULL ,
PRIMARY KEY ("DWID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON "Audit_Assoc"."AuditLogID" = "DWAuditID", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Attr" AS "Document_Attr_Assoc" ON "Document_Attr_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Type" ("DWDocumentType" NVARCHAR(128) NOT NULL ,
"TAConfiguration" NVARCHAR(256),
PRIMARY KEY ("DWDocumentType")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Type_Description" AS "Document_Type_Description_Assoc" ON "Document_Type_Description_Assoc"."DWDocumentType" = "DWDocumentType") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Type_Description" ("DWDocumentType" NVARCHAR(128) NOT NULL ,
"LanguageCode" NVARCHAR(2) NOT NULL ,
"ShortText" NVARCHAR(128),
PRIMARY KEY ("DWDocumentType",
"LanguageCode")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Type" AS "Document_Type_Assoc" ON "Document_Type_Assoc"."DWDocumentType" = "DWDocumentType") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Interaction_Documents_Link" ("DWLinkID" VARBINARY(32) CS_RAW NOT NULL ,
"DWID_Interaction" VARBINARY(32) CS_RAW NOT NULL ,
"DWID_Document" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
PRIMARY KEY ("DWLinkID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON "Audit_Assoc"."AuditLogID" = "DWAuditID", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Key" AS "Documents_Key_Assoc" ON "Documents_Key_Assoc"."DWID" = "DWID_Document", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON "Interactions_Key_Assoc"."DWID" = "DWID_Interaction", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Interaction_Documents_Link_Attr" AS "Link_Attr_Assoc" ON "Link_Attr_Assoc"."DWLinkID" = "DWLinkID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Interaction_Documents_Link_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
"DWLinkID" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"LinkType" NVARCHAR(256),
PRIMARY KEY ("DWDateFrom",
"DWLinkID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON "Audit_Assoc"."AuditLogID" = "DWAuditID", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Interaction_Documents_Link" AS "Interaction_Documents_Link_Assoc" ON "Interaction_Documents_Link_Assoc"."DWLinkID" = "DWLinkID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.PropertySet" ("SetID" NVARCHAR(128) NOT NULL ,
"PropertyName" NVARCHAR(128) NOT NULL ,
"PropertyValue" NVARCHAR(256),
PRIMARY KEY ("SetID",
"PropertyName")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.TA_Document_Interactions_Link" ("DWLinkID" VARBINARY(32) CS_RAW NOT NULL ,
"DWID_Interaction" VARBINARY(32) CS_RAW NOT NULL ,
"DWID_Document" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"PluginID" NVARCHAR(256),
PRIMARY KEY ("DWLinkID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON "Audit_Assoc"."AuditLogID" = "DWAuditID", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Key" AS "Documents_Key_Assoc" ON "Documents_Key_Assoc"."DWID" = "DWID_Document", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON "Interactions_Key_Assoc"."DWID" = "DWID_Interaction") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Condition_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
"DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"ConditionType" NVARCHAR(100),
"Description" NVARCHAR(5000),
PRIMARY KEY ("DWDateFrom",
"DWID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Condition_Key" AS "Condition_Key_Assoc" ON "Condition_Key_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE CPBTREE INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Condition_Attr.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Condition_Attr" ( "DWDateTo" ASC );

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Condition_Attr.ftiOnDescription" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Condition_Attr" ("Description") SYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY ON
FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Condition_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"ConditionID" NVARCHAR(100) NOT NULL ,
PRIMARY KEY ("DWID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Condition_Attr" AS "Condition_Attr_Assoc" ON "Condition_Attr_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
"DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"DWID_Patient" VARBINARY(32) CS_RAW,
"DWID_ParentInteraction" VARBINARY(32) CS_RAW,
"DWID_Condition" VARBINARY(32) CS_RAW,
"InteractionType.OriginalValue" NVARCHAR(100),
"InteractionType.Code" NVARCHAR(100),
"InteractionType.CodeSystem" NVARCHAR(100),
"InteractionType.CodeSystemVersion" NVARCHAR(100),
"InteractionStatus" NVARCHAR(100),
"PeriodStart" LONGDATE CS_LONGDATE,
"PeriodEnd" LONGDATE CS_LONGDATE,
"PeriodTimezone" NVARCHAR(50),
"OrgID" NVARCHAR(100),
PRIMARY KEY ("DWDateFrom",
"DWID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Condition_Key" AS "Condition_Key_Assoc" ON "Condition_Key_Assoc"."DWID" = "DWID_Condition", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON "Interactions_Key_Assoc"."DWID" = "DWID", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "ParentInteractions_Key_Assoc" ON "ParentInteractions_Key_Assoc"."DWID" = "DWID_ParentInteraction", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Key" AS "Patient_Key_Assoc" ON "Patient_Key_Assoc"."DWID" = "DWID_Patient") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE CPBTREE INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Attr" ( "DWDateTo" ASC );




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"InteractionID" NVARCHAR(100) NOT NULL ,
PRIMARY KEY ("DWID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Attr" AS "Interactions_Attr_Assoc" ON "Interactions_Attr_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
"DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"DWID_Patient" VARBINARY(32) CS_RAW,
"ObsType" NVARCHAR(100),
"ObsCharValue" NVARCHAR(255),
"ObsNumValue" DECIMAL(34, 10) CS_FIXED,
"ObsUnit" NVARCHAR(100),
"ObsTime" LONGDATE CS_LONGDATE,
"OrgID" NVARCHAR(100),
PRIMARY KEY ("DWDateFrom",
"DWID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Observations_Key" AS "Observations_Key_Assoc" ON "Observations_Key_Assoc"."DWID" = "DWID", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Key" AS "Patient_Key_Assoc" ON "Patient_Key_Assoc"."DWID" = "DWID_Patient") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE CPBTREE INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Observations_Attr" ( "DWDateTo" ASC );




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Observations_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"ObsID" NVARCHAR(100) NOT NULL ,
PRIMARY KEY ("DWID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Observations_Attr" AS "Observations_Attr_Assoc" ON "Observations_Attr_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
"DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"ValidFrom" DATE CS_DAYDATE NOT NULL ,
"ValidTo" DATE CS_DAYDATE,
"FamilyName" NVARCHAR(100),
"GivenName" NVARCHAR(100),
"Title.OriginalValue" NVARCHAR(100),
"Title.Code" NVARCHAR(100),
"Title.CodeSystem" NVARCHAR(100),
"Title.CodeSystemVersion" NVARCHAR(100),
"Gender.OriginalValue" NVARCHAR(100),
"Gender.Code" NVARCHAR(100),
"Gender.CodeSystem" NVARCHAR(100),
"Gender.CodeSystemVersion" NVARCHAR(100),
"BirthDate" SECONDDATE CS_SECONDDATE,
"MultipleBirthOrder" TINYINT CS_INT,
"DeceasedDate" SECONDDATE CS_SECONDDATE,
"MaritalStatus.OriginalValue" NVARCHAR(100),
"MaritalStatus.Code" NVARCHAR(100),
"MaritalStatus.CodeSystem" NVARCHAR(100),
"MaritalStatus.CodeSystemVersion" NVARCHAR(100),
"Nationality.OriginalValue" NVARCHAR(100),
"Nationality.Code" NVARCHAR(100),
"Nationality.CodeSystem" NVARCHAR(100),
"Nationality.CodeSystemVersion" NVARCHAR(100),
"Address.StreetName" NVARCHAR(200),
"Address.StreetNumber" NVARCHAR(60),
"Address.PostOfficeBox" NVARCHAR(60),
"Address.City" NVARCHAR(100),
"Address.PostalCode" NVARCHAR(60),
"Address.State" NVARCHAR(100),
"Address.Region" NVARCHAR(100),
"Address.Country.OriginalValue" NVARCHAR(100),
"Address.Country.Code" NVARCHAR(100),
"Address.Country.CodeSystem" NVARCHAR(100),
"Address.Country.CodeSystemVersion" NVARCHAR(100),
"Telecom.Phone" NVARCHAR(100),
"Telecom.Mobile" NVARCHAR(100),
"Telecom.Fax" NVARCHAR(100),
"Telecom.Email" NVARCHAR(100),
"OrgID" NVARCHAR(100),
PRIMARY KEY ("DWDateFrom",
"DWID",
"ValidFrom")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Key" AS "Patient_Key_Assoc" ON "Patient_Key_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE CPBTREE INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Attr" ( "DWDateTo" ASC );

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr.ftiOnFamilyName" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Attr" ("FamilyName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr.ftiOnGivenName" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Attr" ("GivenName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"PatientID" NVARCHAR(100) NOT NULL ,
PRIMARY KEY ("DWID")) UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key.ftiOnPatientID" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Key" ("PatientID") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link" ("DWLinkID" VARBINARY(32) CS_RAW NOT NULL ,
"DWID_Patient" VARBINARY(32) CS_RAW NOT NULL ,
"DWID_Practitioner" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
PRIMARY KEY ("DWLinkID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Key" AS "Patient_Key_Assoc" ON "Patient_Key_Assoc"."DWID" = "DWID_Patient", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link_Attr" AS "Patient_Practitioner_Link_Attr_Assoc" ON "Patient_Practitioner_Link_Attr_Assoc"."DWLinkID" = "DWLinkID", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Key" AS "Practitioner_Key_Assoc" ON "Practitioner_Key_Assoc"."DWID" = "DWID_Practitioner") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
"DWLinkID" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"Role.OriginalValue" NVARCHAR(100),
"Role.Code" NVARCHAR(100),
"Role.CodeSystem" NVARCHAR(100),
"Role.CodeSystemVersion" NVARCHAR(100),
PRIMARY KEY ("DWDateFrom",
"DWLinkID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link" AS "Practitioner_Link_Assoc" ON "Practitioner_Link_Assoc"."DWLinkID" = "DWLinkID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
"DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"ValidFrom" DATE CS_DAYDATE NOT NULL ,
"ValidTo" DATE CS_DAYDATE,
"OrgID" NVARCHAR(100),
"FamilyName" NVARCHAR(100),
"GivenName" NVARCHAR(100),
"Title.OriginalValue" NVARCHAR(100),
"Title.Code" NVARCHAR(100),
"Title.CodeSystem" NVARCHAR(100),
"Title.CodeSystemVersion" NVARCHAR(100),
"Gender.OriginalValue" NVARCHAR(100),
"Gender.Code" NVARCHAR(100),
"Gender.CodeSystem" NVARCHAR(100),
"Gender.CodeSystemVersion" NVARCHAR(100),
"BirthDate" SECONDDATE CS_SECONDDATE,
"MaritalStatus.OriginalValue" NVARCHAR(100),
"MaritalStatus.Code" NVARCHAR(100),
"MaritalStatus.CodeSystem" NVARCHAR(100),
"MaritalStatus.CodeSystemVersion" NVARCHAR(100),
"Nationality.OriginalValue" NVARCHAR(100),
"Nationality.Code" NVARCHAR(100),
"Nationality.CodeSystem" NVARCHAR(100),
"Nationality.CodeSystemVersion" NVARCHAR(100),
"Address.StreetName" NVARCHAR(200),
"Address.StreetNumber" NVARCHAR(60),
"Address.PostOfficeBox" NVARCHAR(60),
"Address.City" NVARCHAR(100),
"Address.PostalCode" NVARCHAR(60),
"Address.State" NVARCHAR(100),
"Address.Region" NVARCHAR(100),
"Address.Country.OriginalValue" NVARCHAR(100),
"Address.Country.Code" NVARCHAR(100),
"Address.Country.CodeSystem" NVARCHAR(100),
"Address.Country.CodeSystemVersion" NVARCHAR(100),
"Telecom.Phone" NVARCHAR(100),
"Telecom.Mobile" NVARCHAR(100),
"Telecom.Fax" NVARCHAR(100),
"Telecom.Email" NVARCHAR(100),
"Role.OriginalValue" NVARCHAR(100),
"Role.Code" NVARCHAR(100),
"Role.CodeSystem" NVARCHAR(100),
"Role.CodeSystemVersion" NVARCHAR(100),
"Speciality.OriginalValue" NVARCHAR(100),
"Speciality.Code" NVARCHAR(100),
"Speciality.CodeSystem" NVARCHAR(100),
"Speciality.CodeSystemVersion" NVARCHAR(100),
"PreferredLanguage" NVARCHAR(100),
PRIMARY KEY ("DWDateFrom",
"DWID",
"ValidFrom")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Key" AS "Practitioner_Key_Assoc" ON "Practitioner_Key_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE CPBTREE INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Practitioner_Attr.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" ( "DWDateTo" ASC );

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Practitioner_Attr.ftiOnFamilyName" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" ("FamilyName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Practitioner_Attr.ftiOnGivenName" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" ("GivenName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"PractitionerID" NVARCHAR(100) NOT NULL ,
PRIMARY KEY ("DWID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" AS "Practitioner_Attr_Assoc" ON "Practitioner_Attr_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Practitioner_Key.ftiOnPractitionerID" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Key" ("PractitionerID") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom" LONGDATE CS_LONGDATE,
"DWID" VARBINARY(32) CS_RAW,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"Attribute.OriginalValue" NVARCHAR(100),
"Attribute.Code" NVARCHAR(100),
"Attribute.CodeSystem" NVARCHAR(100),
"Attribute.CodeSystemVersion" NVARCHAR(100),
"Value.OriginalValue" NVARCHAR(5000),
"Value.Code" NVARCHAR(100),
"Value.CodeSystem" NVARCHAR(100),
"Value.CodeSystemVersion" NVARCHAR(100),
"ValueVocabularyID" NVARCHAR(100)) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON "Audit_Assoc"."AuditLogID" = "DWAuditID", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON "Interactions_Key_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE CPBTREE INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ( "DWDateTo" ASC );

CREATE CPBTREE INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details.DWID" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ( "DWID" ASC );




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom" LONGDATE CS_LONGDATE,
"DWID" VARBINARY(32) CS_RAW,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"Attribute.OriginalValue" NVARCHAR(100),
"Attribute.Code" NVARCHAR(100),
"Attribute.CodeSystem" NVARCHAR(100),
"Attribute.CodeSystemVersion" NVARCHAR(100),
"Unit" NVARCHAR(100),
"Value" DECIMAL(34, 10) CS_FIXED) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON "Audit_Assoc"."AuditLogID" = "DWAuditID", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON "Interactions_Key_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE CPBTREE INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ( "DWDateTo" ASC );

CREATE CPBTREE INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures.DWID" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ( "DWID" ASC );




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ("DWDateFrom" LONGDATE CS_LONGDATE,
"DWID" VARBINARY(32) CS_RAW,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"InteractionTextID" NVARCHAR(100),
"Attribute" NVARCHAR(100),
"Value" NVARCHAR(5000),
"Lang" NVARCHAR(50)) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON "Audit_Assoc"."AuditLogID" = "DWAuditID", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON "Interactions_Key_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE CPBTREE INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ( "DWDateTo" ASC );

CREATE CPBTREE INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text.DWID" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ( "DWID" ASC );

CREATE CPBTREE INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text.InteractionTextID" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ( "InteractionTextID" ASC );

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text.ftiOnValue" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ("Value") SYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY ON
FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE TYPE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWTypes.Address" AS TABLE ( "StreetName" NVARCHAR(200) CS_STRING,
"StreetNumber" NVARCHAR(60) CS_STRING,
"PostOfficeBox" NVARCHAR(60) CS_STRING,
"City" NVARCHAR(100) CS_STRING,
"PostalCode" NVARCHAR(60) CS_STRING,
"State" NVARCHAR(100) CS_STRING,
"Region" NVARCHAR(100) CS_STRING,
"Country.OriginalValue" NVARCHAR(100) CS_STRING,
"Country.Code" NVARCHAR(100) CS_STRING,
"Country.CodeSystem" NVARCHAR(100) CS_STRING,
"Country.CodeSystemVersion" NVARCHAR(100) CS_STRING );




CREATE ROW TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Helper.TmpTextKeys" ( "InteractionTextID" NVARCHAR(500) CS_STRING NOT NULL,
"Value" NVARCHAR(500) CS_STRING,
"Score" NVARCHAR(500) CS_STRING,
PRIMARY KEY ("InteractionTextID") ) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" AS "InteractionText_Assoc" ON "InteractionText_Assoc"."InteractionTextID" = "InteractionTextID");




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Ref.Codes" ("CodesID" NVARCHAR(100) NOT NULL ,
"Catalog" NVARCHAR(100),
"Version" NVARCHAR(50),
"Code" NVARCHAR(100),
"Lang" NVARCHAR(50),
"Description" NVARCHAR(5000),
PRIMARY KEY ("CodesID")) UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::Ref.Codes.ftiOnDescription" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::Ref.Codes" ("Description") SYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY ON
FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Ref.PatientBestRecord" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
"PatientBestRecordID" NVARCHAR(100) NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"FamilyName" NVARCHAR(100),
"GivenName" NVARCHAR(100),
"Title.OriginalValue" NVARCHAR(100),
"Title.Code" NVARCHAR(100),
"Title.CodeSystem" NVARCHAR(100),
"Title.CodeSystemVersion" NVARCHAR(100),
"Gender.OriginalValue" NVARCHAR(100),
"Gender.Code" NVARCHAR(100),
"Gender.CodeSystem" NVARCHAR(100),
"Gender.CodeSystemVersion" NVARCHAR(100),
"BirthDate" SECONDDATE CS_SECONDDATE,
"MultipleBirthOrder" TINYINT CS_INT,
"DeceasedDate" SECONDDATE CS_SECONDDATE,
"MaritalStatus.OriginalValue" NVARCHAR(100),
"MaritalStatus.Code" NVARCHAR(100),
"MaritalStatus.CodeSystem" NVARCHAR(100),
"MaritalStatus.CodeSystemVersion" NVARCHAR(100),
"Nationality.OriginalValue" NVARCHAR(100),
"Nationality.Code" NVARCHAR(100),
"Nationality.CodeSystem" NVARCHAR(100),
"Nationality.CodeSystemVersion" NVARCHAR(100),
"Address.StreetName" NVARCHAR(200),
"Address.StreetNumber" NVARCHAR(60),
"Address.PostOfficeBox" NVARCHAR(60),
"Address.City" NVARCHAR(100),
"Address.PostalCode" NVARCHAR(60),
"Address.State" NVARCHAR(100),
"Address.Region" NVARCHAR(100),
"Address.Country.OriginalValue" NVARCHAR(100),
"Address.Country.Code" NVARCHAR(100),
"Address.Country.CodeSystem" NVARCHAR(100),
"Address.Country.CodeSystemVersion" NVARCHAR(100),
"Telecom.Phone" NVARCHAR(100),
"Telecom.Mobile" NVARCHAR(100),
"Telecom.Fax" NVARCHAR(100),
"Telecom.Email" NVARCHAR(100),
PRIMARY KEY ("DWDateFrom",
"PatientBestRecordID")) UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE CPBTREE INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::Ref.PatientBestRecord.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::Ref.PatientBestRecord" ( "DWDateTo" ASC );

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::Ref.PatientBestRecord.ftiOnFamilyName" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::Ref.PatientBestRecord" ("FamilyName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.cdw.db.models::Ref.PatientBestRecord.ftiOnGivenName" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::Ref.PatientBestRecord" ("GivenName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.CohortsStatusConfig" ("Id" NVARCHAR(32) NOT NULL ,
"CollectionType.Id" NVARCHAR(32),
"ItemType" NVARCHAR(1024) DEFAULT '',
"TextKey" NVARCHAR(1024) NOT NULL ,
"IconSource" NVARCHAR(256),
"Language" NVARCHAR(32)) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" AS "Items" ON "Items"."Status.Id" = "Id") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Collection" ("Id" NVARCHAR(32) NOT NULL ,
"Type.Id" NVARCHAR(32) NOT NULL ,
"Status.Id" NVARCHAR(32),
"Title" NVARCHAR(256) NOT NULL ,
"Description" NVARCHAR(4096),
"CreatedBy" NVARCHAR(256) NOT NULL ,
"CreatedAt" LONGDATE CS_LONGDATE NOT NULL ,
"ChangedBy" NVARCHAR(256),
"ChangedAt" LONGDATE CS_LONGDATE,
PRIMARY KEY ("Id")) UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Collection.CollectionTitle" ON
"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Collection" ("Title") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Collection.CollectionDesc" ON
"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Collection" ("Description") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.CollectionType" ("Id" NVARCHAR(32) NOT NULL ,
"TitleKey" NVARCHAR(256) NOT NULL ,
"DescriptionKey" NVARCHAR(4096),
PRIMARY KEY ("Id")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Comment" ("Id" NVARCHAR(32) NOT NULL ,
"Collection.Id" NVARCHAR(32) NOT NULL ,
"Item.Id" NVARCHAR(100) NOT NULL ,
"Text" NVARCHAR(1024) NOT NULL ,
"Type" NVARCHAR(1024) NOT NULL ,
"CreatedBy" NVARCHAR(256) NOT NULL ,
"CreatedAt" LONGDATE CS_LONGDATE NOT NULL ,
PRIMARY KEY ("Id")) UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Comment.CommentText" ON
"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Comment" ("Text") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" ("Id" NVARCHAR(100) NOT NULL ,
"ItemType" NVARCHAR(1024) NOT NULL ,
"Collection.Id" NVARCHAR(32) NOT NULL ,
"CreatedBy" NVARCHAR(256) NOT NULL ,
"CreatedAt" LONGDATE CS_LONGDATE NOT NULL ,
"ChangedBy" NVARCHAR(256),
"ChangedAt" LONGDATE CS_LONGDATE,
"Status.Id" NVARCHAR(32) NOT NULL ,
PRIMARY KEY ("Id",
"ItemType",
"Collection.Id")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Participant" ("HANAUserName" NVARCHAR(256) NOT NULL ,
"Collection.Id" NVARCHAR(32) NOT NULL ,
"Privilege.Id" NVARCHAR(32) NOT NULL ,
"CreatedBy" NVARCHAR(256),
"CreatedAt" LONGDATE CS_LONGDATE,
"ChangedBy" NVARCHAR(256),
"ChangedAt" LONGDATE CS_LONGDATE,
PRIMARY KEY ("HANAUserName",
"Collection.Id")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.ParticipantPrivilege" ("Id" NVARCHAR(32) NOT NULL ,
"LanguageIsoCode" NVARCHAR(2) NOT NULL ,
"Title" NVARCHAR(256) NOT NULL ,
"Description" NVARCHAR(1024),
PRIMARY KEY ("Id",
"LanguageIsoCode")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Status" ("Id" NVARCHAR(32) NOT NULL ,
"Title" NVARCHAR(256) NOT NULL ,
"Description" NVARCHAR(1024) NOT NULL ,
"LanguageIsoCode" NVARCHAR(2) NOT NULL ,
PRIMARY KEY ("Id")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.StatusConfiguration" ("Id" NVARCHAR(32) NOT NULL ,
"CollectionType.Id" NVARCHAR(32) NOT NULL ,
"ItemType" NVARCHAR(1024) DEFAULT '' NOT NULL ,
"TextKey" NVARCHAR(1024) NOT NULL ,
"IconSource" NVARCHAR(256),
PRIMARY KEY ("Id",
"CollectionType.Id",
"ItemType")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Item" AS "Items" ON "Items"."Status.Id" = "Id") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.AssignmentDetail" ("Header.Id" NVARCHAR(40) NOT NULL ,
"Config.Id" NVARCHAR(40) NOT NULL ,
"Config.Version" NVARCHAR(20) NOT NULL ,
"Config.Type" NVARCHAR(20) NOT NULL ) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config" AS "Config" ON "Config"."Id" = "Config.Id" AND "Config"."Version" = "Config.Version" AND "Config"."Type" = "Config.Type", JOIN "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.AssignmentHeader" AS "Header" ON "Header"."Id" = "Header.Id") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.AssignmentHeader" ("Id" NVARCHAR(40) NOT NULL ,
"Name" NVARCHAR(256) DEFAULT '',
"EntityType" NVARCHAR(1) NOT NULL ,
"EntityValue" NVARCHAR(256) NOT NULL ,
"Creator" NVARCHAR(256) NOT NULL ,
"Created" LONGDATE CS_LONGDATE NOT NULL ,
"Modifier" NVARCHAR(256) NOT NULL ,
"Modified" LONGDATE CS_LONGDATE NOT NULL ,
PRIMARY KEY ("Id")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config" ("Id" NVARCHAR(40) NOT NULL ,
"Version" NVARCHAR(20) NOT NULL ,
"Status" NVARCHAR(20) DEFAULT '',
"Name" NVARCHAR(256) DEFAULT '',
"Type" NVARCHAR(20) NOT NULL ,
"Data" NCLOB MEMORY THRESHOLD 1000 NOT NULL ,
"Parent.Id" NVARCHAR(40),
"Parent.Version" NVARCHAR(20),
"Creator" NVARCHAR(256) NOT NULL ,
"Created" LONGDATE CS_LONGDATE NOT NULL ,
"Modifier" NVARCHAR(256) NOT NULL ,
"Modified" LONGDATE CS_LONGDATE NOT NULL ,
PRIMARY KEY ("Id",
"Version")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config" AS "Parent" ON "Parent"."Id" = "Parent.Id" AND "Parent"."Version" = "Parent.Version") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Template" ("Id" NVARCHAR(40) NOT NULL ,
"System" NVARCHAR(40) NOT NULL ,
"Data" NCLOB MEMORY THRESHOLD 1000,
"Creator" NVARCHAR(256),
"Created" LONGDATE CS_LONGDATE,
"Modifier" NVARCHAR(256),
"Modified" LONGDATE CS_LONGDATE,
PRIMARY KEY ("Id")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.UserDefaultConfig" ("User" NVARCHAR(256) NOT NULL ,
"ConfigType" NVARCHAR(20) NOT NULL ,
"Config.Id" NVARCHAR(40) NOT NULL ,
"Config.Version" NVARCHAR(20) NOT NULL ,
PRIMARY KEY ("User",
"ConfigType")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config" AS "Config" ON "Config"."Id" = "Config.Id" AND "Config"."Version" = "Config.Version") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" ("AuditLogID" BIGINT CS_FIXED NOT NULL ,
"ParentAuditLogID" BIGINT CS_FIXED,
"ExtensionID" NVARCHAR(256),
"SourceID" NVARCHAR(5),
"ProfileID" BIGINT CS_FIXED,
"Status" NVARCHAR(16),
"ProcessID" NVARCHAR(512),
"ProcessType" NVARCHAR(512),
"StartTime" LONGDATE CS_LONGDATE,
"EndTime" LONGDATE CS_LONGDATE,
"DocumentID" NVARCHAR(1024),
"DocumentURI" NVARCHAR(1024),
"DocumentName" NVARCHAR(512),
"DocumentSize" NVARCHAR(512),
"DocumentType" NVARCHAR(512),
"Notes" NVARCHAR(1024),
"ProfileJSONParams" NCLOB MEMORY THRESHOLD 1000,
"AdditionalParams" NCLOB MEMORY THRESHOLD 1000,
"ScheduleConfigID" BIGINT CS_FIXED,
"MonitorID" BIGINT CS_FIXED,
"RunBy" NVARCHAR(512),
PRIMARY KEY ("AuditLogID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "ToAuditLog" ON "ToAuditLog"."ParentAuditLogID" = "AuditLogID", JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLogTrace" AS "ToAuditLogTrace" ON "ToAuditLogTrace"."AuditLogID" = "AuditLogID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE TYPE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLogCount" AS TABLE ( "ALLRUNS" INT CS_INT,
"RUNNING" INT CS_INT,
"FAILED" INT CS_INT,
"QUEUED" INT CS_INT,
"CANCELLED" INT CS_INT,
"CLEANEDUP" INT CS_INT,
"COMPLETED" INT CS_INT );




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLogTrace" ("AuditLogID" BIGINT CS_FIXED NOT NULL ,
"LogTraceID" NVARCHAR(256) NOT NULL ,
"Status" NVARCHAR(16),
"Timestamp" LONGDATE CS_LONGDATE,
"Location" NVARCHAR(512),
"Text" NVARCHAR(5000),
PRIMARY KEY ("AuditLogID",
"LogTraceID")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE TYPE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.CdtAdapterLog" AS TABLE ( "LOGDETAILID" NVARCHAR(32) CS_STRING,
"DOCUMENTID" NVARCHAR(1024) CS_STRING,
"DOCUMENTTYPE" NVARCHAR(512) CS_STRING,
"DOCUMENTSIZE" NVARCHAR(512) CS_STRING,
"DOCUMENTLASTUPDATED" LONGDATE CS_LONGDATE,
"STATUS" NVARCHAR(16) CS_STRING,
"NOTES" NVARCHAR(1024) CS_STRING,
"STARTTIME" LONGDATE CS_LONGDATE,
"ENDTIME" LONGDATE CS_LONGDATE );




CREATE TYPE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.CdtAdapterTrace" AS TABLE ( "LOGDETAILID" NVARCHAR(32) CS_STRING,
"LOGTRACEID" NVARCHAR(32) CS_STRING,
"LOGSTATUS" NVARCHAR(16) CS_STRING,
"LOGTIMESTAMP" LONGDATE CS_LONGDATE,
"LOGLOCATION" NVARCHAR(512) CS_STRING,
"LOGMESSAGE" NVARCHAR(5000) CS_STRING );




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DIExtension" ("ExtensionID" NVARCHAR(256) NOT NULL ,
"PluginID" NVARCHAR(256),
"XSJSLibrary" NVARCHAR(512),
"JSONMetadata" NCLOB MEMORY THRESHOLD 1000,
"Provider" NVARCHAR(512),
"Status" NVARCHAR(16),
"CreatedAt" LONGDATE CS_LONGDATE,
"CreatedBy" NVARCHAR(512),
"ModifiedAt" LONGDATE CS_LONGDATE,
"ModifiedBy" NVARCHAR(512),
"TextBundle" NVARCHAR(512),
"Name" NVARCHAR(512),
"Description" NVARCHAR(1024),
"ExtensionAlias" NVARCHAR(64),
PRIMARY KEY ("ExtensionID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.JobProfile" AS "ToJobProfile" ON "ToJobProfile"."ExtensionID" = "ExtensionID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DIJobScheduleConfig" ("ScheduleConfigID" BIGINT CS_FIXED NOT NULL ,
"Name" NVARCHAR(512),
"Description" NVARCHAR(1024),
"ScheduleConfigJSON" NCLOB MEMORY THRESHOLD 1000,
"CreatedAt" LONGDATE CS_LONGDATE,
"CreatedBy" NVARCHAR(512),
"ModifiedAt" LONGDATE CS_LONGDATE,
"ModifiedBy" NVARCHAR(512),
PRIMARY KEY ("ScheduleConfigID")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DIJobScheduleMonitor" ("ScheduleConfigID" BIGINT CS_FIXED NOT NULL ,
"MonitorID" BIGINT CS_FIXED NOT NULL ,
"XSScheduleID" BIGINT CS_FIXED,
"XSScheduleRunStatus" NVARCHAR(16),
"StartedAt" LONGDATE CS_LONGDATE,
"EndedAt" LONGDATE CS_LONGDATE,
"ProfileID" BIGINT CS_FIXED,
PRIMARY KEY ("ScheduleConfigID",
"MonitorID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "ToAuditLog" ON "ToAuditLog"."ScheduleConfigID" = "ScheduleConfigID", JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "ToAuditLogMonitorID" ON "ToAuditLogMonitorID"."MonitorID" = "MonitorID", JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DIJobScheduleConfig" AS "ToDIJobScheduleConfig" ON "ToDIJobScheduleConfig"."ScheduleConfigID" = "ScheduleConfigID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DISource" ("SourceID" NVARCHAR(5) NOT NULL ,
"Name" NVARCHAR(512),
"Description" NVARCHAR(1024),
"CreatedAt" LONGDATE CS_LONGDATE,
"CreatedBy" NVARCHAR(512),
"ModifiedAt" LONGDATE CS_LONGDATE,
"ModifiedBy" NVARCHAR(512),
PRIMARY KEY ("SourceID")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.EmailQueue" ("NotificationID" BIGINT CS_FIXED NOT NULL ,
"Status" NVARCHAR(16),
"UserID" NVARCHAR(512),
"Subject" NVARCHAR(1024),
"EmailText" NVARCHAR(1024),
"AuditLogID" BIGINT CS_FIXED,
"MonitorID" BIGINT CS_FIXED,
PRIMARY KEY ("NotificationID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "ToAuditLog" ON "ToAuditLog"."AuditLogID" = "AuditLogID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE TYPE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.Extensions" AS TABLE ( "EXTENSIONID" NVARCHAR(256) CS_STRING );




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.JobProfile" ("ProfileID" BIGINT CS_FIXED NOT NULL ,
"ExtensionID" NVARCHAR(256),
"SourceID" NVARCHAR(5),
"Name" NVARCHAR(512),
"Description" NVARCHAR(1024),
"CreatedAt" LONGDATE CS_LONGDATE,
"CreatedBy" NVARCHAR(512),
"ModifiedAt" LONGDATE CS_LONGDATE,
"ModifiedBy" NVARCHAR(512),
"Status" NVARCHAR(16),
"LogLevel" INTEGER CS_INT,
"ProfileJSONParams" NCLOB MEMORY THRESHOLD 1000,
"AdditionalParams" NCLOB MEMORY THRESHOLD 1000,
"ScheduleConfigID" BIGINT CS_FIXED,
PRIMARY KEY ("ProfileID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "ToAuditLog" ON "ToAuditLog"."ProfileID" = "ProfileID", JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DIJobScheduleConfig" AS "ToDIJobScheduleConfig" ON "ToDIJobScheduleConfig"."ScheduleConfigID" = "ScheduleConfigID", JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.DISource" AS "ToDISource" ON "ToDISource"."SourceID" = "SourceID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE TYPE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.MonitorRun" AS TABLE ( "ProfileName" NVARCHAR(512) CS_STRING,
"ProfileStatus" NVARCHAR(512) CS_STRING,
"ProfileID" BIGINT CS_FIXED,
"AuditLogID" BIGINT CS_FIXED,
"ParentAuditLogID" BIGINT CS_FIXED,
"ExtensionName" NVARCHAR(512) CS_STRING,
"ExtensionAlias" NVARCHAR(64) CS_STRING,
"PluginID" NVARCHAR(256) CS_STRING,
"Provider" NVARCHAR(512) CS_STRING,
"TextBundle" NVARCHAR(512) CS_STRING,
"ExtensionID" NVARCHAR(256) CS_STRING,
"SourceID" NVARCHAR(256) CS_STRING,
"StartTime" LONGDATE CS_LONGDATE,
"EndTime" LONGDATE CS_LONGDATE,
"SourceName" NVARCHAR(512) CS_STRING,
"Status" NVARCHAR(16) CS_STRING,
"Notes" NVARCHAR(1024) CS_STRING,
"Success" INT CS_INT,
"Warning" INT CS_INT,
"Error" INT CS_INT,
"RunBy" NVARCHAR(512) CS_STRING );




CREATE TYPE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.RunInfo" AS TABLE ( "ProfileName" NVARCHAR(512) CS_STRING,
"ProfileDescription" NVARCHAR(1024) CS_STRING,
"ProfileStatus" NVARCHAR(16) CS_STRING,
"AdditionalParams" NCLOB MEMORY THRESHOLD 1000 ,
"ProfileID" BIGINT CS_FIXED,
"AuditLogID" BIGINT CS_FIXED,
"PluginID" NVARCHAR(256) CS_STRING,
"XSJSLibrary" NVARCHAR(512) CS_STRING,
"Provider" NVARCHAR(512) CS_STRING,
"TextBundle" NVARCHAR(512) CS_STRING,
"JSONMetadata" NCLOB MEMORY THRESHOLD 1000 ,
"PluginStatus" NVARCHAR(16) CS_STRING,
"ExtensionName" NVARCHAR(512) CS_STRING,
"ParentAuditLogID" BIGINT CS_FIXED,
"ExtensionID" NVARCHAR(256) CS_STRING,
"SourceID" NVARCHAR(256) CS_STRING,
"StartTime" LONGDATE CS_LONGDATE,
"EndTime" LONGDATE CS_LONGDATE,
"SourceName" NVARCHAR(512) CS_STRING,
"Status" NVARCHAR(16) CS_STRING,
"ProfileJSONParams" NCLOB MEMORY THRESHOLD 1000 ,
"Notes" NVARCHAR(1024) CS_STRING,
"Success" INT CS_INT,
"Warning" INT CS_INT,
"Error" INT CS_INT );




CREATE TYPE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.Schedules" AS TABLE ( "MonitorID" BIGINT CS_FIXED,
"StartedAt" LONGDATE CS_LONGDATE,
"EndedAt" LONGDATE CS_LONGDATE,
"XSScheduleID" BIGINT CS_FIXED,
"XSScheduleRunStatus" NVARCHAR(16) CS_STRING,
"ExtensionAlias" NVARCHAR(64) CS_STRING,
"PluginID" NVARCHAR(256) CS_STRING,
"Provider" NVARCHAR(512) CS_STRING,
"TextBundle" NVARCHAR(512) CS_STRING,
"ProfileName" NVARCHAR(512) CS_STRING,
"ProfileID" BIGINT CS_FIXED,
"ProfileStatus" NVARCHAR(16) CS_STRING,
"SourceName" NVARCHAR(512) CS_STRING,
"SourceID" NVARCHAR(5) CS_STRING,
"ScheduleName" NVARCHAR(512) CS_STRING,
"ScheduleConfigID" BIGINT CS_FIXED );




CREATE TYPE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.SchedulesCount" AS TABLE ( "ALLSCHEDULES" INT CS_INT,
"ACTIVE" INT CS_INT,
"INACTIVE" INT CS_INT,
"COMPLETED" INT CS_INT,
"FAILED" INT CS_INT );




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.ScheduleSyncHistory" ("LastSyncedAt" LONGDATE CS_LONGDATE) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE TYPE "HTTPTEST_SCHEMA"."legacy.ots.am::Types.Candidate" AS TABLE ( "CandidateID" BIGINT CS_FIXED,
"ComponentID" INT CS_INT,
"ComponentTermText" NVARCHAR(5000) CS_STRING,
"VocabularyID" NVARCHAR(100) CS_STRING,
"Code" NVARCHAR(100) CS_STRING );




CREATE TYPE "HTTPTEST_SCHEMA"."legacy.ots.am::Types.Match" AS TABLE ( "CandidateID" BIGINT CS_FIXED,
"ComponentID" INT CS_INT,
"ComponentTermText" NVARCHAR(5000) CS_STRING,
"VocabularyID" NVARCHAR(100) CS_STRING,
"Code" NVARCHAR(100) CS_STRING,
"TermText" NVARCHAR(5000) CS_STRING,
"Confidence" DOUBLE CS_DOUBLE );




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.ots.internal::Entities.Classification" ("VocabularyID" NVARCHAR(100) NOT NULL ,
"Code" NVARCHAR(100) NOT NULL ,
"Context" NVARCHAR(100) NOT NULL ,
"ClassVocabularyID" NVARCHAR(100) NOT NULL ,
"ClassCode" NVARCHAR(100) NOT NULL ,
"ClassHierarchyLevel" INTEGER CS_INT,
"ParentClassVocabularyID" NVARCHAR(100),
"ParentClassCode" NVARCHAR(100),
"Provider" NVARCHAR(100) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
PRIMARY KEY ("VocabularyID",
"Code",
"Context",
"ClassVocabularyID",
"ClassCode")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.ots.internal::Entities.ConceptTerms" ("ConceptVocabularyID" NVARCHAR(100) NOT NULL ,
"ConceptCode" NVARCHAR(100) NOT NULL ,
"ConceptTypeVocabularyID" NVARCHAR(100),
"ConceptTypeCode" NVARCHAR(100),
"TermContext" NVARCHAR(100) NOT NULL ,
"TermLanguage" NVARCHAR(2) NOT NULL ,
"TermText" NVARCHAR(5000) NOT NULL ,
"TermType" NVARCHAR(100),
"TermIsPreferred" BOOLEAN CS_INT NOT NULL ,
"Provider" NVARCHAR(100) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ) UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX HTTPTEST_SCHEMA."legacy.ots.internal::Entities.ConceptTerms.ftiOnText" ON
"HTTPTEST_SCHEMA"."legacy.ots.internal::Entities.ConceptTerms" ("TermText") SYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY ON
FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.ots.internal::Entities.ConceptTranslation" ("TypeVocabularyID" NVARCHAR(100) NOT NULL ,
"TypeCode" NVARCHAR(100) NOT NULL ,
"FromVocabularyID" NVARCHAR(100) NOT NULL ,
"FromCode" NVARCHAR(100) NOT NULL ,
"ToVocabularyID" NVARCHAR(100) NOT NULL ,
"ToCode" NVARCHAR(100) NOT NULL ,
"Provider" NVARCHAR(100) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
PRIMARY KEY ("TypeVocabularyID",
"TypeCode",
"FromVocabularyID",
"FromCode",
"ToVocabularyID",
"ToCode")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.ots.internal::Entities.Vocabularies" ("ID" NVARCHAR(100),
"ExternalID" NVARCHAR(100) NOT NULL ,
"Provider" NVARCHAR(100) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
PRIMARY KEY ("ExternalID")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE TYPE "HTTPTEST_SCHEMA"."legacy.user.db::UserModels.UserDetails" AS TABLE ( "UserID" NVARCHAR(128) CS_STRING,
"FirstName" NVARCHAR(5000) CS_STRING,
"LastName" NVARCHAR(5000) CS_STRING,
"EmailID" NVARCHAR(5000) CS_STRING );




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.user.db::UserModels.UserInfo" ("UserID" NVARCHAR(128) NOT NULL ,
"FirstName" NVARCHAR(5000),
"LastName" NVARCHAR(5000),
"EmailID" NVARCHAR(5000),
"LastLogin" LONGDATE CS_LONGDATE,
"Status" NVARCHAR(20),
"ChangedBy" NVARCHAR(5000),
"ChangedAt" LONGDATE CS_LONGDATE,
PRIMARY KEY ("UserID")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."MRIEntities_CollectionItems" ("Id" VARCHAR(100),
"ItemType" VARCHAR(1024),
"CollectionId" VARCHAR(32),
"CreatedBy" VARCHAR(256),
"CreatedAt" LONGDATE CS_LONGDATE,
"ChangedBy" VARCHAR(256),
"ChangedAt" LONGDATE CS_LONGDATE,
"StatusId" VARCHAR(32)) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."MRIEntities_DynamicViewList" ("ViewId" VARCHAR(1024) NOT NULL ,
"CreatedBy" VARCHAR(256),
"CreatedAt" LONGDATE CS_LONGDATE,
"Description" VARCHAR(1024),
PRIMARY KEY ("ViewId")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."pa.db::MRIEntities.AllowedPatientIdsForExtension_Attr" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWAuditID" BIGINT CS_FIXED,
"InsertedOn" DATE CS_DAYDATE NOT NULL ,
"UserName" NVARCHAR(100) NOT NULL ,
"DWID_Patient" VARBINARY(32) CS_RAW,
"Patient_Key_Assoc.DWID" VARBINARY(32) CS_RAW NOT NULL ,
PRIMARY KEY ("DWID",
"InsertedOn",
"UserName")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Key" AS "Patient_Key_Assoc" ON "Patient_Key_Assoc"."DWID" = "Patient_Key_Assoc.DWID") UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."pa.db::MRIEntities.Bookmarks" ("Id" NVARCHAR(40) NOT NULL ,
"UserName" NVARCHAR(40) NOT NULL ,
"BookmarkName" NVARCHAR(40) NOT NULL ,
"Bookmark" NCLOB MEMORY THRESHOLD 1000,
"Type" NVARCHAR(10),
"ViewName" NVARCHAR(100),
PRIMARY KEY ("UserName",
"BookmarkName")) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."pa.db::MRIEntities.CollectionItems" ("Id" NVARCHAR(100),
"ItemType" NVARCHAR(1024),
"CollectionId" NVARCHAR(32),
"CreatedBy" NVARCHAR(256),
"CreatedAt" LONGDATE CS_LONGDATE,
"ChangedBy" NVARCHAR(256),
"ChangedAt" LONGDATE CS_LONGDATE,
"StatusId" NVARCHAR(32)) UNLOAD PRIORITY 5 AUTO MERGE;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."pa.db::MRIEntities.DynamicViewList" ("ViewId" NVARCHAR(1024) NOT NULL ,
"CreatedBy" NVARCHAR(256),
"CreatedAt" LONGDATE CS_LONGDATE,
"Description" NVARCHAR(1024),
PRIMARY KEY ("ViewId")) UNLOAD PRIORITY 5 AUTO MERGE;

CREATE VIEW HTTPTEST_SCHEMA."ConfigDbModels_Assignment" AS
SELECT ah."Id" AS "Id",
      ah."Name" AS "Name",
      ah."EntityType" AS "EntityType",
      ah."EntityValue" AS "EntityValue",
      ah."Creator" AS "Creator",
      ah."Created" AS "Created",
      ah."Modifier" AS "Modifier",
      ah."Modified" AS "Modified",
      c."Id" AS "ConfigId",
      c."Version" AS "ConfigVersion",
      c."Type" AS "ConfigType"
        FROM "ConfigDbModels_AssignmentDetail" as ad
        INNER JOIN "ConfigDbModels_AssignmentHeader" AS ah
        ON ad."HeaderId" = ah."Id"
        INNER JOIN "ConfigDbModels_Config" AS c
        ON ad."ConfigId" = c."Id" AND ad."ConfigVersion" = c."Version" AND ad."ConfigType" = c."Type";

CREATE VIEW HTTPTEST_SCHEMA."ConfigDbModels_DefaultConfig" AS
SELECT udc."User",
      udc."ConfigType",
      c."Id",
      c."Version",
      c."Name",
      c."Data"
  FROM "ConfigDbModels_UserDefaultConfig" as udc
  INNER JOIN "ConfigDbModels_Config" AS c
  ON udc."ConfigId" = c."Id" AND udc."ConfigVersion" = c."Version";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::Config.V_ORG" AS
SELECT "Org_$0"."OrgID" , "Org_$0"."ParentOrgID" , "Org_$0"."ValidFrom" , "Org_$0"."ValidTo" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::Config.Org" AS "Org_$0" WHERE  (  ( CURRENT_UTCTIMESTAMP >= "Org_$0"."ValidFrom" )  AND  (  ( CURRENT_UTCTIMESTAMP <= "Org_$0"."ValidTo" )  OR  ( "Org_$0"."ValidTo" IS  NULL  )  )  );

CREATE VIEW HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS
SELECT "Vocabularies_$0"."ID" , "Vocabularies_$0"."ExternalID" FROM HTTPTEST_SCHEMA."legacy.ots.internal::Entities.Vocabularies" AS "Vocabularies_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.PatientTD" AS
SELECT
	"Patient_Attr_$0"."DWID" AS "PatientID" ,
	"Patient_Attr_$0"."Patient_Key_Assoc"."PatientID" AS "SourcePatientID" ,
	"Patient_Attr_$0"."Patient_Key_Assoc"."DWSource" AS "Source" ,
	"Patient_Attr_$0"."ValidFrom" ,
	"Patient_Attr_$0"."ValidTo" ,
	"Patient_Attr_$0"."OrgID" ,
	"Patient_Attr_$0"."FamilyName" ,
	"Patient_Attr_$0"."GivenName" ,
	"Patient_Attr_$0"."Title.OriginalValue" AS "TitleValue" ,
	"Patient_Attr_$0"."Title.Code" AS "TitleCode" ,
	"Vocabularies_$5"."ID" AS "TitleVocabularyID" ,
	"Patient_Attr_$0"."Title.CodeSystem" AS "TitleCodeSystem" ,
	"Patient_Attr_$0"."Title.CodeSystemVersion" AS "TitleCodeSystemVersion" ,
	"Patient_Attr_$0"."Gender.OriginalValue" AS "GenderValue" ,
	"Patient_Attr_$0"."Gender.Code" AS "GenderCode" ,
	"Vocabularies_$2"."ID" AS "GenderVocabularyID" ,
	"Patient_Attr_$0"."Gender.CodeSystem" AS "GenderCodeSystem" ,
	"Patient_Attr_$0"."Gender.CodeSystemVersion" AS "GenderCodeSystemVersion" ,
	"Patient_Attr_$0"."BirthDate" ,
	"Patient_Attr_$0"."MultipleBirthOrder" ,
	"Patient_Attr_$0"."DeceasedDate" ,
	"Patient_Attr_$0"."MaritalStatus.OriginalValue" AS "MaritalStatusValue" ,
	"Patient_Attr_$0"."MaritalStatus.Code" AS "MaritalStatusCode" ,
	"Vocabularies_$3"."ID" AS "MaritalStatusVocabularyID" ,
	"Patient_Attr_$0"."MaritalStatus.CodeSystem" AS "MaritalStatusCodeSystem" ,
	"Patient_Attr_$0"."MaritalStatus.CodeSystemVersion" AS "MaritalStatusCodeSystemVersion" ,
	"Patient_Attr_$0"."Nationality.OriginalValue" AS "NationalityValue" ,
	"Patient_Attr_$0"."Nationality.Code" AS "NationalityCode" ,
	"Vocabularies_$4"."ID" AS "NationalityVocabularyID" ,
	"Patient_Attr_$0"."Nationality.CodeSystem" AS "NationalityCodeSystem" ,
	"Patient_Attr_$0"."Nationality.CodeSystemVersion" AS "NationalityCodeSystemVersion" ,
	"Patient_Attr_$0"."Address.StreetName" AS "StreetName" ,
	"Patient_Attr_$0"."Address.StreetNumber" AS "StreetNumber" ,
	"Patient_Attr_$0"."Address.PostOfficeBox" AS "PostOfficeBox" ,
	"Patient_Attr_$0"."Address.City" AS "City" ,
	"Patient_Attr_$0"."Address.PostalCode" AS "PostalCode" ,
	"Patient_Attr_$0"."Address.State" AS "State" ,
	"Patient_Attr_$0"."Address.Region" AS "Region" ,
	"Patient_Attr_$0"."Address.Country.OriginalValue" AS "CountryValue" ,
	"Patient_Attr_$0"."Address.Country.Code" AS "CountryCode" ,
	"Vocabularies_$1"."ID" AS "CountryVocabularyID" ,
	"Patient_Attr_$0"."Address.Country.CodeSystem" AS "CountryCodeSystem" ,
	"Patient_Attr_$0"."Address.Country.CodeSystemVersion" AS "CountryCodeSystemVersion" ,
	"Patient_Attr_$0"."Telecom.Phone" AS "Phone" ,
	"Patient_Attr_$0"."Telecom.Mobile" AS "Mobile" ,
	"Patient_Attr_$0"."Telecom.Fax" AS "Fax" ,
	"Patient_Attr_$0"."Telecom.Email" AS "Email"
FROM
	( ( ( ( ( HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" AS "Patient_Attr_$0"
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$1" ON
	( "Vocabularies_$1"."ExternalID" = "Patient_Attr_$0"."Address.Country.CodeSystem" ) )
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$2" ON
	( "Vocabularies_$2"."ExternalID" = "Patient_Attr_$0"."Gender.CodeSystem" ) )
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$3" ON
	( "Vocabularies_$3"."ExternalID" = "Patient_Attr_$0"."MaritalStatus.CodeSystem" ) )
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$4" ON
	( "Vocabularies_$4"."ExternalID" = "Patient_Attr_$0"."Nationality.CodeSystem" ) )
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$5" ON
	( "Vocabularies_$5"."ExternalID" = "Patient_Attr_$0"."Title.CodeSystem" ) )
WHERE
	( "Patient_Attr_$0"."DWDateTo" IS NULL );

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Patient" AS
SELECT
	"PatientTD_$0"."PatientID" ,
	"PatientTD_$0"."SourcePatientID" ,
	"PatientTD_$0"."Source" ,
	"PatientTD_$0"."OrgID" ,
	"PatientTD_$0"."FamilyName" ,
	"PatientTD_$0"."GivenName" ,
	"PatientTD_$0"."TitleValue" ,
	"PatientTD_$0"."TitleCode" ,
	"PatientTD_$0"."TitleVocabularyID" ,
	"PatientTD_$0"."TitleCodeSystem" ,
	"PatientTD_$0"."TitleCodeSystemVersion" ,
	"PatientTD_$0"."GenderValue" ,
	"PatientTD_$0"."GenderCode" ,
	"PatientTD_$0"."GenderVocabularyID" ,
	"PatientTD_$0"."GenderCodeSystem" ,
	"PatientTD_$0"."GenderCodeSystemVersion" ,
	"PatientTD_$0"."BirthDate" ,
	"PatientTD_$0"."MultipleBirthOrder" ,
	"PatientTD_$0"."DeceasedDate" ,
	"PatientTD_$0"."MaritalStatusValue" ,
	"PatientTD_$0"."MaritalStatusCode" ,
	"PatientTD_$0"."MaritalStatusVocabularyID" ,
	"PatientTD_$0"."MaritalStatusCodeSystem" ,
	"PatientTD_$0"."MaritalStatusCodeSystemVersion" ,
	"PatientTD_$0"."NationalityValue" ,
	"PatientTD_$0"."NationalityCode" ,
	"PatientTD_$0"."NationalityVocabularyID" ,
	"PatientTD_$0"."NationalityCodeSystem" ,
	"PatientTD_$0"."NationalityCodeSystemVersion" ,
	"PatientTD_$0"."StreetName" ,
	"PatientTD_$0"."StreetNumber" ,
	"PatientTD_$0"."PostOfficeBox" ,
	"PatientTD_$0"."City" ,
	"PatientTD_$0"."PostalCode" ,
	"PatientTD_$0"."State" ,
	"PatientTD_$0"."Region" ,
	"PatientTD_$0"."CountryValue" ,
	"PatientTD_$0"."CountryCode" ,
	"PatientTD_$0"."CountryVocabularyID" ,
	"PatientTD_$0"."CountryCodeSystem" ,
	"PatientTD_$0"."CountryCodeSystemVersion" ,
	"PatientTD_$0"."Phone" ,
	"PatientTD_$0"."Mobile" ,
	"PatientTD_$0"."Fax" ,
	"PatientTD_$0"."Email"
FROM
	HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.PatientTD" AS "PatientTD_$0"
WHERE
	( ( ( "PatientTD_$0"."ValidFrom" IS NULL )
		OR ( "PatientTD_$0"."ValidFrom" = TO_DATE ('0000-00-00') )
			OR ( "PatientTD_$0"."ValidFrom" <= CURRENT_UTCDATE ) )
		AND ( ( CURRENT_UTCDATE < "PatientTD_$0"."ValidTo" )
			OR ( "PatientTD_$0"."ValidTo" IS NULL )
				OR ( "PatientTD_$0"."ValidTo" = TO_DATE ('0000-00-00') ) ) );


CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.CohortAsInteraction" AS
SELECT
	"P_$2"."PatientID" ,
	"P_$2"."PatientID" AS "InteractionID" ,
	( ( "C_$0"."Title" || ' -- ' ) || "U_$3"."CreatedBy" ) AS "CohortName" ,
	"U_$3"."CreatedBy" AS "CreatedBy" ,
	"S_$4"."TextKey" AS "CohortStatus" ,
	"I_$1"."Status.Id" AS "StatusId" ,
	"S_$4"."Language" ,
	"C_$0"."CreatedAt" AS "PeriodStart" ,
	"C_$0"."CreatedAt" AS "PeriodEnd"
FROM
	( ( ( ( HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Collection" AS "C_$0"
INNER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Item" AS "I_$1" ON
	( "C_$0"."Id" = "I_$1"."Collection.Id" ) )
INNER JOIN HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Patient" AS "P_$2" ON
	( "I_$1"."Id" = "P_$2"."PatientID" ) )
INNER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Participant" AS "U_$3" ON
	( "U_$3"."Collection.Id" = "C_$0"."Id" ) )
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.CohortsStatusConfig" AS "S_$4" ON
	( "S_$4"."Id" = "I_$1"."Status.Id" ) )
WHERE
	( ( "U_$3"."HANAUserName" = SESSION_CONTEXT ('APPLICATIONUSER') )
		AND ( "S_$4"."Language" = IFNULL ( SUBSTR ( SESSION_CONTEXT ('LOCALE') ,
		1 ,
		2 ) ,
		'en' ) ) );

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.CohortStatusAsObservation" AS
SELECT
	"P_$3"."PatientID" ,
	"S_$2"."TextKey" AS "ObsCharValue" ,
	'COLLECTION_STATUS' AS "ObsType" ,
	"I_$1"."Status.Id" AS "ObsID" ,
	"S_$2"."Language" AS "Language"
FROM
	( ( ( ( HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Collection" AS "C_$0"
INNER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Item" AS "I_$1" ON
	( "C_$0"."Id" = "I_$1"."Collection.Id" ) )
INNER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.CohortsStatusConfig" AS "S_$2" ON
	( "S_$2"."Id" = "I_$1"."Status.Id" ) )
INNER JOIN HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Patient" AS "P_$3" ON
	( "I_$1"."Id" = "P_$3"."PatientID" ) )
INNER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Participant" AS "U_$4" ON
	( "U_$4"."Collection.Id" = "C_$0"."Id" ) )
WHERE
	( ( "U_$4"."HANAUserName" = SESSION_CONTEXT ('APPLICATIONUSER') )
		AND ( "S_$2"."Language" = IFNULL ( SUBSTR ( SESSION_CONTEXT ('LOCALE') ,
		1 ,
		2 ) ,
		'en' ) ) );


CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.CollectionsAsObservation" AS
SELECT
	"P_$2"."PatientID" ,
	( ( "C_$0"."Title" || ' -- ' ) || "U_$3"."CreatedBy" ) AS "ObsCharValue" ,
	'COLLECTION' AS "ObsType" ,
	"I_$1"."Status.Id" AS "StatusId"
FROM
	( ( ( HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Collection" AS "C_$0"
INNER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Item" AS "I_$1" ON
	( "C_$0"."Id" = "I_$1"."Collection.Id" ) )
INNER JOIN HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Patient" AS "P_$2" ON
	( "I_$1"."Id" = "P_$2"."PatientID" ) )
INNER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Participant" AS "U_$3" ON
	( "U_$3"."Collection.Id" = "C_$0"."Id" ) )
WHERE
	( "U_$3"."HANAUserName" = SESSION_CONTEXT ('APPLICATIONUSER') );


CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Condition" AS
SELECT "Condition_Attr_$0"."DWID" AS "ConditionID" , "Condition_Attr_$0"."Condition_Key_Assoc"."ConditionID" AS "SourceConditionID" , "Condition_Attr_$0"."Condition_Key_Assoc"."DWSource" AS "Source" , "Condition_Attr_$0"."ConditionType" , "Condition_Attr_$0"."Description" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Condition_Attr" AS "Condition_Attr_$0" WHERE  ( "Condition_Attr_$0"."DWDateTo" IS  NULL  );

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViewsEAV.Interaction_Details" AS
SELECT
	"Interaction_Details_$0"."DWID" AS "InteractionID" ,
	"Interaction_Details_$0"."Interactions_Key_Assoc"."InteractionID" AS "SourceInteractionID" ,
	"Interaction_Details_$0"."Interactions_Key_Assoc"."DWSource" AS "Source" ,
	"Interaction_Details_$0"."Attribute.OriginalValue" AS "AttributeValue" ,
	"Interaction_Details_$0"."Attribute.Code" AS "AttributeCode" ,
	"Vocabularies_$1"."ID" AS "AttributeVocabularyID" ,
	"Interaction_Details_$0"."Attribute.CodeSystem" AS "AttributeCodeSystem" ,
	"Interaction_Details_$0"."Attribute.CodeSystemVersion" AS "AttributeCodeSystemVersion" ,
	"Interaction_Details_$0"."Value.OriginalValue" AS "Value" ,
	"Interaction_Details_$0"."Value.Code" AS "ValueCode" ,
	"Vocabularies_$2"."ID" AS "ValueVocabularyID" ,
	"Interaction_Details_$0"."Value.CodeSystem" AS "ValueCodeSystem" ,
	"Interaction_Details_$0"."Value.CodeSystemVersion" AS "ValueCodeSystemVersion"
FROM
	( ( HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" AS "Interaction_Details_$0"
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$1" ON
	( "Vocabularies_$1"."ExternalID" = "Interaction_Details_$0"."Attribute.CodeSystem" ) )
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$2" ON
	( "Vocabularies_$2"."ExternalID" = "Interaction_Details_$0"."Value.CodeSystem" ) )
WHERE
	( "Interaction_Details_$0"."DWDateTo" IS NULL );

CREATE VIEW HTTPTEST_SCHEMA."legacy.ots::Views.Classification" AS
SELECT
	"Classification_$0"."VocabularyID" ,
	"Classification_$0"."Code" ,
	"Classification_$0"."ClassVocabularyID" ,
	"Classification_$0"."ClassCode" ,
	"Classification_$0"."ClassHierarchyLevel" ,
	"Classification_$0"."ParentClassVocabularyID" ,
	"Classification_$0"."ParentClassCode" ,
	"Classification_$0"."Context"
FROM
	HTTPTEST_SCHEMA."legacy.ots.internal::Entities.Classification" AS "Classification_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.ots::Views.ConceptTerms" AS
SELECT
	"ConceptTerms_$0"."ConceptVocabularyID" ,
	"ConceptTerms_$0"."ConceptCode" ,
	"ConceptTerms_$0"."ConceptTypeVocabularyID" ,
	"ConceptTerms_$0"."ConceptTypeCode" ,
	"ConceptTerms_$0"."TermContext" ,
	"ConceptTerms_$0"."TermLanguage" ,
	"ConceptTerms_$0"."TermText" ,
	"ConceptTerms_$0"."TermType" ,
	"ConceptTerms_$0"."TermIsPreferred"
FROM
	HTTPTEST_SCHEMA."legacy.ots.internal::Entities.ConceptTerms" AS "ConceptTerms_$0";


CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.InteractionDetailsOTS" AS
SELECT
	"details_$0"."InteractionID" AS "InteractionID" ,
	"details_$0"."AttributeValue" AS "AttributeValue" ,
	"details_$0"."AttributeCode" AS "AttributeCode" ,
	"details_$0"."AttributeCodeSystem" AS "AttributeCodeSystem" ,
	"details_$0"."AttributeCodeSystemVersion" AS "AttributeCodeSystemVersion" ,
	"details_$0"."Value" AS "Value" ,
	"details_$0"."ValueCode" AS "ValueCode" ,
	"details_$0"."ValueCodeSystem" AS "ValueCodeSystem" ,
	"details_$0"."ValueCodeSystemVersion" AS "ValueCodeSystemVersion" ,
	"class_$1"."ClassCode" AS "TARGET_CODE" ,
	"class_$1"."ClassVocabularyID" AS "TARGET_VOCABULARY_ID" ,
	"class_$1"."ClassHierarchyLevel" AS "HIERARCHY_LEVEL" ,
	"class_$1"."Context" AS "SUBJECT" ,
	"terms_$2"."TermContext" AS "TERM_CONTEXT" ,
	"terms_$2"."TermText" AS "DESCRIPTION" ,
	"terms_$2"."TermLanguage" AS "LANGUAGE"
FROM
	( ( HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViewsEAV.Interaction_Details" AS "details_$0"
INNER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Classification" AS "class_$1" ON
	( ( "class_$1"."VocabularyID" = "details_$0"."ValueVocabularyID" )
		AND ( "class_$1"."Code" = "details_$0"."ValueCode" ) ) )
INNER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.ConceptTerms" AS "terms_$2" ON
	( ( "terms_$2"."ConceptVocabularyID" = "class_$1"."ClassVocabularyID" )
		AND ( "terms_$2"."ConceptCode" = "class_$1"."ClassCode" ) ) );


CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Interactions" AS
SELECT "Interactions_Attr_$0"."DWID" AS "InteractionID" , "Interactions_Attr_$0"."Interactions_Key_Assoc"."InteractionID" AS "SourceInteractionID" , "Interactions_Attr_$0"."Interactions_Key_Assoc"."DWSource" AS "Source" , "Interactions_Attr_$0"."DWID_Patient" AS "PatientID" , "Interactions_Attr_$0"."DWID_ParentInteraction" AS "ParentInteractionID" , "Interactions_Attr_$0"."DWID_Condition" AS "ConditionID" , "Interactions_Attr_$0"."InteractionType.OriginalValue" AS "InteractionTypeValue" , "Interactions_Attr_$0"."InteractionType.Code" AS "InteractionTypeCode" , "Vocabularies_$1"."ID" AS "InteractionTypeVocabularyID" , "Interactions_Attr_$0"."InteractionType.CodeSystem" AS "InteractionTypeCodeSystem" , "Interactions_Attr_$0"."InteractionType.CodeSystemVersion" AS "InteractionTypeCodeSystemVersion" , "Interactions_Attr_$0"."InteractionStatus" , "Interactions_Attr_$0"."PeriodStart" , "Interactions_Attr_$0"."PeriodEnd" , "Interactions_Attr_$0"."OrgID" FROM  ( HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" AS "Interactions_Attr_$0" LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$1" ON  ( "Vocabularies_$1"."ExternalID" = "Interactions_Attr_$0"."InteractionType.CodeSystem" )  )  WHERE  ( "Interactions_Attr_$0"."DWDateTo" IS  NULL  );

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Observations" AS
SELECT "Observations_Attr_$0"."DWID" AS "ObsID" , "Observations_Attr_$0"."Observations_Key_Assoc"."ObsID" AS "SourceObsID" , "Observations_Attr_$0"."Observations_Key_Assoc"."DWSource" AS "Source" , "Observations_Attr_$0"."ObsType" , "Observations_Attr_$0"."DWID_Patient" AS "PatientID" , "Observations_Attr_$0"."ObsCharValue" , "Observations_Attr_$0"."ObsNumValue" , "Observations_Attr_$0"."ObsUnit" , "Observations_Attr_$0"."ObsTime" , "Observations_Attr_$0"."OrgID" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" AS "Observations_Attr_$0" WHERE  ( "Observations_Attr_$0"."DWDateTo" IS  NULL  );

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews._Patient_Practitioner_Attr" AS
SELECT "Patient_Practitioner_Link_Attr_$0"."DWLinkID" , "Patient_Practitioner_Link_Attr_$0"."Role.OriginalValue" AS "RoleValue" , "Patient_Practitioner_Link_Attr_$0"."Role.Code" AS "RoleCode" , "Vocabularies_$1"."ID" AS "RoleVocabularyID" , "Patient_Practitioner_Link_Attr_$0"."Role.CodeSystem" AS "RoleCodeSystem" , "Patient_Practitioner_Link_Attr_$0"."Role.CodeSystemVersion" AS "RoleCodeSystemVersion" FROM  ( HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link_Attr" AS "Patient_Practitioner_Link_Attr_$0" LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$1" ON  ( "Vocabularies_$1"."ExternalID" = "Patient_Practitioner_Link_Attr_$0"."Role.CodeSystem" )  )  WHERE  ( "Patient_Practitioner_Link_Attr_$0"."DWDateTo" IS  NULL  );


CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Patient_Practitioner" AS
SELECT
	"Patient_Practitioner_Link_$0"."DWLinkID" AS "ID" ,
	"Patient_Practitioner_Link_$0"."DWID_Patient" AS "PatientID" ,
	"Patient_Practitioner_Link_$0"."Patient_Key_Assoc"."PatientID" AS "SourcePatientID" ,
	"Patient_Practitioner_Link_$0"."Patient_Key_Assoc"."DWSource" AS "SourcePatient" ,
	"Patient_Practitioner_Link_$0"."DWID_Practitioner" AS "PractitionerID" ,
	"Patient_Practitioner_Link_$0"."Practitioner_Key_Assoc"."PractitionerID" AS "SourcePractitionerID" ,
	"Patient_Practitioner_Link_$0"."Practitioner_Key_Assoc"."DWSource" AS "SourcePractitioner" ,
	"_Patient_Practitioner_Attr_$1"."RoleValue" ,
	"_Patient_Practitioner_Attr_$1"."RoleCode" ,
	"_Patient_Practitioner_Attr_$1"."RoleVocabularyID" ,
	"_Patient_Practitioner_Attr_$1"."RoleCodeSystem" ,
	"_Patient_Practitioner_Attr_$1"."RoleCodeSystemVersion"
FROM
	( HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link" AS "Patient_Practitioner_Link_$0"
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews._Patient_Practitioner_Attr" AS "_Patient_Practitioner_Attr_$1" ON
	( "_Patient_Practitioner_Attr_$1"."DWLinkID" = "Patient_Practitioner_Link_$0"."DWLinkID" ) )
WHERE
	( "Patient_Practitioner_Link_$0"."DWDateTo" IS NULL );

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.PractitionerTD" AS
SELECT "Practitioner_Attr_$0"."DWID" AS "PractitionerID" , "Practitioner_Attr_$0"."Practitioner_Key_Assoc"."PractitionerID" AS "SourcePractitionerID" , "Practitioner_Attr_$0"."Practitioner_Key_Assoc"."DWSource" AS "Source" , "Practitioner_Attr_$0"."ValidFrom" , "Practitioner_Attr_$0"."ValidTo" , "Practitioner_Attr_$0"."OrgID" , "Practitioner_Attr_$0"."FamilyName" , "Practitioner_Attr_$0"."GivenName" , "Practitioner_Attr_$0"."BirthDate" , "Practitioner_Attr_$0"."Title.OriginalValue" AS "TitleValue" , "Practitioner_Attr_$0"."Title.Code" AS "TitleCode" , "Vocabularies_$7"."ID" AS "TitleVocabularyID" , "Practitioner_Attr_$0"."Title.CodeSystem" AS "TitleCodeSystem" , "Practitioner_Attr_$0"."Title.CodeSystemVersion" AS "TitleCodeSystemVersion" , "Practitioner_Attr_$0"."Gender.OriginalValue" AS "GenderValue" , "Practitioner_Attr_$0"."Gender.Code" AS "GenderCode" , "Vocabularies_$2"."ID" AS "GenderVocabularyID" , "Practitioner_Attr_$0"."Gender.CodeSystem" AS "GenderCodeSystem" , "Practitioner_Attr_$0"."Gender.CodeSystemVersion" AS "GenderCodeSystemVersion" , "Practitioner_Attr_$0"."Role.OriginalValue" AS "RoleValue" , "Practitioner_Attr_$0"."Role.Code" AS "RoleCode" , "Vocabularies_$5"."ID" AS "RoleVocabularyID" , "Practitioner_Attr_$0"."Role.CodeSystem" AS "RoleCodeSystem" , "Practitioner_Attr_$0"."Role.CodeSystemVersion" AS "RoleCodeSystemVersion" , "Practitioner_Attr_$0"."Speciality.OriginalValue" AS "SpecialityValue" , "Practitioner_Attr_$0"."Speciality.Code" AS "SpecialityCode" , "Vocabularies_$6"."ID" AS "SpecialityVocabularyID" , "Practitioner_Attr_$0"."Speciality.CodeSystem" AS "SpecialityCodeSystem" , "Practitioner_Attr_$0"."Speciality.CodeSystemVersion" AS "SpecialityCodeSystemVersion" , "Practitioner_Attr_$0"."MaritalStatus.OriginalValue" AS "MaritalStatusValue" , "Practitioner_Attr_$0"."MaritalStatus.Code" AS "MaritalStatusCode" , "Vocabularies_$3"."ID" AS "MaritalStatusVocabularyID" , "Practitioner_Attr_$0"."MaritalStatus.CodeSystem" AS "MaritalStatusCodeSystem" , "Practitioner_Attr_$0"."MaritalStatus.CodeSystemVersion" AS "MaritalStatusCodeSystemVersion" , "Practitioner_Attr_$0"."Nationality.OriginalValue" AS "NationalityValue" , "Practitioner_Attr_$0"."Nationality.Code" AS "NationalityCode" , "Vocabularies_$4"."ID" AS "NationalityVocabularyID" , "Practitioner_Attr_$0"."Nationality.CodeSystem" AS "NationalityCodeSystem" , "Practitioner_Attr_$0"."Nationality.CodeSystemVersion" AS "NationalityCodeSystemVersion" , "Practitioner_Attr_$0"."Address.StreetName" AS "StreetName" , "Practitioner_Attr_$0"."Address.StreetNumber" AS "StreetNumber" , "Practitioner_Attr_$0"."Address.PostOfficeBox" AS "PostOfficeBox" , "Practitioner_Attr_$0"."Address.City" AS "City" , "Practitioner_Attr_$0"."Address.PostalCode" AS "PostalCode" , "Practitioner_Attr_$0"."Address.State" AS "State" , "Practitioner_Attr_$0"."Address.Region" AS "Region" , "Practitioner_Attr_$0"."Address.Country.OriginalValue" AS "CountryValue" , "Practitioner_Attr_$0"."Address.Country.Code" AS "CountryCode" , "Vocabularies_$1"."ID" AS "CountryVocabularyID" , "Practitioner_Attr_$0"."Address.Country.CodeSystem" AS "CountryCodeSystem" , "Practitioner_Attr_$0"."Address.Country.CodeSystemVersion" AS "CountryCodeSystemVersion" , "Practitioner_Attr_$0"."Telecom.Phone" AS "Phone" , "Practitioner_Attr_$0"."Telecom.Mobile" AS "Mobile" , "Practitioner_Attr_$0"."Telecom.Fax" AS "Fax" , "Practitioner_Attr_$0"."Telecom.Email" AS "Email" , "Practitioner_Attr_$0"."PreferredLanguage" FROM  (  (  (  (  (  (  ( HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Practitioner_Attr" AS "Practitioner_Attr_$0" LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$1" ON  ( "Vocabularies_$1"."ExternalID" = "Practitioner_Attr_$0"."Address.Country.CodeSystem" )  )  LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$2" ON  ( "Vocabularies_$2"."ExternalID" = "Practitioner_Attr_$0"."Gender.CodeSystem" )  )  LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$3" ON  ( "Vocabularies_$3"."ExternalID" = "Practitioner_Attr_$0"."MaritalStatus.CodeSystem" )  )  LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$4" ON  ( "Vocabularies_$4"."ExternalID" = "Practitioner_Attr_$0"."Nationality.CodeSystem" )  )  LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$5" ON  ( "Vocabularies_$5"."ExternalID" = "Practitioner_Attr_$0"."Role.CodeSystem" )  )  LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$6" ON  ( "Vocabularies_$6"."ExternalID" = "Practitioner_Attr_$0"."Speciality.CodeSystem" )  )  LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$7" ON  ( "Vocabularies_$7"."ExternalID" = "Practitioner_Attr_$0"."Title.CodeSystem" )  )  WHERE  ( "Practitioner_Attr_$0"."DWDateTo" IS  NULL  );


CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Practitioner" AS
SELECT
	"PractitionerTD_$0"."PractitionerID" ,
	"PractitionerTD_$0"."SourcePractitionerID" ,
	"PractitionerTD_$0"."Source" ,
	"PractitionerTD_$0"."OrgID" ,
	"PractitionerTD_$0"."FamilyName" ,
	"PractitionerTD_$0"."GivenName" ,
	"PractitionerTD_$0"."TitleValue" ,
	"PractitionerTD_$0"."TitleCode" ,
	"PractitionerTD_$0"."TitleVocabularyID" ,
	"PractitionerTD_$0"."TitleCodeSystem" ,
	"PractitionerTD_$0"."TitleCodeSystemVersion" ,
	"PractitionerTD_$0"."GenderValue" ,
	"PractitionerTD_$0"."GenderCode" ,
	"PractitionerTD_$0"."GenderVocabularyID" ,
	"PractitionerTD_$0"."GenderCodeSystem" ,
	"PractitionerTD_$0"."GenderCodeSystemVersion" ,
	"PractitionerTD_$0"."RoleValue" ,
	"PractitionerTD_$0"."RoleCode" ,
	"PractitionerTD_$0"."RoleVocabularyID" ,
	"PractitionerTD_$0"."RoleCodeSystem" ,
	"PractitionerTD_$0"."RoleCodeSystemVersion" ,
	"PractitionerTD_$0"."SpecialityValue" ,
	"PractitionerTD_$0"."SpecialityCode" ,
	"PractitionerTD_$0"."SpecialityVocabularyID" ,
	"PractitionerTD_$0"."SpecialityCodeSystem" ,
	"PractitionerTD_$0"."SpecialityCodeSystemVersion" ,
	"PractitionerTD_$0"."BirthDate" ,
	"PractitionerTD_$0"."MaritalStatusValue" ,
	"PractitionerTD_$0"."MaritalStatusCode" ,
	"PractitionerTD_$0"."MaritalStatusVocabularyID" ,
	"PractitionerTD_$0"."MaritalStatusCodeSystem" ,
	"PractitionerTD_$0"."MaritalStatusCodeSystemVersion" ,
	"PractitionerTD_$0"."NationalityValue" ,
	"PractitionerTD_$0"."NationalityCode" ,
	"PractitionerTD_$0"."NationalityVocabularyID" ,
	"PractitionerTD_$0"."NationalityCodeSystem" ,
	"PractitionerTD_$0"."NationalityCodeSystemVersion" ,
	"PractitionerTD_$0"."StreetName" ,
	"PractitionerTD_$0"."StreetNumber" ,
	"PractitionerTD_$0"."PostOfficeBox" ,
	"PractitionerTD_$0"."City" ,
	"PractitionerTD_$0"."PostalCode" ,
	"PractitionerTD_$0"."State" ,
	"PractitionerTD_$0"."Region" ,
	"PractitionerTD_$0"."CountryValue" ,
	"PractitionerTD_$0"."CountryCode" ,
	"PractitionerTD_$0"."CountryVocabularyID" ,
	"PractitionerTD_$0"."CountryCodeSystem" ,
	"PractitionerTD_$0"."CountryCodeSystemVersion" ,
	"PractitionerTD_$0"."Phone" ,
	"PractitionerTD_$0"."Mobile" ,
	"PractitionerTD_$0"."Fax" ,
	"PractitionerTD_$0"."Email" ,
	"PractitionerTD_$0"."PreferredLanguage"
FROM
	HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.PractitionerTD" AS "PractitionerTD_$0"
WHERE
	( ( ( "PractitionerTD_$0"."ValidFrom" IS NULL )
		OR ( "PractitionerTD_$0"."ValidFrom" = TO_DATE ('0000-00-00') )
			OR ( "PractitionerTD_$0"."ValidFrom" <= CURRENT_UTCDATE ) )
		AND ( ( CURRENT_UTCDATE < "PractitionerTD_$0"."ValidTo" )
			OR ( "PractitionerTD_$0"."ValidTo" IS NULL )
				OR ( "PractitionerTD_$0"."ValidTo" = TO_DATE ('0000-00-00') ) ) );


CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.V_GuardedPatient" AS
SELECT "PatientTD_$0"."PatientID" , "PatientTD_$0"."SourcePatientID" , "PatientTD_$0"."Source" , "PatientTD_$0"."OrgID" , "PatientTD_$0"."FamilyName" , "PatientTD_$0"."GivenName" , "PatientTD_$0"."TitleValue" , "PatientTD_$0"."TitleCode" , "PatientTD_$0"."TitleVocabularyID" , "PatientTD_$0"."TitleCodeSystem" , "PatientTD_$0"."TitleCodeSystemVersion" , "PatientTD_$0"."GenderValue" , "PatientTD_$0"."GenderCode" , "PatientTD_$0"."GenderVocabularyID" , "PatientTD_$0"."GenderCodeSystem" , "PatientTD_$0"."GenderCodeSystemVersion" , "PatientTD_$0"."BirthDate" , "PatientTD_$0"."MultipleBirthOrder" , "PatientTD_$0"."DeceasedDate" , "PatientTD_$0"."MaritalStatusValue" , "PatientTD_$0"."MaritalStatusCode" , "PatientTD_$0"."MaritalStatusVocabularyID" , "PatientTD_$0"."MaritalStatusCodeSystem" , "PatientTD_$0"."MaritalStatusCodeSystemVersion" , "PatientTD_$0"."NationalityValue" , "PatientTD_$0"."NationalityCode" , "PatientTD_$0"."NationalityVocabularyID" , "PatientTD_$0"."NationalityCodeSystem" , "PatientTD_$0"."NationalityCodeSystemVersion" , "PatientTD_$0"."StreetName" , "PatientTD_$0"."StreetNumber" , "PatientTD_$0"."PostOfficeBox" , "PatientTD_$0"."City" , "PatientTD_$0"."PostalCode" , "PatientTD_$0"."State" , "PatientTD_$0"."Region" , "PatientTD_$0"."CountryValue" , "PatientTD_$0"."CountryCode" , "PatientTD_$0"."CountryVocabularyID" , "PatientTD_$0"."CountryCodeSystem" , "PatientTD_$0"."CountryCodeSystemVersion" , "PatientTD_$0"."Phone" , "PatientTD_$0"."Mobile" , "PatientTD_$0"."Fax" , "PatientTD_$0"."Email" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.PatientTD" AS "PatientTD_$0" WHERE  (  (  ( "PatientTD_$0"."ValidFrom" IS  NULL  )  OR  ( "PatientTD_$0"."ValidFrom" = TO_DATE ( '0000-00-00' )  )  OR  ( "PatientTD_$0"."ValidFrom" <= CURRENT_UTCDATE )  )  AND  (  ( CURRENT_UTCDATE < "PatientTD_$0"."ValidTo" )  OR  ( "PatientTD_$0"."ValidTo" IS  NULL  )  OR  ( "PatientTD_$0"."ValidTo" = TO_DATE ( '0000-00-00' )  )  )  );

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViewsEAV.Interaction_Measures" AS
SELECT "Interaction_Measures_$0"."DWID" AS "InteractionID" , "Interaction_Measures_$0"."Interactions_Key_Assoc"."InteractionID" AS "SourceInteractionID" , "Interaction_Measures_$0"."Interactions_Key_Assoc"."DWSource" AS "Source" , "Interaction_Measures_$0"."Attribute.OriginalValue" AS "AttributeValue" , "Interaction_Measures_$0"."Attribute.Code" AS "AttributeCode" , "Vocabularies_$1"."ID" AS "AttributeVocabularyID" , "Interaction_Measures_$0"."Attribute.CodeSystem" AS "AttributeCodeSystem" , "Interaction_Measures_$0"."Attribute.CodeSystemVersion" AS "AttributeCodeSystemVersion" , "Interaction_Measures_$0"."Unit" , "Interaction_Measures_$0"."Value" FROM  ( HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" AS "Interaction_Measures_$0" LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.ots::Views.Vocabularies" AS "Vocabularies_$1" ON  ( "Vocabularies_$1"."ExternalID" = "Interaction_Measures_$0"."Attribute.CodeSystem" )  )  WHERE  ( "Interaction_Measures_$0"."DWDateTo" IS  NULL  );


CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViewsEAV.Interaction_Text" AS
SELECT "Interaction_Text_$0"."InteractionTextID" , "Interaction_Text_$0"."DWID" AS "InteractionID" , "Interaction_Text_$0"."Interactions_Key_Assoc"."InteractionID" AS "SourceInteractionID" , "Interaction_Text_$0"."Interactions_Key_Assoc"."DWSource" AS "Source" , "Interaction_Text_$0"."Attribute" , "Interaction_Text_$0"."Value" , "Interaction_Text_$0"."Lang" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" AS "Interaction_Text_$0" WHERE  ( "Interaction_Text_$0"."DWDateTo" IS  NULL  );

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.CODES" AS
SELECT "ConceptTerms_$0"."ConceptVocabularyID" AS "VOCABULARY_ID" , "ConceptTerms_$0"."TermContext" AS "CONTEXT" , "ConceptTerms_$0"."ConceptCode" AS "CODE" , "ConceptTerms_$0"."TermLanguage" AS "LANGUAGE" , "ConceptTerms_$0"."TermText" AS "DESCRIPTION" FROM HTTPTEST_SCHEMA."legacy.ots::Views.ConceptTerms" AS "ConceptTerms_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.CONDITION" AS
SELECT "Condition_$0"."ConditionID" AS "CONDITION_ID" , "Condition_$0"."ConditionType" AS "CONDITION_TYPE" , "Condition_$0"."Description" AS "DESCRIPTION" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Condition" AS "Condition_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.GUARDED_INTERACTIONS" AS
SELECT "Interactions_$0"."InteractionID" AS "INTERACTION_ID" , "Interactions_$0"."PatientID" AS "PATIENT_ID" , "Interactions_$0"."InteractionTypeValue" AS "INTERACTION_TYPE" , "Interactions_$0"."InteractionTypeCode" AS "INTERACTION_TYPE_CODE" , "Interactions_$0"."InteractionTypeVocabularyID" AS "INTERACTION_TYPE_VOCABULARY_ID" , "Interactions_$0"."InteractionTypeCodeSystem" AS "INTERACTION_TYPE_CODE_SYSTEM" , "Interactions_$0"."InteractionTypeCodeSystemVersion" AS "INTERACTION_TYPE_CODE_SYSTEM_VERSION" , "Interactions_$0"."ParentInteractionID" AS "PARENT_INTERACT_ID" , "Interactions_$0"."ConditionID" AS "CONDITION_ID" , "Interactions_$0"."PeriodStart" AS "START" , "Interactions_$0"."PeriodEnd" AS "END" , "Interactions_$0"."OrgID" AS "ORG_ID" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Interactions" AS "Interactions_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.GUARDED_PATIENT" AS
SELECT "Patient_$0"."PatientID" AS "PATIENT_ID" , "Patient_$0"."SourcePatientID" AS "SOURCE_PATIENT_ID" , "Patient_$0"."Source" AS "SOURCE" , "Patient_$0"."OrgID" AS "ORG_ID" , "Patient_$0"."FamilyName" AS "LASTNAME" , "Patient_$0"."GivenName" AS "FIRSTNAME" , "Patient_$0"."TitleValue" AS "TITLE" , "Patient_$0"."TitleCode" AS "TITLE_CODE" , "Patient_$0"."TitleVocabularyID" AS "TITLE_VOCABULARY_ID" , "Patient_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM" , "Patient_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM_VERSION" , "Patient_$0"."GenderValue" AS "GENDER" , "Patient_$0"."GenderCode" AS "GENDER_CODE" , "Patient_$0"."GenderVocabularyID" AS "GENDER_VOCABULARY_ID" , "Patient_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM" , "Patient_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM_VERSION" , "Patient_$0"."BirthDate" AS "DOB" , "Patient_$0"."MultipleBirthOrder" AS "MULTIPLE_BIRTH_ORDER" , "Patient_$0"."DeceasedDate" AS "DOD" , "Patient_$0"."MaritalStatusValue" AS "MARITAL_STATUS" , "Patient_$0"."MaritalStatusCode" AS "MARITAL_STATUS_CODE" , "Patient_$0"."MaritalStatusVocabularyID" AS "MARITAL_STATUS_VOCABULARY_ID" , "Patient_$0"."MaritalStatusCodeSystem" AS "MARITAL_STATUS_CODE_SYSTEM" , "Patient_$0"."MaritalStatusCodeSystemVersion" AS "MARITAL_STATUS_CODE_SYSTEM_VERSION" , "Patient_$0"."NationalityValue" AS "NATIONALITY" , "Patient_$0"."NationalityCode" AS "NATIONALITY_CODE" , "Patient_$0"."NationalityVocabularyID" AS "NATIONALITY_VOCABULARY_ID" , "Patient_$0"."NationalityCodeSystem" AS "NATIONALITY_CODE_SYSTEM" , "Patient_$0"."NationalityCodeSystemVersion" AS "NATIONALITY_CODE_SYSTEM_VERSION" , "Patient_$0"."StreetName" AS "STREET" , "Patient_$0"."StreetNumber" AS "STREET_NUMBER" , "Patient_$0"."PostOfficeBox" AS "POST_OFFICE_BOX" , "Patient_$0"."City" AS "CITY" , "Patient_$0"."PostalCode" AS "POSTCODE" , "Patient_$0"."State" AS "REGION" , "Patient_$0"."CountryValue" AS "COUNTRY" , "Patient_$0"."CountryCode" AS "COUNTRY_CODE" , "Patient_$0"."CountryVocabularyID" AS "COUNTRY_VOCABULARY_ID" , "Patient_$0"."CountryCodeSystem" AS "COUNTRY_CODE_SYSTEM" , "Patient_$0"."CountryCodeSystemVersion" AS "COUNTRY_CODE_SYSTEM_VERSION" , "Patient_$0"."Phone" AS "PHONE" , "Patient_$0"."Mobile" AS "MOBILE" , "Patient_$0"."Fax" AS "FAX" , "Patient_$0"."Email" AS "EMAIL" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Patient" AS "Patient_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.GUARDED_PATIENT_TD" AS
SELECT "PatientTD_$0"."PatientID" AS "PATIENT_ID" , "PatientTD_$0"."SourcePatientID" AS "SOURCE_PATIENT_ID" , "PatientTD_$0"."Source" AS "SOURCE" , "PatientTD_$0"."OrgID" AS "ORG_ID" , "PatientTD_$0"."ValidFrom" AS "VALID_FROM" , "PatientTD_$0"."ValidTo" AS "VALID_TO" , "PatientTD_$0"."FamilyName" AS "LASTNAME" , "PatientTD_$0"."GivenName" AS "FIRSTNAME" , "PatientTD_$0"."TitleValue" AS "TITLE" , "PatientTD_$0"."TitleCode" AS "TITLE_CODE" , "PatientTD_$0"."TitleVocabularyID" AS "TITLE_VOCABULARY_ID" , "PatientTD_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM" , "PatientTD_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM_VERSION" , "PatientTD_$0"."GenderValue" AS "GENDER" , "PatientTD_$0"."GenderCode" AS "GENDER_CODE" , "PatientTD_$0"."GenderVocabularyID" AS "GENDER_VOCABULARY_ID" , "PatientTD_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM" , "PatientTD_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM_VERSION" , "PatientTD_$0"."BirthDate" AS "DOB" , "PatientTD_$0"."MultipleBirthOrder" AS "MULTIPLE_BIRTH_ORDER" , "PatientTD_$0"."DeceasedDate" AS "DOD" , "PatientTD_$0"."MaritalStatusValue" AS "MARITAL_STATUS" , "PatientTD_$0"."MaritalStatusCode" AS "MARITAL_STATUS_CODE" , "PatientTD_$0"."MaritalStatusVocabularyID" AS "MARITAL_STATUS_VOCABULARY_ID" , "PatientTD_$0"."MaritalStatusCodeSystem" AS "MARITAL_STATUS_CODE_SYSTEM" , "PatientTD_$0"."MaritalStatusCodeSystemVersion" AS "MARITAL_STATUS_CODE_SYSTEM_VERSION" , "PatientTD_$0"."NationalityValue" AS "NATIONALITY" , "PatientTD_$0"."NationalityCode" AS "NATIONALITY_CODE" , "PatientTD_$0"."NationalityVocabularyID" AS "NATIONALITY_VOCABULARY_ID" , "PatientTD_$0"."NationalityCodeSystem" AS "NATIONALITY_CODE_SYSTEM" , "PatientTD_$0"."NationalityCodeSystemVersion" AS "NATIONALITY_CODE_SYSTEM_VERSION" , "PatientTD_$0"."StreetName" AS "STREET" , "PatientTD_$0"."StreetNumber" AS "STREET_NUMBER" , "PatientTD_$0"."PostOfficeBox" AS "POST_OFFICE_BOX" , "PatientTD_$0"."City" AS "CITY" , "PatientTD_$0"."PostalCode" AS "POSTCODE" , "PatientTD_$0"."State" AS "REGION" , "PatientTD_$0"."CountryValue" AS "COUNTRY" , "PatientTD_$0"."CountryCode" AS "COUNTRY_CODE" , "PatientTD_$0"."CountryVocabularyID" AS "COUNTRY_VOCABULARY_ID" , "PatientTD_$0"."CountryCodeSystem" AS "COUNTRY_CODE_SYSTEM" , "PatientTD_$0"."CountryCodeSystemVersion" AS "COUNTRY_CODE_SYSTEM_VERSION" , "PatientTD_$0"."Phone" AS "PHONE" , "PatientTD_$0"."Mobile" AS "MOBILE" , "PatientTD_$0"."Fax" AS "FAX" , "PatientTD_$0"."Email" AS "EMAIL" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.PatientTD" AS "PatientTD_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.INTERACTIONS" AS
SELECT "Interactions_$0"."InteractionID" AS "INTERACTION_ID" , "Interactions_$0"."PatientID" AS "PATIENT_ID" , "Interactions_$0"."InteractionTypeValue" AS "INTERACTION_TYPE" , "Interactions_$0"."InteractionTypeCode" AS "INTERACTION_TYPE_CODE" , "Interactions_$0"."InteractionTypeVocabularyID" AS "INTERACTION_TYPE_VOCABULARY_ID" , "Interactions_$0"."InteractionTypeCodeSystem" AS "INTERACTION_TYPE_CODE_SYSTEM" , "Interactions_$0"."InteractionTypeCodeSystemVersion" AS "INTERACTION_TYPE_CODE_SYSTEM_VERSION" , "Interactions_$0"."ParentInteractionID" AS "PARENT_INTERACT_ID" , "Interactions_$0"."ConditionID" AS "CONDITION_ID" , "Interactions_$0"."PeriodStart" AS "START" , "Interactions_$0"."PeriodEnd" AS "END" , "Interactions_$0"."OrgID" AS "ORG_ID" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Interactions" AS "Interactions_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_EAV" AS
SELECT "Interaction_Details_$0"."InteractionID" AS "INTERACTION_ID" , "Interaction_Details_$0"."AttributeValue" AS "ATTRIBUTE" , "Interaction_Details_$0"."AttributeCode" AS "ATTRIBUTE_CODE" , "Interaction_Details_$0"."AttributeVocabularyID" AS "ATTRIBUTE_VOCABULARY_ID" , "Interaction_Details_$0"."AttributeCodeSystem" AS "ATTRIBUTE_CODE_SYSTEM" , "Interaction_Details_$0"."AttributeCodeSystemVersion" AS "ATTRIBUTE_CODE_SYSTEM_VERSION" , "Interaction_Details_$0"."Value" AS "VALUE" , "Interaction_Details_$0"."ValueCode" AS "VALUE_CODE" , "Interaction_Details_$0"."ValueVocabularyID" AS "VALUE_VOCABULARY_ID" , "Interaction_Details_$0"."ValueCodeSystem" AS "VALUE_CODE_SYSTEM" , "Interaction_Details_$0"."ValueCodeSystemVersion" AS "VALUE_CODE_SYSTEM_VERSION" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViewsEAV.Interaction_Details" AS "Interaction_Details_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_OTS" AS
SELECT "InteractionDetailsOTS_$0"."InteractionID" AS "INTERACTION_ID" , "InteractionDetailsOTS_$0"."AttributeValue" AS "ATTRIBUTE" , "InteractionDetailsOTS_$0"."AttributeCode" AS "ATTRIBUTE_CODE" , "InteractionDetailsOTS_$0"."AttributeCodeSystem" AS "ATTRIBUTE_CODING_SYSTEM" , "InteractionDetailsOTS_$0"."AttributeCodeSystemVersion" AS "ATTRIBUTE_VERSION" , "InteractionDetailsOTS_$0"."Value" AS "VALUE" , "InteractionDetailsOTS_$0"."ValueCode" AS "VALUE_CODE" , "InteractionDetailsOTS_$0"."ValueCodeSystem" AS "VALUE_CODE_SYSTEM" , "InteractionDetailsOTS_$0"."ValueCodeSystemVersion" AS "VALUE_VERSION" , "InteractionDetailsOTS_$0"."TARGET_CODE" AS "TARGET_CODE" , "InteractionDetailsOTS_$0"."TARGET_VOCABULARY_ID" AS "TARGET_VOCABULARY_ID" , "InteractionDetailsOTS_$0"."HIERARCHY_LEVEL" AS "HIERARCHY_LEVEL" , "InteractionDetailsOTS_$0"."SUBJECT" AS "SUBJECT" , "InteractionDetailsOTS_$0"."TERM_CONTEXT" AS "TERM_CONTEXT" , "InteractionDetailsOTS_$0"."DESCRIPTION" AS "DESCRIPTION" , "InteractionDetailsOTS_$0"."LANGUAGE" AS "LANGUAGE" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.InteractionDetailsOTS" AS "InteractionDetailsOTS_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.INTERACTION_MEASURES_EAV" AS
SELECT "Interaction_Measures_$0"."InteractionID" AS "INTERACTION_ID" , "Interaction_Measures_$0"."AttributeValue" AS "ATTRIBUTE" , "Interaction_Measures_$0"."AttributeCode" AS "ATTRIBUTE_CODE" , "Interaction_Measures_$0"."AttributeVocabularyID" AS "ATTRIBUTE_VOCABULARY_ID" , "Interaction_Measures_$0"."AttributeCodeSystem" AS "ATTRIBUTE_CODE_SYSTEM" , "Interaction_Measures_$0"."AttributeCodeSystemVersion" AS "ATTRIBUTE_CODE_SYSTEM_VERSION" , "Interaction_Measures_$0"."Unit" AS "UNIT" , "Interaction_Measures_$0"."Value" AS "VALUE" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViewsEAV.Interaction_Measures" AS "Interaction_Measures_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.INTERACTION_TEXT_EAV" AS
SELECT "Interaction_Text_$0"."InteractionTextID" AS "INTERACTION_TEXT_ID" , "Interaction_Text_$0"."InteractionID" AS "INTERACTION_ID" , "Interaction_Text_$0"."Attribute" AS "ATTRIBUTE" , "Interaction_Text_$0"."Value" AS "VALUE" , "Interaction_Text_$0"."Lang" AS "LANG" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViewsEAV.Interaction_Text" AS "Interaction_Text_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.OBSERVATIONS" AS
SELECT "Observations_$0"."ObsID" AS "OBS_ID" , "Observations_$0"."ObsType" AS "OBS_TYPE" , "Observations_$0"."PatientID" AS "PATIENT_ID" , "Observations_$0"."ObsCharValue" AS "OBS_CHAR_VAL" , "Observations_$0"."ObsNumValue" AS "OBS_NUM_VAL" , "Observations_$0"."ObsUnit" AS "OBS_UNIT" , "Observations_$0"."ObsTime" AS "OBS_TIME" , "Observations_$0"."OrgID" AS "ORG_ID" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Observations" AS "Observations_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.PATIENT" AS
SELECT "Patient_$0"."PatientID" AS "PATIENT_ID" , "Patient_$0"."SourcePatientID" AS "SOURCE_PATIENT_ID" , "Patient_$0"."Source" AS "SOURCE" , "Patient_$0"."OrgID" AS "ORG_ID" , "Patient_$0"."FamilyName" AS "LASTNAME" , "Patient_$0"."GivenName" AS "FIRSTNAME" , "Patient_$0"."TitleValue" AS "TITLE" , "Patient_$0"."TitleCode" AS "TITLE_CODE" , "Patient_$0"."TitleVocabularyID" AS "TITLE_VOCABULARY_ID" , "Patient_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM" , "Patient_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM_VERSION" , "Patient_$0"."GenderValue" AS "GENDER" , "Patient_$0"."GenderCode" AS "GENDER_CODE" , "Patient_$0"."GenderVocabularyID" AS "GENDER_VOCABULARY_ID" , "Patient_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM" , "Patient_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM_VERSION" , "Patient_$0"."BirthDate" AS "DOB" , "Patient_$0"."MultipleBirthOrder" AS "MULTIPLE_BIRTH_ORDER" , "Patient_$0"."DeceasedDate" AS "DOD" , "Patient_$0"."MaritalStatusValue" AS "MARITAL_STATUS" , "Patient_$0"."MaritalStatusCode" AS "MARITAL_STATUS_CODE" , "Patient_$0"."MaritalStatusVocabularyID" AS "MARITAL_STATUS_VOCABULARY_ID" , "Patient_$0"."MaritalStatusCodeSystem" AS "MARITAL_STATUS_CODE_SYSTEM" , "Patient_$0"."MaritalStatusCodeSystemVersion" AS "MARITAL_STATUS_CODE_SYSTEM_VERSION" , "Patient_$0"."NationalityValue" AS "NATIONALITY" , "Patient_$0"."NationalityCode" AS "NATIONALITY_CODE" , "Patient_$0"."NationalityVocabularyID" AS "NATIONALITY_VOCABULARY_ID" , "Patient_$0"."NationalityCodeSystem" AS "NATIONALITY_CODE_SYSTEM" , "Patient_$0"."NationalityCodeSystemVersion" AS "NATIONALITY_CODE_SYSTEM_VERSION" , "Patient_$0"."StreetName" AS "STREET" , "Patient_$0"."StreetNumber" AS "STREET_NUMBER" , "Patient_$0"."PostOfficeBox" AS "POST_OFFICE_BOX" , "Patient_$0"."City" AS "CITY" , "Patient_$0"."PostalCode" AS "POSTCODE" , "Patient_$0"."State" AS "REGION" , "Patient_$0"."CountryValue" AS "COUNTRY" , "Patient_$0"."CountryCode" AS "COUNTRY_CODE" , "Patient_$0"."CountryVocabularyID" AS "COUNTRY_VOCABULARY_ID" , "Patient_$0"."CountryCodeSystem" AS "COUNTRY_CODE_SYSTEM" , "Patient_$0"."CountryCodeSystemVersion" AS "COUNTRY_CODE_SYSTEM_VERSION" , "Patient_$0"."Phone" AS "PHONE" , "Patient_$0"."Mobile" AS "MOBILE" , "Patient_$0"."Fax" AS "FAX" , "Patient_$0"."Email" AS "EMAIL" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.Patient" AS "Patient_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.PATIENT_TD" AS
SELECT "PatientTD_$0"."PatientID" AS "PATIENT_ID" , "PatientTD_$0"."SourcePatientID" AS "SOURCE_PATIENT_ID" , "PatientTD_$0"."Source" AS "SOURCE" , "PatientTD_$0"."OrgID" AS "ORG_ID" , "PatientTD_$0"."ValidFrom" AS "VALID_FROM" , "PatientTD_$0"."ValidTo" AS "VALID_TO" , "PatientTD_$0"."FamilyName" AS "LASTNAME" , "PatientTD_$0"."GivenName" AS "FIRSTNAME" , "PatientTD_$0"."TitleValue" AS "TITLE" , "PatientTD_$0"."TitleCode" AS "TITLE_CODE" , "PatientTD_$0"."TitleVocabularyID" AS "TITLE_VOCABULARY_ID" , "PatientTD_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM" , "PatientTD_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM_VERSION" , "PatientTD_$0"."GenderValue" AS "GENDER" , "PatientTD_$0"."GenderCode" AS "GENDER_CODE" , "PatientTD_$0"."GenderVocabularyID" AS "GENDER_VOCABULARY_ID" , "PatientTD_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM" , "PatientTD_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM_VERSION" , "PatientTD_$0"."BirthDate" AS "DOB" , "PatientTD_$0"."MultipleBirthOrder" AS "MULTIPLE_BIRTH_ORDER" , "PatientTD_$0"."DeceasedDate" AS "DOD" , "PatientTD_$0"."MaritalStatusValue" AS "MARITAL_STATUS" , "PatientTD_$0"."MaritalStatusCode" AS "MARITAL_STATUS_CODE" , "PatientTD_$0"."MaritalStatusVocabularyID" AS "MARITAL_STATUS_VOCABULARY_ID" , "PatientTD_$0"."MaritalStatusCodeSystem" AS "MARITAL_STATUS_CODE_SYSTEM" , "PatientTD_$0"."MaritalStatusCodeSystemVersion" AS "MARITAL_STATUS_CODE_SYSTEM_VERSION" , "PatientTD_$0"."NationalityValue" AS "NATIONALITY" , "PatientTD_$0"."NationalityCode" AS "NATIONALITY_CODE" , "PatientTD_$0"."NationalityVocabularyID" AS "NATIONALITY_VOCABULARY_ID" , "PatientTD_$0"."NationalityCodeSystem" AS "NATIONALITY_CODE_SYSTEM" , "PatientTD_$0"."NationalityCodeSystemVersion" AS "NATIONALITY_CODE_SYSTEM_VERSION" , "PatientTD_$0"."StreetName" AS "STREET" , "PatientTD_$0"."StreetNumber" AS "STREET_NUMBER" , "PatientTD_$0"."PostOfficeBox" AS "POST_OFFICE_BOX" , "PatientTD_$0"."City" AS "CITY" , "PatientTD_$0"."PostalCode" AS "POSTCODE" , "PatientTD_$0"."State" AS "REGION" , "PatientTD_$0"."CountryValue" AS "COUNTRY" , "PatientTD_$0"."CountryCode" AS "COUNTRY_CODE" , "PatientTD_$0"."CountryVocabularyID" AS "COUNTRY_VOCABULARY_ID" , "PatientTD_$0"."CountryCodeSystem" AS "COUNTRY_CODE_SYSTEM" , "PatientTD_$0"."CountryCodeSystemVersion" AS "COUNTRY_CODE_SYSTEM_VERSION" , "PatientTD_$0"."Phone" AS "PHONE" , "PatientTD_$0"."Mobile" AS "MOBILE" , "PatientTD_$0"."Fax" AS "FAX" , "PatientTD_$0"."Email" AS "EMAIL" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.PatientTD" AS "PatientTD_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.cdw.db.models::InterfaceViews.PRACTITIONER" AS
SELECT "PractitionerTD_$0"."PractitionerID" AS "PRACTITIONER_ID" , "PractitionerTD_$0"."SourcePractitionerID" AS "SOURCE_PRACTITIONER_ID" , "PractitionerTD_$0"."Source" AS "SOURCE" , "PractitionerTD_$0"."OrgID" AS "ORG_ID" , "PractitionerTD_$0"."FamilyName" AS "LASTNAME" , "PractitionerTD_$0"."GivenName" AS "FIRSTNAME" , "PractitionerTD_$0"."TitleValue" AS "TITLE" , "PractitionerTD_$0"."TitleCode" AS "TITLE_CODE" , "PractitionerTD_$0"."TitleVocabularyID" AS "TITLE_VOCABULARY_ID" , "PractitionerTD_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM" , "PractitionerTD_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."GenderValue" AS "GENDER" , "PractitionerTD_$0"."GenderCode" AS "GENDER_CODE" , "PractitionerTD_$0"."GenderVocabularyID" AS "GENDER_VOCABULARY_ID" , "PractitionerTD_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM" , "PractitionerTD_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."BirthDate" AS "DOB" , "PractitionerTD_$0"."MaritalStatusValue" AS "MARITAL_STATUS" , "PractitionerTD_$0"."MaritalStatusCode" AS "MARITAL_STATUS_CODE" , "PractitionerTD_$0"."MaritalStatusVocabularyID" AS "MARITAL_STATUS_VOCABULARY_ID" , "PractitionerTD_$0"."MaritalStatusCodeSystem" AS "MARITAL_STATUS_CODE_SYSTEM" , "PractitionerTD_$0"."MaritalStatusCodeSystemVersion" AS "MARITAL_STATUS_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."NationalityValue" AS "NATIONALITY" , "PractitionerTD_$0"."NationalityCode" AS "NATIONALITY_CODE" , "PractitionerTD_$0"."NationalityVocabularyID" AS "NATIONALITY_VOCABULARY_ID" , "PractitionerTD_$0"."NationalityCodeSystem" AS "NATIONALITY_CODE_SYSTEM" , "PractitionerTD_$0"."NationalityCodeSystemVersion" AS "NATIONALITY_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."RoleValue" AS "ROLE" , "PractitionerTD_$0"."RoleCode" AS "ROLE_CODE" , "PractitionerTD_$0"."RoleVocabularyID" AS "ROLE_VOCABULARY_ID" , "PractitionerTD_$0"."RoleCodeSystem" AS "ROLE_CODE_SYSTEM" , "PractitionerTD_$0"."RoleCodeSystemVersion" AS "ROLE_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."SpecialityValue" AS "SPECIALITY" , "PractitionerTD_$0"."SpecialityCode" AS "SPECIALITY_CODE" , "PractitionerTD_$0"."SpecialityVocabularyID" AS "SPECIALITY_VOCABULARY_ID" , "PractitionerTD_$0"."SpecialityCodeSystem" AS "SPECIALITY_CODE_SYSTEM" , "PractitionerTD_$0"."SpecialityCodeSystemVersion" AS "SPECIALITY_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."PreferredLanguage" AS "LANGUAGE" , "PractitionerTD_$0"."StreetName" AS "STREET" , "PractitionerTD_$0"."StreetNumber" AS "STREET_NUMBER" , "PractitionerTD_$0"."PostOfficeBox" AS "POST_OFFICE_BOX" , "PractitionerTD_$0"."City" AS "CITY" , "PractitionerTD_$0"."PostalCode" AS "POSTCODE" , "PractitionerTD_$0"."State" AS "REGION" , "PractitionerTD_$0"."CountryValue" AS "COUNTRY" , "PractitionerTD_$0"."CountryCode" AS "COUNTRY_CODE" , "PractitionerTD_$0"."CountryVocabularyID" AS "COUNTRY_VOCABULARY_ID" , "PractitionerTD_$0"."CountryCodeSystem" AS "COUNTRY_CODE_SYSTEM" , "PractitionerTD_$0"."CountryCodeSystemVersion" AS "COUNTRY_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."Phone" AS "PHONE" , "PractitionerTD_$0"."Mobile" AS "MOBILE" , "PractitionerTD_$0"."Fax" AS "FAX" , "PractitionerTD_$0"."Email" AS "EMAIL" FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::DWViews.PractitionerTD" AS "PractitionerTD_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.AllCollectionComments" AS
SELECT "Comment_$0"."Id" , "Comment_$0"."Collection.Id" AS "CollectionId" , "Comment_$0"."Item.Id" AS "ItemId" , "Comment_$0"."Text" , "Comment_$0"."Type" , "Comment_$0"."CreatedBy" , "Comment_$0"."CreatedAt" FROM HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Comment" AS "Comment_$0" WHERE  ( "Comment_$0"."Item.Id" = '' );

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.AllItemComments" AS
SELECT "Comment_$0"."Id" , "Comment_$0"."Collection.Id" AS "CollectionId" , "Comment_$0"."Item.Id" AS "ItemId" , "Comment_$0"."Text" , "Comment_$0"."Type" , "Comment_$0"."CreatedBy" , "Comment_$0"."CreatedAt" FROM HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Comment" AS "Comment_$0" WHERE  ( "Comment_$0"."Item.Id" != '' );

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.AllItems" AS
SELECT "Item_$0"."Id" , "Item_$0"."ItemType" , "Item_$0"."Collection.Id" AS "CollectionId" , "Item_$0"."CreatedBy" , "Item_$0"."CreatedAt" , "Item_$0"."ChangedBy" , "Item_$0"."ChangedAt" , "Item_$0"."Status.Id" AS "StatusId" FROM HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Item" AS "Item_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.AllMyCollections" AS
SELECT "Collection_$0"."Id" , "Collection_$0"."Type.Id" AS "CollectionType" , "Collection_$0"."Title" , "Collection_$0"."Description" , "Collection_$0"."CreatedBy" , "Collection_$0"."CreatedAt" , "Collection_$0"."ChangedBy" , "Collection_$0"."ChangedAt" FROM  ( HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Collection" AS "Collection_$0" LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Participant" AS "Participant_$1" ON  ( "Participant_$1"."Collection.Id" = "Collection_$0"."Id" )  )  WHERE  (  ( SESSION_CONTEXT ( 'XS_APPLICATIONUSER' )  = "Participant_$1"."HANAUserName" )  AND  ( "Collection_$0"."Type.Id" = '1' )  );

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.IncludedPatientIds" AS
SELECT  COUNT  ( "Item_$0"."Status.Id" )  AS "IncludedCount" , "Item_$0"."Collection.Id" AS "CollectionId" FROM HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Item" AS "Item_$0" WHERE  (  ( "Item_$0"."ItemType" = 'legacy.tax.Patient' )  AND  ( "Item_$0"."Status.Id" = '2' )  )  GROUP BY "Item_$0"."Collection.Id";

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.ItemIds" AS
SELECT  COUNT  ( "Item_$0"."Id" )  AS "ItemCount" , "Item_$0"."Collection.Id" AS "CollectionId" FROM HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Item" AS "Item_$0" GROUP BY "Item_$0"."Collection.Id";

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.NoteIds" AS
SELECT  COUNT  ( "AllCollectionComments_$0"."Id" )  AS "NoteCount" , "AllCollectionComments_$0"."CollectionId" AS "CollectionId" FROM HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.AllCollectionComments" AS "AllCollectionComments_$0" GROUP BY "AllCollectionComments_$0"."CollectionId";

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.ParticipantIds" AS
SELECT  COUNT  ( "Participant_$0"."HANAUserName" )  AS "ParticipantCount" , "Participant_$0"."Collection.Id" AS "CollectionId" FROM HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Participant" AS "Participant_$0" GROUP BY "Participant_$0"."Collection.Id";

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.AllMyCollections2" AS
SELECT
	"Collection_$0"."Id" ,
	"Collection_$0"."Type.Id" AS "CollectionType" ,
	"Collection_$0"."Title" ,
	"Collection_$0"."Description" ,
	"Collection_$0"."CreatedBy" ,
	"Collection_$0"."CreatedAt" ,
	"Collection_$0"."ChangedBy" ,
	"Collection_$0"."ChangedAt" ,
	"Participant_$4"."Privilege.Id" AS "PrivilegeId" ,
	"ParticipantIds_$5"."ParticipantCount" ,
	"ItemIds_$2"."ItemCount" AS "ItemCount" ,
	"IncludedPatientIds_$1"."IncludedCount" AS "IncludedCount" ,
	"NoteIds_$3"."NoteCount" AS "NoteCount"
FROM
	( ( ( ( ( HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Collection" AS "Collection_$0"
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.IncludedPatientIds" AS "IncludedPatientIds_$1" ON
	( "IncludedPatientIds_$1"."CollectionId" = "Collection_$0"."Id" ) )
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.ItemIds" AS "ItemIds_$2" ON
	( "ItemIds_$2"."CollectionId" = "Collection_$0"."Id" ) )
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.NoteIds" AS "NoteIds_$3" ON
	( "NoteIds_$3"."CollectionId" = "Collection_$0"."Id" ) )
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Participant" AS "Participant_$4" ON
	( "Participant_$4"."Collection.Id" = "Collection_$0"."Id" ) )
LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.ParticipantIds" AS "ParticipantIds_$5" ON
	( "ParticipantIds_$5"."CollectionId" = "Collection_$0"."Id" ) )
WHERE
	( ( SESSION_CONTEXT ('XS_APPLICATIONUSER') = "Participant_$4"."HANAUserName" )
		AND ( "Collection_$0"."Type.Id" = '1' ) );

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.AllParticipants" AS
SELECT "Participant_$0"."Collection.Id" AS "CollectionId" , "Participant_$0"."Privilege.Id" AS "PrivilegeId" , "Participant_$0"."HANAUserName" , ' ' AS "CreatorFirstName" , ' ' AS "CreatorLastName" , ' ' AS "CreatorDefaultEMailAddress" , ' ' AS "CreatorDefaultHomepageURL" FROM HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Participant" AS "Participant_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.AllPrivileges" AS
SELECT "ParticipantPrivilege_$0"."Id" , "ParticipantPrivilege_$0"."Title" FROM HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.ParticipantPrivilege" AS "ParticipantPrivilege_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.CollectionItemsByStatus" AS
SELECT "Item_$0"."Collection.Id" AS "CollectionId" , "Item_$0"."Status.Id" AS "StatusId" ,  COUNT  ( "Item_$0"."Id" )  AS "ItemCount" FROM HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Item" AS "Item_$0" GROUP BY "Item_$0"."Status.Id" , "Item_$0"."Collection.Id";

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.CollectionStatusConfiguration" AS
SELECT "StatusConfiguration_$0"."Id" , "StatusConfiguration_$0"."CollectionType.Id" AS "CollectionTypeId" , "StatusConfiguration_$0"."IconSource" , "StatusConfiguration_$0"."TextKey" FROM HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.StatusConfiguration" AS "StatusConfiguration_$0" WHERE  ( "StatusConfiguration_$0"."ItemType" = 'legacy.tax.Patient' );

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.ItemNoteIds" AS
SELECT  COUNT  ( "AllItemComments_$0"."Id" )  AS "NoteCount" , "AllItemComments_$0"."ItemId" , "AllItemComments_$0"."CollectionId" AS "CollectionId" FROM HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.AllItemComments" AS "AllItemComments_$0" GROUP BY "AllItemComments_$0"."CollectionId" , "AllItemComments_$0"."ItemId";

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.ItemsCollectionIds" AS
SELECT "Item_$0"."Id" ,  COUNT  ( "Item_$0"."Collection.Id" )  AS "CohortCount" FROM  ( HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Item" AS "Item_$0" LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Participant" AS "Participant_$1" ON  ( "Participant_$1"."Collection.Id" = "Item_$0"."Collection.Id" )  )  WHERE  ( SESSION_CONTEXT ( 'XS_APPLICATIONUSER' )  = "Participant_$1"."HANAUserName" )  GROUP BY "Item_$0"."Id";

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.PatientItems" AS
SELECT "Item_$0"."Id" , "Item_$0"."ItemType" , "Item_$0"."Collection.Id" AS "CollectionId" , "ItemNoteIds_$4"."NoteCount" AS "NoteCount" , "ItemsCollectionIds_$1"."CohortCount" AS "CohortCount" , "CollectionItemsByStatus_$2"."ItemCount" AS "ItemCount" , "ItemIds_$3"."ItemCount" AS "TotalCount" , "Item_$0"."CreatedBy" , "Item_$0"."CreatedAt" , "Item_$0"."ChangedBy" , "Item_$0"."ChangedAt" , "Item_$0"."Status.Id" AS "StatusId" FROM  (  (  (  ( HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Item" AS "Item_$0" LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.ItemsCollectionIds" AS "ItemsCollectionIds_$1" ON  ( "ItemsCollectionIds_$1"."Id" = "Item_$0"."Id" )  )  LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.CollectionItemsByStatus" AS "CollectionItemsByStatus_$2" ON  (  ( "CollectionItemsByStatus_$2"."CollectionId" = "Item_$0"."Collection.Id" )  AND  ( "CollectionItemsByStatus_$2"."StatusId" = "Item_$0"."Status.Id" )  )  )  LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.ItemIds" AS "ItemIds_$3" ON  ( "ItemIds_$3"."CollectionId" = "Item_$0"."Collection.Id" )  )  LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.ItemNoteIds" AS "ItemNoteIds_$4" ON  (  ( "ItemNoteIds_$4"."ItemId" = "Item_$0"."Id" )  AND  ( "ItemNoteIds_$4"."CollectionId" = "Item_$0"."Collection.Id" )  )  )  WHERE  ( "Item_$0"."ItemType" = 'legacy.tax.Patient' );

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.StatusCount" AS
SELECT "StatusConfiguration_$0"."Id" , "StatusConfiguration_$0"."TextKey" ,  COUNT  ( "StatusConfiguration_$0"."Items"."Id" )  AS "ItemsCount" , "StatusConfiguration_$0"."Items"."Collection.Id" AS "CollectionId" FROM HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.StatusConfiguration" AS "StatusConfiguration_$0" GROUP BY "StatusConfiguration_$0"."Id" , "StatusConfiguration_$0"."TextKey" , "StatusConfiguration_$0"."Items"."Collection.Id";

CREATE VIEW HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.UserCollections" AS
SELECT "Collection_$0"."Id" , "Collection_$0"."Type.Id" AS "CollectionType" , "Collection_$0"."Title" , "NoteIds_$3"."NoteCount" AS "NoteCount" , "Collection_$0"."Description" , "Collection_$0"."CreatedBy" , "Collection_$0"."CreatedAt" , "Collection_$0"."ChangedBy" , "Collection_$0"."ChangedAt" , "Participant_$4"."Privilege.Id" AS "PrivilegeId" , "ParticipantIds_$5"."ParticipantCount" AS "ParticipantCount" , "ItemIds_$2"."ItemCount" AS "PatientCount" , "ItemIds_$2"."ItemCount" AS "ItemCount" , "IncludedPatientIds_$1"."IncludedCount" AS "IncludedCount" FROM  (  (  (  (  ( HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Collection" AS "Collection_$0" LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.IncludedPatientIds" AS "IncludedPatientIds_$1" ON  ( "IncludedPatientIds_$1"."CollectionId" = "Collection_$0"."Id" )  )  LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.ItemIds" AS "ItemIds_$2" ON  ( "ItemIds_$2"."CollectionId" = "Collection_$0"."Id" )  )  LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.NoteIds" AS "NoteIds_$3" ON  ( "NoteIds_$3"."CollectionId" = "Collection_$0"."Id" )  )  LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.Participant" AS "Participant_$4" ON  ( "Participant_$4"."Collection.Id" = "Collection_$0"."Id" )  )  LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.collections.db.models::CollectionModel.ParticipantIds" AS "ParticipantIds_$5" ON  ( "ParticipantIds_$5"."CollectionId" = "Collection_$0"."Id" )  )  WHERE  ( SESSION_CONTEXT ( 'XS_APPLICATIONUSER' )  = "Participant_$4"."HANAUserName" );

CREATE VIEW HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.Assignment" AS
SELECT "AssignmentDetail_$0"."Header"."Id" AS "Id" , "AssignmentDetail_$0"."Header"."Name" AS "Name" , "AssignmentDetail_$0"."Header"."EntityType" AS "EntityType" , "AssignmentDetail_$0"."Header"."EntityValue" AS "EntityValue" , "AssignmentDetail_$0"."Header"."Creator" AS "Creator" , "AssignmentDetail_$0"."Header"."Created" AS "Created" , "AssignmentDetail_$0"."Header"."Modifier" AS "Modifier" , "AssignmentDetail_$0"."Header"."Modified" AS "Modified" , "AssignmentDetail_$0"."Config"."Id" AS "ConfigId" , "AssignmentDetail_$0"."Config"."Version" AS "ConfigVersion" , "AssignmentDetail_$0"."Config"."Type" AS "ConfigType" FROM HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.AssignmentDetail" AS "AssignmentDetail_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.DefaultConfig" AS
SELECT "UserDefaultConfig_$0"."User" , "UserDefaultConfig_$0"."ConfigType" , "UserDefaultConfig_$0"."Config"."Id" , "UserDefaultConfig_$0"."Config"."Version" , "UserDefaultConfig_$0"."Config"."Name" , "UserDefaultConfig_$0"."Config"."Data" FROM HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.UserDefaultConfig" AS "UserDefaultConfig_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.di.db.model::DataIntegration.AuditLogRuns" AS
SELECT "AuditLog_$0"."AuditLogID" , "AuditLog_$0"."ParentAuditLogID" , "AuditLog_$0"."ExtensionID" , "AuditLog_$0"."DocumentID" , "AuditLog_$0"."DocumentURI" , "AuditLog_$0"."SourceID" , "AuditLog_$0"."ProfileID" , "AuditLog_$0"."Status" , "AuditLog_$0"."StartTime" , "AuditLog_$0"."EndTime" , "AuditLog_$0"."ScheduleConfigID" , "AuditLog_$0"."MonitorID" FROM HTTPTEST_SCHEMA."legacy.di.db.model::DataIntegration.AuditLog" AS "AuditLog_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.di.db.model::DataIntegration.CompleteduditLogRuns" AS
SELECT "AuditLog_$0"."AuditLogID" , "AuditLog_$0"."ParentAuditLogID" , "AuditLog_$0"."ExtensionID" , "AuditLog_$0"."DocumentID" , "AuditLog_$0"."DocumentURI" , "AuditLog_$0"."SourceID" , "AuditLog_$0"."ProfileID" , "AuditLog_$0"."Status" , "AuditLog_$0"."StartTime" , "AuditLog_$0"."EndTime" , "AuditLog_$0"."ScheduleConfigID" , "AuditLog_$0"."MonitorID" FROM HTTPTEST_SCHEMA."legacy.di.db.model::DataIntegration.AuditLog" AS "AuditLog_$0" WHERE  ( "AuditLog_$0"."Status" = 'Completed' );

CREATE VIEW HTTPTEST_SCHEMA."legacy.di.db.model::DataIntegration.DWSources" AS
SELECT "DISource_$0"."SourceID" , "DISource_$0"."Name" , "DISource_$0"."Description" , "DISource_$0"."CreatedAt" , "DISource_$0"."CreatedBy" , "DISource_$0"."ModifiedAt" , "DISource_$0"."ModifiedBy" FROM HTTPTEST_SCHEMA."legacy.di.db.model::DataIntegration.DISource" AS "DISource_$0";

CREATE VIEW HTTPTEST_SCHEMA."legacy.di.db.model::DataIntegration.FailedAuditLogRuns" AS
SELECT "AuditLog_$0"."AuditLogID" , "AuditLog_$0"."ParentAuditLogID" , "AuditLog_$0"."ExtensionID" , "AuditLog_$0"."DocumentID" , "AuditLog_$0"."DocumentURI" , "AuditLog_$0"."SourceID" , "AuditLog_$0"."ProfileID" , "AuditLog_$0"."Status" , "AuditLog_$0"."StartTime" , "AuditLog_$0"."EndTime" , "AuditLog_$0"."ScheduleConfigID" , "AuditLog_$0"."MonitorID" FROM HTTPTEST_SCHEMA."legacy.di.db.model::DataIntegration.AuditLog" AS "AuditLog_$0" WHERE  ( "AuditLog_$0"."Status" = 'Failed' );

CREATE VIEW HTTPTEST_SCHEMA."legacy.di.db.model::DataIntegration.JobProfiles" AS
SELECT "JobProfile_$0"."ProfileID" , "JobProfile_$0"."ExtensionID" , "JobProfile_$0"."Name" AS "ProfileName" , "JobProfile_$0"."Description" AS "Description" , "JobProfile_$0"."SourceID" , "DISource_$1"."Name" AS "SourceName" , "DISource_$1"."Description" AS "SourceDescription" , "JobProfile_$0"."CreatedAt" , "JobProfile_$0"."CreatedBy" , "JobProfile_$0"."ModifiedAt" , "JobProfile_$0"."ModifiedBy" , "JobProfile_$0"."Status" , "JobProfile_$0"."ProfileJSONParams" , "JobProfile_$0"."AdditionalParams" FROM  ( HTTPTEST_SCHEMA."legacy.di.db.model::DataIntegration.JobProfile" AS "JobProfile_$0" LEFT OUTER JOIN HTTPTEST_SCHEMA."legacy.di.db.model::DataIntegration.DISource" AS "DISource_$1" ON  ( "JobProfile_$0"."SourceID" = "DISource_$1"."SourceID" )  );

CREATE VIEW HTTPTEST_SCHEMA."legacy.ots::Views.ConceptTranslation" AS
SELECT "ConceptTranslation_$0"."TypeVocabularyID" , "ConceptTranslation_$0"."TypeCode" , "ConceptTranslation_$0"."FromVocabularyID" , "ConceptTranslation_$0"."FromCode" , "ConceptTranslation_$0"."ToVocabularyID" , "ConceptTranslation_$0"."ToCode" FROM HTTPTEST_SCHEMA."legacy.ots.internal::Entities.ConceptTranslation" AS "ConceptTranslation_$0";

INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303030', 'ISH01', 1, '000000000');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303031', 'ISH01', 1, '000000001');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303032', 'ISH01', 1, '000000002');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303033', 'ISH01', 1, '000000003');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303034', 'ISH01', 1, '000000004');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303035', 'ISH01', 1, '000000005');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303036', 'ISH01', 1, '000000006');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303037', 'ISH01', 1, '000000007');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303038', 'ISH01', 1, '000000008');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303039', 'ISH01', 1, '000000009');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303130', 'ISH01', 1, '000000010');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303131', 'ISH01', 1, '000000011');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303132', 'ISH01', 1, '000000012');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303133', 'ISH01', 1, '000000013');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303134', 'ISH01', 1, '000000014');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303135', 'ISH01', 1, '000000015');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303136', 'ISH01', 1, '000000016');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303137', 'ISH01', 1, '000000017');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303138', 'ISH01', 1, '000000018');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303139', 'ISH01', 1, '000000019');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303230', 'ISH01', 1, '000000020');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303231', 'ISH01', 1, '000000021');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303232', 'ISH01', 1, '000000022');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303233', 'ISH01', 1, '000000023');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303234', 'ISH01', 1, '000000024');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303235', 'ISH01', 1, '000000025');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303236', 'ISH01', 1, '000000026');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303237', 'ISH01', 1, '000000027');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303238', 'ISH01', 1, '000000028');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303239', 'ISH01', 1, '000000029');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303330', 'ISH01', 1, '000000030');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303331', 'ISH01', 1, '000000031');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303332', 'ISH01', 1, '000000032');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303333', 'ISH01', 1, '000000033');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303334', 'ISH01', 1, '000000034');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303335', 'ISH01', 1, '000000035');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303336', 'ISH01', 1, '000000036');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303337', 'ISH01', 1, '000000037');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303338', 'ISH01', 1, '000000038');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303339', 'ISH01', 1, '000000039');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303430', 'ISH01', 1, '000000040');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303431', 'ISH01', 1, '000000041');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303432', 'ISH01', 1, '000000042');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303433', 'ISH01', 1, '000000043');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303434', 'ISH01', 1, '000000044');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303435', 'ISH01', 1, '000000045');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303436', 'ISH01', 1, '000000046');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303437', 'ISH01', 1, '000000047');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303438', 'ISH01', 1, '000000048');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303439', 'ISH01', 1, '000000049');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303530', 'ISH01', 1, '000000050');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303531', 'ISH01', 1, '000000051');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303532', 'ISH01', 1, '000000052');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303533', 'ISH01', 1, '000000053');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303534', 'ISH01', 1, '000000054');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303535', 'ISH01', 1, '000000055');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303536', 'ISH01', 1, '000000056');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303537', 'ISH01', 1, '000000057');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303538', 'ISH01', 1, '000000058');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303539', 'ISH01', 1, '000000059');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303630', 'ISH01', 1, '000000060');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303631', 'ISH01', 1, '000000061');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303632', 'ISH01', 1, '000000062');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303633', 'ISH01', 1, '000000063');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303634', 'ISH01', 1, '000000064');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303635', 'ISH01', 1, '000000065');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303636', 'ISH01', 1, '000000066');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303637', 'ISH01', 1, '000000067');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303638', 'ISH01', 1, '000000068');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303639', 'ISH01', 1, '000000069');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303730', 'ISH01', 1, '000000070');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303731', 'ISH01', 1, '000000071');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303732', 'ISH01', 1, '000000072');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303733', 'ISH01', 1, '000000073');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303734', 'ISH01', 1, '000000074');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303735', 'ISH01', 1, '000000075');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303736', 'ISH01', 1, '000000076');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303737', 'ISH01', 1, '000000077');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303738', 'ISH01', 1, '000000078');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303739', 'ISH01', 1, '000000079');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303830', 'ISH01', 1, '000000080');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303831', 'ISH01', 1, '000000081');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303832', 'ISH01', 1, '000000082');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303833', 'ISH01', 1, '000000083');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303834', 'ISH01', 1, '000000084');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303835', 'ISH01', 1, '000000085');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303836', 'ISH01', 1, '000000086');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303837', 'ISH01', 1, '000000087');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303838', 'ISH01', 1, '000000088');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303839', 'ISH01', 1, '000000089');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303930', 'ISH01', 1, '000000090');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303931', 'ISH01', 1, '000000091');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303932', 'ISH01', 1, '000000092');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303933', 'ISH01', 1, '000000093');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303934', 'ISH01', 1, '000000094');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303935', 'ISH01', 1, '000000095');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303936', 'ISH01', 1, '000000096');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303937', 'ISH01', 1, '000000097');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303938', 'ISH01', 1, '000000098');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" (DWID, "DWSource", "DWAuditID", "PatientID") VALUES(x'4953483031303030303030303939', 'ISH01', 1, '000000099');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314b6a75675537536376795673476f5a32', 'ISH01', 1, 'KjugU7ScvyVsGoZ2');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314c73436146796f54364c5777385a695a', 'ISH01', 1, 'LsCaFyoT6LWw8ZiZ');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830316250614a4343636656376d7376727576', 'ISH01', 1, 'bPaJCCcfV7msvruv');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303162786254667a766f3663566472466a38', 'ISH01', 1, 'bxbTfzvo6cVdrFj8');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303161755967336563615150793433784339', 'ISH01', 1, 'auYg3ecaQPy43xC9');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031773353374745654d435734377a444e6a', 'ISH01', 1, 'w3S7GEeMCW47zDNj');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314267793567724d47635442555261574b', 'ISH01', 1, 'Bgy5grMGcTBURaWK');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031475a326b4d344a46784e4a4e77656469', 'ISH01', 1, 'GZ2kM4JFxNJNwedi');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830316632434d466550736152516952663454', 'ISH01', 1, 'f2CMFePsaRQiRf4T');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830315956616d74574b55707370437a65366a', 'ISH01', 1, 'YVamtWKUpspCze6j');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031674c4569327059373866734879377251', 'ISH01', 1, 'gLEi2pY78fsHy7rQ');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031546f733958664d73483334675a777775', 'ISH01', 1, 'Tos9XfMsH34gZwwu');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303168666975655059446232414d6f694d64', 'ISH01', 1, 'hfiuePYDb2AMoiMd');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830315a4a564634435836514c523775567179', 'ISH01', 1, 'ZJVF4CX6QLR7uVqy');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031534b6a74766450796535366b35325158', 'ISH01', 1, 'SKjtvdPye56k52QX');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303133597750455333455357464645554a33', 'ISH01', 1, '3YwPES3ESWFFEUJ3');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314c6a69775371674b627472576233466f', 'ISH01', 1, 'LjiwSqgKbtrWb3Fo');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303152425a69675054576e5851563334697a', 'ISH01', 1, 'RBZigPTWnXQV34iz');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830316d59734658786155485a78326e70746b', 'ISH01', 1, 'mYsFXxaUHZx2nptk');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314457564e4d5964635533464362736f6f', 'ISH01', 1, 'DWVNMYdcU3FCbsoo');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314738644d354259424869544c56335152', 'ISH01', 1, 'G8dM5BYBHiTLV3QR');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830317558446370333341694269675a45796f', 'ISH01', 1, 'uXDcp33AiBigZEyo');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830316551614c64354b79734b724b776b5247', 'ISH01', 1, 'eQaLd5KysKrKwkRG');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031347078614273796958504d4467534437', 'ISH01', 1, '4pxaBsyiXPMDgSD7');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031574c737533444c7a6e4d456771774d74', 'ISH01', 1, 'WLsu3DLznMEgqwMt');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830317a466a364275456d63714e4d4a736378', 'ISH01', 1, 'zFj6BuEmcqNMJscx');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830315a373436736e714d646e506145364874', 'ISH01', 1, 'Z746snqMdnPaE6Ht');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303155486e71326737387434467a52384246', 'ISH01', 1, 'UHnq2g78t4FzR8BF');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031755079754a4756376634327a4a63544b', 'ISH01', 1, 'uPyuJGV7f42zJcTK');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830313845647959686647594b47364a7a5466', 'ISH01', 1, '8EdyYhfGYKG6JzTf');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830313433554c5074585a46334c39587a6743', 'ISH01', 1, '43ULPtXZF3L9XzgC');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830317978426b695559567657714e74755561', 'ISH01', 1, 'yxBkiUYVvWqNtuUa');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031766a56454c68427548754b7869575866', 'ISH01', 1, 'vjVELhBuHuKxiWXf');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830316436706a75436b356648457338587246', 'ISH01', 1, 'd6pjuCk5fHEs8XrF');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031673678336a33477041436850347a4134', 'ISH01', 1, 'g6x3j3GpAChP4zA4');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830316b756d73695545664c37547339625158', 'ISH01', 1, 'kumsiUEfL7Ts9bQX');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031476352335a413533423765577a777a46', 'ISH01', 1, 'GcR3ZA53B7eWzwzF');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303162646f69475358323452386a46374346', 'ISH01', 1, 'bdoiGSX24R8jF7CF');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031554b654575786a53586234525843376f', 'ISH01', 1, 'UKeEuxjSXb4RXC7o');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303176634a7a503368374b71673254525644', 'ISH01', 1, 'vcJzP3h7Kqg2TRVD');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314a5077366d436151556b513838367265', 'ISH01', 1, 'JPw6mCaQUkQ886re');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303133666e6a574e556f485856786f77714a', 'ISH01', 1, '3fnjWNUoHXVxowqJ');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031475367766270374e7a41523536757a65', 'ISH01', 1, 'GSgvbp7NzAR56uze');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303146676754583859786d37586947755569', 'ISH01', 1, 'FggTX8Yxm7XiGuUi');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830316e614154336274435856526977695578', 'ISH01', 1, 'naAT3btCXVRiwiUx');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031666d7245645167796532556974667032', 'ISH01', 1, 'fmrEdQgye2Uitfp2');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303163757437706d446b62436f3963534761', 'ISH01', 1, 'cut7pmDkbCo9cSGa');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031325671666d56674d485733366b426b6e', 'ISH01', 1, '2VqfmVgMHW36kBkn');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303167356d624b33735569746976516f5477', 'ISH01', 1, 'g5mbK3sUitivQoTw');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303153644b57504e6262756776727a674273', 'ISH01', 1, 'SdKWPNbbugvrzgBs');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031694571614a35727a376f52414a6d7334', 'ISH01', 1, 'iEqaJ5rz7oRAJms4');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314c7479577a4b3663334452634134734b', 'ISH01', 1, 'LtyWzK6c3DRcA4sK');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314b646a72743663675743553777735a4b', 'ISH01', 1, 'Kdjrt6cgWCU7wsZK');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031424b703434644859554d7a4452446548', 'ISH01', 1, 'BKp44dHYUMzDRDeH');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314e6b4c5a753735466d64464c43553468', 'ISH01', 1, 'NkLZu75FmdFLCU4h');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314a796e527764704a43543950784c3234', 'ISH01', 1, 'JynRwdpJCT9PxL24');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314435354267413456477a38596e527a56', 'ISH01', 1, 'D55BgA4VGz8YnRzV');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303157334746444673413476617a5175666f', 'ISH01', 1, 'W3GFDFsA4vazQufo');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830317375764d666f65705966684876783679', 'ISH01', 1, 'suvMfoepYfhHvx6y');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830316d426f3964393273444579734a785967', 'ISH01', 1, 'mBo9d92sDEysJxYg');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303141354b6332674d4b70564c5669357933', 'ISH01', 1, 'A5Kc2gMKpVLVi5y3');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830316b72336e4e6132344378446d76774d4e', 'ISH01', 1, 'kr3nNa24CxDmvwMN');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031733477374d63764d765a4b4c43364168', 'ISH01', 1, 's4w7McvMvZKLC6Ah');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031627154533576335771396a78646e3853', 'ISH01', 1, 'bqTS5v3Wq9jxdn8S');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031547a727954566a564a5241507a786457', 'ISH01', 1, 'TzryTVjVJRAPzxdW');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830316f68724d376f6f543744654a78624466', 'ISH01', 1, 'ohrM7ooT7DeJxbDf');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303179334e634b6237745838664b44563944', 'ISH01', 1, 'y3NcKb7tX8fKDV9D');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031644b5051397a35536b51794679746774', 'ISH01', 1, 'dKPQ9z5SkQyFytgt');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830316f58556952366b48566e423339624e47', 'ISH01', 1, 'oXUiR6kHVnB39bNG');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314752746348565641504b6f4c66797650', 'ISH01', 1, 'GRtcHVVAPKoLfyvP');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303151566f774a325435336e38694e777235', 'ISH01', 1, 'QVowJ2T53n8iNwr5');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303163536e705755374e4164634164373865', 'ISH01', 1, 'cSnpWU7NAdcAd78e');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303164683971366475757454686f39777554', 'ISH01', 1, 'dh9q6duutTho9wuT');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314869356f794a77367248795376333670', 'ISH01', 1, 'Hi5oyJw6rHySv36p');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031334250347a6d78684d366a385a555736', 'ISH01', 1, '3BP4zmxhM6j8ZUW6');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830313358414a4161514545617552424c4661', 'ISH01', 1, '3XAJAaQEEauRBLFa');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031434c5054517a5a6669656f5066794264', 'ISH01', 1, 'CLPTQzZfieoPfyBd');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031346d3869374e33596e4561764a556a73', 'ISH01', 1, '4m8i7N3YnEavJUjs');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303138387a34766b676a664a5444726e6e45', 'ISH01', 1, '88z4vkgjfJTDrnnE');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830316f6b7a69676e3762334e387833767853', 'ISH01', 1, 'okzign7b3N8x3vxS');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303139323532713662483952437950626164', 'ISH01', 1, '9252q6bH9RCyPbad');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303139744354706178705838625673596870', 'ISH01', 1, '9tCTpaxpX8bVsYhp');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303175417673724d473950724e324b36646d', 'ISH01', 1, 'uAvsrMG9PrN2K6dm');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031503975715878586e564e7a716273666f', 'ISH01', 1, 'P9uqXxXnVNzqbsfo');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303138636a415738686e367966394e426a76', 'ISH01', 1, '8cjAW8hn6yf9NBjv');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303164546f616a796475483274337a543548', 'ISH01', 1, 'dToajyduH2t3zT5H');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031416755523359713754327a7967563638', 'ISH01', 1, 'AgUR3Yq7T2zygV68');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830315347594d5a74547969346b6664327457', 'ISH01', 1, 'SGYMZtTyi4kfd2tW');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830317934724a41384b70436265505a353544', 'ISH01', 1, 'y4rJA8KpCbePZ55D');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830314b6f68466158736a4a7938526d415634', 'ISH01', 1, 'KohFaXsjJy8RmAV4');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031676d61734b6862625571775666356865', 'ISH01', 1, 'gmasKhbbUqwVf5he');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303133554238356d3947517336545a747073', 'ISH01', 1, '3UB85m9GQs6TZtps');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303141434646566247325250617868586467', 'ISH01', 1, 'ACFFVbG2RPaxhXdg');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031736f51513765353544424d343241374e', 'ISH01', 1, 'soQQ7e55DBM42A7N');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830315038477a356450664d68576675624135', 'ISH01', 1, 'P8Gz5dPfMhWfubA5');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830316a744a4e74396d376869787257444159', 'ISH01', 1, 'jtJNt9m7hixrWDAY');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303146324d48535071744251426679446d4b', 'ISH01', 1, 'F2MHSPqtBQBfyDmK');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'49534830315346525452624a373638584e70576979', 'ISH01', 1, 'SFRTRbJ768XNpWiy');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'4953483031626e506b374a676a533648444a704474', 'ISH01', 1, 'bnPk7JgjS6HDJpDt');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" (DWID, "DWSource", "DWAuditID", "InteractionID") VALUES(x'495348303153753863386175443236593236577652', 'ISH01', 1, 'Su8c8auD26Y26WvR');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830313851443478454144505a417a7a415267', 'ISH01', 1, '8QD4xEADPZAzzARg');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830315a3636654a6f577341576f3678426e7a', 'ISH01', 1, 'Z66eJoWsAWo6xBnz');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031734b6556597636704b656f6651713765', 'ISH01', 1, 'sKeVYv6pKeofQq7e');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303159726f644b46554648783870504e4c36', 'ISH01', 1, 'YrodKFUFHx8pPNL6');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830315a325262336465356455674e696b3335', 'ISH01', 1, 'Z2Rb3de5dUgNik35');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830317338706e745a7444674c746e55593333', 'ISH01', 1, 's8pntZtDgLtnUY33');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031684a776662325a47675570656f4d656b', 'ISH01', 1, 'hJwfb2ZGgUpeoMek');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314d7273687978585942717756686a6a42', 'ISH01', 1, 'MrshyxXYBqwVhjjB');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303143437645505a4e663653626463486579', 'ISH01', 1, 'CCvEPZNf6SbdcHey');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314233785941593359797368474e426e59', 'ISH01', 1, 'B3xYAY3YyshGNBnY');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303162437954366357554138625439546a69', 'ISH01', 1, 'bCyT6cWUA8bT9Tji');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031514e454454386a6963334e5337796d57', 'ISH01', 1, 'QNEDT8jic3NS7ymW');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830315163794e416139365a683554696d5074', 'ISH01', 1, 'QcyNAa96Zh5TimPt');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303174556b685853665a484e646444637373', 'ISH01', 1, 'tUkhXSfZHNddDcss');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031514a5336337a6d6a46475a4655774e4d', 'ISH01', 1, 'QJS63zmjFGZFUwNM');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830313974524653795a6476786d5262756e62', 'ISH01', 1, '9tRFSyZdvxmRbunb');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031506a613269756f7575596e50374e4b77', 'ISH01', 1, 'Pja2iuouuYnP7NKw');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314264474b546b3854466770486a554548', 'ISH01', 1, 'BdGKTk8TFgpHjUEH');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316f63326e625346546848397454367438', 'ISH01', 1, 'oc2nbSFThH9tT6t8');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314e473441444673484763764a6d505a62', 'ISH01', 1, 'NG4ADFsHGcvJmPZb');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303159744641733552527450615756555562', 'ISH01', 1, 'YtFAs5RRtPaWVUUb');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303165676a4b556f6a344d42695151455469', 'ISH01', 1, 'egjKUoj4MBiQQETi');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031765a634e7a6d4b4e6258584361696d54', 'ISH01', 1, 'vZcNzmKNbXXCaimT');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303157595632487a71556b45485868335575', 'ISH01', 1, 'WYV2HzqUkEHXh3Uu');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303133516b69614847396533396954325376', 'ISH01', 1, '3QkiaHG9e39iT2Sv');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031575356357241557758734755504c5054', 'ISH01', 1, 'WSV5rAUwXsGUPLPT');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830317937675952344e4c4e624e4a48795179', 'ISH01', 1, 'y7gYR4NLNbNJHyQy');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314e4a6737487450795171553761457668', 'ISH01', 1, 'NJg7HtPyQqU7aEvh');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031575a783763576a794b68585a3570794e', 'ISH01', 1, 'WZx7cWjyKhXZ5pyN');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830313559465a5746396267685762334b6f50', 'ISH01', 1, '5YFZWF9bghWb3KoP');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830317138644c5a714778366159465a555469', 'ISH01', 1, 'q8dLZqGx6aYFZUTi');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031506e4173446742545336685668595a58', 'ISH01', 1, 'PnAsDgBTS6hVhYZX');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031376d794e713938627761464176697a48', 'ISH01', 1, '7myNq98bwaFAvizH');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303136367756435164487667514e387a4b77', 'ISH01', 1, '66wVCQdHvgQN8zKw');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316464364176797273764c44434d39516a', 'ISH01', 1, 'dd6AvyrsvLDCM9Qj');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031414b6965535767723458336d5776686e', 'ISH01', 1, 'AKieSWgr4X3mWvhn');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830315871746e65515155726a3746354b7164', 'ISH01', 1, 'XqtneQQUrj7F5Kqd');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316b645633323673523570564d5144336e', 'ISH01', 1, 'kdV326sR5pVMQD3n');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316b57484c6a79765465554771644c4168', 'ISH01', 1, 'kWHLjyvTeUGqdLAh');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316e34743534756655466a41766e6d7a79', 'ISH01', 1, 'n4t54ufUFjAvnmzy');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830315638446b383842583368616d6e6a584b', 'ISH01', 1, 'V8Dk88BX3hamnjXK');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031396a68796d476d7a4d32504a43343973', 'ISH01', 1, '9jhymGmzM2PJC49s');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031765055655839484444375145724c7870', 'ISH01', 1, 'vPUeX9HDD7QErLxp');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303132775276703934336e6f45384e6f6b73', 'ISH01', 1, '2wRvp943noE8Noks');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316d71323273644c394c4d575444364439', 'ISH01', 1, 'mq22sdL9LMWTD6D9');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303138466a65674a746e56724b595879774d', 'ISH01', 1, '8FjegJtnVrKYXywM');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314a747467344b42573435377363737761', 'ISH01', 1, 'Jttg4KBW457scswa');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303143373957787739715974586a50574e71', 'ISH01', 1, 'C79Wxw9qYtXjPWNq');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031635575365844507a583565456e445069', 'ISH01', 1, 'cUu6XDPzX5eEnDPi');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303169677742464c367764385637784e326b', 'ISH01', 1, 'igwBFL6wd8V7xN2k');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830317947465238364d566273615932325748', 'ISH01', 1, 'yGFR86MVbsaY22WH');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303171413471796b35756874666875524342', 'ISH01', 1, 'qA4qyk5uhtfhuRCB');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316b6668354e4365466e337350346b5439', 'ISH01', 1, 'kfh5NCeFn3sP4kT9');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303168433337777a486a4663515a75737771', 'ISH01', 1, 'hC37wzHjFcQZuswq');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314542334366354661414c4667387a6369', 'ISH01', 1, 'EB3Cf5FaALFg8zci');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303143626557374d4c67724c684a77705a54', 'ISH01', 1, 'CbeW7MLgrLhJwpZT');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031364d6b3346324c4c56435a386e715274', 'ISH01', 1, '6Mk3F2LLVCZ8nqRt');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830315a655439754573505a644e7a72504d74', 'ISH01', 1, 'ZeT9uEsPZdNzrPMt');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314667696742735738443941586b68797a', 'ISH01', 1, 'FgigBsW8D9AXkhyz');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830317365766662357546453464506670776f', 'ISH01', 1, 'sevfb5uFE4dPfpwo');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303150356d7a5575615071354e68365a5145', 'ISH01', 1, 'P5mzUuaPq5Nh6ZQE');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303139614856646e55414c524d447a4d3247', 'ISH01', 1, '9aHVdnUALRMDzM2G');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316a55344d764137543376714173796d6e', 'ISH01', 1, 'jU4MvA7T3vqAsymn');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031784367344856356e746963596f615267', 'ISH01', 1, 'xCg4HV5nticYoaRg');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316f676f4c466f4b4573416f6a36346747', 'ISH01', 1, 'ogoLFoKEsAoj64gG');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316354374b79466965536d61517655707a', 'ISH01', 1, 'cT7KyFieSmaQvUpz');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830317178646a5a6d714475536d5378414533', 'ISH01', 1, 'qxdjZmqDuSmSxAE3');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031394152513934636758704c4170567071', 'ISH01', 1, '9ARQ94cgXpLApVpq');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314a66476e716178477934614338485032', 'ISH01', 1, 'JfGnqaxGy4aC8HP2');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830313656596e4171486b76623267536a6e38', 'ISH01', 1, '6VYnAqHkvb2gSjn8');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031657663646d4272626541585244777255', 'ISH01', 1, 'evcdmBrbeAXRDwrU');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316a6a666b3665555144656e6635346666', 'ISH01', 1, 'jjfk6eUQDenf54ff');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303134747a7463354b4a5376774259747a59', 'ISH01', 1, '4tztc5KJSvwBYtzY');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830315045516d4136474b7578704a34786379', 'ISH01', 1, 'PEQmA6GKuxpJ4xcy');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303135663636596853736138347567704d58', 'ISH01', 1, '5f66YhSsa84ugpMX');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830315a647162444637546f79664571655671', 'ISH01', 1, 'ZdqbDF7ToyfEqeVq');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316944723763744b556632446f78394134', 'ISH01', 1, 'iDr7ctKUf2Dox9A4');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830317652776944467737796577433477594a', 'ISH01', 1, 'vRwiDFw7yewC4wYJ');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314168646650514635584c50386d613754', 'ISH01', 1, 'AhdfPQF5XLP8ma7T');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316a46335a34664b686b77585643473479', 'ISH01', 1, 'jF3Z4fKhkwXVCG4y');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303142384b5333646f6156714e3947733952', 'ISH01', 1, 'B8KS3doaVqN9Gs9R');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830317565534b48375262684b414e786a7a62', 'ISH01', 1, 'ueSKH7RbhKANxjzb');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031337576466d5542485448476354767238', 'ISH01', 1, '3uvFmUBHTHGcTvr8');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031474b4471644e656e5032567245365871', 'ISH01', 1, 'GKDqdNenP2VrE6Xq');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830313755416d34715a58594854424e62634c', 'ISH01', 1, '7UAm4qZXYHTBNbcL');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314d5842736759574d555833696b333969', 'ISH01', 1, 'MXBsgYWMUX3ik39i');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303141687a4e625a5a62767374686d6d6b68', 'ISH01', 1, 'AhzNbZZbvsthmmkh');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031644b7045366a65434d52445a53616d43', 'ISH01', 1, 'dKpE6jeCMRDZSamC');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314e666b55797956346e58336a63796352', 'ISH01', 1, 'NfkUyyV4nX3jcycR');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031426a714d614432454170364453764a4b', 'ISH01', 1, 'BjqMaD2EAp6DSvJK');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'495348303161456566574e7a786d56664334476378', 'ISH01', 1, 'aEefWNzxmVfC4Gcx');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314a576865464e746f4c72326772786e47', 'ISH01', 1, 'JWheFNtoLr2grxnG');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316146336b4c325a69364b7462356d4751', 'ISH01', 1, 'aF3kL2Zi6Ktb5mGQ');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830317935356852444c774564584d55653764', 'ISH01', 1, 'y55hRDLwEdXMUe7d');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031546f5768566178634c72564b62734d75', 'ISH01', 1, 'ToWhVaxcLrVKbsMu');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031505045336f447774386f716b44416d58', 'ISH01', 1, 'PPE3oDwt8oqkDAmX');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316e46706e374a68366748387444786256', 'ISH01', 1, 'nFpn7Jh6gH8tDxbV');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830316132594a5a786b5666587a426a417466', 'ISH01', 1, 'a2YJZxkVfXzBjAtf');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'4953483031376f6933615673424271465339467239', 'ISH01', 1, '7oi3aVsBBqFS9Fr9');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" (DWID, "DWSource", "DWAuditID", "ObsID") VALUES(x'49534830314469656f6e6178504c65434c34625952', 'ISH01', 1, 'DieonaxPLeCL4bYR');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303030', '', 1, '1900-01-01', '', 'Martin', 'Jacquie', '', '', '', '', 'W', '', '', '', '1936-12-24', 1, '2016-11-17', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303031', '', 1, '1900-01-01', '', 'Andrews', 'Caroline', '', '', '', '', 'W', '', '', '', '1954-12-11', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303032', '', 1, '1900-01-01', '', 'Snyder', 'Alejandra', '', '', '', '', 'W', '', '', '', '1939-07-18', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303033', '', 1, '1900-01-01', '', 'Ware', 'Denise', '', '', '', '', 'W', '', '', '', '1933-11-12', 1, '2016-11-20', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303034', '', 1, '1900-01-01', '', 'Lenoir', 'Aaron', '', '', '', '', 'M', '', '', '', '1957-10-21', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303035', '', 1, '1900-01-01', '', 'Portillo', 'Kevin', '', '', '', '', 'M', '', '', '', '1937-03-20', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303036', '', 1, '1900-01-01', '', 'Johnston', 'Latasha', '', '', '', '', 'W', '', '', '', '1962-07-21', 1, '2016-11-18', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303037', '', 1, '1900-01-01', '', 'Toft', 'David', '', '', '', '', 'M', '', '', '', '1962-12-11', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303038', '', 1, '1900-01-01', '', 'Boudreau', 'Anne', '', '', '', '', 'W', '', '', '', '1943-04-08', 1, '2016-11-11', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303039', '', 1, '1900-01-01', '', 'Chavez', 'John', '', '', '', '', 'M', '', '', '', '1949-02-10', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303130', '', 1, '1900-01-01', '', 'Brooks', 'Keith', '', '', '', '', 'M', '', '', '', '1957-04-14', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303131', '', 1, '1900-01-01', '', 'Hunter', 'Hilda', '', '', '', '', 'W', '', '', '', '1930-12-18', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303132', '', 1, '1900-01-01', '', 'Mobilia', 'David', '', '', '', '', 'M', '', '', '', '1951-10-26', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303133', '', 1, '1900-01-01', '', 'Francis', 'Robert', '', '', '', '', 'M', '', '', '', '1943-04-11', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303134', '', 1, '1900-01-01', '', 'Jones', 'Patrick', '', '', '', '', 'M', '', '', '', '1950-10-20', 1, '2016-11-14', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303135', '', 1, '1900-01-01', '', 'Robinson', 'Lori', '', '', '', '', 'W', '', '', '', '1958-11-15', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303136', '', 1, '1900-01-01', '', 'Sumney', 'Sarah', '', '', '', '', 'W', '', '', '', '1950-11-22', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303137', '', 1, '1900-01-01', '', 'Fuller', 'John', '', '', '', '', 'M', '', '', '', '1952-12-30', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303138', '', 1, '1900-01-01', '', 'Smith', 'Jackie', '', '', '', '', 'W', '', '', '', '1930-03-28', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303139', '', 1, '1900-01-01', '', 'Webber', 'Thomas', '', '', '', '', 'M', '', '', '', '1960-01-26', 1, '2016-11-15', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303230', '', 1, '1900-01-01', '', 'Nelson', 'Mary', '', '', '', '', 'W', '', '', '', '1960-04-25', 1, '2016-11-03', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303231', '', 1, '1900-01-01', '', 'Patterson', 'Ryan', '', '', '', '', 'M', '', '', '', '1936-01-16', 1, '2016-11-08', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303232', '', 1, '1900-01-01', '', 'Davis', 'Debbie', '', '', '', '', 'W', '', '', '', '1932-01-18', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303233', '', 1, '1900-01-01', '', 'Comeau', 'Samantha', '', '', '', '', 'W', '', '', '', '1962-09-25', 1, '2016-11-15', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303234', '', 1, '1900-01-01', '', 'Hart', 'June', '', '', '', '', 'W', '', '', '', '1981-12-15', 1, '2016-11-13', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303235', '', 1, '1900-01-01', '', 'Cruz', 'Gail', '', '', '', '', 'W', '', '', '', '1935-08-16', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303236', '', 1, '1900-01-01', '', 'Worley', 'Dorothy', '', '', '', '', 'W', '', '', '', '1945-01-11', 1, '2016-11-19', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303237', '', 1, '1900-01-01', '', 'Marnell', 'Kenneth', '', '', '', '', 'M', '', '', '', '1959-10-10', 1, '2016-11-16', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303238', '', 1, '1900-01-01', '', 'Vanwinkle', 'Leticia', '', '', '', '', 'W', '', '', '', '1946-12-26', 1, '2016-11-14', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303239', '', 1, '1900-01-01', '', 'Farley', 'Charlotte', '', '', '', '', 'W', '', '', '', '1943-06-12', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303330', '', 1, '1900-01-01', '', 'Mcdowell', 'Mark', '', '', '', '', 'M', '', '', '', '1955-11-30', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303331', '', 1, '1900-01-01', '', 'Pasceri', 'Charles', '', '', '', '', 'M', '', '', '', '1943-01-08', 1, '2016-11-11', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303332', '', 1, '1900-01-01', '', 'Heim', 'Julian', '', '', '', '', 'M', '', '', '', '1951-09-23', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303333', '', 1, '1900-01-01', '', 'Arzola', 'Michael', '', '', '', '', 'M', '', '', '', '1950-04-23', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303334', '', 1, '1900-01-01', '', 'Rosado', 'George', '', '', '', '', 'M', '', '', '', '1946-01-23', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303335', '', 1, '1900-01-01', '', 'Freeman', 'Kristin', '', '', '', '', 'W', '', '', '', '1945-01-05', 1, '2016-11-01', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303336', '', 1, '1900-01-01', '', 'Robertson', 'Thomas', '', '', '', '', 'M', '', '', '', '1962-10-21', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303337', '', 1, '1900-01-01', '', 'Geffre', 'Deborah', '', '', '', '', 'W', '', '', '', '1980-12-20', 1, '2016-11-13', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303338', '', 1, '1900-01-01', '', 'Atkinson', 'John', '', '', '', '', 'M', '', '', '', '1945-07-12', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303339', '', 1, '1900-01-01', '', 'Rodriquez', 'Clarence', '', '', '', '', 'M', '', '', '', '1966-11-12', 1, '2016-11-03', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303430', '', 1, '1900-01-01', '', 'Sroka', 'Peter', '', '', '', '', 'M', '', '', '', '2007-03-06', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303431', '', 1, '1900-01-01', '', 'Kenyon', 'Charles', '', '', '', '', 'M', '', '', '', '1974-03-02', 1, '2016-11-07', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303432', '', 1, '1900-01-01', '', 'Fuller', 'Luis', '', '', '', '', 'M', '', '', '', '1940-08-03', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303433', '', 1, '1900-01-01', '', 'Theis', 'Joan', '', '', '', '', 'W', '', '', '', '1936-10-26', 1, '2016-11-20', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303434', '', 1, '1900-01-01', '', 'Dorr', 'Michael', '', '', '', '', 'M', '', '', '', '1958-11-03', 1, '2016-11-11', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303435', '', 1, '1900-01-01', '', 'Brunton', 'Peter', '', '', '', '', 'M', '', '', '', '1966-09-19', 1, '2016-11-11', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303436', '', 1, '1900-01-01', '', 'Scheller', 'Virginia', '', '', '', '', 'W', '', '', '', '1980-12-07', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303437', '', 1, '1900-01-01', '', 'Head', 'Maxine', '', '', '', '', 'W', '', '', '', '1981-03-25', 1, '2016-11-05', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303438', '', 1, '1900-01-01', '', 'Heikes', 'Ruth', '', '', '', '', 'W', '', '', '', '1932-01-27', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303439', '', 1, '1900-01-01', '', 'Ramsey', 'Lisa', '', '', '', '', 'W', '', '', '', '1983-02-20', 1, '2016-11-09', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303530', '', 1, '1900-01-01', '', 'Redman', 'Michael', '', '', '', '', 'M', '', '', '', '1943-08-08', 1, '2016-11-12', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303531', '', 1, '1900-01-01', '', 'Fisk', 'Benton', '', '', '', '', 'M', '', '', '', '1968-11-07', 1, '2016-11-20', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303532', '', 1, '1900-01-01', '', 'Byars', 'Jorge', '', '', '', '', 'M', '', '', '', '1947-03-03', 1, '2016-11-17', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303533', '', 1, '1900-01-01', '', 'Rome', 'Ehtel', '', '', '', '', 'W', '', '', '', '1945-06-10', 1, '2016-11-04', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303534', '', 1, '1900-01-01', '', 'Hernandez', 'Nicole', '', '', '', '', 'W', '', '', '', '1924-07-07', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303535', '', 1, '1900-01-01', '', 'Banda', 'Joseph', '', '', '', '', 'M', '', '', '', '1947-08-18', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303536', '', 1, '1900-01-01', '', 'Chaffin', 'Patricia', '', '', '', '', 'W', '', '', '', '1952-05-20', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303537', '', 1, '1900-01-01', '', 'Gardner', 'Karon', '', '', '', '', 'W', '', '', '', '1938-09-06', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303538', '', 1, '1900-01-01', '', 'Delgado', 'Steve', '', '', '', '', 'M', '', '', '', '1958-07-21', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303539', '', 1, '1900-01-01', '', 'Martinez', 'William', '', '', '', '', 'M', '', '', '', '1957-11-21', 1, '2016-11-11', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303630', '', 1, '1900-01-01', '', 'Upton', 'Teresa', '', '', '', '', 'W', '', '', '', '1941-04-22', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303631', '', 1, '1900-01-01', '', 'Young', 'Thomas', '', '', '', '', 'M', '', '', '', '1981-02-22', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303632', '', 1, '1900-01-01', '', 'Thomas', 'Samuel', '', '', '', '', 'M', '', '', '', '1998-08-03', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303633', '', 1, '1900-01-01', '', 'Rosas', 'James', '', '', '', '', 'M', '', '', '', '1938-09-03', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303634', '', 1, '1900-01-01', '', 'Melton', 'David', '', '', '', '', 'M', '', '', '', '1941-09-05', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303635', '', 1, '1900-01-01', '', 'Stern', 'Gertrude', '', '', '', '', 'W', '', '', '', '1956-11-09', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303636', '', 1, '1900-01-01', '', 'Bradley', 'Jeffrey', '', '', '', '', 'M', '', '', '', '1940-06-16', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303637', '', 1, '1900-01-01', '', 'Fernandez', 'Stacy', '', '', '', '', 'W', '', '', '', '1964-11-17', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303638', '', 1, '1900-01-01', '', 'Mccarthy', 'Irene', '', '', '', '', 'W', '', '', '', '1993-02-08', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303639', '', 1, '1900-01-01', '', 'Wilkins', 'Kenneth', '', '', '', '', 'M', '', '', '', '1974-05-31', 1, '2016-11-17', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303730', '', 1, '1900-01-01', '', 'Rowe', 'Tania', '', '', '', '', 'W', '', '', '', '1942-02-05', 1, '2016-11-03', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303731', '', 1, '1900-01-01', '', 'Arcizo', 'Velma', '', '', '', '', 'W', '', '', '', '1941-05-07', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303732', '', 1, '1900-01-01', '', 'Craig', 'Helen', '', '', '', '', 'W', '', '', '', '1962-06-12', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303733', '', 1, '1900-01-01', '', 'Alley', 'Colleen', '', '', '', '', 'W', '', '', '', '1955-12-08', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303734', '', 1, '1900-01-01', '', 'Bates', 'Clayton', '', '', '', '', 'M', '', '', '', '1947-10-27', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303735', '', 1, '1900-01-01', '', 'Rivera', 'Greg', '', '', '', '', 'M', '', '', '', '1979-05-07', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303736', '', 1, '1900-01-01', '', 'Orellana', 'Lynn', '', '', '', '', 'M', '', '', '', '1968-12-24', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303737', '', 1, '1900-01-01', '', 'Catrone', 'Barbara', '', '', '', '', 'W', '', '', '', '1951-11-01', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303738', '', 1, '1900-01-01', '', 'Davis', 'Grant', '', '', '', '', 'M', '', '', '', '1951-06-04', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303739', '', 1, '1900-01-01', '', 'Moton', 'Jay', '', '', '', '', 'M', '', '', '', '1950-11-25', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303830', '', 1, '1900-01-01', '', 'Fetterhoff', 'James', '', '', '', '', 'M', '', '', '', '1970-08-15', 1, '2016-11-17', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303831', '', 1, '1900-01-01', '', 'Nelson', 'Paul', '', '', '', '', 'M', '', '', '', '1962-07-31', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303832', '', 1, '1900-01-01', '', 'Burris', 'Monte', '', '', '', '', 'M', '', '', '', '1968-05-07', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303833', '', 1, '1900-01-01', '', 'Powers', 'Mark', '', '', '', '', 'M', '', '', '', '1960-06-11', 1, '2016-11-14', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303834', '', 1, '1900-01-01', '', 'Kearns', 'Thersa', '', '', '', '', 'W', '', '', '', '1938-08-08', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303835', '', 1, '1900-01-01', '', 'Castillo', 'Keith', '', '', '', '', 'M', '', '', '', '1976-01-02', 1, '2016-11-07', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303836', '', 1, '1900-01-01', '', 'Mcguigan', 'Benton', '', '', '', '', 'M', '', '', '', '1939-03-17', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303837', '', 1, '1900-01-01', '', 'Perry', 'Brad', '', '', '', '', 'M', '', '', '', '1947-09-03', 1, '2016-11-16', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303838', '', 1, '1900-01-01', '', 'Limbaugh', 'Dennis', '', '', '', '', 'M', '', '', '', '1946-06-19', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303839', '', 1, '1900-01-01', '', 'Cobb', 'Jeremy', '', '', '', '', 'M', '', '', '', '1940-07-22', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303930', '', 1, '1900-01-01', '', 'Pope', 'Deborah', '', '', '', '', 'W', '', '', '', '1982-05-16', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303931', '', 1, '1900-01-01', '', 'Hochstetler', 'David', '', '', '', '', 'M', '', '', '', '1939-02-01', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303932', '', 1, '1900-01-01', '', 'Regnier', 'Christopher', '', '', '', '', 'M', '', '', '', '1968-08-19', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303933', '', 1, '1900-01-01', '', 'Bloom', 'Laura', '', '', '', '', 'W', '', '', '', '1939-08-25', 1, '2016-11-02', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303934', '', 1, '1900-01-01', '', 'Murphy', 'Joseph', '', '', '', '', 'M', '', '', '', '1931-01-17', 1, '2016-11-13', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303935', '', 1, '1900-01-01', '', 'Janczewski', 'Margaret', '', '', '', '', 'W', '', '', '', '1945-09-28', 1, '2016-11-12', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303936', '', 1, '1900-01-01', '', 'Williams', 'Albert', '', '', '', '', 'M', '', '', '', '1990-06-25', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303937', '', 1, '1900-01-01', '', 'Holland', 'Nicholas', '', '', '', '', 'M', '', '', '', '1954-04-02', 1, '', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303938', '', 1, '1900-01-01', '', 'Archer', 'Julie', '', '', '', '', 'W', '', '', '', '1954-05-20', 1, '2016-11-01', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "ValidFrom", "ValidTo", "FamilyName", "GivenName", "Title.OriginalValue", "Title.Code", "Title.CodeSystem", "Title.CodeSystemVersion", "Gender.OriginalValue", "Gender.Code", "Gender.CodeSystem", "Gender.CodeSystemVersion", "BirthDate", "MultipleBirthOrder", "DeceasedDate", "MaritalStatus.OriginalValue", "MaritalStatus.Code", "MaritalStatus.CodeSystem", "MaritalStatus.CodeSystemVersion", "Nationality.OriginalValue", "Nationality.Code", "Nationality.CodeSystem", "Nationality.CodeSystemVersion", "Address.StreetName", "Address.StreetNumber", "Address.PostOfficeBox", "Address.City", "Address.PostalCode", "Address.State", "Address.Region", "Address.Country.OriginalValue", "Address.Country.Code", "Address.Country.CodeSystem", "Address.Country.CodeSystemVersion", "Telecom.Phone", "Telecom.Mobile", "Telecom.Fax", "Telecom.Email", "OrgID") VALUES('1900-01-05', x'4953483031303030303030303939', '', 1, '1900-01-01', '', 'Rosenblum', 'Ronnie', '', '', '', '', 'M', '', '', '', '1938-09-06', 1, '2016-11-06', '', '', '', '', 'US', '', '', '', '1862 Morton Circle Apt. 11', '', '', 'Troy', '40729', 'MT', '', '', '', '', '', '', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830313851443478454144505a417a7a415267', '', 1, x'4953483031303030303030303030', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830315a3636654a6f577341576f3678426e7a', '', 1, x'4953483031303030303030303031', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031734b6556597636704b656f6651713765', '', 1, x'4953483031303030303030303032', 'BIOMARKER', 'Her2neu', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303159726f644b46554648783870504e4c36', '', 1, x'4953483031303030303030303032', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830315a325262336465356455674e696b3335', '', 1, x'4953483031303030303030303033', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830317338706e745a7444674c746e55593333', '', 1, x'4953483031303030303030303034', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031684a776662325a47675570656f4d656b', '', 1, x'4953483031303030303030303035', 'BIOMARKER', 'EGFR', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314d7273687978585942717756686a6a42', '', 1, x'4953483031303030303030303035', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303143437645505a4e663653626463486579', '', 1, x'4953483031303030303030303036', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314233785941593359797368474e426e59', '', 1, x'4953483031303030303030303037', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303162437954366357554138625439546a69', '', 1, x'4953483031303030303030303038', 'BIOMARKER', 'Her2neu', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031514e454454386a6963334e5337796d57', '', 1, x'4953483031303030303030303038', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830315163794e416139365a683554696d5074', '', 1, x'4953483031303030303030303039', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303174556b685853665a484e646444637373', '', 1, x'4953483031303030303030303130', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031514a5336337a6d6a46475a4655774e4d', '', 1, x'4953483031303030303030303131', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830313974524653795a6476786d5262756e62', '', 1, x'4953483031303030303030303132', 'BIOMARKER', 'KRAS', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031506a613269756f7575596e50374e4b77', '', 1, x'4953483031303030303030303132', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314264474b546b3854466770486a554548', '', 1, x'4953483031303030303030303133', 'BIOMARKER', 'BRAF', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316f63326e625346546848397454367438', '', 1, x'4953483031303030303030303133', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314e473441444673484763764a6d505a62', '', 1, x'4953483031303030303030303134', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303159744641733552527450615756555562', '', 1, x'4953483031303030303030303135', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303165676a4b556f6a344d42695151455469', '', 1, x'4953483031303030303030303136', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031765a634e7a6d4b4e6258584361696d54', '', 1, x'4953483031303030303030303137', 'BIOMARKER', 'KRAS', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303157595632487a71556b45485868335575', '', 1, x'4953483031303030303030303137', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303133516b69614847396533396954325376', '', 1, x'4953483031303030303030303138', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031575356357241557758734755504c5054', '', 1, x'4953483031303030303030303139', 'BIOMARKER', 'BRAF', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830317937675952344e4c4e624e4a48795179', '', 1, x'4953483031303030303030303139', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314e4a6737487450795171553761457668', '', 1, x'4953483031303030303030303230', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031575a783763576a794b68585a3570794e', '', 1, x'4953483031303030303030303231', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830313559465a5746396267685762334b6f50', '', 1, x'4953483031303030303030303232', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830317138644c5a714778366159465a555469', '', 1, x'4953483031303030303030303233', 'BIOMARKER', 'EGFR', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031506e4173446742545336685668595a58', '', 1, x'4953483031303030303030303233', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031376d794e713938627761464176697a48', '', 1, x'4953483031303030303030303234', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303136367756435164487667514e387a4b77', '', 1, x'4953483031303030303030303235', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316464364176797273764c44434d39516a', '', 1, x'4953483031303030303030303236', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031414b6965535767723458336d5776686e', '', 1, x'4953483031303030303030303237', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830315871746e65515155726a3746354b7164', '', 1, x'4953483031303030303030303238', 'BIOMARKER', 'BRAF', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316b645633323673523570564d5144336e', '', 1, x'4953483031303030303030303238', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316b57484c6a79765465554771644c4168', '', 1, x'4953483031303030303030303239', 'BIOMARKER', 'Her2neu', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316e34743534756655466a41766e6d7a79', '', 1, x'4953483031303030303030303239', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830315638446b383842583368616d6e6a584b', '', 1, x'4953483031303030303030303330', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031396a68796d476d7a4d32504a43343973', '', 1, x'4953483031303030303030303331', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031765055655839484444375145724c7870', '', 1, x'4953483031303030303030303332', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303132775276703934336e6f45384e6f6b73', '', 1, x'4953483031303030303030303333', 'BIOMARKER', 'Her2neu', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316d71323273644c394c4d575444364439', '', 1, x'4953483031303030303030303333', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303138466a65674a746e56724b595879774d', '', 1, x'4953483031303030303030303334', 'BIOMARKER', 'EGFR', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314a747467344b42573435377363737761', '', 1, x'4953483031303030303030303334', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303143373957787739715974586a50574e71', '', 1, x'4953483031303030303030303335', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031635575365844507a583565456e445069', '', 1, x'4953483031303030303030303336', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303169677742464c367764385637784e326b', '', 1, x'4953483031303030303030303337', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830317947465238364d566273615932325748', '', 1, x'4953483031303030303030303338', 'BIOMARKER', 'KRAS', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303171413471796b35756874666875524342', '', 1, x'4953483031303030303030303338', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316b6668354e4365466e337350346b5439', '', 1, x'4953483031303030303030303339', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303168433337777a486a4663515a75737771', '', 1, x'4953483031303030303030303430', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314542334366354661414c4667387a6369', '', 1, x'4953483031303030303030303431', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303143626557374d4c67724c684a77705a54', '', 1, x'4953483031303030303030303432', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031364d6b3346324c4c56435a386e715274', '', 1, x'4953483031303030303030303433', 'BIOMARKER', 'Her2neu', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830315a655439754573505a644e7a72504d74', '', 1, x'4953483031303030303030303433', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314667696742735738443941586b68797a', '', 1, x'4953483031303030303030303434', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830317365766662357546453464506670776f', '', 1, x'4953483031303030303030303435', 'BIOMARKER', 'KRAS', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303150356d7a5575615071354e68365a5145', '', 1, x'4953483031303030303030303435', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303139614856646e55414c524d447a4d3247', '', 1, x'4953483031303030303030303436', 'BIOMARKER', 'Her2neu', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316a55344d764137543376714173796d6e', '', 1, x'4953483031303030303030303436', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031784367344856356e746963596f615267', '', 1, x'4953483031303030303030303437', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316f676f4c466f4b4573416f6a36346747', '', 1, x'4953483031303030303030303438', 'BIOMARKER', 'Her2neu', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316354374b79466965536d61517655707a', '', 1, x'4953483031303030303030303438', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830317178646a5a6d714475536d5378414533', '', 1, x'4953483031303030303030303439', 'BIOMARKER', 'Her2neu', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031394152513934636758704c4170567071', '', 1, x'4953483031303030303030303439', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314a66476e716178477934614338485032', '', 1, x'4953483031303030303030303530', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830313656596e4171486b76623267536a6e38', '', 1, x'4953483031303030303030303531', 'BIOMARKER', 'KRAS', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031657663646d4272626541585244777255', '', 1, x'4953483031303030303030303531', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316a6a666b3665555144656e6635346666', '', 1, x'4953483031303030303030303532', 'BIOMARKER', 'EGFR', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303134747a7463354b4a5376774259747a59', '', 1, x'4953483031303030303030303532', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830315045516d4136474b7578704a34786379', '', 1, x'4953483031303030303030303533', 'BIOMARKER', 'BRAF', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303135663636596853736138347567704d58', '', 1, x'4953483031303030303030303533', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830315a647162444637546f79664571655671', '', 1, x'4953483031303030303030303534', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316944723763744b556632446f78394134', '', 1, x'4953483031303030303030303535', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830317652776944467737796577433477594a', '', 1, x'4953483031303030303030303536', 'BIOMARKER', 'BRCA1', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314168646650514635584c50386d613754', '', 1, x'4953483031303030303030303536', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316a46335a34664b686b77585643473479', '', 1, x'4953483031303030303030303537', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303142384b5333646f6156714e3947733952', '', 1, x'4953483031303030303030303538', 'BIOMARKER', 'Her2neu', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830317565534b48375262684b414e786a7a62', '', 1, x'4953483031303030303030303538', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031337576466d5542485448476354767238', '', 1, x'4953483031303030303030303539', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031474b4471644e656e5032567245365871', '', 1, x'4953483031303030303030303630', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830313755416d34715a58594854424e62634c', '', 1, x'4953483031303030303030303631', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314d5842736759574d555833696b333969', '', 1, x'4953483031303030303030303632', 'BIOMARKER', 'BRAF', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303141687a4e625a5a62767374686d6d6b68', '', 1, x'4953483031303030303030303632', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031644b7045366a65434d52445a53616d43', '', 1, x'4953483031303030303030303633', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314e666b55797956346e58336a63796352', '', 1, x'4953483031303030303030303634', 'BIOMARKER', 'KRAS', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031426a714d614432454170364453764a4b', '', 1, x'4953483031303030303030303634', 'SMOKER', 'Yes', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'495348303161456566574e7a786d56664334476378', '', 1, x'4953483031303030303030303635', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314a576865464e746f4c72326772786e47', '', 1, x'4953483031303030303030303636', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316146336b4c325a69364b7462356d4751', '', 1, x'4953483031303030303030303637', 'BIOMARKER', 'KRAS', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830317935356852444c774564584d55653764', '', 1, x'4953483031303030303030303637', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031546f5768566178634c72564b62734d75', '', 1, x'4953483031303030303030303638', 'BIOMARKER', 'EGFR', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031505045336f447774386f716b44416d58', '', 1, x'4953483031303030303030303638', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316e46706e374a68366748387444786256', '', 1, x'4953483031303030303030303639', 'BIOMARKER', 'BRAF', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830316132594a5a786b5666587a426a417466', '', 1, x'4953483031303030303030303639', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'4953483031376f6933615673424271465339467239', '', 1, x'4953483031303030303030303730', 'BIOMARKER', 'BRCA1', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "ObsType", "ObsCharValue", "ObsNumValue", "ObsUnit", "ObsTime", "OrgID") VALUES('1900-01-05', x'49534830314469656f6e6178504c65434c34625952', '', 1, x'4953483031303030303030303730', 'SMOKER', 'No', 0, '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303161755967336563615150793433784339', 1, '', 'Weight', '', '', '', 'kg', 83.3718852105);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031773353374745654d435734377a444e6a', 1, '', 'Weight', '', '', '', 'kg', 83.0121031841);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830314267793567724d47635442555261574b', 1, '', 'Weight', '', '', '', 'kg', 83.0707605757);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031475a326b4d344a46784e4a4e77656469', 1, '', 'Weight', '', '', '', 'kg', 82.8096869075);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316632434d466550736152516952663454', 1, '', 'Weight', '', '', '', 'kg', 82.5698814723);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830315956616d74574b55707370437a65366a', 1, '', 'Weight', '', '', '', 'kg', 82.2456968742);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031674c4569327059373866734879377251', 1, '', 'Weight', '', '', '', 'kg', 82.4015172556);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031546f733958664d73483334675a777775', 1, '', 'Weight', '', '', '', 'kg', 81.9607320381);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303168666975655059446232414d6f694d64', 1, '', 'DOSAGE', '', '', '', 'Gy', 70);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830314738644d354259424869544c56335152', 1, '', 'Weight', '', '', '', 'kg', 45.8007986209);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830317558446370333341694269675a45796f', 1, '', 'Weight', '', '', '', 'kg', 45.5948926318);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316551614c64354b79734b724b776b5247', 1, '', 'Weight', '', '', '', 'kg', 45.5097576721);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031347078614273796958504d4467534437', 1, '', 'Weight', '', '', '', 'kg', 45.2397866035);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031574c737533444c7a6e4d456771774d74', 1, '', 'Weight', '', '', '', 'kg', 45.2093700957);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830317a466a364275456d63714e4d4a736378', 1, '', 'Weight', '', '', '', 'kg', 45.1866244233);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830315a373436736e714d646e506145364874', 1, '', 'Weight', '', '', '', 'kg', 45.2362447971);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303155486e71326737387434467a52384246', 1, '', 'Weight', '', '', '', 'kg', 45.1690949693);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031755079754a4756376634327a4a63544b', 1, '', 'DOSAGE', '', '', '', 'Gy', 70);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316b756d73695545664c37547339625158', 1, '', 'Weight', '', '', '', 'kg', 69.6759294371);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031476352335a413533423765577a777a46', 1, '', 'Weight', '', '', '', 'kg', 69.3380454731);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303162646f69475358323452386a46374346', 1, '', 'Weight', '', '', '', 'kg', 69.1686928192);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031554b654575786a53586234525843376f', 1, '', 'Weight', '', '', '', 'kg', 68.8739531966);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303176634a7a503368374b71673254525644', 1, '', 'Weight', '', '', '', 'kg', 68.6624737764);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830314a5077366d436151556b513838367265', 1, '', 'Weight', '', '', '', 'kg', 68.5738964729);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303133666e6a574e556f485856786f77714a', 1, '', 'Weight', '', '', '', 'kg', 68.6889187958);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031475367766270374e7a41523536757a65', 1, '', 'Weight', '', '', '', 'kg', 68.404067147);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303146676754583859786d37586947755569', 1, '', 'Weight', '', '', '', 'kg', 68.0639703363);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316e614154336274435856526977695578', 1, '', 'Weight', '', '', '', 'kg', 67.8756582339);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031666d7245645167796532556974667032', 1, '', 'Weight', '', '', '', 'kg', 67.6479910589);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303163757437706d446b62436f3963534761', 1, '', 'DOSAGE', '', '', '', 'Gy', 70);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303157334746444673413476617a5175666f', 1, '', 'DOSAGE', '', '', '', 'Gy', 30);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031644b5051397a35536b51794679746774', 1, '', 'Weight', '', '', '', 'kg', 63.3101633987);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316f58556952366b48566e423339624e47', 1, '', 'Weight', '', '', '', 'kg', 63.1567979035);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830314752746348565641504b6f4c66797650', 1, '', 'Weight', '', '', '', 'kg', 63.0059962675);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303151566f774a325435336e38694e777235', 1, '', 'Weight', '', '', '', 'kg', 62.9319170537);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303163536e705755374e4164634164373865', 1, '', 'Weight', '', '', '', 'kg', 62.6513069788);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303164683971366475757454686f39777554', 1, '', 'Weight', '', '', '', 'kg', 62.5073158805);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830314869356f794a77367248795376333670', 1, '', 'Weight', '', '', '', 'kg', 62.5215665582);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031334250347a6d78684d366a385a555736', 1, '', 'Weight', '', '', '', 'kg', 62.4658336546);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830313358414a4161514545617552424c4661', 1, '', 'Weight', '', '', '', 'kg', 62.1280039669);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031434c5054517a5a6669656f5066794264', 1, '', 'Weight', '', '', '', 'kg', 62.1461046717);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031346d3869374e33596e4561764a556a73', 1, '', 'Weight', '', '', '', 'kg', 61.9644882735);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303138387a34766b676a664a5444726e6e45', 1, '', 'Weight', '', '', '', 'kg', 61.6762850177);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316f6b7a69676e3762334e387833767853', 1, '', 'Weight', '', '', '', 'kg', 61.5984303916);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303139323532713662483952437950626164', 1, '', 'Weight', '', '', '', 'kg', 61.6390679687);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303139744354706178705838625673596870', 1, '', 'Weight', '', '', '', 'kg', 61.5061422724);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303175417673724d473950724e324b36646d', 1, '', 'Weight', '', '', '', 'kg', 61.3685877731);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031503975715878586e564e7a716273666f', 1, '', 'Weight', '', '', '', 'kg', 61.4553003858);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031416755523359713754327a7967563638', 1, '', 'DOSAGE', '', '', '', 'Gy', 70);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303133554238356d3947517336545a747073', 1, '', 'DOSAGE', '', '', '', 'Gy', 40);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303146324d48535071744251426679446d4b', 1, '', 'DOSAGE', '', '', '', 'Gy', 40);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830314b7445517265377a45476e4c4a363762', 1, '', 'Weight', '', '', '', 'kg', 98.401098092);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830315054785661734341757047436b774478', 1, '', 'Weight', '', '', '', 'kg', 98.001993409);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830315337347846694770624a426a35465a72', 1, '', 'Weight', '', '', '', 'kg', 98.1056322844);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031764432485435435061394e7479666862', 1, '', 'Weight', '', '', '', 'kg', 97.9991311769);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031337568783365566a4c7a365a6b756b69', 1, '', 'Weight', '', '', '', 'kg', 97.5211676091);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830314e687573526f73616450626336657a74', 1, '', 'Weight', '', '', '', 'kg', 97.5549229432);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316a625471366b33635646685764764732', 1, '', 'Weight', '', '', '', 'kg', 97.5379148875);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830314442756654744c6644536f767450624c', 1, '', 'Weight', '', '', '', 'kg', 97.1875841672);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830317172697848425448455264574b717954', 1, '', 'Weight', '', '', '', 'kg', 96.7103358476);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303132556943484d6858646d516f7536776a', 1, '', 'Weight', '', '', '', 'kg', 71.132826612);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303164755061746f775566446a7065694575', 1, '', 'Weight', '', '', '', 'kg', 70.7799565315);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031596f4c75724d36545a6d563370356f42', 1, '', 'Weight', '', '', '', 'kg', 70.9104708933);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830314141586a71687757783645594a6a6558', 1, '', 'Weight', '', '', '', 'kg', 70.6750505848);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830314b507275447279586144595763337958', 1, '', 'Weight', '', '', '', 'kg', 70.7279852925);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316156683559527876485539537075564c', 1, '', 'Weight', '', '', '', 'kg', 70.5302773377);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303176396e334445684c4e64376a38584744', 1, '', 'Weight', '', '', '', 'kg', 70.215120815);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830315052594244646559726372466b70754c', 1, '', 'Weight', '', '', '', 'kg', 70.0917398628);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031457a7439466a473771536f3951683344', 1, '', 'Weight', '', '', '', 'kg', 69.8478141224);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830317938576d5768433638345a5861414344', 1, '', 'Weight', '', '', '', 'kg', 69.8100310021);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303176373578556d4c555853633268724354', 1, '', 'Weight', '', '', '', 'kg', 69.8604139017);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303144425832746f6973645263577a6f4775', 1, '', 'Weight', '', '', '', 'kg', 69.8544529841);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303170527574686d6d526a364d55324e6564', 1, '', 'Weight', '', '', '', 'kg', 69.8513430114);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031664d666159517a65686d7933646b4751', 1, '', 'Weight', '', '', '', 'kg', 69.5619389473);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031503747755a5779617a657036636d3477', 1, '', 'Weight', '', '', '', 'kg', 69.1726463697);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303142576335775259634e4a665a4a694a32', 1, '', 'Weight', '', '', '', 'kg', 68.8461136127);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031443459395467544762526e597a786a46', 1, '', 'Weight', '', '', '', 'kg', 79.3336384218);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316e644e48686162656b43477976743435', 1, '', 'Weight', '', '', '', 'kg', 78.9299054443);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316437593636675a645056454d6b713638', 1, '', 'Weight', '', '', '', 'kg', 78.6274078123);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316d4553477050667a4c5a6b7653503773', 1, '', 'Weight', '', '', '', 'kg', 78.6646350641);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316156684b6e364566364b6a684a414e6a', 1, '', 'Weight', '', '', '', 'kg', 78.2420534407);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316961767776536f4b4c517774474e4e4e', 1, '', 'Weight', '', '', '', 'kg', 78.0019407544);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303144616f597161436d744a33585a617966', 1, '', 'Weight', '', '', '', 'kg', 77.7807956374);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830315a6e36366b753665416b6546456d586d', 1, '', 'Weight', '', '', '', 'kg', 77.8145954315);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031796757596a6976527167726f71747865', 1, '', 'Weight', '', '', '', 'kg', 77.5932176238);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316f5352416b7a504244534a79354b3865', 1, '', 'Weight', '', '', '', 'kg', 77.4528397926);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031355562753438434546696245434a426d', 1, '', 'Weight', '', '', '', 'kg', 77.4689097269);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303170564774764d5a78564534786f505958', 1, '', 'Weight', '', '', '', 'kg', 77.1972913726);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303166463255506f696341414c477358657a', 1, '', 'Weight', '', '', '', 'kg', 76.9036638176);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031416d327072703648693756557862724b', 1, '', 'Weight', '', '', '', 'kg', 76.6062061024);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303176377144595841714b4b364b55694e68', 1, '', 'Weight', '', '', '', 'kg', 76.6303043648);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303155797166325069466155327a6f44644a', 1, '', 'DOSAGE', '', '', '', 'Gy', 40);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830314c77616a4c7137413767694351716237', 1, '', 'Weight', '', '', '', 'kg', 55.9969568678);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031395236765358656d70504c5232516879', 1, '', 'Weight', '', '', '', 'kg', 55.762478783);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'495348303163334c4d663850586e7163426d755a4e', 1, '', 'Weight', '', '', '', 'kg', 55.7801760152);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031697a58697144776444364661684c764e', 1, '', 'Weight', '', '', '', 'kg', 55.6688011265);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031793975595a5a48757a706338714a7546', 1, '', 'Weight', '', '', '', 'kg', 55.5410004071);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'4953483031435a3633437a77664b676b50626f3244', 1, '', 'Weight', '', '', '', 'kg', 55.4626140137);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830315161425848614c653467417863555264', 1, '', 'Weight', '', '', '', 'kg', 55.3375009429);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Unit", "Value") VALUES('1900-01-05', x'49534830316b567a717252536175585853754c356a', 1, '', 'Weight', '', '', '', 'kg', 55.3106329137);
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314b6a75675537536376795673476f5a32', 1, '', 'ICD_10', '', '', '', 'C64', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314b6a75675537536376795673476f5a32', 1, '', '', 'ICD_OTS', '', '', '', 'C64', 'ICD10CM', '2015', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314c73436146796f54364c5777385a695a', 1, '', 'TNM_T', '', '', '', '1', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314c73436146796f54364c5777385a695a', 1, '', 'TNM_N', '', '', '', '0', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314c73436146796f54364c5777385a695a', 1, '', 'TNM_M', '', '', '', '0', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316250614a4343636656376d7376727576', 1, '', 'CHEMO_OPS', '', '', '', '8-542', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316250614a4343636656376d7376727576', 1, '', 'CHEMO_PROT', '', '', '', 'ICE', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303162786254667a766f3663566472466a38', 1, '', 'CHEMO_OPS', '', '', '', '8-543', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303162786254667a766f3663566472466a38', 1, '', 'CHEMO_PROT', '', '', '', 'FOLFOX', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303168666975655059446232414d6f694d64', 1, '', 'RADIO_OPS', '', '', '', '8-521', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830315a4a564634435836514c523775567179', 1, '', 'SURGERY_OPS', '', '', '', '5-320', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031534b6a74766450796535366b35325158', 1, '', 'BIOBANK_TYPE', '', '', '', 'HOD', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031534b6a74766450796535366b35325158', 1, '', 'BIOBANK_STATUS', '', '', '', 'Freigegeben', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303133597750455333455357464645554a33', 1, '', 'ICD_10', '', '', '', 'C50', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303133597750455333455357464645554a33', 1, '', '', 'ICD_OTS', '', '', '', 'C50', 'ICD10CM', '2015', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314c6a69775371674b627472576233466f', 1, '', 'TNM_T', '', '', '', '4', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314c6a69775371674b627472576233466f', 1, '', 'TNM_N', '', '', '', '0', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314c6a69775371674b627472576233466f', 1, '', 'TNM_M', '', '', '', '0', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303152425a69675054576e5851563334697a', 1, '', 'VITALSTATUS', '', '', '', 'Alive', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316d59734658786155485a78326e70746b', 1, '', 'CHEMO_OPS', '', '', '', '8-544', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316d59734658786155485a78326e70746b', 1, '', 'CHEMO_PROT', '', '', '', 'FOLFOX', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314457564e4d5964635533464362736f6f', 1, '', 'CHEMO_OPS', '', '', '', '8-544', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314457564e4d5964635533464362736f6f', 1, '', 'CHEMO_PROT', '', '', '', 'COPP', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031755079754a4756376634327a4a63544b', 1, '', 'RADIO_OPS', '', '', '', '8-521', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830313845647959686647594b47364a7a5466', 1, '', 'BIOBANK_TYPE', '', '', '', 'MAM', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830313845647959686647594b47364a7a5466', 1, '', 'BIOBANK_STATUS', '', '', '', 'Freigegeben', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830313433554c5074585a46334c39587a6743', 1, '', 'ICD_10', '', '', '', 'C44', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830313433554c5074585a46334c39587a6743', 1, '', '', 'ICD_OTS', '', '', '', 'C44', 'ICD10CM', '2015', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830317978426b695559567657714e74755561', 1, '', 'TNM_T', '', '', '', '2', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830317978426b695559567657714e74755561', 1, '', 'TNM_N', '', '', '', '1', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830317978426b695559567657714e74755561', 1, '', 'TNM_M', '', '', '', '0', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031766a56454c68427548754b7869575866', 1, '', 'VITALSTATUS', '', '', '', 'Alive', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316436706a75436b356648457338587246', 1, '', 'CHEMO_OPS', '', '', '', '8-543', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316436706a75436b356648457338587246', 1, '', 'CHEMO_PROT', '', '', '', 'COPP', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031673678336a33477041436850347a4134', 1, '', 'CHEMO_OPS', '', '', '', '8-542', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031673678336a33477041436850347a4134', 1, '', 'CHEMO_PROT', '', '', '', 'COPP', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303163757437706d446b62436f3963534761', 1, '', 'RADIO_OPS', '', '', '', '8-520', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031325671666d56674d485733366b426b6e', 1, '', 'BIOBANK_TYPE', '', '', '', 'LYM-MET', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031325671666d56674d485733366b426b6e', 1, '', 'BIOBANK_STATUS', '', '', '', 'Freigegeben', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303167356d624b33735569746976516f5477', 1, '', 'ICD_10', '', '', '', 'C56', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303167356d624b33735569746976516f5477', 1, '', '', 'ICD_OTS', '', '', '', 'C56', 'ICD10CM', '2015', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303153644b57504e6262756776727a674273', 1, '', 'TNM_T', '', '', '', '2', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303153644b57504e6262756776727a674273', 1, '', 'TNM_N', '', '', '', '0', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303153644b57504e6262756776727a674273', 1, '', 'TNM_M', '', '', '', '0', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031694571614a35727a376f52414a6d7334', 1, '', 'SURGERY_OPS', '', '', '', '5-320', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314c7479577a4b3663334452634134734b', 1, '', 'BIOBANK_TYPE', '', '', '', 'HOD', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314c7479577a4b3663334452634134734b', 1, '', 'BIOBANK_STATUS', '', '', '', 'Freigegeben', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314b646a72743663675743553777735a4b', 1, '', 'LC_TYPE', '', '', '', 'NSCLC', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314b646a72743663675743553777735a4b', 1, '', 'ICD_10', '', '', '', 'C34', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314b646a72743663675743553777735a4b', 1, '', '', 'ICD_OTS', '', '', '', 'C34', 'ICD10CM', '2015', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031424b703434644859554d7a4452446548', 1, '', 'TNM_T', '', '', '', '3', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031424b703434644859554d7a4452446548', 1, '', 'TNM_N', '', '', '', '2', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031424b703434644859554d7a4452446548', 1, '', 'TNM_M', '', '', '', '1', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314e6b4c5a753735466d64464c43553468', 1, '', 'VITALSTATUS', '', '', '', 'Alive', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314a796e527764704a43543950784c3234', 1, '', 'CHEMO_OPS', '', '', '', '8-543', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314a796e527764704a43543950784c3234', 1, '', 'CHEMO_PROT', '', '', '', 'Docetaxel / Cisplatin', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314435354267413456477a38596e527a56', 1, '', 'CHEMO_OPS', '', '', '', '8-543', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314435354267413456477a38596e527a56', 1, '', 'CHEMO_PROT', '', '', '', 'Pemetrexed / Cisplatin', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303157334746444673413476617a5175666f', 1, '', 'RADIO_OPS', '', '', '', '8-522', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830317375764d666f65705966684876783679', 1, '', 'BIOBANK_TYPE', '', '', '', 'LYM-MET', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830317375764d666f65705966684876783679', 1, '', 'BIOBANK_STATUS', '', '', '', 'Freigegeben', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316d426f3964393273444579734a785967', 1, '', 'LC_TYPE', '', '', '', 'NSCLC', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316d426f3964393273444579734a785967', 1, '', 'ICD_10', '', '', '', 'C34', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316d426f3964393273444579734a785967', 1, '', '', 'ICD_OTS', '', '', '', 'C34', 'ICD10CM', '2015', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303141354b6332674d4b70564c5669357933', 1, '', 'TNM_T', '', '', '', '2', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303141354b6332674d4b70564c5669357933', 1, '', 'TNM_N', '', '', '', '0', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303141354b6332674d4b70564c5669357933', 1, '', 'TNM_M', '', '', '', '0', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316b72336e4e6132344378446d76774d4e', 1, '', 'VITALSTATUS', '', '', '', 'Alive', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031733477374d63764d765a4b4c43364168', 1, '', 'CHEMO_OPS', '', '', '', '8-544', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031733477374d63764d765a4b4c43364168', 1, '', 'CHEMO_PROT', '', '', '', 'Vinorelbin / Cisplatin', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031627154533576335771396a78646e3853', 1, '', 'CHEMO_OPS', '', '', '', '8-543', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031627154533576335771396a78646e3853', 1, '', 'CHEMO_PROT', '', '', '', 'Pemetrexed / Cisplatin', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031547a727954566a564a5241507a786457', 1, '', 'BIOBANK_TYPE', '', '', '', 'LYM-MET', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031547a727954566a564a5241507a786457', 1, '', 'BIOBANK_STATUS', '', '', '', 'Freigegeben', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316f68724d376f6f543744654a78624466', 1, '', 'ICD_10', '', '', '', 'C50', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316f68724d376f6f543744654a78624466', 1, '', '', 'ICD_OTS', '', '', '', 'C50', 'ICD10CM', '2015', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303179334e634b6237745838664b44563944', 1, '', 'TNM_T', '', '', '', '1', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303179334e634b6237745838664b44563944', 1, '', 'TNM_N', '', '', '', '0', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303179334e634b6237745838664b44563944', 1, '', 'TNM_M', '', '', '', '0', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303138636a415738686e367966394e426a76', 1, '', 'CHEMO_OPS', '', '', '', '8-543', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303138636a415738686e367966394e426a76', 1, '', 'CHEMO_PROT', '', '', '', 'ICE', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303164546f616a796475483274337a543548', 1, '', 'CHEMO_OPS', '', '', '', '8-544', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303164546f616a796475483274337a543548', 1, '', 'CHEMO_PROT', '', '', '', 'ICE', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031416755523359713754327a7967563638', 1, '', 'RADIO_OPS', '', '', '', '8-522', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830315347594d5a74547969346b6664327457', 1, '', 'BIOBANK_TYPE', '', '', '', 'MAM', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830315347594d5a74547969346b6664327457', 1, '', 'BIOBANK_STATUS', '', '', '', 'Freigegeben', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830317934724a41384b70436265505a353544', 1, '', 'ICD_10', '', '', '', 'C00', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830317934724a41384b70436265505a353544', 1, '', '', 'ICD_OTS', '', '', '', 'C00', 'ICD10CM', '2015', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314b6f68466158736a4a7938526d415634', 1, '', 'TNM_T', '', '', '', '3', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314b6f68466158736a4a7938526d415634', 1, '', 'TNM_N', '', '', '', '1', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830314b6f68466158736a4a7938526d415634', 1, '', 'TNM_M', '', '', '', '0', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031676d61734b6862625571775666356865', 1, '', 'VITALSTATUS', '', '', '', 'Alive', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303133554238356d3947517336545a747073', 1, '', 'RADIO_OPS', '', '', '', '8-521', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'495348303141434646566247325250617868586467', 1, '', 'SURGERY_OPS', '', '', '', '5-870', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031736f51513765353544424d343241374e', 1, '', 'BIOBANK_TYPE', '', '', '', 'REK', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'4953483031736f51513765353544424d343241374e', 1, '', 'BIOBANK_STATUS', '', '', '', 'Freigegeben', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830315038477a356450664d68576675624135', 1, '', 'ICD_10', '', '', '', 'C71', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830315038477a356450664d68576675624135', 1, '', '', 'ICD_OTS', '', '', '', 'C71', 'ICD10CM', '2015', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316a744a4e74396d376869787257444159', 1, '', 'TNM_T', '', '', '', '3', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom", DWID, "DWAuditID", "DWDateTo", "Attribute.OriginalValue", "Attribute.Code", "Attribute.CodeSystem", "Attribute.CodeSystemVersion", "Value.OriginalValue", "Value.Code", "Value.CodeSystem", "Value.CodeSystemVersion", "ValueVocabularyID") VALUES('1900-01-05', x'49534830316a744a4e74396d376869787257444159', 1, '', 'TNM_N', '', '', '', '0', '', '', '', '');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314b6a75675537536376795673476f5a32', '', 1, x'4953483031303030303030303030', x'49534830314b6a75675537536376795673476f5a32', x'4953483031726d524758526e4b566275574a6d6447', 'ACME_M03', '', '', '', '', '2011-01-22', '2011-01-22', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314c73436146796f54364c5777385a695a', '', 1, x'4953483031303030303030303030', x'49534830314c73436146796f54364c5777385a695a', x'4953483031726d524758526e4b566275574a6d6447', 'ACME_M03TS', '', '', '', '', '2011-01-22', '2011-01-22', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830316250614a4343636656376d7376727576', '', 1, x'4953483031303030303030303030', x'49534830314b6a75675537536376795673476f5a32', x'4953483031726d524758526e4b566275574a6d6447', 'ACME_M07_CHEMO', '', '', '', '', '2011-01-22', '2011-02-06', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303162786254667a766f3663566472466a38', '', 1, x'4953483031303030303030303030', x'49534830314b6a75675537536376795673476f5a32', x'4953483031726d524758526e4b566275574a6d6447', 'ACME_M07_CHEMO', '', '', '', '', '2011-06-18', '2011-07-06', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303161755967336563615150793433784339', '', 1, x'4953483031303030303030303030', x'495348303161755967336563615150793433784339', x'4953483031726d524758526e4b566275574a6d6447', 'Weight Measurement', '', '', '', '', '2014-04-17 07:38:08.527933', '2014-04-17 07:38:08.527933', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031773353374745654d435734377a444e6a', '', 1, x'4953483031303030303030303030', x'4953483031773353374745654d435734377a444e6a', x'4953483031726d524758526e4b566275574a6d6447', 'Weight Measurement', '', '', '', '', '2014-04-18 09:54:08.063176', '2014-04-18 09:54:08.063176', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314267793567724d47635442555261574b', '', 1, x'4953483031303030303030303030', x'49534830314267793567724d47635442555261574b', x'4953483031726d524758526e4b566275574a6d6447', 'Weight Measurement', '', '', '', '', '2014-04-19 10:15:19.606270', '2014-04-19 10:15:19.606270', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031475a326b4d344a46784e4a4e77656469', '', 1, x'4953483031303030303030303030', x'4953483031475a326b4d344a46784e4a4e77656469', x'4953483031726d524758526e4b566275574a6d6447', 'Weight Measurement', '', '', '', '', '2014-04-20 10:00:46.740683', '2014-04-20 10:00:46.740683', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830316632434d466550736152516952663454', '', 1, x'4953483031303030303030303030', x'49534830316632434d466550736152516952663454', x'4953483031726d524758526e4b566275574a6d6447', 'Weight Measurement', '', '', '', '', '2014-04-21 08:44:35.714273', '2014-04-21 08:44:35.714273', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830315956616d74574b55707370437a65366a', '', 1, x'4953483031303030303030303030', x'49534830315956616d74574b55707370437a65366a', x'4953483031726d524758526e4b566275574a6d6447', 'Weight Measurement', '', '', '', '', '2014-04-22 07:58:23.014979', '2014-04-22 07:58:23.014979', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031674c4569327059373866734879377251', '', 1, x'4953483031303030303030303030', x'4953483031674c4569327059373866734879377251', x'4953483031726d524758526e4b566275574a6d6447', 'Weight Measurement', '', '', '', '', '2014-04-23 08:42:19.621680', '2014-04-23 08:42:19.621680', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031546f733958664d73483334675a777775', '', 1, x'4953483031303030303030303030', x'4953483031546f733958664d73483334675a777775', x'4953483031726d524758526e4b566275574a6d6447', 'Weight Measurement', '', '', '', '', '2014-04-24 08:19:26.909509', '2014-04-24 08:19:26.909509', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303168666975655059446232414d6f694d64', '', 1, x'4953483031303030303030303030', x'495348303168666975655059446232414d6f694d64', x'4953483031726d524758526e4b566275574a6d6447', 'ACME_M07_RADIO', '', '', '', '', '2014-04-17', '2014-04-25', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830315a4a564634435836514c523775567179', '', 1, x'4953483031303030303030303030', x'49534830315a4a564634435836514c523775567179', x'4953483031726d524758526e4b566275574a6d6447', 'ACME_M07_SURGERY', '', '', '', '', '2012-09-24', '2012-09-24', 'UTC', '500');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031534b6a74766450796535366b35325158', '', 1, x'4953483031303030303030303030', x'4953483031534b6a74766450796535366b35325158', x'4953483031726d524758526e4b566275574a6d6447', 'BIOBANK', '', '', '', '', '2011-01-22', '2011-01-22', 'UTC', '600');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303133597750455333455357464645554a33', '', 1, x'4953483031303030303030303031', x'495348303133597750455333455357464645554a33', x'495348303139726d475754666e373371536d32546a', 'ACME_M03', '', '', '', '', '2016-01-10', '2016-01-10', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314c6a69775371674b627472576233466f', '', 1, x'4953483031303030303030303031', x'49534830314c6a69775371674b627472576233466f', x'495348303139726d475754666e373371536d32546a', 'ACME_M03TS', '', '', '', '', '2016-01-10', '2016-01-10', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303152425a69675054576e5851563334697a', '', 1, x'4953483031303030303030303031', x'495348303152425a69675054576e5851563334697a', x'4953483031', 'ACME_M16', '', '', '', '', '2016-11-01', '2016-11-01', 'UTC', '200');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830316d59734658786155485a78326e70746b', '', 1, x'4953483031303030303030303031', x'495348303133597750455333455357464645554a33', x'495348303139726d475754666e373371536d32546a', 'ACME_M07_CHEMO', '', '', '', '', '2016-01-15', '2016-01-24', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314457564e4d5964635533464362736f6f', '', 1, x'4953483031303030303030303031', x'495348303133597750455333455357464645554a33', x'495348303139726d475754666e373371536d32546a', 'ACME_M07_CHEMO', '', '', '', '', '2016-01-15', '2016-01-22', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314738644d354259424869544c56335152', '', 1, x'4953483031303030303030303031', x'49534830314738644d354259424869544c56335152', x'495348303139726d475754666e373371536d32546a', 'Weight Measurement', '', '', '', '', '2016-03-03 09:46:00.337173', '2016-03-03 09:46:00.337173', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830317558446370333341694269675a45796f', '', 1, x'4953483031303030303030303031', x'49534830317558446370333341694269675a45796f', x'495348303139726d475754666e373371536d32546a', 'Weight Measurement', '', '', '', '', '2016-03-04 07:49:34.626278', '2016-03-04 07:49:34.626278', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830316551614c64354b79734b724b776b5247', '', 1, x'4953483031303030303030303031', x'49534830316551614c64354b79734b724b776b5247', x'495348303139726d475754666e373371536d32546a', 'Weight Measurement', '', '', '', '', '2016-03-05 08:10:10.514427', '2016-03-05 08:10:10.514427', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031347078614273796958504d4467534437', '', 1, x'4953483031303030303030303031', x'4953483031347078614273796958504d4467534437', x'495348303139726d475754666e373371536d32546a', 'Weight Measurement', '', '', '', '', '2016-03-06 10:08:10.153301', '2016-03-06 10:08:10.153301', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031574c737533444c7a6e4d456771774d74', '', 1, x'4953483031303030303030303031', x'4953483031574c737533444c7a6e4d456771774d74', x'495348303139726d475754666e373371536d32546a', 'Weight Measurement', '', '', '', '', '2016-03-07 08:23:17.584869', '2016-03-07 08:23:17.584869', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830317a466a364275456d63714e4d4a736378', '', 1, x'4953483031303030303030303031', x'49534830317a466a364275456d63714e4d4a736378', x'495348303139726d475754666e373371536d32546a', 'Weight Measurement', '', '', '', '', '2016-03-08 08:57:12.586204', '2016-03-08 08:57:12.586204', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830315a373436736e714d646e506145364874', '', 1, x'4953483031303030303030303031', x'49534830315a373436736e714d646e506145364874', x'495348303139726d475754666e373371536d32546a', 'Weight Measurement', '', '', '', '', '2016-03-09 07:54:21.736556', '2016-03-09 07:54:21.736556', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303155486e71326737387434467a52384246', '', 1, x'4953483031303030303030303031', x'495348303155486e71326737387434467a52384246', x'495348303139726d475754666e373371536d32546a', 'Weight Measurement', '', '', '', '', '2016-03-10 10:16:30.725783', '2016-03-10 10:16:30.725783', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031755079754a4756376634327a4a63544b', '', 1, x'4953483031303030303030303031', x'4953483031755079754a4756376634327a4a63544b', x'495348303139726d475754666e373371536d32546a', 'ACME_M07_RADIO', '', '', '', '', '2016-03-03', '2016-03-11', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830313845647959686647594b47364a7a5466', '', 1, x'4953483031303030303030303031', x'49534830313845647959686647594b47364a7a5466', x'495348303139726d475754666e373371536d32546a', 'BIOBANK', '', '', '', '', '2016-01-10', '2016-01-10', 'UTC', '600');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830313433554c5074585a46334c39587a6743', '', 1, x'4953483031303030303030303032', x'49534830313433554c5074585a46334c39587a6743', x'495348303178783536716a674b6363624253516a7a', 'ACME_M03', '', '', '', '', '2013-04-08', '2013-04-08', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830317978426b695559567657714e74755561', '', 1, x'4953483031303030303030303032', x'49534830317978426b695559567657714e74755561', x'495348303178783536716a674b6363624253516a7a', 'ACME_M03TS', '', '', '', '', '2013-04-08', '2013-04-08', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031766a56454c68427548754b7869575866', '', 1, x'4953483031303030303030303032', x'4953483031766a56454c68427548754b7869575866', x'4953483031', 'ACME_M16', '', '', '', '', '2016-11-01', '2016-11-01', 'UTC', '200');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830316436706a75436b356648457338587246', '', 1, x'4953483031303030303030303032', x'49534830313433554c5074585a46334c39587a6743', x'495348303178783536716a674b6363624253516a7a', 'ACME_M07_CHEMO', '', '', '', '', '2013-08-16', '2013-08-25', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031673678336a33477041436850347a4134', '', 1, x'4953483031303030303030303032', x'49534830313433554c5074585a46334c39587a6743', x'495348303178783536716a674b6363624253516a7a', 'ACME_M07_CHEMO', '', '', '', '', '2013-05-17', '2013-05-24', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830316b756d73695545664c37547339625158', '', 1, x'4953483031303030303030303032', x'49534830316b756d73695545664c37547339625158', x'495348303178783536716a674b6363624253516a7a', 'Weight Measurement', '', '', '', '', '2015-01-19 09:47:52.475315', '2015-01-19 09:47:52.475315', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031476352335a413533423765577a777a46', '', 1, x'4953483031303030303030303032', x'4953483031476352335a413533423765577a777a46', x'495348303178783536716a674b6363624253516a7a', 'Weight Measurement', '', '', '', '', '2015-01-20 10:22:45.096814', '2015-01-20 10:22:45.096814', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303162646f69475358323452386a46374346', '', 1, x'4953483031303030303030303032', x'495348303162646f69475358323452386a46374346', x'495348303178783536716a674b6363624253516a7a', 'Weight Measurement', '', '', '', '', '2015-01-21 08:15:08.432228', '2015-01-21 08:15:08.432228', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031554b654575786a53586234525843376f', '', 1, x'4953483031303030303030303032', x'4953483031554b654575786a53586234525843376f', x'495348303178783536716a674b6363624253516a7a', 'Weight Measurement', '', '', '', '', '2015-01-22 09:03:43.952732', '2015-01-22 09:03:43.952732', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303176634a7a503368374b71673254525644', '', 1, x'4953483031303030303030303032', x'495348303176634a7a503368374b71673254525644', x'495348303178783536716a674b6363624253516a7a', 'Weight Measurement', '', '', '', '', '2015-01-23 09:03:27.464653', '2015-01-23 09:03:27.464653', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314a5077366d436151556b513838367265', '', 1, x'4953483031303030303030303032', x'49534830314a5077366d436151556b513838367265', x'495348303178783536716a674b6363624253516a7a', 'Weight Measurement', '', '', '', '', '2015-01-24 07:43:16.924586', '2015-01-24 07:43:16.924586', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303133666e6a574e556f485856786f77714a', '', 1, x'4953483031303030303030303032', x'495348303133666e6a574e556f485856786f77714a', x'495348303178783536716a674b6363624253516a7a', 'Weight Measurement', '', '', '', '', '2015-01-25 09:34:40.647504', '2015-01-25 09:34:40.647504', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031475367766270374e7a41523536757a65', '', 1, x'4953483031303030303030303032', x'4953483031475367766270374e7a41523536757a65', x'495348303178783536716a674b6363624253516a7a', 'Weight Measurement', '', '', '', '', '2015-01-26 08:57:58.926313', '2015-01-26 08:57:58.926313', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303146676754583859786d37586947755569', '', 1, x'4953483031303030303030303032', x'495348303146676754583859786d37586947755569', x'495348303178783536716a674b6363624253516a7a', 'Weight Measurement', '', '', '', '', '2015-01-27 08:23:20.931211', '2015-01-27 08:23:20.931211', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830316e614154336274435856526977695578', '', 1, x'4953483031303030303030303032', x'49534830316e614154336274435856526977695578', x'495348303178783536716a674b6363624253516a7a', 'Weight Measurement', '', '', '', '', '2015-01-28 10:29:07.436806', '2015-01-28 10:29:07.436806', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031666d7245645167796532556974667032', '', 1, x'4953483031303030303030303032', x'4953483031666d7245645167796532556974667032', x'495348303178783536716a674b6363624253516a7a', 'Weight Measurement', '', '', '', '', '2015-01-29 09:44:12.617751', '2015-01-29 09:44:12.617751', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303163757437706d446b62436f3963534761', '', 1, x'4953483031303030303030303032', x'495348303163757437706d446b62436f3963534761', x'495348303178783536716a674b6363624253516a7a', 'ACME_M07_RADIO', '', '', '', '', '2015-01-19', '2015-01-30', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031325671666d56674d485733366b426b6e', '', 1, x'4953483031303030303030303032', x'4953483031325671666d56674d485733366b426b6e', x'495348303178783536716a674b6363624253516a7a', 'BIOBANK', '', '', '', '', '2013-04-08', '2013-04-08', 'UTC', '600');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303167356d624b33735569746976516f5477', '', 1, x'4953483031303030303030303033', x'495348303167356d624b33735569746976516f5477', x'4953483031465a50636435327147467a5571566541', 'ACME_M03', '', '', '', '', '2015-09-27', '2015-09-27', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303153644b57504e6262756776727a674273', '', 1, x'4953483031303030303030303033', x'495348303153644b57504e6262756776727a674273', x'4953483031465a50636435327147467a5571566541', 'ACME_M03TS', '', '', '', '', '2015-09-27', '2015-09-27', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031694571614a35727a376f52414a6d7334', '', 1, x'4953483031303030303030303033', x'4953483031694571614a35727a376f52414a6d7334', x'4953483031465a50636435327147467a5571566541', 'ACME_M07_SURGERY', '', '', '', '', '2016-10-27', '2016-10-27', 'UTC', '500');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314c7479577a4b3663334452634134734b', '', 1, x'4953483031303030303030303033', x'49534830314c7479577a4b3663334452634134734b', x'4953483031465a50636435327147467a5571566541', 'BIOBANK', '', '', '', '', '2015-09-27', '2015-09-27', 'UTC', '600');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314b646a72743663675743553777735a4b', '', 1, x'4953483031303030303030303034', x'49534830314b646a72743663675743553777735a4b', x'4953483031463751413551766f6d45594842384576', 'ACME_M03', '', '', '', '', '2015-03-12', '2015-03-12', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031424b703434644859554d7a4452446548', '', 1, x'4953483031303030303030303034', x'4953483031424b703434644859554d7a4452446548', x'4953483031463751413551766f6d45594842384576', 'ACME_M03TS', '', '', '', '', '2015-03-12', '2015-03-12', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314e6b4c5a753735466d64464c43553468', '', 1, x'4953483031303030303030303034', x'49534830314e6b4c5a753735466d64464c43553468', x'4953483031', 'ACME_M16', '', '', '', '', '2016-11-01', '2016-11-01', 'UTC', '200');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314a796e527764704a43543950784c3234', '', 1, x'4953483031303030303030303034', x'49534830314b646a72743663675743553777735a4b', x'4953483031463751413551766f6d45594842384576', 'ACME_M07_CHEMO', '', '', '', '', '2016-01-24', '2016-02-10', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314435354267413456477a38596e527a56', '', 1, x'4953483031303030303030303034', x'49534830314b646a72743663675743553777735a4b', x'4953483031463751413551766f6d45594842384576', 'ACME_M07_CHEMO', '', '', '', '', '2015-05-11', '2015-05-19', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303157334746444673413476617a5175666f', '', 1, x'4953483031303030303030303034', x'49534830314b646a72743663675743553777735a4b', x'4953483031463751413551766f6d45594842384576', 'ACME_M07_RADIO', '', '', '', '', '2015-04-05', '2015-04-15', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830317375764d666f65705966684876783679', '', 1, x'4953483031303030303030303034', x'49534830317375764d666f65705966684876783679', x'4953483031463751413551766f6d45594842384576', 'BIOBANK', '', '', '', '', '2015-03-12', '2015-03-12', 'UTC', '600');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830316d426f3964393273444579734a785967', '', 1, x'4953483031303030303030303035', x'49534830316d426f3964393273444579734a785967', x'4953483031646b6f776b7633557765753855475961', 'ACME_M03', '', '', '', '', '2014-11-30', '2014-11-30', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303141354b6332674d4b70564c5669357933', '', 1, x'4953483031303030303030303035', x'495348303141354b6332674d4b70564c5669357933', x'4953483031646b6f776b7633557765753855475961', 'ACME_M03TS', '', '', '', '', '2014-11-30', '2014-11-30', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830316b72336e4e6132344378446d76774d4e', '', 1, x'4953483031303030303030303035', x'49534830316b72336e4e6132344378446d76774d4e', x'4953483031', 'ACME_M16', '', '', '', '', '2016-11-01', '2016-11-01', 'UTC', '200');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031733477374d63764d765a4b4c43364168', '', 1, x'4953483031303030303030303035', x'49534830316d426f3964393273444579734a785967', x'4953483031646b6f776b7633557765753855475961', 'ACME_M07_CHEMO', '', '', '', '', '2015-04-05', '2015-04-13', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031627154533576335771396a78646e3853', '', 1, x'4953483031303030303030303035', x'4953483031627154533576335771396a78646e3853', x'4953483031646b6f776b7633557765753855475961', 'ACME_M07_CHEMO', '', '', '', '', '2015-08-02', '2015-08-16', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031547a727954566a564a5241507a786457', '', 1, x'4953483031303030303030303035', x'4953483031547a727954566a564a5241507a786457', x'4953483031646b6f776b7633557765753855475961', 'BIOBANK', '', '', '', '', '2014-11-30', '2014-11-30', 'UTC', '600');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830316f68724d376f6f543744654a78624466', '', 1, x'4953483031303030303030303036', x'49534830316f68724d376f6f543744654a78624466', x'49534830316f7056473266556d506d486f6a525967', 'ACME_M03', '', '', '', '', '2012-04-06', '2012-04-06', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303179334e634b6237745838664b44563944', '', 1, x'4953483031303030303030303036', x'495348303179334e634b6237745838664b44563944', x'49534830316f7056473266556d506d486f6a525967', 'ACME_M03TS', '', '', '', '', '2012-04-06', '2012-04-06', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031644b5051397a35536b51794679746774', '', 1, x'4953483031303030303030303036', x'4953483031644b5051397a35536b51794679746774', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-10-23 10:12:47.928806', '2012-10-23 10:12:47.928806', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830316f58556952366b48566e423339624e47', '', 1, x'4953483031303030303030303036', x'49534830316f58556952366b48566e423339624e47', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-10-24 09:59:37.602754', '2012-10-24 09:59:37.602754', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314752746348565641504b6f4c66797650', '', 1, x'4953483031303030303030303036', x'49534830314752746348565641504b6f4c66797650', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-10-25 10:16:58.048781', '2012-10-25 10:16:58.048781', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303151566f774a325435336e38694e777235', '', 1, x'4953483031303030303030303036', x'495348303151566f774a325435336e38694e777235', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-10-26 08:27:37.220487', '2012-10-26 08:27:37.220487', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303163536e705755374e4164634164373865', '', 1, x'4953483031303030303030303036', x'495348303163536e705755374e4164634164373865', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-10-27 10:20:31.827042', '2012-10-27 10:20:31.827042', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303164683971366475757454686f39777554', '', 1, x'4953483031303030303030303036', x'495348303164683971366475757454686f39777554', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-10-28 10:11:55.522363', '2012-10-28 10:11:55.522363', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314869356f794a77367248795376333670', '', 1, x'4953483031303030303030303036', x'49534830314869356f794a77367248795376333670', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-10-29 08:50:28.449574', '2012-10-29 08:50:28.449574', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031334250347a6d78684d366a385a555736', '', 1, x'4953483031303030303030303036', x'4953483031334250347a6d78684d366a385a555736', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-10-30 09:06:23.412102', '2012-10-30 09:06:23.412102', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830313358414a4161514545617552424c4661', '', 1, x'4953483031303030303030303036', x'49534830313358414a4161514545617552424c4661', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-10-31 09:03:38.881692', '2012-10-31 09:03:38.881692', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031434c5054517a5a6669656f5066794264', '', 1, x'4953483031303030303030303036', x'4953483031434c5054517a5a6669656f5066794264', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-11-01 09:12:24.285916', '2012-11-01 09:12:24.285916', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031346d3869374e33596e4561764a556a73', '', 1, x'4953483031303030303030303036', x'4953483031346d3869374e33596e4561764a556a73', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-11-02 07:40:59.526176', '2012-11-02 07:40:59.526176', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303138387a34766b676a664a5444726e6e45', '', 1, x'4953483031303030303030303036', x'495348303138387a34766b676a664a5444726e6e45', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-11-03 09:29:02.671653', '2012-11-03 09:29:02.671653', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830316f6b7a69676e3762334e387833767853', '', 1, x'4953483031303030303030303036', x'49534830316f6b7a69676e3762334e387833767853', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-11-04 08:15:53.387160', '2012-11-04 08:15:53.387160', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303139323532713662483952437950626164', '', 1, x'4953483031303030303030303036', x'495348303139323532713662483952437950626164', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-11-05 07:39:18.903373', '2012-11-05 07:39:18.903373', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303139744354706178705838625673596870', '', 1, x'4953483031303030303030303036', x'495348303139744354706178705838625673596870', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-11-06 08:18:37.644625', '2012-11-06 08:18:37.644625', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303175417673724d473950724e324b36646d', '', 1, x'4953483031303030303030303036', x'495348303175417673724d473950724e324b36646d', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-11-07 10:01:32.467732', '2012-11-07 10:01:32.467732', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031503975715878586e564e7a716273666f', '', 1, x'4953483031303030303030303036', x'4953483031503975715878586e564e7a716273666f', x'49534830316f7056473266556d506d486f6a525967', 'Weight Measurement', '', '', '', '', '2012-11-08 07:46:03.561717', '2012-11-08 07:46:03.561717', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303138636a415738686e367966394e426a76', '', 1, x'4953483031303030303030303036', x'49534830316f68724d376f6f543744654a78624466', x'49534830316f7056473266556d506d486f6a525967', 'ACME_M07_CHEMO', '', '', '', '', '2012-10-23', '2012-11-09', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303164546f616a796475483274337a543548', '', 1, x'4953483031303030303030303036', x'49534830316f68724d376f6f543744654a78624466', x'49534830316f7056473266556d506d486f6a525967', 'ACME_M07_CHEMO', '', '', '', '', '2012-07-15', '2012-08-01', 'UTC', '300');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031416755523359713754327a7967563638', '', 1, x'4953483031303030303030303036', x'4953483031416755523359713754327a7967563638', x'49534830316f7056473266556d506d486f6a525967', 'ACME_M07_RADIO', '', '', '', '', '2014-06-16', '2014-07-04', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830315347594d5a74547969346b6664327457', '', 1, x'4953483031303030303030303036', x'49534830315347594d5a74547969346b6664327457', x'49534830316f7056473266556d506d486f6a525967', 'BIOBANK', '', '', '', '', '2012-04-06', '2012-04-06', 'UTC', '600');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830317934724a41384b70436265505a353544', '', 1, x'4953483031303030303030303037', x'49534830317934724a41384b70436265505a353544', x'49534830314c416636594e35573453353753713945', 'ACME_M03', '', '', '', '', '2016-04-30', '2016-04-30', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830314b6f68466158736a4a7938526d415634', '', 1, x'4953483031303030303030303037', x'49534830314b6f68466158736a4a7938526d415634', x'49534830314c416636594e35573453353753713945', 'ACME_M03TS', '', '', '', '', '2016-04-30', '2016-04-30', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031676d61734b6862625571775666356865', '', 1, x'4953483031303030303030303037', x'4953483031676d61734b6862625571775666356865', x'4953483031', 'ACME_M16', '', '', '', '', '2016-11-01', '2016-11-01', 'UTC', '200');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303133554238356d3947517336545a747073', '', 1, x'4953483031303030303030303037', x'495348303133554238356d3947517336545a747073', x'49534830314c416636594e35573453353753713945', 'ACME_M07_RADIO', '', '', '', '', '2016-05-09', '2016-05-19', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303141434646566247325250617868586467', '', 1, x'4953483031303030303030303037', x'495348303141434646566247325250617868586467', x'49534830314c416636594e35573453353753713945', 'ACME_M07_SURGERY', '', '', '', '', '2016-06-11', '2016-06-11', 'UTC', '500');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031736f51513765353544424d343241374e', '', 1, x'4953483031303030303030303037', x'4953483031736f51513765353544424d343241374e', x'49534830314c416636594e35573453353753713945', 'BIOBANK', '', '', '', '', '2016-04-30', '2016-04-30', 'UTC', '600');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830315038477a356450664d68576675624135', '', 1, x'4953483031303030303030303038', x'49534830315038477a356450664d68576675624135', x'49534830314578396936477a446555545743713746', 'ACME_M03', '', '', '', '', '2016-10-02', '2016-10-02', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830316a744a4e74396d376869787257444159', '', 1, x'4953483031303030303030303038', x'49534830316a744a4e74396d376869787257444159', x'49534830314578396936477a446555545743713746', 'ACME_M03TS', '', '', '', '', '2016-10-02', '2016-10-02', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303146324d48535071744251426679446d4b', '', 1, x'4953483031303030303030303038', x'49534830315038477a356450664d68576675624135', x'49534830314578396936477a446555545743713746', 'ACME_M07_RADIO', '', '', '', '', '2016-10-06', '2016-10-20', 'UTC', '400');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'49534830315346525452624a373638584e70576979', '', 1, x'4953483031303030303030303038', x'49534830315346525452624a373638584e70576979', x'49534830314578396936477a446555545743713746', 'BIOBANK', '', '', '', '', '2016-10-02', '2016-10-02', 'UTC', '600');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'4953483031626e506b374a676a533648444a704474', '', 1, x'4953483031303030303030303039', x'4953483031626e506b374a676a533648444a704474', x'495348303155503973325775365a64345069546a41', 'ACME_M03', '', '', '', '', '2015-12-03', '2015-12-03', 'UTC', '100');
INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom", DWID, "DWDateTo", "DWAuditID", "DWID_Patient", "DWID_ParentInteraction", "DWID_Condition", "InteractionType.OriginalValue", "InteractionType.Code", "InteractionType.CodeSystem", "InteractionType.CodeSystemVersion", "InteractionStatus", "PeriodStart", "PeriodEnd", "PeriodTimezone", "OrgID") VALUES('1900-01-05', x'495348303153753863386175443236593236577652', '', 1, x'4953483031303030303030303039', x'495348303153753863386175443236593236577652', x'495348303155503973325775365a64345069546a41', 'ACME_M03TS', '', '', '', '', '2015-12-03', '2015-12-03', 'UTC', '100');