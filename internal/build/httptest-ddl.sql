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

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWDocuments.Document_Attr.fti_title" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Attr" ("Title") ASYNC LANGUAGE DETECTION ('en') PHRASE INDEX RATIO 0.200000 FUZZY SEARCH INDEX ON
SEARCH ONLY ON
FAST PREPROCESS OFF TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWDocuments.Document_Attr.fti_author" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWDocuments.Document_Attr" ("Author") ASYNC LANGUAGE DETECTION ('en') PHRASE INDEX RATIO 0.200000 FUZZY SEARCH INDEX ON
SEARCH ONLY ON
FAST PREPROCESS OFF TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWDocuments.Document_Attr.fti_filename" ON
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

CREATE CPBTREE INDEX "legacy.cdw.db.models::DWEntities.Condition_Attr.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Condition_Attr" ( "DWDateTo" ASC );

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Condition_Attr.ftiOnDescription" ON
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

CREATE CPBTREE INDEX "legacy.cdw.db.models::DWEntities.Interactions_Attr.DWDateTo" ON
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

CREATE CPBTREE INDEX "legacy.cdw.db.models::DWEntities.Observations_Attr.DWDateTo" ON
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

CREATE CPBTREE INDEX "legacy.cdw.db.models::DWEntities.Patient_Attr.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Attr" ( "DWDateTo" ASC );

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Patient_Attr.ftiOnFamilyName" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Attr" ("FamilyName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Patient_Attr.ftiOnGivenName" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Attr" ("GivenName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Patient_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"PatientID" NVARCHAR(100) NOT NULL ,
PRIMARY KEY ("DWID")) UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Patient_Key.ftiOnPatientID" ON
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

CREATE CPBTREE INDEX "legacy.cdw.db.models::DWEntities.Practitioner_Attr.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" ( "DWDateTo" ASC );

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Practitioner_Attr.ftiOnFamilyName" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" ("FamilyName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Practitioner_Attr.ftiOnGivenName" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" ("GivenName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"PractitionerID" NVARCHAR(100) NOT NULL ,
PRIMARY KEY ("DWID")) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" AS "Practitioner_Attr_Assoc" ON "Practitioner_Attr_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Practitioner_Key.ftiOnPractitionerID" ON
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

CREATE CPBTREE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ( "DWDateTo" ASC );

CREATE CPBTREE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details.DWID" ON
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

CREATE CPBTREE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ( "DWDateTo" ASC );

CREATE CPBTREE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures.DWID" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ( "DWID" ASC );




CREATE COLUMN TABLE "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ("DWDateFrom" LONGDATE CS_LONGDATE,
"DWID" VARBINARY(32) CS_RAW,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"InteractionTextID" NVARCHAR(100),
"Attribute" NVARCHAR(100),
"Value" NVARCHAR(5000),
"Lang" NVARCHAR(50)) WITH ASSOCIATIONS( JOIN "HTTPTEST_SCHEMA"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON "Audit_Assoc"."AuditLogID" = "DWAuditID", JOIN "HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON "Interactions_Key_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE CPBTREE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ( "DWDateTo" ASC );

CREATE CPBTREE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text.DWID" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ( "DWID" ASC );

CREATE CPBTREE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text.InteractionTextID" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ( "InteractionTextID" ASC );

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text.ftiOnValue" ON
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

CREATE FULLTEXT INDEX "legacy.cdw.db.models::Ref.Codes.ftiOnDescription" ON
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

CREATE CPBTREE INDEX "legacy.cdw.db.models::Ref.PatientBestRecord.DWDateTo" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::Ref.PatientBestRecord" ( "DWDateTo" ASC );

CREATE FULLTEXT INDEX "legacy.cdw.db.models::Ref.PatientBestRecord.ftiOnFamilyName" ON
"HTTPTEST_SCHEMA"."legacy.cdw.db.models::Ref.PatientBestRecord" ("FamilyName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::Ref.PatientBestRecord.ftiOnGivenName" ON
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

CREATE FULLTEXT INDEX "legacy.collections.db.models::CollectionModel.Collection.CollectionTitle" ON
"HTTPTEST_SCHEMA"."legacy.collections.db.models::CollectionModel.Collection" ("Title") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX "legacy.collections.db.models::CollectionModel.Collection.CollectionDesc" ON
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

CREATE FULLTEXT INDEX "legacy.collections.db.models::CollectionModel.Comment.CommentText" ON
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

CREATE FULLTEXT INDEX "legacy.ots.internal::Entities.ConceptTerms.ftiOnText" ON
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


