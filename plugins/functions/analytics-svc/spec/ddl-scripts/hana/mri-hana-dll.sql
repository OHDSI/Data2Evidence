DROP SCHEMA <TEST_SCHEMA> CASCADE;
CREATE SCHEMA <TEST_SCHEMA>;

--------

-- <TEST_SCHEMA>."legacy.cdw.db.models::Config.ChangeLog" definition

CREATE TYPE "<TEST_SCHEMA>"."legacy.cdw.db.models::Config.ChangeLog" AS TABLE ( "CreatedBy" NVARCHAR(256) CS_STRING,
"CreatedAt" LONGDATE CS_LONGDATE,
"ChangedBy" NVARCHAR(256) CS_STRING,
"ChangedAt" LONGDATE CS_LONGDATE );


-- <TEST_SCHEMA>."legacy.cdw.db.models::Config.Org" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::Config.Org" ("OrgID" NVARCHAR(100) NOT NULL ,
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


-- <TEST_SCHEMA>."legacy.cdw.db.models::Config.OrgAncestors" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::Config.OrgAncestors" ("OrgID" NVARCHAR(100) NOT NULL ,
"AncestorOrgID" NVARCHAR(100) NOT NULL ,
"Distance" INTEGER CS_INT,
PRIMARY KEY ("OrgID",
"AncestorOrgID")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::Config.OrgAttrEAV" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::Config.OrgAttrEAV" ("OrgID" NVARCHAR(100) NOT NULL ,
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
"Attribute")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::Config.Org" AS "Org_Assoc" ON
"Org_Assoc"."OrgID" = "OrgID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::Config.OrgTexts" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::Config.OrgTexts" ("OrgID" NVARCHAR(100) NOT NULL ,
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
"ValidFrom")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::Config.Org" AS "Org_Assoc" ON
"Org_Assoc"."OrgID" = "OrgID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::Config.UserOrgMapping" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::Config.UserOrgMapping" ("UserName" NVARCHAR(256),
"OrgID" NVARCHAR(100),
"ChangeDetails.CreatedBy" NVARCHAR(256),
"ChangeDetails.CreatedAt" LONGDATE CS_LONGDATE,
"ChangeDetails.ChangedBy" NVARCHAR(256),
"ChangeDetails.ChangedAt" LONGDATE CS_LONGDATE) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::Config.Org" AS "Org_Assoc" ON
"Org_Assoc"."OrgID" = "OrgID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWDocuments.Document_Attr" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
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
"DWID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Type" AS "Document_Type_Assoc" ON
"Document_Type_Assoc"."DWDocumentType" = "Type",
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Key" AS "Document_Key_Assoc" ON
"Document_Key_Assoc"."DWID" = "DWID",
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON
"Audit_Assoc"."AuditLogID" = "DWAuditID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWDocuments.Document_Attr.fti_title" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Attr" ("Title") ASYNC LANGUAGE DETECTION ('en') PHRASE INDEX RATIO 0.200000 FUZZY SEARCH INDEX ON
SEARCH ONLY ON
FAST PREPROCESS OFF TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWDocuments.Document_Attr.fti_author" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Attr" ("Author") ASYNC LANGUAGE DETECTION ('en') PHRASE INDEX RATIO 0.200000 FUZZY SEARCH INDEX ON
SEARCH ONLY ON
FAST PREPROCESS OFF TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWDocuments.Document_Attr.fti_filename" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Attr" ("FileName") ASYNC LANGUAGE DETECTION ('en') PHRASE INDEX RATIO 0.200000 FUZZY SEARCH INDEX ON
SEARCH ONLY ON
FAST PREPROCESS OFF TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWDocuments.Document_Key" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"DocumentID" NVARCHAR(1024) NOT NULL ,
PRIMARY KEY ("DWID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Attr" AS "Document_Attr_Assoc" ON
"Document_Attr_Assoc"."DWID" = "DWID",
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON
"Audit_Assoc"."AuditLogID" = "DWAuditID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWDocuments.Document_Type" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Type" ("DWDocumentType" NVARCHAR(128) NOT NULL ,
"TAConfiguration" NVARCHAR(256),
PRIMARY KEY ("DWDocumentType")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Type_Description" AS "Document_Type_Description_Assoc" ON
"Document_Type_Description_Assoc"."DWDocumentType" = "DWDocumentType") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWDocuments.Document_Type_Description" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Type_Description" ("DWDocumentType" NVARCHAR(128) NOT NULL ,
"LanguageCode" NVARCHAR(2) NOT NULL ,
"ShortText" NVARCHAR(128),
PRIMARY KEY ("DWDocumentType",
"LanguageCode")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Type" AS "Document_Type_Assoc" ON
"Document_Type_Assoc"."DWDocumentType" = "DWDocumentType") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWDocuments.Interaction_Documents_Link" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Interaction_Documents_Link" ("DWLinkID" VARBINARY(32) CS_RAW NOT NULL ,
"DWID_Interaction" VARBINARY(32) CS_RAW NOT NULL ,
"DWID_Document" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
PRIMARY KEY ("DWLinkID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Interaction_Documents_Link_Attr" AS "Link_Attr_Assoc" ON
"Link_Attr_Assoc"."DWLinkID" = "DWLinkID",
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Key" AS "Documents_Key_Assoc" ON
"Documents_Key_Assoc"."DWID" = "DWID_Document",
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON
"Interactions_Key_Assoc"."DWID" = "DWID_Interaction",
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON
"Audit_Assoc"."AuditLogID" = "DWAuditID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWDocuments.Interaction_Documents_Link_Attr" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Interaction_Documents_Link_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
"DWLinkID" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"LinkType" NVARCHAR(256),
PRIMARY KEY ("DWDateFrom",
"DWLinkID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON
"Audit_Assoc"."AuditLogID" = "DWAuditID",
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Interaction_Documents_Link" AS "Interaction_Documents_Link_Assoc" ON
"Interaction_Documents_Link_Assoc"."DWLinkID" = "DWLinkID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWDocuments.PropertySet" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.PropertySet" ("SetID" NVARCHAR(128) NOT NULL ,
"PropertyName" NVARCHAR(128) NOT NULL ,
"PropertyValue" NVARCHAR(256),
PRIMARY KEY ("SetID",
"PropertyName")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWDocuments.TA_Document_Interactions_Link" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.TA_Document_Interactions_Link" ("DWLinkID" VARBINARY(32) CS_RAW NOT NULL ,
"DWID_Interaction" VARBINARY(32) CS_RAW NOT NULL ,
"DWID_Document" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"PluginID" NVARCHAR(256),
PRIMARY KEY ("DWLinkID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON
"Audit_Assoc"."AuditLogID" = "DWAuditID",
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWDocuments.Document_Key" AS "Documents_Key_Assoc" ON
"Documents_Key_Assoc"."DWID" = "DWID_Document",
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON
"Interactions_Key_Assoc"."DWID" = "DWID_Interaction") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntities.Condition_Attr" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Condition_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
"DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"ConditionType" NVARCHAR(100),
"Description" NVARCHAR(5000),
PRIMARY KEY ("DWDateFrom",
"DWID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Condition_Key" AS "Condition_Key_Assoc" ON
"Condition_Key_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE INDEX "legacy.cdw.db.models::DWEntities.Condition_Attr.DWDateTo" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Condition_Attr" ( "DWDateTo" ASC );

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Condition_Attr.ftiOnDescription" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Condition_Attr" ("Description") SYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY ON
FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntities.Condition_Key" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Condition_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"ConditionID" NVARCHAR(100) NOT NULL ,
PRIMARY KEY ("DWID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Condition_Attr" AS "Condition_Attr_Assoc" ON
"Condition_Attr_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntities.Interactions_Attr" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Interactions_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
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
"DWID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "ParentInteractions_Key_Assoc" ON
"ParentInteractions_Key_Assoc"."DWID" = "DWID_ParentInteraction",
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON
"Interactions_Key_Assoc"."DWID" = "DWID",
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Condition_Key" AS "Condition_Key_Assoc" ON
"Condition_Key_Assoc"."DWID" = "DWID_Condition",
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Key" AS "Patient_Key_Assoc" ON
"Patient_Key_Assoc"."DWID" = "DWID_Patient") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE INDEX "legacy.cdw.db.models::DWEntities.Interactions_Attr.DWDateTo" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Interactions_Attr" ( "DWDateTo" ASC );


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntities.Interactions_Key" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Interactions_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"InteractionID" NVARCHAR(100) NOT NULL ,
PRIMARY KEY ("DWID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Interactions_Attr" AS "Interactions_Attr_Assoc" ON
"Interactions_Attr_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntities.Observations_Attr" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Observations_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
"DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"DWID_Patient" VARBINARY(32) CS_RAW,
"ObsType" NVARCHAR(100),
"ObsCharValue" NVARCHAR(255),
"ObsNumValue" DECIMAL(34,
10) CS_FIXED,
"ObsUnit" NVARCHAR(100),
"ObsTime" LONGDATE CS_LONGDATE,
"OrgID" NVARCHAR(100),
PRIMARY KEY ("DWDateFrom",
"DWID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Key" AS "Patient_Key_Assoc" ON
"Patient_Key_Assoc"."DWID" = "DWID_Patient",
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Observations_Key" AS "Observations_Key_Assoc" ON
"Observations_Key_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE INDEX "legacy.cdw.db.models::DWEntities.Observations_Attr.DWDateTo" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Observations_Attr" ( "DWDateTo" ASC );


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntities.Observations_Key" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Observations_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"ObsID" NVARCHAR(100) NOT NULL ,
PRIMARY KEY ("DWID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Observations_Attr" AS "Observations_Attr_Assoc" ON
"Observations_Attr_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntities.Patient_Attr" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
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
"ValidFrom")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Key" AS "Patient_Key_Assoc" ON
"Patient_Key_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE INDEX "legacy.cdw.db.models::DWEntities.Patient_Attr.DWDateTo" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Attr" ( "DWDateTo" ASC );

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Patient_Attr.ftiOnFamilyName" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Attr" ("FamilyName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Patient_Attr.ftiOnGivenName" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Attr" ("GivenName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntities.Patient_Key" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"PatientID" NVARCHAR(100) NOT NULL ,
PRIMARY KEY ("DWID")) UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Patient_Key.ftiOnPatientID" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Key" ("PatientID") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link" ("DWLinkID" VARBINARY(32) CS_RAW NOT NULL ,
"DWID_Patient" VARBINARY(32) CS_RAW NOT NULL ,
"DWID_Practitioner" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
PRIMARY KEY ("DWLinkID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link_Attr" AS "Patient_Practitioner_Link_Attr_Assoc" ON
"Patient_Practitioner_Link_Attr_Assoc"."DWLinkID" = "DWLinkID",
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Practitioner_Key" AS "Practitioner_Key_Assoc" ON
"Practitioner_Key_Assoc"."DWID" = "DWID_Practitioner",
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Key" AS "Patient_Key_Assoc" ON
"Patient_Key_Assoc"."DWID" = "DWID_Patient") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link_Attr" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
"DWLinkID" VARBINARY(32) CS_RAW NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"Role.OriginalValue" NVARCHAR(100),
"Role.Code" NVARCHAR(100),
"Role.CodeSystem" NVARCHAR(100),
"Role.CodeSystemVersion" NVARCHAR(100),
PRIMARY KEY ("DWDateFrom",
"DWLinkID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link" AS "Practitioner_Link_Assoc" ON
"Practitioner_Link_Assoc"."DWLinkID" = "DWLinkID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntities.Practitioner_Attr" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
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
"ValidFrom")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Practitioner_Key" AS "Practitioner_Key_Assoc" ON
"Practitioner_Key_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE INDEX "legacy.cdw.db.models::DWEntities.Practitioner_Attr.DWDateTo" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" ( "DWDateTo" ASC );

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Practitioner_Attr.ftiOnFamilyName" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" ("FamilyName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Practitioner_Attr.ftiOnGivenName" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" ("GivenName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntities.Practitioner_Key" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Practitioner_Key" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWSource" NVARCHAR(5) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"PractitionerID" NVARCHAR(100) NOT NULL ,
PRIMARY KEY ("DWID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Practitioner_Attr" AS "Practitioner_Attr_Assoc" ON
"Practitioner_Attr_Assoc"."DWID" = "DWID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntities.Practitioner_Key.ftiOnPractitionerID" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Practitioner_Key" ("PractitionerID") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ("DWDateFrom" LONGDATE CS_LONGDATE,
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
"ValueVocabularyID" NVARCHAR(100)) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON
"Interactions_Key_Assoc"."DWID" = "DWID",
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON
"Audit_Assoc"."AuditLogID" = "DWAuditID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details.DWDateTo" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ( "DWDateTo" ASC );

CREATE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details.DWID" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" ( "DWID" ASC );


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ("DWDateFrom" LONGDATE CS_LONGDATE,
"DWID" VARBINARY(32) CS_RAW,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"Attribute.OriginalValue" NVARCHAR(100),
"Attribute.Code" NVARCHAR(100),
"Attribute.CodeSystem" NVARCHAR(100),
"Attribute.CodeSystemVersion" NVARCHAR(100),
"Unit" NVARCHAR(100),
"Value" DECIMAL(34,
10) CS_FIXED) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON
"Interactions_Key_Assoc"."DWID" = "DWID",
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON
"Audit_Assoc"."AuditLogID" = "DWAuditID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures.DWDateTo" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ( "DWDateTo" ASC );

CREATE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures.DWID" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" ( "DWID" ASC );


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ("DWDateFrom" LONGDATE CS_LONGDATE,
"DWID" VARBINARY(32) CS_RAW,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
"DWDateTo" LONGDATE CS_LONGDATE,
"InteractionTextID" NVARCHAR(100),
"Attribute" NVARCHAR(100),
"Value" NVARCHAR(5000),
"Lang" NVARCHAR(50)) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Interactions_Key" AS "Interactions_Key_Assoc" ON
"Interactions_Key_Assoc"."DWID" = "DWID",
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" AS "Audit_Assoc" ON
"Audit_Assoc"."AuditLogID" = "DWAuditID") UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text.DWDateTo" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ( "DWDateTo" ASC );

CREATE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text.DWID" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ( "DWID" ASC );

CREATE INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text.InteractionTextID" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ( "InteractionTextID" ASC );

CREATE FULLTEXT INDEX "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text.ftiOnValue" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" ("Value") SYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY ON
FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;


-- <TEST_SCHEMA>."legacy.cdw.db.models::DWTypes.Address" definition

CREATE TYPE "<TEST_SCHEMA>"."legacy.cdw.db.models::DWTypes.Address" AS TABLE ( "StreetName" NVARCHAR(200) CS_STRING,
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

-- <TEST_SCHEMA>."legacy.cdw.db.models::Ref.Codes" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::Ref.Codes" ("CodesID" NVARCHAR(100) NOT NULL ,
"Catalog" NVARCHAR(100),
"Version" NVARCHAR(50),
"Code" NVARCHAR(100),
"Lang" NVARCHAR(50),
"Description" NVARCHAR(5000),
PRIMARY KEY ("CodesID")) UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::Ref.Codes.ftiOnDescription" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::Ref.Codes" ("Description") SYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY ON
FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;


-- <TEST_SCHEMA>."legacy.cdw.db.models::Ref.PatientBestRecord" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.cdw.db.models::Ref.PatientBestRecord" ("DWDateFrom" LONGDATE CS_LONGDATE NOT NULL ,
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

CREATE INDEX "legacy.cdw.db.models::Ref.PatientBestRecord.DWDateTo" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::Ref.PatientBestRecord" ( "DWDateTo" ASC );

CREATE FULLTEXT INDEX "legacy.cdw.db.models::Ref.PatientBestRecord.ftiOnFamilyName" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::Ref.PatientBestRecord" ("FamilyName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX "legacy.cdw.db.models::Ref.PatientBestRecord.ftiOnGivenName" ON
"<TEST_SCHEMA>"."legacy.cdw.db.models::Ref.PatientBestRecord" ("GivenName") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.CohortsStatusConfig" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.CohortsStatusConfig" ("Id" NVARCHAR(32) NOT NULL ,
"CollectionType.Id" NVARCHAR(32),
"ItemType" NVARCHAR(1024) DEFAULT '',
"TextKey" NVARCHAR(1024) NOT NULL ,
"IconSource" NVARCHAR(256),
"Language" NVARCHAR(32)) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.Item" AS "Items" ON
"Items"."Status.Id" = "Id") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.Collection" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.Collection" ("Id" NVARCHAR(32) NOT NULL ,
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
"<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.Collection" ("Title") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;

CREATE FULLTEXT INDEX "legacy.collections.db.models::CollectionModel.Collection.CollectionDesc" ON
"<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.Collection" ("Description") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.CollectionType" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.CollectionType" ("Id" NVARCHAR(32) NOT NULL ,
"TitleKey" NVARCHAR(256) NOT NULL ,
"DescriptionKey" NVARCHAR(4096),
PRIMARY KEY ("Id")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.Comment" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.Comment" ("Id" NVARCHAR(32) NOT NULL ,
"Collection.Id" NVARCHAR(32) NOT NULL ,
"Item.Id" NVARCHAR(100) NOT NULL ,
"Text" NVARCHAR(1024) NOT NULL ,
"Type" NVARCHAR(1024) NOT NULL ,
"CreatedBy" NVARCHAR(256) NOT NULL ,
"CreatedAt" LONGDATE CS_LONGDATE NOT NULL ,
PRIMARY KEY ("Id")) UNLOAD PRIORITY 5 AUTO MERGE ;

CREATE FULLTEXT INDEX "legacy.collections.db.models::CollectionModel.Comment.CommentText" ON
"<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.Comment" ("Text") ASYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX ON
SEARCH ONLY OFF FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.Item" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.Item" ("Id" NVARCHAR(100) NOT NULL ,
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


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.Participant" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.Participant" ("HANAUserName" NVARCHAR(256) NOT NULL ,
"Collection.Id" NVARCHAR(32) NOT NULL ,
"Privilege.Id" NVARCHAR(32) NOT NULL ,
"CreatedBy" NVARCHAR(256),
"CreatedAt" LONGDATE CS_LONGDATE,
"ChangedBy" NVARCHAR(256),
"ChangedAt" LONGDATE CS_LONGDATE,
PRIMARY KEY ("HANAUserName",
"Collection.Id")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.ParticipantPrivilege" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.ParticipantPrivilege" ("Id" NVARCHAR(32) NOT NULL ,
"LanguageIsoCode" NVARCHAR(2) NOT NULL ,
"Title" NVARCHAR(256) NOT NULL ,
"Description" NVARCHAR(1024),
PRIMARY KEY ("Id",
"LanguageIsoCode")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.Status" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.Status" ("Id" NVARCHAR(32) NOT NULL ,
"Title" NVARCHAR(256) NOT NULL ,
"Description" NVARCHAR(1024) NOT NULL ,
"LanguageIsoCode" NVARCHAR(2) NOT NULL ,
PRIMARY KEY ("Id")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.StatusConfiguration" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.StatusConfiguration" ("Id" NVARCHAR(32) NOT NULL ,
"CollectionType.Id" NVARCHAR(32) NOT NULL ,
"ItemType" NVARCHAR(1024) DEFAULT '' NOT NULL ,
"TextKey" NVARCHAR(1024) NOT NULL ,
"IconSource" NVARCHAR(256),
PRIMARY KEY ("Id",
"CollectionType.Id",
"ItemType")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.collections.db.models::CollectionModel.Item" AS "Items" ON
"Items"."Status.Id" = "Id") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.config.db.models::Configuration.AssignmentDetail" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.config.db.models::Configuration.AssignmentDetail" ("Header.Id" NVARCHAR(40) NOT NULL ,
"Config.Id" NVARCHAR(40) NOT NULL ,
"Config.Version" NVARCHAR(20) NOT NULL ,
"Config.Type" NVARCHAR(20) NOT NULL ) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.config.db.models::Configuration.Config" AS "Config" ON
"Config"."Id" = "Config.Id"
AND "Config"."Version" = "Config.Version"
AND "Config"."Type" = "Config.Type",
JOIN "<TEST_SCHEMA>"."legacy.config.db.models::Configuration.AssignmentHeader" AS "Header" ON
"Header"."Id" = "Header.Id") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.config.db.models::Configuration.AssignmentHeader" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.config.db.models::Configuration.AssignmentHeader" ("Id" NVARCHAR(40) NOT NULL ,
"Name" NVARCHAR(256) DEFAULT '',
"EntityType" NVARCHAR(1) NOT NULL ,
"EntityValue" NVARCHAR(256) NOT NULL ,
"Creator" NVARCHAR(256) NOT NULL ,
"Created" LONGDATE CS_LONGDATE NOT NULL ,
"Modifier" NVARCHAR(256) NOT NULL ,
"Modified" LONGDATE CS_LONGDATE NOT NULL ,
PRIMARY KEY ("Id")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.config.db.models::Configuration.Config" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.config.db.models::Configuration.Config" ("Id" NVARCHAR(40) NOT NULL ,
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
"Version")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.config.db.models::Configuration.Config" AS "Parent" ON
"Parent"."Id" = "Parent.Id"
AND "Parent"."Version" = "Parent.Version") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.config.db.models::Configuration.Template" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.config.db.models::Configuration.Template" ("Id" NVARCHAR(40) NOT NULL ,
"System" NVARCHAR(40) NOT NULL ,
"Data" NCLOB MEMORY THRESHOLD 1000,
"Creator" NVARCHAR(256),
"Created" LONGDATE CS_LONGDATE,
"Modifier" NVARCHAR(256),
"Modified" LONGDATE CS_LONGDATE,
PRIMARY KEY ("Id")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.config.db.models::Configuration.UserDefaultConfig" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.config.db.models::Configuration.UserDefaultConfig" ("User" NVARCHAR(256) NOT NULL ,
"ConfigType" NVARCHAR(20) NOT NULL ,
"Config.Id" NVARCHAR(40) NOT NULL ,
"Config.Version" NVARCHAR(20) NOT NULL ,
PRIMARY KEY ("User",
"ConfigType")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.config.db.models::Configuration.Config" AS "Config" ON
"Config"."Id" = "Config.Id"
AND "Config"."Version" = "Config.Version") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.AuditLog" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" ("AuditLogID" BIGINT CS_FIXED NOT NULL ,
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
PRIMARY KEY ("AuditLogID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLogTrace" AS "ToAuditLogTrace" ON
"ToAuditLogTrace"."AuditLogID" = "AuditLogID",
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" AS "ToAuditLog" ON
"ToAuditLog"."ParentAuditLogID" = "AuditLogID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.AuditLogCount" definition

CREATE TYPE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLogCount" AS TABLE ( "ALLRUNS" INT CS_INT,
"RUNNING" INT CS_INT,
"FAILED" INT CS_INT,
"QUEUED" INT CS_INT,
"CANCELLED" INT CS_INT,
"CLEANEDUP" INT CS_INT,
"COMPLETED" INT CS_INT );


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.AuditLogTrace" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLogTrace" ("AuditLogID" BIGINT CS_FIXED NOT NULL ,
"LogTraceID" NVARCHAR(256) NOT NULL ,
"Status" NVARCHAR(16),
"Timestamp" LONGDATE CS_LONGDATE,
"Location" NVARCHAR(512),
"Text" NVARCHAR(5000),
PRIMARY KEY ("AuditLogID",
"LogTraceID")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.CdtAdapterLog" definition

CREATE TYPE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.CdtAdapterLog" AS TABLE ( "LOGDETAILID" NVARCHAR(32) CS_STRING,
"DOCUMENTID" NVARCHAR(1024) CS_STRING,
"DOCUMENTTYPE" NVARCHAR(512) CS_STRING,
"DOCUMENTSIZE" NVARCHAR(512) CS_STRING,
"DOCUMENTLASTUPDATED" LONGDATE CS_LONGDATE,
"STATUS" NVARCHAR(16) CS_STRING,
"NOTES" NVARCHAR(1024) CS_STRING,
"STARTTIME" LONGDATE CS_LONGDATE,
"ENDTIME" LONGDATE CS_LONGDATE );


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.CdtAdapterTrace" definition

CREATE TYPE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.CdtAdapterTrace" AS TABLE ( "LOGDETAILID" NVARCHAR(32) CS_STRING,
"LOGTRACEID" NVARCHAR(32) CS_STRING,
"LOGSTATUS" NVARCHAR(16) CS_STRING,
"LOGTIMESTAMP" LONGDATE CS_LONGDATE,
"LOGLOCATION" NVARCHAR(512) CS_STRING,
"LOGMESSAGE" NVARCHAR(5000) CS_STRING );


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.DIExtension" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.DIExtension" ("ExtensionID" NVARCHAR(256) NOT NULL ,
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
PRIMARY KEY ("ExtensionID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.JobProfile" AS "ToJobProfile" ON
"ToJobProfile"."ExtensionID" = "ExtensionID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.DIJobScheduleConfig" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.DIJobScheduleConfig" ("ScheduleConfigID" BIGINT CS_FIXED NOT NULL ,
"Name" NVARCHAR(512),
"Description" NVARCHAR(1024),
"ScheduleConfigJSON" NCLOB MEMORY THRESHOLD 1000,
"CreatedAt" LONGDATE CS_LONGDATE,
"CreatedBy" NVARCHAR(512),
"ModifiedAt" LONGDATE CS_LONGDATE,
"ModifiedBy" NVARCHAR(512),
PRIMARY KEY ("ScheduleConfigID")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.DIJobScheduleMonitor" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.DIJobScheduleMonitor" ("ScheduleConfigID" BIGINT CS_FIXED NOT NULL ,
"MonitorID" BIGINT CS_FIXED NOT NULL ,
"XSScheduleID" BIGINT CS_FIXED,
"XSScheduleRunStatus" NVARCHAR(16),
"StartedAt" LONGDATE CS_LONGDATE,
"EndedAt" LONGDATE CS_LONGDATE,
"ProfileID" BIGINT CS_FIXED,
PRIMARY KEY ("ScheduleConfigID",
"MonitorID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" AS "ToAuditLogMonitorID" ON
"ToAuditLogMonitorID"."MonitorID" = "MonitorID",
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" AS "ToAuditLog" ON
"ToAuditLog"."ScheduleConfigID" = "ScheduleConfigID",
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.DIJobScheduleConfig" AS "ToDIJobScheduleConfig" ON
"ToDIJobScheduleConfig"."ScheduleConfigID" = "ScheduleConfigID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.DISource" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.DISource" ("SourceID" NVARCHAR(5) NOT NULL ,
"Name" NVARCHAR(512),
"Description" NVARCHAR(1024),
"CreatedAt" LONGDATE CS_LONGDATE,
"CreatedBy" NVARCHAR(512),
"ModifiedAt" LONGDATE CS_LONGDATE,
"ModifiedBy" NVARCHAR(512),
PRIMARY KEY ("SourceID")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.EmailQueue" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.EmailQueue" ("NotificationID" BIGINT CS_FIXED NOT NULL ,
"Status" NVARCHAR(16),
"UserID" NVARCHAR(512),
"Subject" NVARCHAR(1024),
"EmailText" NVARCHAR(1024),
"AuditLogID" BIGINT CS_FIXED,
"MonitorID" BIGINT CS_FIXED,
PRIMARY KEY ("NotificationID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" AS "ToAuditLog" ON
"ToAuditLog"."AuditLogID" = "AuditLogID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.Extensions" definition

CREATE TYPE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.Extensions" AS TABLE ( "EXTENSIONID" NVARCHAR(256) CS_STRING );


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.JobProfile" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.JobProfile" ("ProfileID" BIGINT CS_FIXED NOT NULL ,
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
PRIMARY KEY ("ProfileID")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.DISource" AS "ToDISource" ON
"ToDISource"."SourceID" = "SourceID",
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.AuditLog" AS "ToAuditLog" ON
"ToAuditLog"."ProfileID" = "ProfileID",
JOIN "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.DIJobScheduleConfig" AS "ToDIJobScheduleConfig" ON
"ToDIJobScheduleConfig"."ScheduleConfigID" = "ScheduleConfigID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.MonitorRun" definition

CREATE TYPE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.MonitorRun" AS TABLE ( "ProfileName" NVARCHAR(512) CS_STRING,
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


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.RunInfo" definition

CREATE TYPE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.RunInfo" AS TABLE ( "ProfileName" NVARCHAR(512) CS_STRING,
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


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.ScheduleSyncHistory" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.ScheduleSyncHistory" ("LastSyncedAt" LONGDATE CS_LONGDATE) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.Schedules" definition

CREATE TYPE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.Schedules" AS TABLE ( "MonitorID" BIGINT CS_FIXED,
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


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.SchedulesCount" definition

CREATE TYPE "<TEST_SCHEMA>"."legacy.di.db.model::DataIntegration.SchedulesCount" AS TABLE ( "ALLSCHEDULES" INT CS_INT,
"ACTIVE" INT CS_INT,
"INACTIVE" INT CS_INT,
"COMPLETED" INT CS_INT,
"FAILED" INT CS_INT );


-- <TEST_SCHEMA>."legacy.ots.am::Types.Candidate" definition

CREATE TYPE "<TEST_SCHEMA>"."legacy.ots.am::Types.Candidate" AS TABLE ( "CandidateID" BIGINT CS_FIXED,
"ComponentID" INT CS_INT,
"ComponentTermText" NVARCHAR(5000) CS_STRING,
"VocabularyID" NVARCHAR(100) CS_STRING,
"Code" NVARCHAR(100) CS_STRING );


-- <TEST_SCHEMA>."legacy.ots.am::Types.Match" definition

CREATE TYPE "<TEST_SCHEMA>"."legacy.ots.am::Types.Match" AS TABLE ( "CandidateID" BIGINT CS_FIXED,
"ComponentID" INT CS_INT,
"ComponentTermText" NVARCHAR(5000) CS_STRING,
"VocabularyID" NVARCHAR(100) CS_STRING,
"Code" NVARCHAR(100) CS_STRING,
"TermText" NVARCHAR(5000) CS_STRING,
"Confidence" DOUBLE CS_DOUBLE );


-- <TEST_SCHEMA>."legacy.ots.internal::Entities.Classification" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.ots.internal::Entities.Classification" ("VocabularyID" NVARCHAR(100) NOT NULL ,
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


-- <TEST_SCHEMA>."legacy.ots.internal::Entities.ConceptTerms" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.ots.internal::Entities.ConceptTerms" ("ConceptVocabularyID" NVARCHAR(100) NOT NULL ,
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
"<TEST_SCHEMA>"."legacy.ots.internal::Entities.ConceptTerms" ("TermText") SYNC PHRASE INDEX RATIO 0.000000 FUZZY SEARCH INDEX OFF SEARCH ONLY ON
FAST PREPROCESS ON
TEXT MINING OFF TEXT ANALYSIS OFF TOKEN SEPARATORS '\/;,.:-_()[]<>!?*@+{}="&#$~|' COMPRESSION LEVEL 0;


-- <TEST_SCHEMA>."legacy.ots.internal::Entities.ConceptTranslation" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.ots.internal::Entities.ConceptTranslation" ("TypeVocabularyID" NVARCHAR(100) NOT NULL ,
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


-- <TEST_SCHEMA>."legacy.ots.internal::Entities.Vocabularies" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.ots.internal::Entities.Vocabularies" ("ID" NVARCHAR(100),
"ExternalID" NVARCHAR(100) NOT NULL ,
"Provider" NVARCHAR(100) NOT NULL ,
"DWAuditID" BIGINT CS_FIXED NOT NULL ,
PRIMARY KEY ("ExternalID")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."legacy.user.db::UserModels.UserDetails" definition

CREATE TYPE "<TEST_SCHEMA>"."legacy.user.db::UserModels.UserDetails" AS TABLE ( "UserID" NVARCHAR(128) CS_STRING,
"FirstName" NVARCHAR(5000) CS_STRING,
"LastName" NVARCHAR(5000) CS_STRING,
"EmailID" NVARCHAR(5000) CS_STRING );


-- <TEST_SCHEMA>."legacy.user.db::UserModels.UserInfo" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."legacy.user.db::UserModels.UserInfo" ("UserID" NVARCHAR(128) NOT NULL ,
"FirstName" NVARCHAR(5000),
"LastName" NVARCHAR(5000),
"EmailID" NVARCHAR(5000),
"LastLogin" LONGDATE CS_LONGDATE,
"Status" NVARCHAR(20),
"ChangedBy" NVARCHAR(5000),
"ChangedAt" LONGDATE CS_LONGDATE,
PRIMARY KEY ("UserID")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."pa.db::MRIEntities.AllowedPatientIdsForExtension_Attr" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."pa.db::MRIEntities.AllowedPatientIdsForExtension_Attr" ("DWID" VARBINARY(32) CS_RAW NOT NULL ,
"DWAuditID" BIGINT CS_FIXED,
"InsertedOn" DATE CS_DAYDATE NOT NULL ,
"UserName" NVARCHAR(100) NOT NULL ,
"DWID_Patient" VARBINARY(32) CS_RAW,
"Patient_Key_Assoc.DWID" VARBINARY(32) CS_RAW NOT NULL ,
PRIMARY KEY ("DWID",
"InsertedOn",
"UserName")) WITH ASSOCIATIONS(
JOIN "<TEST_SCHEMA>"."legacy.cdw.db.models::DWEntities.Patient_Key" AS "Patient_Key_Assoc" ON
"Patient_Key_Assoc"."DWID" = "Patient_Key_Assoc.DWID") UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."pa.db::MRIEntities.Bookmarks" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."pa.db::MRIEntities.Bookmarks" ("Id" NVARCHAR(40) NOT NULL ,
"UserName" NVARCHAR(40) NOT NULL ,
"BookmarkName" NVARCHAR(40) NOT NULL ,
"Bookmark" NCLOB MEMORY THRESHOLD 1000,
"Type" NVARCHAR(10),
"ViewName" NVARCHAR(100),
PRIMARY KEY ("UserName",
"BookmarkName")) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."pa.db::MRIEntities.CollectionItems" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."pa.db::MRIEntities.CollectionItems" ("Id" NVARCHAR(100),
"ItemType" NVARCHAR(1024),
"CollectionId" NVARCHAR(32),
"CreatedBy" NVARCHAR(256),
"CreatedAt" LONGDATE CS_LONGDATE,
"ChangedBy" NVARCHAR(256),
"ChangedAt" LONGDATE CS_LONGDATE,
"StatusId" NVARCHAR(32)) UNLOAD PRIORITY 5 AUTO MERGE;


-- <TEST_SCHEMA>."pa.db::MRIEntities.DynamicViewList" definition

CREATE COLUMN TABLE "<TEST_SCHEMA>"."pa.db::MRIEntities.DynamicViewList" ("ViewId" NVARCHAR(1024) NOT NULL ,
"CreatedBy" NVARCHAR(256),
"CreatedAt" LONGDATE CS_LONGDATE,
"Description" NVARCHAR(1024),
PRIMARY KEY ("ViewId")) UNLOAD PRIORITY 5 AUTO MERGE;


-------------------------------

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::Config.V_ORG" AS
SELECT "Org_$0"."OrgID" , "Org_$0"."ParentOrgID" , "Org_$0"."ValidFrom" , "Org_$0"."ValidTo" FROM "legacy.cdw.db.models::Config.Org" AS "Org_$0" WHERE  (  ( CURRENT_UTCTIMESTAMP >= "Org_$0"."ValidFrom" )  AND  (  ( CURRENT_UTCTIMESTAMP <= "Org_$0"."ValidTo" )  OR  ( "Org_$0"."ValidTo" IS  NULL  )  )  );

CREATE VIEW <TEST_SCHEMA>."legacy.ots::Views.Vocabularies" AS
SELECT "Vocabularies_$0"."ID" , "Vocabularies_$0"."ExternalID" FROM "legacy.ots.internal::Entities.Vocabularies" AS "Vocabularies_$0";

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews.PatientTD" AS
SELECT "Patient_Attr_$0"."DWID" AS "PatientID" , "Patient_Attr_$0"."Patient_Key_Assoc"."PatientID" AS "SourcePatientID" , "Patient_Attr_$0"."Patient_Key_Assoc"."DWSource" AS "Source" , "Patient_Attr_$0"."ValidFrom" , "Patient_Attr_$0"."ValidTo" , "Patient_Attr_$0"."OrgID" , "Patient_Attr_$0"."FamilyName" , "Patient_Attr_$0"."GivenName" , "Patient_Attr_$0"."Title.OriginalValue" AS "TitleValue" , "Patient_Attr_$0"."Title.Code" AS "TitleCode" , "Vocabularies_$5"."ID" AS "TitleVocabularyID" , "Patient_Attr_$0"."Title.CodeSystem" AS "TitleCodeSystem" , "Patient_Attr_$0"."Title.CodeSystemVersion" AS "TitleCodeSystemVersion" , "Patient_Attr_$0"."Gender.OriginalValue" AS "GenderValue" , "Patient_Attr_$0"."Gender.Code" AS "GenderCode" , "Vocabularies_$2"."ID" AS "GenderVocabularyID" , "Patient_Attr_$0"."Gender.CodeSystem" AS "GenderCodeSystem" , "Patient_Attr_$0"."Gender.CodeSystemVersion" AS "GenderCodeSystemVersion" , "Patient_Attr_$0"."BirthDate" , "Patient_Attr_$0"."MultipleBirthOrder" , "Patient_Attr_$0"."DeceasedDate" , "Patient_Attr_$0"."MaritalStatus.OriginalValue" AS "MaritalStatusValue" , "Patient_Attr_$0"."MaritalStatus.Code" AS "MaritalStatusCode" , "Vocabularies_$3"."ID" AS "MaritalStatusVocabularyID" , "Patient_Attr_$0"."MaritalStatus.CodeSystem" AS "MaritalStatusCodeSystem" , "Patient_Attr_$0"."MaritalStatus.CodeSystemVersion" AS "MaritalStatusCodeSystemVersion" , "Patient_Attr_$0"."Nationality.OriginalValue" AS "NationalityValue" , "Patient_Attr_$0"."Nationality.Code" AS "NationalityCode" , "Vocabularies_$4"."ID" AS "NationalityVocabularyID" , "Patient_Attr_$0"."Nationality.CodeSystem" AS "NationalityCodeSystem" , "Patient_Attr_$0"."Nationality.CodeSystemVersion" AS "NationalityCodeSystemVersion" , "Patient_Attr_$0"."Address.StreetName" AS "StreetName" , "Patient_Attr_$0"."Address.StreetNumber" AS "StreetNumber" , "Patient_Attr_$0"."Address.PostOfficeBox" AS "PostOfficeBox" , "Patient_Attr_$0"."Address.City" AS "City" , "Patient_Attr_$0"."Address.PostalCode" AS "PostalCode" , "Patient_Attr_$0"."Address.State" AS "State" , "Patient_Attr_$0"."Address.Region" AS "Region" , "Patient_Attr_$0"."Address.Country.OriginalValue" AS "CountryValue" , "Patient_Attr_$0"."Address.Country.Code" AS "CountryCode" , "Vocabularies_$1"."ID" AS "CountryVocabularyID" , "Patient_Attr_$0"."Address.Country.CodeSystem" AS "CountryCodeSystem" , "Patient_Attr_$0"."Address.Country.CodeSystemVersion" AS "CountryCodeSystemVersion" , "Patient_Attr_$0"."Telecom.Phone" AS "Phone" , "Patient_Attr_$0"."Telecom.Mobile" AS "Mobile" , "Patient_Attr_$0"."Telecom.Fax" AS "Fax" , "Patient_Attr_$0"."Telecom.Email" AS "Email" FROM  (  (  (  (  ( "legacy.cdw.db.models::DWEntities.Patient_Attr" AS "Patient_Attr_$0" LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$1" ON  ( "Vocabularies_$1"."ExternalID" = "Patient_Attr_$0"."Address.Country.CodeSystem" )  )  LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$2" ON  ( "Vocabularies_$2"."ExternalID" = "Patient_Attr_$0"."Gender.CodeSystem" )  )  LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$3" ON  ( "Vocabularies_$3"."ExternalID" = "Patient_Attr_$0"."MaritalStatus.CodeSystem" )  )  LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$4" ON  ( "Vocabularies_$4"."ExternalID" = "Patient_Attr_$0"."Nationality.CodeSystem" )  )  LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$5" ON  ( "Vocabularies_$5"."ExternalID" = "Patient_Attr_$0"."Title.CodeSystem" )  )  WHERE  ( "Patient_Attr_$0"."DWDateTo" IS  NULL  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews.Patient" AS
SELECT "PatientTD_$0"."PatientID" , "PatientTD_$0"."SourcePatientID" , "PatientTD_$0"."Source" , "PatientTD_$0"."OrgID" , "PatientTD_$0"."FamilyName" , "PatientTD_$0"."GivenName" , "PatientTD_$0"."TitleValue" , "PatientTD_$0"."TitleCode" , "PatientTD_$0"."TitleVocabularyID" , "PatientTD_$0"."TitleCodeSystem" , "PatientTD_$0"."TitleCodeSystemVersion" , "PatientTD_$0"."GenderValue" , "PatientTD_$0"."GenderCode" , "PatientTD_$0"."GenderVocabularyID" , "PatientTD_$0"."GenderCodeSystem" , "PatientTD_$0"."GenderCodeSystemVersion" , "PatientTD_$0"."BirthDate" , "PatientTD_$0"."MultipleBirthOrder" , "PatientTD_$0"."DeceasedDate" , "PatientTD_$0"."MaritalStatusValue" , "PatientTD_$0"."MaritalStatusCode" , "PatientTD_$0"."MaritalStatusVocabularyID" , "PatientTD_$0"."MaritalStatusCodeSystem" , "PatientTD_$0"."MaritalStatusCodeSystemVersion" , "PatientTD_$0"."NationalityValue" , "PatientTD_$0"."NationalityCode" , "PatientTD_$0"."NationalityVocabularyID" , "PatientTD_$0"."NationalityCodeSystem" , "PatientTD_$0"."NationalityCodeSystemVersion" , "PatientTD_$0"."StreetName" , "PatientTD_$0"."StreetNumber" , "PatientTD_$0"."PostOfficeBox" , "PatientTD_$0"."City" , "PatientTD_$0"."PostalCode" , "PatientTD_$0"."State" , "PatientTD_$0"."Region" , "PatientTD_$0"."CountryValue" , "PatientTD_$0"."CountryCode" , "PatientTD_$0"."CountryVocabularyID" , "PatientTD_$0"."CountryCodeSystem" , "PatientTD_$0"."CountryCodeSystemVersion" , "PatientTD_$0"."Phone" , "PatientTD_$0"."Mobile" , "PatientTD_$0"."Fax" , "PatientTD_$0"."Email" FROM "legacy.cdw.db.models::DWViews.PatientTD" AS "PatientTD_$0" WHERE  (  (  ( "PatientTD_$0"."ValidFrom" IS  NULL  )  OR  ( "PatientTD_$0"."ValidFrom" = TO_DATE ( '0000-00-00' )  )  OR  ( "PatientTD_$0"."ValidFrom" <= CURRENT_UTCDATE )  )  AND  (  ( CURRENT_UTCDATE < "PatientTD_$0"."ValidTo" )  OR  ( "PatientTD_$0"."ValidTo" IS  NULL  )  OR  ( "PatientTD_$0"."ValidTo" = TO_DATE ( '0000-00-00' )  )  )  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews.Interactions" AS
SELECT "Interactions_Attr_$0"."DWID" AS "InteractionID" , "Interactions_Attr_$0"."Interactions_Key_Assoc"."InteractionID" AS "SourceInteractionID" , "Interactions_Attr_$0"."Interactions_Key_Assoc"."DWSource" AS "Source" , "Interactions_Attr_$0"."DWID_Patient" AS "PatientID" , "Interactions_Attr_$0"."DWID_ParentInteraction" AS "ParentInteractionID" , "Interactions_Attr_$0"."DWID_Condition" AS "ConditionID" , "Interactions_Attr_$0"."InteractionType.OriginalValue" AS "InteractionTypeValue" , "Interactions_Attr_$0"."InteractionType.Code" AS "InteractionTypeCode" , "Vocabularies_$1"."ID" AS "InteractionTypeVocabularyID" , "Interactions_Attr_$0"."InteractionType.CodeSystem" AS "InteractionTypeCodeSystem" , "Interactions_Attr_$0"."InteractionType.CodeSystemVersion" AS "InteractionTypeCodeSystemVersion" , "Interactions_Attr_$0"."InteractionStatus" , "Interactions_Attr_$0"."PeriodStart" , "Interactions_Attr_$0"."PeriodEnd" , "Interactions_Attr_$0"."OrgID" FROM  ( "legacy.cdw.db.models::DWEntities.Interactions_Attr" AS "Interactions_Attr_$0" LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$1" ON  ( "Vocabularies_$1"."ExternalID" = "Interactions_Attr_$0"."InteractionType.CodeSystem" )  )  WHERE  ( "Interactions_Attr_$0"."DWDateTo" IS  NULL  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews.Observations" AS
SELECT "Observations_Attr_$0"."DWID" AS "ObsID" , "Observations_Attr_$0"."Observations_Key_Assoc"."ObsID" AS "SourceObsID" , "Observations_Attr_$0"."Observations_Key_Assoc"."DWSource" AS "Source" , "Observations_Attr_$0"."ObsType" , "Observations_Attr_$0"."DWID_Patient" AS "PatientID" , "Observations_Attr_$0"."ObsCharValue" , "Observations_Attr_$0"."ObsNumValue" , "Observations_Attr_$0"."ObsUnit" , "Observations_Attr_$0"."ObsTime" , "Observations_Attr_$0"."OrgID" FROM "legacy.cdw.db.models::DWEntities.Observations_Attr" AS "Observations_Attr_$0" WHERE  ( "Observations_Attr_$0"."DWDateTo" IS  NULL  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews.Condition" AS
SELECT "Condition_Attr_$0"."DWID" AS "ConditionID" , "Condition_Attr_$0"."Condition_Key_Assoc"."ConditionID" AS "SourceConditionID" , "Condition_Attr_$0"."Condition_Key_Assoc"."DWSource" AS "Source" , "Condition_Attr_$0"."ConditionType" , "Condition_Attr_$0"."Description" FROM "legacy.cdw.db.models::DWEntities.Condition_Attr" AS "Condition_Attr_$0" WHERE  ( "Condition_Attr_$0"."DWDateTo" IS  NULL  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViewsEAV.Interaction_Details" AS
SELECT "Interaction_Details_$0"."DWID" AS "InteractionID" , "Interaction_Details_$0"."Interactions_Key_Assoc"."InteractionID" AS "SourceInteractionID" , "Interaction_Details_$0"."Interactions_Key_Assoc"."DWSource" AS "Source" , "Interaction_Details_$0"."Attribute.OriginalValue" AS "AttributeValue" , "Interaction_Details_$0"."Attribute.Code" AS "AttributeCode" , "Vocabularies_$1"."ID" AS "AttributeVocabularyID" , "Interaction_Details_$0"."Attribute.CodeSystem" AS "AttributeCodeSystem" , "Interaction_Details_$0"."Attribute.CodeSystemVersion" AS "AttributeCodeSystemVersion" , "Interaction_Details_$0"."Value.OriginalValue" AS "Value" , "Interaction_Details_$0"."Value.Code" AS "ValueCode" , "Vocabularies_$2"."ID" AS "ValueVocabularyID" , "Interaction_Details_$0"."Value.CodeSystem" AS "ValueCodeSystem" , "Interaction_Details_$0"."Value.CodeSystemVersion" AS "ValueCodeSystemVersion" FROM  (  ( "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" AS "Interaction_Details_$0" LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$1" ON  ( "Vocabularies_$1"."ExternalID" = "Interaction_Details_$0"."Attribute.CodeSystem" )  )  LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$2" ON  ( "Vocabularies_$2"."ExternalID" = "Interaction_Details_$0"."Value.CodeSystem" )  )  WHERE  ( "Interaction_Details_$0"."DWDateTo" IS  NULL  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViewsEAV.Interaction_Measures" AS
SELECT "Interaction_Measures_$0"."DWID" AS "InteractionID" , "Interaction_Measures_$0"."Interactions_Key_Assoc"."InteractionID" AS "SourceInteractionID" , "Interaction_Measures_$0"."Interactions_Key_Assoc"."DWSource" AS "Source" , "Interaction_Measures_$0"."Attribute.OriginalValue" AS "AttributeValue" , "Interaction_Measures_$0"."Attribute.Code" AS "AttributeCode" , "Vocabularies_$1"."ID" AS "AttributeVocabularyID" , "Interaction_Measures_$0"."Attribute.CodeSystem" AS "AttributeCodeSystem" , "Interaction_Measures_$0"."Attribute.CodeSystemVersion" AS "AttributeCodeSystemVersion" , "Interaction_Measures_$0"."Unit" , "Interaction_Measures_$0"."Value" FROM  ( "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" AS "Interaction_Measures_$0" LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$1" ON  ( "Vocabularies_$1"."ExternalID" = "Interaction_Measures_$0"."Attribute.CodeSystem" )  )  WHERE  ( "Interaction_Measures_$0"."DWDateTo" IS  NULL  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViewsEAV.Interaction_Text" AS
SELECT "Interaction_Text_$0"."InteractionTextID" , "Interaction_Text_$0"."DWID" AS "InteractionID" , "Interaction_Text_$0"."Interactions_Key_Assoc"."InteractionID" AS "SourceInteractionID" , "Interaction_Text_$0"."Interactions_Key_Assoc"."DWSource" AS "Source" , "Interaction_Text_$0"."Attribute" , "Interaction_Text_$0"."Value" , "Interaction_Text_$0"."Lang" FROM "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text" AS "Interaction_Text_$0" WHERE  ( "Interaction_Text_$0"."DWDateTo" IS  NULL  );

CREATE VIEW <TEST_SCHEMA>."legacy.ots::Views.Classification" AS
SELECT "Classification_$0"."VocabularyID" , "Classification_$0"."Code" , "Classification_$0"."ClassVocabularyID" , "Classification_$0"."ClassCode" , "Classification_$0"."ClassHierarchyLevel" , "Classification_$0"."ParentClassVocabularyID" , "Classification_$0"."ParentClassCode" , "Classification_$0"."Context" FROM "legacy.ots.internal::Entities.Classification" AS "Classification_$0";

CREATE VIEW <TEST_SCHEMA>."legacy.ots::Views.ConceptTerms" AS
SELECT "ConceptTerms_$0"."ConceptVocabularyID" , "ConceptTerms_$0"."ConceptCode" , "ConceptTerms_$0"."ConceptTypeVocabularyID" , "ConceptTerms_$0"."ConceptTypeCode" , "ConceptTerms_$0"."TermContext" , "ConceptTerms_$0"."TermLanguage" , "ConceptTerms_$0"."TermText" , "ConceptTerms_$0"."TermType" , "ConceptTerms_$0"."TermIsPreferred" FROM "legacy.ots.internal::Entities.ConceptTerms" AS "ConceptTerms_$0";

CREATE VIEW <TEST_SCHEMA>."legacy.ots::Views.ConceptTranslation" AS
SELECT "ConceptTranslation_$0"."TypeVocabularyID" , "ConceptTranslation_$0"."TypeCode" , "ConceptTranslation_$0"."FromVocabularyID" , "ConceptTranslation_$0"."FromCode" , "ConceptTranslation_$0"."ToVocabularyID" , "ConceptTranslation_$0"."ToCode" FROM "legacy.ots.internal::Entities.ConceptTranslation" AS "ConceptTranslation_$0";

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews.InteractionDetailsOTS" AS
SELECT "details_$0"."InteractionID" AS "InteractionID" , "details_$0"."AttributeValue" AS "AttributeValue" , "details_$0"."AttributeCode" AS "AttributeCode" , "details_$0"."AttributeCodeSystem" AS "AttributeCodeSystem" , "details_$0"."AttributeCodeSystemVersion" AS "AttributeCodeSystemVersion" , "details_$0"."Value" AS "Value" , "details_$0"."ValueCode" AS "ValueCode" , "details_$0"."ValueCodeSystem" AS "ValueCodeSystem" , "details_$0"."ValueCodeSystemVersion" AS "ValueCodeSystemVersion" , "class_$1"."ClassCode" AS "TARGET_CODE" , "class_$1"."ClassVocabularyID" AS "TARGET_VOCABULARY_ID" , "class_$1"."ClassHierarchyLevel" AS "HIERARCHY_LEVEL" , "class_$1"."Context" AS "SUBJECT" , "terms_$2"."TermContext" AS "TERM_CONTEXT" , "terms_$2"."TermText" AS "DESCRIPTION" , "terms_$2"."TermLanguage" AS "LANGUAGE" FROM  (  ( "legacy.cdw.db.models::DWViewsEAV.Interaction_Details" AS "details_$0" INNER JOIN "legacy.ots::Views.Classification" AS "class_$1" ON  (  ( "class_$1"."VocabularyID" = "details_$0"."ValueVocabularyID" )  AND  ( "class_$1"."Code" = "details_$0"."ValueCode" )  )  )  INNER JOIN "legacy.ots::Views.ConceptTerms" AS "terms_$2" ON  (  ( "terms_$2"."ConceptVocabularyID" = "class_$1"."ClassVocabularyID" )  AND  ( "terms_$2"."ConceptCode" = "class_$1"."ClassCode" )  )  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews.PractitionerTD" AS
SELECT "Practitioner_Attr_$0"."DWID" AS "PractitionerID" , "Practitioner_Attr_$0"."Practitioner_Key_Assoc"."PractitionerID" AS "SourcePractitionerID" , "Practitioner_Attr_$0"."Practitioner_Key_Assoc"."DWSource" AS "Source" , "Practitioner_Attr_$0"."ValidFrom" , "Practitioner_Attr_$0"."ValidTo" , "Practitioner_Attr_$0"."OrgID" , "Practitioner_Attr_$0"."FamilyName" , "Practitioner_Attr_$0"."GivenName" , "Practitioner_Attr_$0"."BirthDate" , "Practitioner_Attr_$0"."Title.OriginalValue" AS "TitleValue" , "Practitioner_Attr_$0"."Title.Code" AS "TitleCode" , "Vocabularies_$7"."ID" AS "TitleVocabularyID" , "Practitioner_Attr_$0"."Title.CodeSystem" AS "TitleCodeSystem" , "Practitioner_Attr_$0"."Title.CodeSystemVersion" AS "TitleCodeSystemVersion" , "Practitioner_Attr_$0"."Gender.OriginalValue" AS "GenderValue" , "Practitioner_Attr_$0"."Gender.Code" AS "GenderCode" , "Vocabularies_$2"."ID" AS "GenderVocabularyID" , "Practitioner_Attr_$0"."Gender.CodeSystem" AS "GenderCodeSystem" , "Practitioner_Attr_$0"."Gender.CodeSystemVersion" AS "GenderCodeSystemVersion" , "Practitioner_Attr_$0"."Role.OriginalValue" AS "RoleValue" , "Practitioner_Attr_$0"."Role.Code" AS "RoleCode" , "Vocabularies_$5"."ID" AS "RoleVocabularyID" , "Practitioner_Attr_$0"."Role.CodeSystem" AS "RoleCodeSystem" , "Practitioner_Attr_$0"."Role.CodeSystemVersion" AS "RoleCodeSystemVersion" , "Practitioner_Attr_$0"."Speciality.OriginalValue" AS "SpecialityValue" , "Practitioner_Attr_$0"."Speciality.Code" AS "SpecialityCode" , "Vocabularies_$6"."ID" AS "SpecialityVocabularyID" , "Practitioner_Attr_$0"."Speciality.CodeSystem" AS "SpecialityCodeSystem" , "Practitioner_Attr_$0"."Speciality.CodeSystemVersion" AS "SpecialityCodeSystemVersion" , "Practitioner_Attr_$0"."MaritalStatus.OriginalValue" AS "MaritalStatusValue" , "Practitioner_Attr_$0"."MaritalStatus.Code" AS "MaritalStatusCode" , "Vocabularies_$3"."ID" AS "MaritalStatusVocabularyID" , "Practitioner_Attr_$0"."MaritalStatus.CodeSystem" AS "MaritalStatusCodeSystem" , "Practitioner_Attr_$0"."MaritalStatus.CodeSystemVersion" AS "MaritalStatusCodeSystemVersion" , "Practitioner_Attr_$0"."Nationality.OriginalValue" AS "NationalityValue" , "Practitioner_Attr_$0"."Nationality.Code" AS "NationalityCode" , "Vocabularies_$4"."ID" AS "NationalityVocabularyID" , "Practitioner_Attr_$0"."Nationality.CodeSystem" AS "NationalityCodeSystem" , "Practitioner_Attr_$0"."Nationality.CodeSystemVersion" AS "NationalityCodeSystemVersion" , "Practitioner_Attr_$0"."Address.StreetName" AS "StreetName" , "Practitioner_Attr_$0"."Address.StreetNumber" AS "StreetNumber" , "Practitioner_Attr_$0"."Address.PostOfficeBox" AS "PostOfficeBox" , "Practitioner_Attr_$0"."Address.City" AS "City" , "Practitioner_Attr_$0"."Address.PostalCode" AS "PostalCode" , "Practitioner_Attr_$0"."Address.State" AS "State" , "Practitioner_Attr_$0"."Address.Region" AS "Region" , "Practitioner_Attr_$0"."Address.Country.OriginalValue" AS "CountryValue" , "Practitioner_Attr_$0"."Address.Country.Code" AS "CountryCode" , "Vocabularies_$1"."ID" AS "CountryVocabularyID" , "Practitioner_Attr_$0"."Address.Country.CodeSystem" AS "CountryCodeSystem" , "Practitioner_Attr_$0"."Address.Country.CodeSystemVersion" AS "CountryCodeSystemVersion" , "Practitioner_Attr_$0"."Telecom.Phone" AS "Phone" , "Practitioner_Attr_$0"."Telecom.Mobile" AS "Mobile" , "Practitioner_Attr_$0"."Telecom.Fax" AS "Fax" , "Practitioner_Attr_$0"."Telecom.Email" AS "Email" , "Practitioner_Attr_$0"."PreferredLanguage" FROM  (  (  (  (  (  (  ( "legacy.cdw.db.models::DWEntities.Practitioner_Attr" AS "Practitioner_Attr_$0" LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$1" ON  ( "Vocabularies_$1"."ExternalID" = "Practitioner_Attr_$0"."Address.Country.CodeSystem" )  )  LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$2" ON  ( "Vocabularies_$2"."ExternalID" = "Practitioner_Attr_$0"."Gender.CodeSystem" )  )  LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$3" ON  ( "Vocabularies_$3"."ExternalID" = "Practitioner_Attr_$0"."MaritalStatus.CodeSystem" )  )  LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$4" ON  ( "Vocabularies_$4"."ExternalID" = "Practitioner_Attr_$0"."Nationality.CodeSystem" )  )  LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$5" ON  ( "Vocabularies_$5"."ExternalID" = "Practitioner_Attr_$0"."Role.CodeSystem" )  )  LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$6" ON  ( "Vocabularies_$6"."ExternalID" = "Practitioner_Attr_$0"."Speciality.CodeSystem" )  )  LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$7" ON  ( "Vocabularies_$7"."ExternalID" = "Practitioner_Attr_$0"."Title.CodeSystem" )  )  WHERE  ( "Practitioner_Attr_$0"."DWDateTo" IS  NULL  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews.Practitioner" AS
SELECT "PractitionerTD_$0"."PractitionerID" , "PractitionerTD_$0"."SourcePractitionerID" , "PractitionerTD_$0"."Source" , "PractitionerTD_$0"."OrgID" , "PractitionerTD_$0"."FamilyName" , "PractitionerTD_$0"."GivenName" , "PractitionerTD_$0"."TitleValue" , "PractitionerTD_$0"."TitleCode" , "PractitionerTD_$0"."TitleVocabularyID" , "PractitionerTD_$0"."TitleCodeSystem" , "PractitionerTD_$0"."TitleCodeSystemVersion" , "PractitionerTD_$0"."GenderValue" , "PractitionerTD_$0"."GenderCode" , "PractitionerTD_$0"."GenderVocabularyID" , "PractitionerTD_$0"."GenderCodeSystem" , "PractitionerTD_$0"."GenderCodeSystemVersion" , "PractitionerTD_$0"."RoleValue" , "PractitionerTD_$0"."RoleCode" , "PractitionerTD_$0"."RoleVocabularyID" , "PractitionerTD_$0"."RoleCodeSystem" , "PractitionerTD_$0"."RoleCodeSystemVersion" , "PractitionerTD_$0"."SpecialityValue" , "PractitionerTD_$0"."SpecialityCode" , "PractitionerTD_$0"."SpecialityVocabularyID" , "PractitionerTD_$0"."SpecialityCodeSystem" , "PractitionerTD_$0"."SpecialityCodeSystemVersion" , "PractitionerTD_$0"."BirthDate" , "PractitionerTD_$0"."MaritalStatusValue" , "PractitionerTD_$0"."MaritalStatusCode" , "PractitionerTD_$0"."MaritalStatusVocabularyID" , "PractitionerTD_$0"."MaritalStatusCodeSystem" , "PractitionerTD_$0"."MaritalStatusCodeSystemVersion" , "PractitionerTD_$0"."NationalityValue" , "PractitionerTD_$0"."NationalityCode" , "PractitionerTD_$0"."NationalityVocabularyID" , "PractitionerTD_$0"."NationalityCodeSystem" , "PractitionerTD_$0"."NationalityCodeSystemVersion" , "PractitionerTD_$0"."StreetName" , "PractitionerTD_$0"."StreetNumber" , "PractitionerTD_$0"."PostOfficeBox" , "PractitionerTD_$0"."City" , "PractitionerTD_$0"."PostalCode" , "PractitionerTD_$0"."State" , "PractitionerTD_$0"."Region" , "PractitionerTD_$0"."CountryValue" , "PractitionerTD_$0"."CountryCode" , "PractitionerTD_$0"."CountryVocabularyID" , "PractitionerTD_$0"."CountryCodeSystem" , "PractitionerTD_$0"."CountryCodeSystemVersion" , "PractitionerTD_$0"."Phone" , "PractitionerTD_$0"."Mobile" , "PractitionerTD_$0"."Fax" , "PractitionerTD_$0"."Email" , "PractitionerTD_$0"."PreferredLanguage" FROM "legacy.cdw.db.models::DWViews.PractitionerTD" AS "PractitionerTD_$0" WHERE  (  (  ( "PractitionerTD_$0"."ValidFrom" IS  NULL  )  OR  ( "PractitionerTD_$0"."ValidFrom" = TO_DATE ( '0000-00-00' )  )  OR  ( "PractitionerTD_$0"."ValidFrom" <= CURRENT_UTCDATE )  )  AND  (  ( CURRENT_UTCDATE < "PractitionerTD_$0"."ValidTo" )  OR  ( "PractitionerTD_$0"."ValidTo" IS  NULL  )  OR  ( "PractitionerTD_$0"."ValidTo" = TO_DATE ( '0000-00-00' )  )  )  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews._Patient_Practitioner_Attr" AS
SELECT "Patient_Practitioner_Link_Attr_$0"."DWLinkID" , "Patient_Practitioner_Link_Attr_$0"."Role.OriginalValue" AS "RoleValue" , "Patient_Practitioner_Link_Attr_$0"."Role.Code" AS "RoleCode" , "Vocabularies_$1"."ID" AS "RoleVocabularyID" , "Patient_Practitioner_Link_Attr_$0"."Role.CodeSystem" AS "RoleCodeSystem" , "Patient_Practitioner_Link_Attr_$0"."Role.CodeSystemVersion" AS "RoleCodeSystemVersion" FROM  ( "legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link_Attr" AS "Patient_Practitioner_Link_Attr_$0" LEFT OUTER JOIN "legacy.ots::Views.Vocabularies" AS "Vocabularies_$1" ON  ( "Vocabularies_$1"."ExternalID" = "Patient_Practitioner_Link_Attr_$0"."Role.CodeSystem" )  )  WHERE  ( "Patient_Practitioner_Link_Attr_$0"."DWDateTo" IS  NULL  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews.Patient_Practitioner" AS
SELECT "Patient_Practitioner_Link_$0"."DWLinkID" AS "ID" , "Patient_Practitioner_Link_$0"."DWID_Patient" AS "PatientID" , "Patient_Practitioner_Link_$0"."Patient_Key_Assoc"."PatientID" AS "SourcePatientID" , "Patient_Practitioner_Link_$0"."Patient_Key_Assoc"."DWSource" AS "SourcePatient" , "Patient_Practitioner_Link_$0"."DWID_Practitioner" AS "PractitionerID" , "Patient_Practitioner_Link_$0"."Practitioner_Key_Assoc"."PractitionerID" AS "SourcePractitionerID" , "Patient_Practitioner_Link_$0"."Practitioner_Key_Assoc"."DWSource" AS "SourcePractitioner" , "_Patient_Practitioner_Attr_$1"."RoleValue" , "_Patient_Practitioner_Attr_$1"."RoleCode" , "_Patient_Practitioner_Attr_$1"."RoleVocabularyID" , "_Patient_Practitioner_Attr_$1"."RoleCodeSystem" , "_Patient_Practitioner_Attr_$1"."RoleCodeSystemVersion" FROM  ( "legacy.cdw.db.models::DWEntities.Patient_Practitioner_Link" AS "Patient_Practitioner_Link_$0" LEFT OUTER JOIN "legacy.cdw.db.models::DWViews._Patient_Practitioner_Attr" AS "_Patient_Practitioner_Attr_$1" ON  ( "_Patient_Practitioner_Attr_$1"."DWLinkID" = "Patient_Practitioner_Link_$0"."DWLinkID" )  )  WHERE  ( "Patient_Practitioner_Link_$0"."DWDateTo" IS  NULL  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews.V_GuardedPatient" AS
SELECT "PatientTD_$0"."PatientID" , "PatientTD_$0"."SourcePatientID" , "PatientTD_$0"."Source" , "PatientTD_$0"."OrgID" , "PatientTD_$0"."FamilyName" , "PatientTD_$0"."GivenName" , "PatientTD_$0"."TitleValue" , "PatientTD_$0"."TitleCode" , "PatientTD_$0"."TitleVocabularyID" , "PatientTD_$0"."TitleCodeSystem" , "PatientTD_$0"."TitleCodeSystemVersion" , "PatientTD_$0"."GenderValue" , "PatientTD_$0"."GenderCode" , "PatientTD_$0"."GenderVocabularyID" , "PatientTD_$0"."GenderCodeSystem" , "PatientTD_$0"."GenderCodeSystemVersion" , "PatientTD_$0"."BirthDate" , "PatientTD_$0"."MultipleBirthOrder" , "PatientTD_$0"."DeceasedDate" , "PatientTD_$0"."MaritalStatusValue" , "PatientTD_$0"."MaritalStatusCode" , "PatientTD_$0"."MaritalStatusVocabularyID" , "PatientTD_$0"."MaritalStatusCodeSystem" , "PatientTD_$0"."MaritalStatusCodeSystemVersion" , "PatientTD_$0"."NationalityValue" , "PatientTD_$0"."NationalityCode" , "PatientTD_$0"."NationalityVocabularyID" , "PatientTD_$0"."NationalityCodeSystem" , "PatientTD_$0"."NationalityCodeSystemVersion" , "PatientTD_$0"."StreetName" , "PatientTD_$0"."StreetNumber" , "PatientTD_$0"."PostOfficeBox" , "PatientTD_$0"."City" , "PatientTD_$0"."PostalCode" , "PatientTD_$0"."State" , "PatientTD_$0"."Region" , "PatientTD_$0"."CountryValue" , "PatientTD_$0"."CountryCode" , "PatientTD_$0"."CountryVocabularyID" , "PatientTD_$0"."CountryCodeSystem" , "PatientTD_$0"."CountryCodeSystemVersion" , "PatientTD_$0"."Phone" , "PatientTD_$0"."Mobile" , "PatientTD_$0"."Fax" , "PatientTD_$0"."Email" FROM "legacy.cdw.db.models::DWViews.PatientTD" AS "PatientTD_$0" WHERE  (  (  ( "PatientTD_$0"."ValidFrom" IS  NULL  )  OR  ( "PatientTD_$0"."ValidFrom" = TO_DATE ( '0000-00-00' )  )  OR  ( "PatientTD_$0"."ValidFrom" <= CURRENT_UTCDATE )  )  AND  (  ( CURRENT_UTCDATE < "PatientTD_$0"."ValidTo" )  OR  ( "PatientTD_$0"."ValidTo" IS  NULL  )  OR  ( "PatientTD_$0"."ValidTo" = TO_DATE ( '0000-00-00' )  )  )  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews.CollectionsAsObservation" AS
SELECT "P_$2"."PatientID" ,  (  ( "C_$0"."Title" || ' -- ' )  || "U_$3"."CreatedBy" )  AS "ObsCharValue" , 'COLLECTION' AS "ObsType" , "I_$1"."Status.Id" AS "StatusId" FROM  (  (  ( "legacy.collections.db.models::CollectionModel.Collection" AS "C_$0" INNER JOIN "legacy.collections.db.models::CollectionModel.Item" AS "I_$1" ON  ( "C_$0"."Id" = "I_$1"."Collection.Id" )  )  INNER JOIN "legacy.cdw.db.models::DWViews.Patient" AS "P_$2" ON  ( "I_$1"."Id" = "P_$2"."PatientID" )  )  INNER JOIN "legacy.collections.db.models::CollectionModel.Participant" AS "U_$3" ON  ( "U_$3"."Collection.Id" = "C_$0"."Id" )  )  WHERE  ( "U_$3"."HANAUserName" = SESSION_CONTEXT ( 'APPLICATIONUSER' )  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews.CohortStatusAsObservation" AS
SELECT "P_$3"."PatientID" , "S_$2"."TextKey" AS "ObsCharValue" , 'COLLECTION_STATUS' AS "ObsType" , "I_$1"."Status.Id" AS "ObsID" , "S_$2"."Language" AS "Language" FROM  (  (  (  ( "legacy.collections.db.models::CollectionModel.Collection" AS "C_$0" INNER JOIN "legacy.collections.db.models::CollectionModel.Item" AS "I_$1" ON  ( "C_$0"."Id" = "I_$1"."Collection.Id" )  )  INNER JOIN "legacy.collections.db.models::CollectionModel.CohortsStatusConfig" AS "S_$2" ON  ( "S_$2"."Id" = "I_$1"."Status.Id" )  )  INNER JOIN "legacy.cdw.db.models::DWViews.Patient" AS "P_$3" ON  ( "I_$1"."Id" = "P_$3"."PatientID" )  )  INNER JOIN "legacy.collections.db.models::CollectionModel.Participant" AS "U_$4" ON  ( "U_$4"."Collection.Id" = "C_$0"."Id" )  )  WHERE  (  ( "U_$4"."HANAUserName" = SESSION_CONTEXT ( 'APPLICATIONUSER' )  )  AND  ( "S_$2"."Language" = IFNULL ( SUBSTR ( SESSION_CONTEXT ( 'LOCALE' )  , 1 , 2 )  , 'en' )  )  );

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::DWViews.CohortAsInteraction" AS
SELECT "P_$2"."PatientID" , "P_$2"."PatientID" AS "InteractionID" ,  (  ( "C_$0"."Title" || ' -- ' )  || "U_$3"."CreatedBy" )  AS "CohortName" , "U_$3"."CreatedBy" AS "CreatedBy" , "S_$4"."TextKey" AS "CohortStatus" , "I_$1"."Status.Id" AS "StatusId" , "S_$4"."Language" , "C_$0"."CreatedAt" AS "PeriodStart" , "C_$0"."CreatedAt" AS "PeriodEnd" FROM  (  (  (  ( "legacy.collections.db.models::CollectionModel.Collection" AS "C_$0" INNER JOIN "legacy.collections.db.models::CollectionModel.Item" AS "I_$1" ON  ( "C_$0"."Id" = "I_$1"."Collection.Id" )  )  INNER JOIN "legacy.cdw.db.models::DWViews.Patient" AS "P_$2" ON  ( "I_$1"."Id" = "P_$2"."PatientID" )  )  INNER JOIN "legacy.collections.db.models::CollectionModel.Participant" AS "U_$3" ON  ( "U_$3"."Collection.Id" = "C_$0"."Id" )  )  LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.CohortsStatusConfig" AS "S_$4" ON  ( "S_$4"."Id" = "I_$1"."Status.Id" )  )  WHERE  (  ( "U_$3"."HANAUserName" = SESSION_CONTEXT ( 'APPLICATIONUSER' )  )  AND  ( "S_$4"."Language" = IFNULL ( SUBSTR ( SESSION_CONTEXT ( 'LOCALE' )  , 1 , 2 )  , 'en' )  )  );

-----
-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.CODES" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.CODES" AS
SELECT "ConceptTerms_$0"."ConceptVocabularyID" AS "VOCABULARY_ID" , "ConceptTerms_$0"."TermContext" AS "CONTEXT" , "ConceptTerms_$0"."ConceptCode" AS "CODE" , "ConceptTerms_$0"."TermLanguage" AS "LANGUAGE" , "ConceptTerms_$0"."TermText" AS "DESCRIPTION" FROM "legacy.ots::Views.ConceptTerms" AS "ConceptTerms_$0";


-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.CONDITION" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.CONDITION" AS
SELECT "Condition_$0"."ConditionID" AS "CONDITION_ID" , "Condition_$0"."ConditionType" AS "CONDITION_TYPE" , "Condition_$0"."Description" AS "DESCRIPTION" FROM "legacy.cdw.db.models::DWViews.Condition" AS "Condition_$0";


-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.GUARDED_INTERACTIONS" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.GUARDED_INTERACTIONS" AS
SELECT "Interactions_$0"."InteractionID" AS "INTERACTION_ID" , "Interactions_$0"."PatientID" AS "PATIENT_ID" , "Interactions_$0"."InteractionTypeValue" AS "INTERACTION_TYPE" , "Interactions_$0"."InteractionTypeCode" AS "INTERACTION_TYPE_CODE" , "Interactions_$0"."InteractionTypeVocabularyID" AS "INTERACTION_TYPE_VOCABULARY_ID" , "Interactions_$0"."InteractionTypeCodeSystem" AS "INTERACTION_TYPE_CODE_SYSTEM" , "Interactions_$0"."InteractionTypeCodeSystemVersion" AS "INTERACTION_TYPE_CODE_SYSTEM_VERSION" , "Interactions_$0"."ParentInteractionID" AS "PARENT_INTERACT_ID" , "Interactions_$0"."ConditionID" AS "CONDITION_ID" , "Interactions_$0"."PeriodStart" AS "START" , "Interactions_$0"."PeriodEnd" AS "END" , "Interactions_$0"."OrgID" AS "ORG_ID" FROM "legacy.cdw.db.models::DWViews.Interactions" AS "Interactions_$0";


-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.GUARDED_PATIENT" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.GUARDED_PATIENT" AS
SELECT "Patient_$0"."PatientID" AS "PATIENT_ID" , "Patient_$0"."SourcePatientID" AS "SOURCE_PATIENT_ID" , "Patient_$0"."Source" AS "SOURCE" , "Patient_$0"."OrgID" AS "ORG_ID" , "Patient_$0"."FamilyName" AS "LASTNAME" , "Patient_$0"."GivenName" AS "FIRSTNAME" , "Patient_$0"."TitleValue" AS "TITLE" , "Patient_$0"."TitleCode" AS "TITLE_CODE" , "Patient_$0"."TitleVocabularyID" AS "TITLE_VOCABULARY_ID" , "Patient_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM" , "Patient_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM_VERSION" , "Patient_$0"."GenderValue" AS "GENDER" , "Patient_$0"."GenderCode" AS "GENDER_CODE" , "Patient_$0"."GenderVocabularyID" AS "GENDER_VOCABULARY_ID" , "Patient_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM" , "Patient_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM_VERSION" , "Patient_$0"."BirthDate" AS "DOB" , "Patient_$0"."MultipleBirthOrder" AS "MULTIPLE_BIRTH_ORDER" , "Patient_$0"."DeceasedDate" AS "DOD" , "Patient_$0"."MaritalStatusValue" AS "MARITAL_STATUS" , "Patient_$0"."MaritalStatusCode" AS "MARITAL_STATUS_CODE" , "Patient_$0"."MaritalStatusVocabularyID" AS "MARITAL_STATUS_VOCABULARY_ID" , "Patient_$0"."MaritalStatusCodeSystem" AS "MARITAL_STATUS_CODE_SYSTEM" , "Patient_$0"."MaritalStatusCodeSystemVersion" AS "MARITAL_STATUS_CODE_SYSTEM_VERSION" , "Patient_$0"."NationalityValue" AS "NATIONALITY" , "Patient_$0"."NationalityCode" AS "NATIONALITY_CODE" , "Patient_$0"."NationalityVocabularyID" AS "NATIONALITY_VOCABULARY_ID" , "Patient_$0"."NationalityCodeSystem" AS "NATIONALITY_CODE_SYSTEM" , "Patient_$0"."NationalityCodeSystemVersion" AS "NATIONALITY_CODE_SYSTEM_VERSION" , "Patient_$0"."StreetName" AS "STREET" , "Patient_$0"."StreetNumber" AS "STREET_NUMBER" , "Patient_$0"."PostOfficeBox" AS "POST_OFFICE_BOX" , "Patient_$0"."City" AS "CITY" , "Patient_$0"."PostalCode" AS "POSTCODE" , "Patient_$0"."State" AS "REGION" , "Patient_$0"."CountryValue" AS "COUNTRY" , "Patient_$0"."CountryCode" AS "COUNTRY_CODE" , "Patient_$0"."CountryVocabularyID" AS "COUNTRY_VOCABULARY_ID" , "Patient_$0"."CountryCodeSystem" AS "COUNTRY_CODE_SYSTEM" , "Patient_$0"."CountryCodeSystemVersion" AS "COUNTRY_CODE_SYSTEM_VERSION" , "Patient_$0"."Phone" AS "PHONE" , "Patient_$0"."Mobile" AS "MOBILE" , "Patient_$0"."Fax" AS "FAX" , "Patient_$0"."Email" AS "EMAIL" FROM "legacy.cdw.db.models::DWViews.Patient" AS "Patient_$0";


-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.GUARDED_PATIENT_TD" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.GUARDED_PATIENT_TD" AS
SELECT "PatientTD_$0"."PatientID" AS "PATIENT_ID" , "PatientTD_$0"."SourcePatientID" AS "SOURCE_PATIENT_ID" , "PatientTD_$0"."Source" AS "SOURCE" , "PatientTD_$0"."OrgID" AS "ORG_ID" , "PatientTD_$0"."ValidFrom" AS "VALID_FROM" , "PatientTD_$0"."ValidTo" AS "VALID_TO" , "PatientTD_$0"."FamilyName" AS "LASTNAME" , "PatientTD_$0"."GivenName" AS "FIRSTNAME" , "PatientTD_$0"."TitleValue" AS "TITLE" , "PatientTD_$0"."TitleCode" AS "TITLE_CODE" , "PatientTD_$0"."TitleVocabularyID" AS "TITLE_VOCABULARY_ID" , "PatientTD_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM" , "PatientTD_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM_VERSION" , "PatientTD_$0"."GenderValue" AS "GENDER" , "PatientTD_$0"."GenderCode" AS "GENDER_CODE" , "PatientTD_$0"."GenderVocabularyID" AS "GENDER_VOCABULARY_ID" , "PatientTD_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM" , "PatientTD_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM_VERSION" , "PatientTD_$0"."BirthDate" AS "DOB" , "PatientTD_$0"."MultipleBirthOrder" AS "MULTIPLE_BIRTH_ORDER" , "PatientTD_$0"."DeceasedDate" AS "DOD" , "PatientTD_$0"."MaritalStatusValue" AS "MARITAL_STATUS" , "PatientTD_$0"."MaritalStatusCode" AS "MARITAL_STATUS_CODE" , "PatientTD_$0"."MaritalStatusVocabularyID" AS "MARITAL_STATUS_VOCABULARY_ID" , "PatientTD_$0"."MaritalStatusCodeSystem" AS "MARITAL_STATUS_CODE_SYSTEM" , "PatientTD_$0"."MaritalStatusCodeSystemVersion" AS "MARITAL_STATUS_CODE_SYSTEM_VERSION" , "PatientTD_$0"."NationalityValue" AS "NATIONALITY" , "PatientTD_$0"."NationalityCode" AS "NATIONALITY_CODE" , "PatientTD_$0"."NationalityVocabularyID" AS "NATIONALITY_VOCABULARY_ID" , "PatientTD_$0"."NationalityCodeSystem" AS "NATIONALITY_CODE_SYSTEM" , "PatientTD_$0"."NationalityCodeSystemVersion" AS "NATIONALITY_CODE_SYSTEM_VERSION" , "PatientTD_$0"."StreetName" AS "STREET" , "PatientTD_$0"."StreetNumber" AS "STREET_NUMBER" , "PatientTD_$0"."PostOfficeBox" AS "POST_OFFICE_BOX" , "PatientTD_$0"."City" AS "CITY" , "PatientTD_$0"."PostalCode" AS "POSTCODE" , "PatientTD_$0"."State" AS "REGION" , "PatientTD_$0"."CountryValue" AS "COUNTRY" , "PatientTD_$0"."CountryCode" AS "COUNTRY_CODE" , "PatientTD_$0"."CountryVocabularyID" AS "COUNTRY_VOCABULARY_ID" , "PatientTD_$0"."CountryCodeSystem" AS "COUNTRY_CODE_SYSTEM" , "PatientTD_$0"."CountryCodeSystemVersion" AS "COUNTRY_CODE_SYSTEM_VERSION" , "PatientTD_$0"."Phone" AS "PHONE" , "PatientTD_$0"."Mobile" AS "MOBILE" , "PatientTD_$0"."Fax" AS "FAX" , "PatientTD_$0"."Email" AS "EMAIL" FROM "legacy.cdw.db.models::DWViews.PatientTD" AS "PatientTD_$0";

-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.INTERACTIONS" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.INTERACTIONS" AS
SELECT "Interactions_$0"."InteractionID" AS "INTERACTION_ID" , "Interactions_$0"."PatientID" AS "PATIENT_ID" , "Interactions_$0"."InteractionTypeValue" AS "INTERACTION_TYPE" , "Interactions_$0"."InteractionTypeCode" AS "INTERACTION_TYPE_CODE" , "Interactions_$0"."InteractionTypeVocabularyID" AS "INTERACTION_TYPE_VOCABULARY_ID" , "Interactions_$0"."InteractionTypeCodeSystem" AS "INTERACTION_TYPE_CODE_SYSTEM" , "Interactions_$0"."InteractionTypeCodeSystemVersion" AS "INTERACTION_TYPE_CODE_SYSTEM_VERSION" , "Interactions_$0"."ParentInteractionID" AS "PARENT_INTERACT_ID" , "Interactions_$0"."ConditionID" AS "CONDITION_ID" , "Interactions_$0"."PeriodStart" AS "START" , "Interactions_$0"."PeriodEnd" AS "END" , "Interactions_$0"."OrgID" AS "ORG_ID" FROM "legacy.cdw.db.models::DWViews.Interactions" AS "Interactions_$0";


-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_EAV" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_EAV" AS
SELECT "Interaction_Details_$0"."InteractionID" AS "INTERACTION_ID" , "Interaction_Details_$0"."AttributeValue" AS "ATTRIBUTE" , "Interaction_Details_$0"."AttributeCode" AS "ATTRIBUTE_CODE" , "Interaction_Details_$0"."AttributeVocabularyID" AS "ATTRIBUTE_VOCABULARY_ID" , "Interaction_Details_$0"."AttributeCodeSystem" AS "ATTRIBUTE_CODE_SYSTEM" , "Interaction_Details_$0"."AttributeCodeSystemVersion" AS "ATTRIBUTE_CODE_SYSTEM_VERSION" , "Interaction_Details_$0"."Value" AS "VALUE" , "Interaction_Details_$0"."ValueCode" AS "VALUE_CODE" , "Interaction_Details_$0"."ValueVocabularyID" AS "VALUE_VOCABULARY_ID" , "Interaction_Details_$0"."ValueCodeSystem" AS "VALUE_CODE_SYSTEM" , "Interaction_Details_$0"."ValueCodeSystemVersion" AS "VALUE_CODE_SYSTEM_VERSION" FROM "legacy.cdw.db.models::DWViewsEAV.Interaction_Details" AS "Interaction_Details_$0";


-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_OTS" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_OTS" AS
SELECT "InteractionDetailsOTS_$0"."InteractionID" AS "INTERACTION_ID" , "InteractionDetailsOTS_$0"."AttributeValue" AS "ATTRIBUTE" , "InteractionDetailsOTS_$0"."AttributeCode" AS "ATTRIBUTE_CODE" , "InteractionDetailsOTS_$0"."AttributeCodeSystem" AS "ATTRIBUTE_CODING_SYSTEM" , "InteractionDetailsOTS_$0"."AttributeCodeSystemVersion" AS "ATTRIBUTE_VERSION" , "InteractionDetailsOTS_$0"."Value" AS "VALUE" , "InteractionDetailsOTS_$0"."ValueCode" AS "VALUE_CODE" , "InteractionDetailsOTS_$0"."ValueCodeSystem" AS "VALUE_CODE_SYSTEM" , "InteractionDetailsOTS_$0"."ValueCodeSystemVersion" AS "VALUE_VERSION" , "InteractionDetailsOTS_$0"."TARGET_CODE" AS "TARGET_CODE" , "InteractionDetailsOTS_$0"."TARGET_VOCABULARY_ID" AS "TARGET_VOCABULARY_ID" , "InteractionDetailsOTS_$0"."HIERARCHY_LEVEL" AS "HIERARCHY_LEVEL" , "InteractionDetailsOTS_$0"."SUBJECT" AS "SUBJECT" , "InteractionDetailsOTS_$0"."TERM_CONTEXT" AS "TERM_CONTEXT" , "InteractionDetailsOTS_$0"."DESCRIPTION" AS "DESCRIPTION" , "InteractionDetailsOTS_$0"."LANGUAGE" AS "LANGUAGE" FROM "legacy.cdw.db.models::DWViews.InteractionDetailsOTS" AS "InteractionDetailsOTS_$0";


-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.INTERACTION_MEASURES_EAV" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.INTERACTION_MEASURES_EAV" AS
SELECT "Interaction_Measures_$0"."InteractionID" AS "INTERACTION_ID" , "Interaction_Measures_$0"."AttributeValue" AS "ATTRIBUTE" , "Interaction_Measures_$0"."AttributeCode" AS "ATTRIBUTE_CODE" , "Interaction_Measures_$0"."AttributeVocabularyID" AS "ATTRIBUTE_VOCABULARY_ID" , "Interaction_Measures_$0"."AttributeCodeSystem" AS "ATTRIBUTE_CODE_SYSTEM" , "Interaction_Measures_$0"."AttributeCodeSystemVersion" AS "ATTRIBUTE_CODE_SYSTEM_VERSION" , "Interaction_Measures_$0"."Unit" AS "UNIT" , "Interaction_Measures_$0"."Value" AS "VALUE" FROM "legacy.cdw.db.models::DWViewsEAV.Interaction_Measures" AS "Interaction_Measures_$0";


-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.INTERACTION_TEXT_EAV" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.INTERACTION_TEXT_EAV" AS
SELECT "Interaction_Text_$0"."InteractionTextID" AS "INTERACTION_TEXT_ID" , "Interaction_Text_$0"."InteractionID" AS "INTERACTION_ID" , "Interaction_Text_$0"."Attribute" AS "ATTRIBUTE" , "Interaction_Text_$0"."Value" AS "VALUE" , "Interaction_Text_$0"."Lang" AS "LANG" FROM "legacy.cdw.db.models::DWViewsEAV.Interaction_Text" AS "Interaction_Text_$0";


-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.OBSERVATIONS" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.OBSERVATIONS" AS
SELECT "Observations_$0"."ObsID" AS "OBS_ID" , "Observations_$0"."ObsType" AS "OBS_TYPE" , "Observations_$0"."PatientID" AS "PATIENT_ID" , "Observations_$0"."ObsCharValue" AS "OBS_CHAR_VAL" , "Observations_$0"."ObsNumValue" AS "OBS_NUM_VAL" , "Observations_$0"."ObsUnit" AS "OBS_UNIT" , "Observations_$0"."ObsTime" AS "OBS_TIME" , "Observations_$0"."OrgID" AS "ORG_ID" FROM "legacy.cdw.db.models::DWViews.Observations" AS "Observations_$0";


-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.PATIENT" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.PATIENT" AS
SELECT "Patient_$0"."PatientID" AS "PATIENT_ID" , "Patient_$0"."SourcePatientID" AS "SOURCE_PATIENT_ID" , "Patient_$0"."Source" AS "SOURCE" , "Patient_$0"."OrgID" AS "ORG_ID" , "Patient_$0"."FamilyName" AS "LASTNAME" , "Patient_$0"."GivenName" AS "FIRSTNAME" , "Patient_$0"."TitleValue" AS "TITLE" , "Patient_$0"."TitleCode" AS "TITLE_CODE" , "Patient_$0"."TitleVocabularyID" AS "TITLE_VOCABULARY_ID" , "Patient_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM" , "Patient_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM_VERSION" , "Patient_$0"."GenderValue" AS "GENDER" , "Patient_$0"."GenderCode" AS "GENDER_CODE" , "Patient_$0"."GenderVocabularyID" AS "GENDER_VOCABULARY_ID" , "Patient_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM" , "Patient_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM_VERSION" , "Patient_$0"."BirthDate" AS "DOB" , "Patient_$0"."MultipleBirthOrder" AS "MULTIPLE_BIRTH_ORDER" , "Patient_$0"."DeceasedDate" AS "DOD" , "Patient_$0"."MaritalStatusValue" AS "MARITAL_STATUS" , "Patient_$0"."MaritalStatusCode" AS "MARITAL_STATUS_CODE" , "Patient_$0"."MaritalStatusVocabularyID" AS "MARITAL_STATUS_VOCABULARY_ID" , "Patient_$0"."MaritalStatusCodeSystem" AS "MARITAL_STATUS_CODE_SYSTEM" , "Patient_$0"."MaritalStatusCodeSystemVersion" AS "MARITAL_STATUS_CODE_SYSTEM_VERSION" , "Patient_$0"."NationalityValue" AS "NATIONALITY" , "Patient_$0"."NationalityCode" AS "NATIONALITY_CODE" , "Patient_$0"."NationalityVocabularyID" AS "NATIONALITY_VOCABULARY_ID" , "Patient_$0"."NationalityCodeSystem" AS "NATIONALITY_CODE_SYSTEM" , "Patient_$0"."NationalityCodeSystemVersion" AS "NATIONALITY_CODE_SYSTEM_VERSION" , "Patient_$0"."StreetName" AS "STREET" , "Patient_$0"."StreetNumber" AS "STREET_NUMBER" , "Patient_$0"."PostOfficeBox" AS "POST_OFFICE_BOX" , "Patient_$0"."City" AS "CITY" , "Patient_$0"."PostalCode" AS "POSTCODE" , "Patient_$0"."State" AS "REGION" , "Patient_$0"."CountryValue" AS "COUNTRY" , "Patient_$0"."CountryCode" AS "COUNTRY_CODE" , "Patient_$0"."CountryVocabularyID" AS "COUNTRY_VOCABULARY_ID" , "Patient_$0"."CountryCodeSystem" AS "COUNTRY_CODE_SYSTEM" , "Patient_$0"."CountryCodeSystemVersion" AS "COUNTRY_CODE_SYSTEM_VERSION" , "Patient_$0"."Phone" AS "PHONE" , "Patient_$0"."Mobile" AS "MOBILE" , "Patient_$0"."Fax" AS "FAX" , "Patient_$0"."Email" AS "EMAIL" FROM "legacy.cdw.db.models::DWViews.Patient" AS "Patient_$0";


-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.PATIENT_TD" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.PATIENT_TD" AS
SELECT "PatientTD_$0"."PatientID" AS "PATIENT_ID" , "PatientTD_$0"."SourcePatientID" AS "SOURCE_PATIENT_ID" , "PatientTD_$0"."Source" AS "SOURCE" , "PatientTD_$0"."OrgID" AS "ORG_ID" , "PatientTD_$0"."ValidFrom" AS "VALID_FROM" , "PatientTD_$0"."ValidTo" AS "VALID_TO" , "PatientTD_$0"."FamilyName" AS "LASTNAME" , "PatientTD_$0"."GivenName" AS "FIRSTNAME" , "PatientTD_$0"."TitleValue" AS "TITLE" , "PatientTD_$0"."TitleCode" AS "TITLE_CODE" , "PatientTD_$0"."TitleVocabularyID" AS "TITLE_VOCABULARY_ID" , "PatientTD_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM" , "PatientTD_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM_VERSION" , "PatientTD_$0"."GenderValue" AS "GENDER" , "PatientTD_$0"."GenderCode" AS "GENDER_CODE" , "PatientTD_$0"."GenderVocabularyID" AS "GENDER_VOCABULARY_ID" , "PatientTD_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM" , "PatientTD_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM_VERSION" , "PatientTD_$0"."BirthDate" AS "DOB" , "PatientTD_$0"."MultipleBirthOrder" AS "MULTIPLE_BIRTH_ORDER" , "PatientTD_$0"."DeceasedDate" AS "DOD" , "PatientTD_$0"."MaritalStatusValue" AS "MARITAL_STATUS" , "PatientTD_$0"."MaritalStatusCode" AS "MARITAL_STATUS_CODE" , "PatientTD_$0"."MaritalStatusVocabularyID" AS "MARITAL_STATUS_VOCABULARY_ID" , "PatientTD_$0"."MaritalStatusCodeSystem" AS "MARITAL_STATUS_CODE_SYSTEM" , "PatientTD_$0"."MaritalStatusCodeSystemVersion" AS "MARITAL_STATUS_CODE_SYSTEM_VERSION" , "PatientTD_$0"."NationalityValue" AS "NATIONALITY" , "PatientTD_$0"."NationalityCode" AS "NATIONALITY_CODE" , "PatientTD_$0"."NationalityVocabularyID" AS "NATIONALITY_VOCABULARY_ID" , "PatientTD_$0"."NationalityCodeSystem" AS "NATIONALITY_CODE_SYSTEM" , "PatientTD_$0"."NationalityCodeSystemVersion" AS "NATIONALITY_CODE_SYSTEM_VERSION" , "PatientTD_$0"."StreetName" AS "STREET" , "PatientTD_$0"."StreetNumber" AS "STREET_NUMBER" , "PatientTD_$0"."PostOfficeBox" AS "POST_OFFICE_BOX" , "PatientTD_$0"."City" AS "CITY" , "PatientTD_$0"."PostalCode" AS "POSTCODE" , "PatientTD_$0"."State" AS "REGION" , "PatientTD_$0"."CountryValue" AS "COUNTRY" , "PatientTD_$0"."CountryCode" AS "COUNTRY_CODE" , "PatientTD_$0"."CountryVocabularyID" AS "COUNTRY_VOCABULARY_ID" , "PatientTD_$0"."CountryCodeSystem" AS "COUNTRY_CODE_SYSTEM" , "PatientTD_$0"."CountryCodeSystemVersion" AS "COUNTRY_CODE_SYSTEM_VERSION" , "PatientTD_$0"."Phone" AS "PHONE" , "PatientTD_$0"."Mobile" AS "MOBILE" , "PatientTD_$0"."Fax" AS "FAX" , "PatientTD_$0"."Email" AS "EMAIL" FROM "legacy.cdw.db.models::DWViews.PatientTD" AS "PatientTD_$0";


-- <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.PRACTITIONER" source

CREATE VIEW <TEST_SCHEMA>."legacy.cdw.db.models::InterfaceViews.PRACTITIONER" AS
SELECT "PractitionerTD_$0"."PractitionerID" AS "PRACTITIONER_ID" , "PractitionerTD_$0"."SourcePractitionerID" AS "SOURCE_PRACTITIONER_ID" , "PractitionerTD_$0"."Source" AS "SOURCE" , "PractitionerTD_$0"."OrgID" AS "ORG_ID" , "PractitionerTD_$0"."FamilyName" AS "LASTNAME" , "PractitionerTD_$0"."GivenName" AS "FIRSTNAME" , "PractitionerTD_$0"."TitleValue" AS "TITLE" , "PractitionerTD_$0"."TitleCode" AS "TITLE_CODE" , "PractitionerTD_$0"."TitleVocabularyID" AS "TITLE_VOCABULARY_ID" , "PractitionerTD_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM" , "PractitionerTD_$0"."TitleCodeSystem" AS "TITLE_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."GenderValue" AS "GENDER" , "PractitionerTD_$0"."GenderCode" AS "GENDER_CODE" , "PractitionerTD_$0"."GenderVocabularyID" AS "GENDER_VOCABULARY_ID" , "PractitionerTD_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM" , "PractitionerTD_$0"."GenderCodeSystem" AS "GENDER_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."BirthDate" AS "DOB" , "PractitionerTD_$0"."MaritalStatusValue" AS "MARITAL_STATUS" , "PractitionerTD_$0"."MaritalStatusCode" AS "MARITAL_STATUS_CODE" , "PractitionerTD_$0"."MaritalStatusVocabularyID" AS "MARITAL_STATUS_VOCABULARY_ID" , "PractitionerTD_$0"."MaritalStatusCodeSystem" AS "MARITAL_STATUS_CODE_SYSTEM" , "PractitionerTD_$0"."MaritalStatusCodeSystemVersion" AS "MARITAL_STATUS_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."NationalityValue" AS "NATIONALITY" , "PractitionerTD_$0"."NationalityCode" AS "NATIONALITY_CODE" , "PractitionerTD_$0"."NationalityVocabularyID" AS "NATIONALITY_VOCABULARY_ID" , "PractitionerTD_$0"."NationalityCodeSystem" AS "NATIONALITY_CODE_SYSTEM" , "PractitionerTD_$0"."NationalityCodeSystemVersion" AS "NATIONALITY_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."RoleValue" AS "ROLE" , "PractitionerTD_$0"."RoleCode" AS "ROLE_CODE" , "PractitionerTD_$0"."RoleVocabularyID" AS "ROLE_VOCABULARY_ID" , "PractitionerTD_$0"."RoleCodeSystem" AS "ROLE_CODE_SYSTEM" , "PractitionerTD_$0"."RoleCodeSystemVersion" AS "ROLE_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."SpecialityValue" AS "SPECIALITY" , "PractitionerTD_$0"."SpecialityCode" AS "SPECIALITY_CODE" , "PractitionerTD_$0"."SpecialityVocabularyID" AS "SPECIALITY_VOCABULARY_ID" , "PractitionerTD_$0"."SpecialityCodeSystem" AS "SPECIALITY_CODE_SYSTEM" , "PractitionerTD_$0"."SpecialityCodeSystemVersion" AS "SPECIALITY_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."PreferredLanguage" AS "LANGUAGE" , "PractitionerTD_$0"."StreetName" AS "STREET" , "PractitionerTD_$0"."StreetNumber" AS "STREET_NUMBER" , "PractitionerTD_$0"."PostOfficeBox" AS "POST_OFFICE_BOX" , "PractitionerTD_$0"."City" AS "CITY" , "PractitionerTD_$0"."PostalCode" AS "POSTCODE" , "PractitionerTD_$0"."State" AS "REGION" , "PractitionerTD_$0"."CountryValue" AS "COUNTRY" , "PractitionerTD_$0"."CountryCode" AS "COUNTRY_CODE" , "PractitionerTD_$0"."CountryVocabularyID" AS "COUNTRY_VOCABULARY_ID" , "PractitionerTD_$0"."CountryCodeSystem" AS "COUNTRY_CODE_SYSTEM" , "PractitionerTD_$0"."CountryCodeSystemVersion" AS "COUNTRY_CODE_SYSTEM_VERSION" , "PractitionerTD_$0"."Phone" AS "PHONE" , "PractitionerTD_$0"."Mobile" AS "MOBILE" , "PractitionerTD_$0"."Fax" AS "FAX" , "PractitionerTD_$0"."Email" AS "EMAIL" FROM "legacy.cdw.db.models::DWViews.PractitionerTD" AS "PractitionerTD_$0";


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllCollectionComments" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllCollectionComments" AS
SELECT "Comment_$0"."Id" , "Comment_$0"."Collection.Id" AS "CollectionId" , "Comment_$0"."Item.Id" AS "ItemId" , "Comment_$0"."Text" , "Comment_$0"."Type" , "Comment_$0"."CreatedBy" , "Comment_$0"."CreatedAt" FROM "legacy.collections.db.models::CollectionModel.Comment" AS "Comment_$0" WHERE  ( "Comment_$0"."Item.Id" = '' );

-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllItemComments" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllItemComments" AS
SELECT "Comment_$0"."Id" , "Comment_$0"."Collection.Id" AS "CollectionId" , "Comment_$0"."Item.Id" AS "ItemId" , "Comment_$0"."Text" , "Comment_$0"."Type" , "Comment_$0"."CreatedBy" , "Comment_$0"."CreatedAt" FROM "legacy.collections.db.models::CollectionModel.Comment" AS "Comment_$0" WHERE  ( "Comment_$0"."Item.Id" != '' );


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllItems" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllItems" AS
SELECT "Item_$0"."Id" , "Item_$0"."ItemType" , "Item_$0"."Collection.Id" AS "CollectionId" , "Item_$0"."CreatedBy" , "Item_$0"."CreatedAt" , "Item_$0"."ChangedBy" , "Item_$0"."ChangedAt" , "Item_$0"."Status.Id" AS "StatusId" FROM "legacy.collections.db.models::CollectionModel.Item" AS "Item_$0";


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllMyCollections" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllMyCollections" AS
SELECT "Collection_$0"."Id" , "Collection_$0"."Type.Id" AS "CollectionType" , "Collection_$0"."Title" , "Collection_$0"."Description" , "Collection_$0"."CreatedBy" , "Collection_$0"."CreatedAt" , "Collection_$0"."ChangedBy" , "Collection_$0"."ChangedAt" FROM  ( "legacy.collections.db.models::CollectionModel.Collection" AS "Collection_$0" LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.Participant" AS "Participant_$1" ON  ( "Participant_$1"."Collection.Id" = "Collection_$0"."Id" )  )  WHERE  (  ( SESSION_CONTEXT ( 'XS_APPLICATIONUSER' )  = "Participant_$1"."HANAUserName" )  AND  ( "Collection_$0"."Type.Id" = '1' )  );

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.IncludedPatientIds" AS
SELECT  COUNT  ( "Item_$0"."Status.Id" )  AS "IncludedCount" , "Item_$0"."Collection.Id" AS "CollectionId" FROM "legacy.collections.db.models::CollectionModel.Item" AS "Item_$0" WHERE  (  ( "Item_$0"."ItemType" = 'legacy.tax.Patient' )  AND  ( "Item_$0"."Status.Id" = '2' )  )  GROUP BY "Item_$0"."Collection.Id";

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.ItemIds" AS
SELECT  COUNT  ( "Item_$0"."Id" )  AS "ItemCount" , "Item_$0"."Collection.Id" AS "CollectionId" FROM "legacy.collections.db.models::CollectionModel.Item" AS "Item_$0" GROUP BY "Item_$0"."Collection.Id";

-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.ItemNoteIds" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.ItemNoteIds" AS
SELECT  COUNT  ( "AllItemComments_$0"."Id" )  AS "NoteCount" , "AllItemComments_$0"."ItemId" , "AllItemComments_$0"."CollectionId" AS "CollectionId" FROM "legacy.collections.db.models::CollectionModel.AllItemComments" AS "AllItemComments_$0" GROUP BY "AllItemComments_$0"."CollectionId" , "AllItemComments_$0"."ItemId";


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.ItemsCollectionIds" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.ItemsCollectionIds" AS
SELECT "Item_$0"."Id" ,  COUNT  ( "Item_$0"."Collection.Id" )  AS "CohortCount" FROM  ( "legacy.collections.db.models::CollectionModel.Item" AS "Item_$0" LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.Participant" AS "Participant_$1" ON  ( "Participant_$1"."Collection.Id" = "Item_$0"."Collection.Id" )  )  WHERE  ( SESSION_CONTEXT ( 'XS_APPLICATIONUSER' )  = "Participant_$1"."HANAUserName" )  GROUP BY "Item_$0"."Id";


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.NoteIds" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.NoteIds" AS
SELECT  COUNT  ( "AllCollectionComments_$0"."Id" )  AS "NoteCount" , "AllCollectionComments_$0"."CollectionId" AS "CollectionId" FROM "legacy.collections.db.models::CollectionModel.AllCollectionComments" AS "AllCollectionComments_$0" GROUP BY "AllCollectionComments_$0"."CollectionId";


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.ParticipantIds" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.ParticipantIds" AS
SELECT  COUNT  ( "Participant_$0"."HANAUserName" )  AS "ParticipantCount" , "Participant_$0"."Collection.Id" AS "CollectionId" FROM "legacy.collections.db.models::CollectionModel.Participant" AS "Participant_$0" GROUP BY "Participant_$0"."Collection.Id";

-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllMyCollections2" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllMyCollections2" AS
SELECT "Collection_$0"."Id" , "Collection_$0"."Type.Id" AS "CollectionType" , "Collection_$0"."Title" , "Collection_$0"."Description" , "Collection_$0"."CreatedBy" , "Collection_$0"."CreatedAt" , "Collection_$0"."ChangedBy" , "Collection_$0"."ChangedAt" , "Participant_$4"."Privilege.Id" AS "PrivilegeId" , "ParticipantIds_$5"."ParticipantCount" , "ItemIds_$2"."ItemCount" AS "ItemCount" , "IncludedPatientIds_$1"."IncludedCount" AS "IncludedCount" , "NoteIds_$3"."NoteCount" AS "NoteCount" FROM  (  (  (  (  ( "legacy.collections.db.models::CollectionModel.Collection" AS "Collection_$0" LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.IncludedPatientIds" AS "IncludedPatientIds_$1" ON  ( "IncludedPatientIds_$1"."CollectionId" = "Collection_$0"."Id" )  )  LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.ItemIds" AS "ItemIds_$2" ON  ( "ItemIds_$2"."CollectionId" = "Collection_$0"."Id" )  )  LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.NoteIds" AS "NoteIds_$3" ON  ( "NoteIds_$3"."CollectionId" = "Collection_$0"."Id" )  )  LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.Participant" AS "Participant_$4" ON  ( "Participant_$4"."Collection.Id" = "Collection_$0"."Id" )  )  LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.ParticipantIds" AS "ParticipantIds_$5" ON  ( "ParticipantIds_$5"."CollectionId" = "Collection_$0"."Id" )  )  WHERE  (  ( SESSION_CONTEXT ( 'XS_APPLICATIONUSER' )  = "Participant_$4"."HANAUserName" )  AND  ( "Collection_$0"."Type.Id" = '1' )  );


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllParticipants" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllParticipants" AS
SELECT "Participant_$0"."Collection.Id" AS "CollectionId" , "Participant_$0"."Privilege.Id" AS "PrivilegeId" , "Participant_$0"."HANAUserName" , ' ' AS "CreatorFirstName" , ' ' AS "CreatorLastName" , ' ' AS "CreatorDefaultEMailAddress" , ' ' AS "CreatorDefaultHomepageURL" FROM "legacy.collections.db.models::CollectionModel.Participant" AS "Participant_$0";


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllPrivileges" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.AllPrivileges" AS
SELECT "ParticipantPrivilege_$0"."Id" , "ParticipantPrivilege_$0"."Title" FROM "legacy.collections.db.models::CollectionModel.ParticipantPrivilege" AS "ParticipantPrivilege_$0";


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.CollectionItemsByStatus" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.CollectionItemsByStatus" AS
SELECT "Item_$0"."Collection.Id" AS "CollectionId" , "Item_$0"."Status.Id" AS "StatusId" ,  COUNT  ( "Item_$0"."Id" )  AS "ItemCount" FROM "legacy.collections.db.models::CollectionModel.Item" AS "Item_$0" GROUP BY "Item_$0"."Status.Id" , "Item_$0"."Collection.Id";


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.CollectionStatusConfiguration" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.CollectionStatusConfiguration" AS
SELECT "StatusConfiguration_$0"."Id" , "StatusConfiguration_$0"."CollectionType.Id" AS "CollectionTypeId" , "StatusConfiguration_$0"."IconSource" , "StatusConfiguration_$0"."TextKey" FROM "legacy.collections.db.models::CollectionModel.StatusConfiguration" AS "StatusConfiguration_$0" WHERE  ( "StatusConfiguration_$0"."ItemType" = 'legacy.tax.Patient' );

-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.PatientItems" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.PatientItems" AS
SELECT "Item_$0"."Id" , "Item_$0"."ItemType" , "Item_$0"."Collection.Id" AS "CollectionId" , "ItemNoteIds_$4"."NoteCount" AS "NoteCount" , "ItemsCollectionIds_$1"."CohortCount" AS "CohortCount" , "CollectionItemsByStatus_$2"."ItemCount" AS "ItemCount" , "ItemIds_$3"."ItemCount" AS "TotalCount" , "Item_$0"."CreatedBy" , "Item_$0"."CreatedAt" , "Item_$0"."ChangedBy" , "Item_$0"."ChangedAt" , "Item_$0"."Status.Id" AS "StatusId" FROM  (  (  (  ( "legacy.collections.db.models::CollectionModel.Item" AS "Item_$0" LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.ItemsCollectionIds" AS "ItemsCollectionIds_$1" ON  ( "ItemsCollectionIds_$1"."Id" = "Item_$0"."Id" )  )  LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.CollectionItemsByStatus" AS "CollectionItemsByStatus_$2" ON  (  ( "CollectionItemsByStatus_$2"."CollectionId" = "Item_$0"."Collection.Id" )  AND  ( "CollectionItemsByStatus_$2"."StatusId" = "Item_$0"."Status.Id" )  )  )  LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.ItemIds" AS "ItemIds_$3" ON  ( "ItemIds_$3"."CollectionId" = "Item_$0"."Collection.Id" )  )  LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.ItemNoteIds" AS "ItemNoteIds_$4" ON  (  ( "ItemNoteIds_$4"."ItemId" = "Item_$0"."Id" )  AND  ( "ItemNoteIds_$4"."CollectionId" = "Item_$0"."Collection.Id" )  )  )  WHERE  ( "Item_$0"."ItemType" = 'legacy.tax.Patient' );


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.StatusCount" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.StatusCount" AS
SELECT "StatusConfiguration_$0"."Id" , "StatusConfiguration_$0"."TextKey" ,  COUNT  ( "StatusConfiguration_$0"."Items"."Id" )  AS "ItemsCount" , "StatusConfiguration_$0"."Items"."Collection.Id" AS "CollectionId" FROM "legacy.collections.db.models::CollectionModel.StatusConfiguration" AS "StatusConfiguration_$0" GROUP BY "StatusConfiguration_$0"."Id" , "StatusConfiguration_$0"."TextKey" , "StatusConfiguration_$0"."Items"."Collection.Id";


-- <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.UserCollections" source

CREATE VIEW <TEST_SCHEMA>."legacy.collections.db.models::CollectionModel.UserCollections" AS
SELECT "Collection_$0"."Id" , "Collection_$0"."Type.Id" AS "CollectionType" , "Collection_$0"."Title" , "NoteIds_$3"."NoteCount" AS "NoteCount" , "Collection_$0"."Description" , "Collection_$0"."CreatedBy" , "Collection_$0"."CreatedAt" , "Collection_$0"."ChangedBy" , "Collection_$0"."ChangedAt" , "Participant_$4"."Privilege.Id" AS "PrivilegeId" , "ParticipantIds_$5"."ParticipantCount" AS "ParticipantCount" , "ItemIds_$2"."ItemCount" AS "PatientCount" , "ItemIds_$2"."ItemCount" AS "ItemCount" , "IncludedPatientIds_$1"."IncludedCount" AS "IncludedCount" FROM  (  (  (  (  ( "legacy.collections.db.models::CollectionModel.Collection" AS "Collection_$0" LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.IncludedPatientIds" AS "IncludedPatientIds_$1" ON  ( "IncludedPatientIds_$1"."CollectionId" = "Collection_$0"."Id" )  )  LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.ItemIds" AS "ItemIds_$2" ON  ( "ItemIds_$2"."CollectionId" = "Collection_$0"."Id" )  )  LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.NoteIds" AS "NoteIds_$3" ON  ( "NoteIds_$3"."CollectionId" = "Collection_$0"."Id" )  )  LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.Participant" AS "Participant_$4" ON  ( "Participant_$4"."Collection.Id" = "Collection_$0"."Id" )  )  LEFT OUTER JOIN "legacy.collections.db.models::CollectionModel.ParticipantIds" AS "ParticipantIds_$5" ON  ( "ParticipantIds_$5"."CollectionId" = "Collection_$0"."Id" )  )  WHERE  ( SESSION_CONTEXT ( 'XS_APPLICATIONUSER' )  = "Participant_$4"."HANAUserName" );


-- <TEST_SCHEMA>."legacy.config.db.models::Configuration.Assignment" source

CREATE VIEW <TEST_SCHEMA>."legacy.config.db.models::Configuration.Assignment" AS
SELECT "AssignmentDetail_$0"."Header"."Id" AS "Id" , "AssignmentDetail_$0"."Header"."Name" AS "Name" , "AssignmentDetail_$0"."Header"."EntityType" AS "EntityType" , "AssignmentDetail_$0"."Header"."EntityValue" AS "EntityValue" , "AssignmentDetail_$0"."Header"."Creator" AS "Creator" , "AssignmentDetail_$0"."Header"."Created" AS "Created" , "AssignmentDetail_$0"."Header"."Modifier" AS "Modifier" , "AssignmentDetail_$0"."Header"."Modified" AS "Modified" , "AssignmentDetail_$0"."Config"."Id" AS "ConfigId" , "AssignmentDetail_$0"."Config"."Version" AS "ConfigVersion" , "AssignmentDetail_$0"."Config"."Type" AS "ConfigType" FROM "legacy.config.db.models::Configuration.AssignmentDetail" AS "AssignmentDetail_$0";


-- <TEST_SCHEMA>."legacy.config.db.models::Configuration.DefaultConfig" source

CREATE VIEW <TEST_SCHEMA>."legacy.config.db.models::Configuration.DefaultConfig" AS
SELECT "UserDefaultConfig_$0"."User" , "UserDefaultConfig_$0"."ConfigType" , "UserDefaultConfig_$0"."Config"."Id" , "UserDefaultConfig_$0"."Config"."Version" , "UserDefaultConfig_$0"."Config"."Name" , "UserDefaultConfig_$0"."Config"."Data" FROM "legacy.config.db.models::Configuration.UserDefaultConfig" AS "UserDefaultConfig_$0";


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.AuditLogRuns" source

CREATE VIEW <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.AuditLogRuns" AS
SELECT "AuditLog_$0"."AuditLogID" , "AuditLog_$0"."ParentAuditLogID" , "AuditLog_$0"."ExtensionID" , "AuditLog_$0"."DocumentID" , "AuditLog_$0"."DocumentURI" , "AuditLog_$0"."SourceID" , "AuditLog_$0"."ProfileID" , "AuditLog_$0"."Status" , "AuditLog_$0"."StartTime" , "AuditLog_$0"."EndTime" , "AuditLog_$0"."ScheduleConfigID" , "AuditLog_$0"."MonitorID" FROM "legacy.di.db.model::DataIntegration.AuditLog" AS "AuditLog_$0";


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.CompleteduditLogRuns" source

CREATE VIEW <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.CompleteduditLogRuns" AS
SELECT "AuditLog_$0"."AuditLogID" , "AuditLog_$0"."ParentAuditLogID" , "AuditLog_$0"."ExtensionID" , "AuditLog_$0"."DocumentID" , "AuditLog_$0"."DocumentURI" , "AuditLog_$0"."SourceID" , "AuditLog_$0"."ProfileID" , "AuditLog_$0"."Status" , "AuditLog_$0"."StartTime" , "AuditLog_$0"."EndTime" , "AuditLog_$0"."ScheduleConfigID" , "AuditLog_$0"."MonitorID" FROM "legacy.di.db.model::DataIntegration.AuditLog" AS "AuditLog_$0" WHERE  ( "AuditLog_$0"."Status" = 'Completed' );


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.DWSources" source

CREATE VIEW <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.DWSources" AS
SELECT "DISource_$0"."SourceID" , "DISource_$0"."Name" , "DISource_$0"."Description" , "DISource_$0"."CreatedAt" , "DISource_$0"."CreatedBy" , "DISource_$0"."ModifiedAt" , "DISource_$0"."ModifiedBy" FROM "legacy.di.db.model::DataIntegration.DISource" AS "DISource_$0";


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.FailedAuditLogRuns" source

CREATE VIEW <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.FailedAuditLogRuns" AS
SELECT "AuditLog_$0"."AuditLogID" , "AuditLog_$0"."ParentAuditLogID" , "AuditLog_$0"."ExtensionID" , "AuditLog_$0"."DocumentID" , "AuditLog_$0"."DocumentURI" , "AuditLog_$0"."SourceID" , "AuditLog_$0"."ProfileID" , "AuditLog_$0"."Status" , "AuditLog_$0"."StartTime" , "AuditLog_$0"."EndTime" , "AuditLog_$0"."ScheduleConfigID" , "AuditLog_$0"."MonitorID" FROM "legacy.di.db.model::DataIntegration.AuditLog" AS "AuditLog_$0" WHERE  ( "AuditLog_$0"."Status" = 'Failed' );


-- <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.JobProfiles" source

CREATE VIEW <TEST_SCHEMA>."legacy.di.db.model::DataIntegration.JobProfiles" AS
SELECT "JobProfile_$0"."ProfileID" , "JobProfile_$0"."ExtensionID" , "JobProfile_$0"."Name" AS "ProfileName" , "JobProfile_$0"."Description" AS "Description" , "JobProfile_$0"."SourceID" , "DISource_$1"."Name" AS "SourceName" , "DISource_$1"."Description" AS "SourceDescription" , "JobProfile_$0"."CreatedAt" , "JobProfile_$0"."CreatedBy" , "JobProfile_$0"."ModifiedAt" , "JobProfile_$0"."ModifiedBy" , "JobProfile_$0"."Status" , "JobProfile_$0"."ProfileJSONParams" , "JobProfile_$0"."AdditionalParams" FROM  ( "legacy.di.db.model::DataIntegration.JobProfile" AS "JobProfile_$0" LEFT OUTER JOIN "legacy.di.db.model::DataIntegration.DISource" AS "DISource_$1" ON  ( "JobProfile_$0"."SourceID" = "DISource_$1"."SourceID" )  );


--------
SET SCHEMA <TEST_SCHEMA>;

CREATE PROCEDURE "legacy.config.db.procedures::CreateAssignment" (
        IN ASSIGNMENT_NAME NVARCHAR(256),
        IN ENTITY_TYPE NVARCHAR(1),
        IN ENTITY_VALUE NVARCHAR(256),
        IN CONFIGS TABLE(
            CONFIG_ID NVARCHAR(40),
            CONFIG_VERSION NVARCHAR(20),
            CONFIG_TYPE NVARCHAR(20)
        ),
        OUT GUID NVARCHAR(40)
    ) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    AS

BEGIN

    DECLARE USERNAME NVARCHAR(256) := SESSION_CONTEXT('APPLICATIONUSER');
    DECLARE CURSOR config_cursor FOR
        SELECT CONFIG_ID, CONFIG_VERSION, CONFIG_TYPE FROM :CONFIGS;

    GUID := SYSUUID;

    INSERT INTO "legacy.config.db.models::Configuration.AssignmentHeader"
        ("Id", "Name", "EntityType", "EntityValue", "Creator", "Created", "Modifier", "Modified")
        VALUES (:GUID, :ASSIGNMENT_NAME, :ENTITY_TYPE, :ENTITY_VALUE, :USERNAME, CURRENT_UTCTIMESTAMP, :USERNAME, CURRENT_UTCTIMESTAMP);

    FOR cur_row as config_cursor DO
        INSERT INTO "legacy.config.db.models::Configuration.AssignmentDetail"
            ("Header.Id", "Config.Id", "Config.Version", "Config.Type")
            VALUES (:GUID, cur_row.CONFIG_ID, cur_row.CONFIG_VERSION, cur_row.CONFIG_TYPE);
    END FOR;

END;

CREATE PROCEDURE "legacy.config.db.procedures::CreateConfiguration" (
        IN CONFIG_ID NVARCHAR(40),
        IN CONFIG_VERSION NVARCHAR(20),
        IN CONFIG_TYPE NVARCHAR(20),
        IN CONFIG_STATUS NVARCHAR(1),
        IN CONFIG_NAME NVARCHAR(256),
        IN PARENT_CONFIG_ID NVARCHAR(40),
        IN PARENT_CONFIG_VERSION NVARCHAR(20),
        IN DATA NCLOB,
        OUT CONFIG_ID_OUT NVARCHAR(40)
    ) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    AS

BEGIN
    DECLARE EXISTS INTEGER;
    DECLARE USERNAME NVARCHAR(256) := SESSION_CONTEXT('APPLICATIONUSER');

    IF CONFIG_ID is NULL THEN
        CONFIG_ID_OUT := SYSUUID;
    ELSE
        CONFIG_ID_OUT := CONFIG_ID;
    END IF;

    SELECT count(*) INTO EXISTS 
    FROM "legacy.config.db.models::Configuration.Config"
    WHERE "Id" = :CONFIG_ID AND "Version" = CONFIG_VERSION;

    IF EXISTS > 0 THEN
        UPDATE "legacy.config.db.models::Configuration.Config"
        SET
            "Status" = COALESCE(:CONFIG_STATUS, "Status"),
            "Name" = COALESCE(:CONFIG_NAME, "Name"),
            "Parent.Id" = COALESCE(:PARENT_CONFIG_ID, "Parent.Id"),
            "Parent.Version" = COALESCE(:PARENT_CONFIG_VERSION, "Parent.Version"),
            "Data" = COALESCE(:DATA, "Data"),
            "Modifier" = :USERNAME,
            "Modified" = CURRENT_UTCTIMESTAMP
        WHERE "Id" = :CONFIG_ID AND "Version" = CONFIG_VERSION;
    ELSE
        INSERT INTO "legacy.config.db.models::Configuration.Config"
            ("Id", "Version", "Type", "Status", "Name", "Parent.Id", "Parent.Version", "Data", "Creator", "Created", "Modifier", "Modified")
            VALUES (:CONFIG_ID_OUT, :CONFIG_VERSION, :CONFIG_TYPE, :CONFIG_STATUS, :CONFIG_NAME, :PARENT_CONFIG_ID, :PARENT_CONFIG_VERSION, :DATA, :USERNAME, CURRENT_UTCTIMESTAMP, :USERNAME, CURRENT_UTCTIMESTAMP);
    END IF;



END;

CREATE PROCEDURE "legacy.config.db.procedures::DeleteAssignment" (
        IN ASSIGNMENT_ID NVARCHAR(256)
    ) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    AS

BEGIN 
 
    DELETE FROM "legacy.config.db.models::Configuration.AssignmentHeader"
    WHERE "Id" = :ASSIGNMENT_ID;
    DELETE FROM "legacy.config.db.models::Configuration.AssignmentDetail"
    WHERE "Header.Id" = :ASSIGNMENT_ID;

END;

CREATE PROCEDURE "legacy.config.db.procedures::DeleteConfiguration" (
        IN CONFIG_ID NVARCHAR(40),
        IN CONFIG_VERSION NVARCHAR(20),
        IN CONFIG_STATUS NVARCHAR(20)
    ) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    AS

BEGIN

    DECLARE CONFIGS_TO_DELETE TABLE(CONFIG_ID NVARCHAR(40), CONFIG_VERSION NVARCHAR(20));
    DECLARE ASSIGNMENTS_TO_DELETE TABLE(ASSIGNMENT_ID NVARCHAR(40));
    DECLARE PREV_ROWCOUNT INTEGER := 0;
    DECLARE CUR_ROWCOUNT INTEGER := 1;

    CONFIGS_TO_DELETE = 
        SELECT "Id" as CONFIG_ID, "Version" as CONFIG_VERSION 
        FROM "legacy.config.db.models::Configuration.Config"
        WHERE 
            "Id" = :CONFIG_ID AND (
                "Version" = :CONFIG_VERSION
                OR :CONFIG_VERSION is null
            ) AND (
                "Status" = :CONFIG_STATUS
                OR :CONFIG_STATUS is null
            );

    WHILE CUR_ROWCOUNT > PREV_ROWCOUNT DO
        PREV_ROWCOUNT := CUR_ROWCOUNT;
        CONFIGS_TO_DELETE = 
                SELECT "Id" as CONFIG_ID, "Version" as CONFIG_VERSION
                FROM "legacy.config.db.models::Configuration.Config" configs
                    JOIN :CONFIGS_TO_DELETE as toDelete 
                        ON configs."Parent.Id" = toDelete.CONFIG_ID
                        AND configs."Parent.Version" = toDelete.CONFIG_VERSION
            UNION
                SELECT CONFIG_ID, CONFIG_VERSION
                FROM :CONFIGS_TO_DELETE;
        SELECT count(*) INTO CUR_ROWCOUNT FROM :CONFIGS_TO_DELETE;
    END WHILE;

    DELETE FROM "legacy.config.db.models::Configuration.Config"
    WHERE "Id" || '-' || "Version" in (
        SELECT CONFIG_ID || '-' || CONFIG_VERSION
        FROM :CONFIGS_TO_DELETE
    );

    DELETE FROM "legacy.config.db.models::Configuration.UserDefaultConfig"
    WHERE "Config.Id" || '-' || "Config.Version" in (
        SELECT CONFIG_ID || '-' || CONFIG_VERSION
        FROM :CONFIGS_TO_DELETE
    );


    
    ASSIGNMENTS_TO_DELETE = 
        SELECT DISTINCT header."Id" as ASSIGNMENT_ID
        FROM "legacy.config.db.models::Configuration.AssignmentHeader" header
        JOIN "legacy.config.db.models::Configuration.AssignmentDetail" detail
            ON header."Id" = detail."Header.Id"
        JOIN :CONFIGS_TO_DELETE as toDelete
            ON detail."Config.Id" = toDelete.CONFIG_ID
            AND detail."Config.Version" = toDelete.CONFIG_VERSION;

    BEGIN
        DECLARE CURSOR assignment_cursor FOR
            SELECT ASSIGNMENT_ID FROM :ASSIGNMENTS_TO_DELETE;
        FOR cur_row as assignment_cursor DO
            CALL "legacy.config.db.procedures::DeleteAssignment"(cur_row.ASSIGNMENT_ID);
        END FOR;

    END;
            
END;

CREATE PROCEDURE "legacy.config.db.procedures::GetOrganizations" (IN USERNAME NVARCHAR(256), OUT ORGS table ("ORG_ID" NVARCHAR(1024))) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    READS SQL DATA AS

BEGIN
 
    ORGS = 
        SELECT DISTINCT CAST("OrgID" AS NVARCHAR(100)) AS "ORG_ID" 
        FROM "legacy.cdw.db.models::Config.V_ORG"
        WHERE "OrgID" IN
            (SELECT  "OrgID" AS ORG_ID 
            FROM "legacy.cdw.db.models::Config.UserOrgMapping"
            WHERE UPPER("UserName") = UPPER(:USERNAME)
            
            UNION
            
            SELECT "OrgID" AS ORG_ID 
            FROM "legacy.cdw.db.models::Config.UserOrgMapping"
            WHERE UPPER("UserName") = UPPER(:USERNAME)
            )
    ;
            
END;


CREATE PROCEDURE "legacy.config.db.procedures::GetAssignedConfigurations" (
    IN CONFIG_TYPE VARCHAR(20), 
    IN USERNAME NVARCHAR(256),  
    OUT configs TABLE(
        ASSIGNMENT_ID VARCHAR(40),
        ASSIGNMENT_NAME NVARCHAR(256),
        CONFIG_ID VARCHAR(40),
        CONFIG_VERSION VARCHAR(20),
        CONFIG_STATUS VARCHAR(20),
        CONFIG_NAME NVARCHAR(256),
        DEPENDENT_CONFIG_ID VARCHAR(40),
        DEPENDENT_CONFIG_VERSION VARCHAR(20),
        DATA NCLOB
    )
)  
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    READS SQL DATA AS
    
BEGIN 

    CALL "legacy.config.db.procedures::GetOrganizations"(:USERNAME, orgs);
    
    entities = SELECT 'U' as ENTITY_TYPE, :USERNAME as ENTITY_VALUE FROM DUMMY 
                    UNION
                SELECT 'O', ORG_ID as ENTITY_VALUE FROM :orgs
    ;

    CONFIGS = 
        SELECT  
            assignment."Id" as ASSIGNMENT_ID,
            assignment."Name" as ASSIGNMENT_NAME,
            config."Id" as CONFIG_ID,
            config."Version" as CONFIG_VERSION,
            config."Status" as CONFIG_STATUS,
            config."Name" as CONFIG_NAME,
            config."Parent.Id" as DEPENDENT_CONFIG_ID, 
            config."Parent.Version" as DEPENDENT_CONFIG_VERSION,
            config."Data" as "DATA"
        FROM :entities as ent
            JOIN "legacy.config.db.models::Configuration.Assignment" as assignment
                ON assignment."EntityType" = ent.ENTITY_TYPE
                AND assignment."EntityValue" = ent.ENTITY_VALUE
            JOIN  "legacy.config.db.models::Configuration.Config" as config
                ON assignment."ConfigId" = config."Id"
                AND assignment."ConfigVersion" = config."Version"
        WHERE config."Type" = :CONFIG_TYPE
            AND config."Id" is not null
    ;

END;--;

CREATE PROCEDURE "legacy.config.db.procedures::GetConfiguration" (
        IN CONFIG_ID NVARCHAR(40),
        IN CONFIG_VERSION NVARCHAR(20),
        IN CONFIG_STATUS NVARCHAR(1),
        OUT CONFIGS TABLE(
            CONFIG_ID NVARCHAR(40),
            CONFIG_VERSION NVARCHAR(20),
            CONFIG_TYPE NVARCHAR(20),
            CONFIG_STATUS NVARCHAR(1),
            CONFIG_NAME NVARCHAR(256),
            PARENT_CONFIG_ID NVARCHAR(40),
            PARENT_CONFIG_VERSION NVARCHAR(20),
            CREATOR NVARCHAR(256),
            CREATED TIMESTAMP,
            MODIFIER NVARCHAR(256),
            MODIFIED TIMESTAMP,
            DATA NCLOB
        )
    ) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    READS SQL DATA AS

BEGIN
    CONFIGS = 
        SELECT 
            "Id" AS CONFIG_ID, 
            "Version" AS CONFIG_VERSION, 
            "Type" AS CONFIG_TYPE, 
            "Status" AS CONFIG_STATUS, 
            "Name" AS CONFIG_NAME, 
            "Parent.Id" AS PARENT_CONFIG_ID, 
            "Parent.Version" AS PARENT_CONFIG_VERSION, 
            "Creator" AS CREATOR, 
            "Created" AS CREATED, 
            "Modifier" AS MODIFIER, 
            "Modified" AS MODIFIED, 
            "Data" AS DATA
        FROM "legacy.config.db.models::Configuration.Config"
        WHERE 
            "Id" = :CONFIG_ID
            AND ("Version" = :CONFIG_VERSION or :CONFIG_VERSION is null)
            AND ("Status" = :CONFIG_STATUS or :CONFIG_STATUS is null)
        ;
END;


CREATE PROCEDURE "legacy.config.db.procedures::HasUserConfigurationAssigned" (
    IN USERNAME NVARCHAR(128),
    IN CONFIG_ID VARCHAR(40),
    IN CONFIG_VERSION VARCHAR(20),
    OUT ALLOWED TABLE(ALLOWED INTEGER) 
) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    READS SQL DATA AS


BEGIN 


    CALL "legacy.config.db.procedures::GetOrganizations"(:USERNAME, orgs);
    
    entities = SELECT 'U' as ENTITY_TYPE, :USERNAME as ENTITY_VALUE FROM DUMMY
                    UNION
                SELECT 'U' as ENTITY_TYPE, 'DEFAULT_CONFIG_ASSIGNMENT' as ENTITY_VALUE FROM DUMMY
                    UNION
                SELECT 'O', ORG_ID as ENTITY_VALUE FROM :orgs;

    
    ALLOWED = SELECT    
            CASE WHEN
                count(*)>0
            THEN 
                1
            ELSE
                0
            END as ALLOWED
        FROM :entities as ent
            JOIN "legacy.config.db.models::Configuration.Assignment" as assignment
                ON assignment."EntityType" = ent.ENTITY_TYPE
                AND assignment."EntityValue" = ent.ENTITY_VALUE
        WHERE assignment."ConfigId" = :CONFIG_ID
            AND assignment."ConfigVersion" = :CONFIG_VERSION;

END;

CREATE procedure "legacy.ots.am.lib::MatchCandidates"(
		in  iv_profile_name nvarchar(100),
		in  it_candidates   "legacy.ots.am::Types.Candidate",
		out ot_matches      "legacy.ots.am::Types.Match"
	)
	language sqlscript
	sql security definer
	as
begin
    ot_matches = 
    select
        "CandidateID",
        "ComponentID",
        "ComponentTermText",
        "VocabularyID",
        "Code",
        null as "TermText",
        0.0 as "Confidence"
    from :it_candidates;
end
;
