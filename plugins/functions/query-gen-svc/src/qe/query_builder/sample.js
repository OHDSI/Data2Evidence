"use strict";
var FqbLib = require("../../../target/src/qe/query_builder/FastQueryBuilder");
var queryEngine = require("../../../target/src/qe/sql_generator2/SqlGenerator");

//Initialize Builder Object
var oBuilder = new FqbLib.FastQueryBuilder();

//Build Fast Query
var define = oBuilder.definition("Primary_Diagnosis_Females");

define.retrieve("P0", "patient", "patient");

define.whereClause(FqbLib.BoolExpr.compare("Equal")
    .LHS(FqbLib.Operand.property("gender", "P0", "patient.attributes.gender"))
    .RHS(FqbLib.Operand.literal("String", "F")));

define.with(FqbLib.FastQueryBuilder.with("priDiag1")
    .retrieve("priDiag", "patient-conditions-acme-interactions-priDiag")
 .suchThatClause(FqbLib.BoolExpr.compare("Equal")
    .LHS(FqbLib.Operand.property("icd_10", "priDiag1", "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10"))
    .RHS(FqbLib.Operand.literal("String", "C00"))));

define.group("icd_10", "priDiag1", "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10");

define.group("pid", "P0", "patient.attributes.pid");

define.order("icd_10", 
"priDiag1", 
"patient.conditions.acme.interactions.priDiag.1.attributes.icd_10", 
"ASC", 
"patient-conditions-acme-interactions-priDiag-1-attributes-icd_10");

var define2 =  oBuilder.definition("Chemo_Diagnosis_Females");

define2.reference("Primary_Diagnosis_Females");

define2.with(FqbLib.FastQueryBuilder.with("chemo1")
    .retrieve("chemo", "patient-conditions-acme-interactions-chemo"));

define2.group("chemo_ops", "chemo1", "patient.conditions.acme.interactions.chemo.1.attributes.chemo_ops");


/*var define3 = oBuilder.definition("join");
define3.reference("Primary_Diagnosis_Females");

define3.with(FqbLib.FastQueryBuilder.with("chemo2")
    .reference("Chemo_Diagnosis_Females"));
*/




console.log(oBuilder.getFastJson()); //print fast json

var patient_id = `"PATIENT_ID"`;
var interaction_id = `"INTERACTION_ID"`;
var condition_id = `"CONDITION_ID"`;
var parent_interact_id = `"PARENT_INTERACT_ID"`;
var start = `"START"`;
var end = `"END"`;
var observation_id = `"OBSERVATION_ID"`;

//Generate SQL
var oPlaceholderTableMap = 
{
   "@COND": "$$SCHEMA$$.\"VIEW::OMOP.COND\"",
   "@COND.PATIENT_ID": "\"PATIENT_ID\"",
   "@COND.INTERACTION_ID": "\"CONDITION_OCCURRENCE_ID\"",
   "@COND.CONDITION_ID": "\"CONDITION_OCCURRENCE_ID\"",
   "@COND.PARENT_INTERACT_ID": "\"CONDITION_OCCURRENCE_ID\"",
   "@COND.START": "\"CONDITION_START_DATE\"",
   "@COND.END": "\"CONDITION_END_DATE\"",
   "@COND.INTERACTION_TYPE": "\"CONDITION_TYPE_NAME\"",
   "@VISIT": "$$SCHEMA$$.\"VIEW::OMOP.VISIT\"",
   "@VISIT.PATIENT_ID": "\"PATIENT_ID\"",
   "@VISIT.INTERACTION_ID": "\"VISIT_OCCURRENCE_ID\"",
   "@VISIT.CONDITION_ID": "\"VISIT_OCCURRENCE_ID\"",
   "@VISIT.PARENT_INTERACT_ID": "\"VISIT_OCCURRENCE_ID\"",
   "@VISIT.START": "\"VISIT_START_DATE\"",
   "@VISIT.END": "\"VISIT_END_DATE\"",
   "@VISIT.INTERACTION_TYPE": "\"VISIT_TYPE_NAME\"",
   "@CONDERA": "$$SCHEMA$$.\"VIEW::OMOP.COND_ERA\"",
   "@CONDERA.PATIENT_ID": "\"PATIENT_ID\"",
   "@CONDERA.INTERACTION_ID": "\"CONDITION_ERA_ID\"",
   "@CONDERA.CONDITION_ID": "\"CONDITION_ERA_ID\"",
   "@CONDERA.PARENT_INTERACT_ID": "\"CONDITION_ERA_ID\"",
   "@CONDERA.START": "\"CONDITION_ERA_START_DATE\"",
   "@CONDERA.END": "\"CONDITION_ERA_END_DATE\"",
   "@CONDERA.INTERACTION_TYPE": "\"CONDITION_NAME\"",
   "@DEATH": "$$SCHEMA$$.\"VIEW::OMOP.DEATH\"",
   "@DEATH.PATIENT_ID": "\"PATIENT_ID\"",
   "@DEATH.INTERACTION_ID": "\"PATIENT_ID\"",
   "@DEATH.CONDITION_ID": "\"PATIENT_ID\"",
   "@DEATH.PARENT_INTERACT_ID": "\"PATIENT_ID\"",
   "@DEATH.START": "\"DEATH_DATE\"",
   "@DEATH.END": "\"DEATH_DATE\"",
   "@DEATH.INTERACTION_TYPE": "\"DEATH_TYPE_NAME\"",
   "@DEVEXP": "$$SCHEMA$$.\"VIEW::OMOP.DEVICE_EXPOSURE\"",
   "@DEVEXP.PATIENT_ID": "\"PATIENT_ID\"",
   "@DEVEXP.INTERACTION_ID": "\"DEVICE_EXPOSURE_ID\"",
   "@DEVEXP.CONDITION_ID": "\"DEVICE_EXPOSURE_ID\"",
   "@DEVEXP.PARENT_INTERACT_ID": "\"DEVICE_EXPOSURE_ID\"",
   "@DEVEXP.START": "\"DEVICE_EXPOSURE_START_DATE\"",
   "@DEVEXP.END": "\"DEVICE_EXPOSURE_END_DATE\"",
   "@DEVEXP.INTERACTION_TYPE": "\"DEVICE_TYPE_NAME\"",
   "@DOSEERA": "$$SCHEMA$$.\"VIEW::OMOP.DOSE_ERA\"",
   "@DOSEERA.PATIENT_ID": "\"PATIENT_ID\"",
   "@DOSEERA.INTERACTION_ID": "\"DOSE_ERA_ID\"",
   "@DOSEERA.CONDITION_ID": "\"DOSE_ERA_ID\"",
   "@DOSEERA.PARENT_INTERACT_ID": "\"DOSE_ERA_ID\"",
   "@DOSEERA.START": "\"DOSE_ERA_START_DATE\"",
   "@DOSEERA.END": "\"DOSE_ERA_END_DATE\"",
   "@DOSEERA.INTERACTION_TYPE": "\"DRUG_NAME\"",
   "@DRUGERA": "$$SCHEMA$$.\"VIEW::OMOP.DRUG_ERA\"",
   "@DRUGERA.PATIENT_ID": "\"PATIENT_ID\"",
   "@DRUGERA.INTERACTION_ID": "\"DRUG_ERA_ID\"",
   "@DRUGERA.CONDITION_ID": "\"DRUG_ERA_ID\"",
   "@DRUGERA.PARENT_INTERACT_ID": "\"DRUG_ERA_ID\"",
   "@DRUGERA.START": "\"DRUG_ERA_START_DATE\"",
   "@DRUGERA.END": "\"DRUG_ERA_END_DATE\"",
   "@DRUGERA.INTERACTION_TYPE": "\"DRUG_NAME\"",
   "@DRUGEXP": "$$SCHEMA$$.\"VIEW::OMOP.DRUG_EXP\"",
   "@DRUGEXP.PATIENT_ID": "\"PATIENT_ID\"",
   "@DRUGEXP.INTERACTION_ID": "\"DRUG_EXPOSURE_ID\"",
   "@DRUGEXP.CONDITION_ID": "\"DRUG_EXPOSURE_ID\"",
   "@DRUGEXP.PARENT_INTERACT_ID": "\"DRUG_EXPOSURE_ID\"",
   "@DRUGEXP.START": "\"DRUG_EXPOSURE_START_DATE\"",
   "@DRUGEXP.END": "\"DRUG_EXPOSURE_END_DATE\"",
   "@DRUGEXP.INTERACTION_TYPE": "\"DRUG_TYPE_NAME\"",
   "@OBS": "$$SCHEMA$$.\"VIEW::OMOP.OBS\"",
   "@OBS.PATIENT_ID": "\"PATIENT_ID\"",
   "@OBS.INTERACTION_ID": "\"OBSERVATION_ID\"",
   "@OBS.CONDITION_ID": "\"OBSERVATION_ID\"",
   "@OBS.PARENT_INTERACT_ID": "\"OBSERVATION_ID\"",
   "@OBS.START": "\"OBSERVATION_DATE\"",
   "@OBS.END": "\"OBSERVATION_DATE\"",
   "@OBS.INTERACTION_TYPE": "\"OBSERVATION_TYPE_NAME\"",
   "@OBSPER": "$$SCHEMA$$.\"VIEW::OMOP.OBS_PER\"",
   "@OBSPER.PATIENT_ID": "\"PATIENT_ID\"",
   "@OBSPER.INTERACTION_ID": "\"OBSERVATION_PERIOD_ID\"",
   "@OBSPER.CONDITION_ID": "\"OBSERVATION_PERIOD_ID\"",
   "@OBSPER.PARENT_INTERACT_ID": "\"OBSERVATION_PERIOD_ID\"",
   "@OBSPER.START": "\"OBSERVATION_PERIOD_START_DATE\"",
   "@OBSPER.END": "\"OBSERVATION_PERIOD_END_DATE\"",
   "@OBSPER.INTERACTION_TYPE": "\"PERIOD_TYPE_NAME\"",
   "@PPPER": "$$SCHEMA$$.\"VIEW::OMOP.PP_PER\"",
   "@PPPER.PATIENT_ID": "\"PATIENT_ID\"",
   "@PPPER.INTERACTION_ID": "\"PAYER_PLAN_PERIOD_ID\"",
   "@PPPER.CONDITION_ID": "\"PAYER_PLAN_PERIOD_ID\"",
   "@PPPER.PARENT_INTERACT_ID": "\"PAYER_PLAN_PERIOD_ID\"",
   "@PPPER.START": "\"PAYER_PLAN_PERIOD_START_DATE\"",
   "@PPPER.END": "\"PAYER_PLAN_PERIOD_END_DATE\"",
   "@PPPER.INTERACTION_TYPE": "\"PLAN_SOURCE_VALUE\"",
   "@SPEC": "$$SCHEMA$$.\"VIEW::OMOP.SPEC\"",
   "@SPEC.PATIENT_ID": "\"PATIENT_ID\"",
   "@SPEC.INTERACTION_ID": "\"SPECIMEN_ID\"",
   "@SPEC.CONDITION_ID": "\"SPECIMEN_ID\"",
   "@SPEC.PARENT_INTERACT_ID": "\"SPECIMEN_ID\"",
   "@SPEC.START": "\"SPECIMEN_DATE\"",
   "@SPEC.END": "\"SPECIMEN_DATE\"",
   "@SPEC.INTERACTION_TYPE": "\"SPECIMEN_TYPE_NAME\"",
   "@MEAS": "$$SCHEMA$$.\"VIEW::OMOP.MEAS\"",
   "@MEAS.PATIENT_ID": "\"PATIENT_ID\"",
   "@MEAS.INTERACTION_ID": "\"MEASUREMENT_ID\"",
   "@MEAS.CONDITION_ID": "\"MEASUREMENT_ID\"",
   "@MEAS.PARENT_INTERACT_ID": "\"MEASUREMENT_ID\"",
   "@MEAS.START": "\"MEASUREMENT_DATE\"",
   "@MEAS.END": "\"MEASUREMENT_DATE\"",
   "@MEAS.INTERACTION_TYPE": "\"MEASUREMENT_TYPE_NAME\"",
   "@PROC": "$$SCHEMA$$.\"VIEW::OMOP.PROC\"",
   "@PROC.PATIENT_ID": "\"PATIENT_ID\"",
   "@PROC.INTERACTION_ID": "\"PROCEDURE_OCCURRENCE_ID\"",
   "@PROC.CONDITION_ID": "\"PROCEDURE_OCCURRENCE_ID\"",
   "@PROC.PARENT_INTERACT_ID": "\"PROCEDURE_OCCURRENCE_ID\"",
   "@PROC.START": "\"PROCEDURE_DATE\"",
   "@PROC.END": "\"PROCEDURE_DATE\"",
   "@PROC.INTERACTION_TYPE": "\"PROCEDURE_TYPE_NAME\"",
   "@CONSENT": "$$SCHEMA$$.\"VIEW::GDM.CONSENT_BASE\"",
   "@CONSENT.PATIENT_ID": "\"PERSON_ID\"",
   "@CONSENT.INTERACTION_ID": "\"ID\"",
   "@CONSENT.CONDITION_ID": "\"ID\"",
   "@CONSENT.PARENT_INTERACT_ID": "\"PARENT_CONSENT_DETAIL_ID\"",
   "@CONSENT.START": "\"CREATED_AT\"",
   "@CONSENT.END": "\"CREATED_AT\"",
   "@CONSENT.INTERACTION_TYPE": "\"TYPE\"",
   "@RESPONSE": "$$SCHEMA$$.\"VIEW::GDM.QUESTIONNAIRE_RESPONSE_BASE\"",
   "@RESPONSE.PATIENT_ID": "\"PERSON_ID\"",
   "@RESPONSE.INTERACTION_ID": "\"ID\"",
   "@RESPONSE.CONDITION_ID": "\"ID\"",
   "@RESPONSE.PARENT_INTERACT_ID": "\"ANSWER_ID\"",
   "@RESPONSE.START": "\"AUTHORED\"",
   "@RESPONSE.END": "\"AUTHORED\"",
   "@RESPONSE.INTERACTION_TYPE": "\"ANSWER_ID\"",
   "@PTOKEN": "$$SCHEMA$$.\"VIEW::OMOP.PARTICIPANT_TOKEN\"",
   "@PTOKEN.PATIENT_ID": "\"PERSON_ID\"",
   "@PTOKEN.INTERACTION_ID": "\"ID\"",
   "@PTOKEN.CONDITION_ID": "\"ID\"",
   "@PTOKEN.PARENT_INTERACT_ID": "\"ID\"",
   "@PTOKEN.START": "\"CREATED_DATE\"",
   "@PTOKEN.END": "\"CREATED_DATE\"",
   "@PTOKEN.INTERACTION_TYPE": "\"TOKEN\"",
   "@PATIENT": "$$SCHEMA$$.\"VIEW::OMOP.GDM.PATIENT\"",
   "@PATIENT.PATIENT_ID": "\"PATIENT_ID\"",
   "@PATIENT.DOD": "\"DEATH_DATE\"",
   "@PATIENT.DOB": "\"BIRTH_DATE\"",
   "@REF": "\"CDMVOCAB\".\"CONCEPT\"",
   "@REF.VOCABULARY_ID": "\"VOCABULARY_ID\"",
   "@REF.CODE": "\"CONCEPT_ID\"",
   "@REF.TEXT": "\"CONCEPT_NAME\"",
   "@TEXT": "\"CDMVOCAB\".\"CONCEPT\"",
   "@TEXT.INTERACTION_ID": "\"CONCEPT_ID\"",
   "@TEXT.INTERACTION_TEXT_ID": "\"CONCEPT_ID\"",
   "@TEXT.VALUE": "\"CONCEPT_NAME\""
};


var oModelConfig = {
   "patient":{
      "conditions":{
         "acme":{
            "interactions":{
               "priDiag":{
                  "name":"Primary Tumor Diagnosis",
                  "defaultFilter":"@INTERACTION.INTERACTION_TYPE = 'ACME_M03'",
                  "defaultFilterKey":"ACME_M03",
                  "order":4,
                  "attributes":{
                     "icd_10":{
                        "name":"ICD-10-CM Code",
                        "type":"text",
                        "expression":"LEFT(@CODE.VALUE,3)",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'ICD_10'",
                        "referenceExpression":"LEFT(@REF.CODE,3)",
                        "referenceFilter":"@REF.VOCABULARY_ID = 'ots.ICD.ICD10GM' AND (LENGTH(@REF.CODE)=3 OR (LENGTH(@REF.CODE)=5 AND @REF.CODE LIKE '%.-'))",
                        "order":1
                     },
                     "icd_9":{
                        "name":"ICD-9-CM Code",
                        "type":"text",
                        "expression":"LEFT(@CODE.VALUE,3)",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'ICD_9'",
                        "order":2
                     },
                     "age":{
                        "name":"Age at Diagnosis",
                        "type":"num",
                        "defaultFilter":"@PATIENT.DOB <= @INTERACTION.\"END\"",
                        "expression":"FLOOR(DAYS_BETWEEN(@PATIENT.DOB,@INTERACTION.\"END\") / 365)",
                        "order":3
                     },
                     "nsclc":{
                        "name":"Lung Cancer Subtype",
                        "type":"text",
                        "expression":"@CODE.VALUE",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'LC_TYPE'",
                        "eavExpressionKey":"LC_TYPE",
                        "order":4
                     },
                     "freetextDiag":{
                        "name":"Diagnosis Free Text",
                        "type":"freetext",
                        "defaultFilter":"@TEXT.ATTRIBUTE = 'INTERACTIONS_FREETEXT'",
                        "expression":"@TEXT.VALUE",
                        "fuzziness":0.8,
                        "order":5
                     },
                     "histology":{
                        "name":"Histology",
                        "type":"text",
                        "expression":"@CODE.VALUE",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'Histology'",
                        "eavExpressionKey":"Histology",
                        "order":6
                     },
                     "tcgaCode":{
                        "name":"Cancer Abbreviation",
                        "type":"text",
                        "expression":"@CODE.VALUE",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'TCGA_CODE'",
                        "eavExpressionKey":"TCGA_CODE",
                        "order":7
                     },
                     "tcgaCancer":{
                        "name":"Cancer Type",
                        "type":"text",
                        "expression":"@CODE.VALUE",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'TCGA_CANCER'",
                        "eavExpressionKey":"TCGA_CANCER",
                        "order":8
                     },
                     "calYear":{
                        "name":"Start Year",
                        "type":"num",
                        "expression":"YEAR(@INTERACTION.\"START\")",
                        "isDefault":true,
                        "order":26
                     },
                     "calMonth":{
                        "name":"Start Month",
                        "type":"num",
                        "expression":"MONTH(@INTERACTION.\"START\")",
                        "referenceFilter":"@REF.VOCABULARY_ID='mri.CAT.MONTHS'",
                        "referenceExpression":"@REF.CODE",
                        "isDefault":true,
                        "order":27
                     },
                     "start":{
                        "name":"Start Date",
                        "type":"time",
                        "expression":"TO_DATE(@INTERACTION.\"START\")",
                        "isDefault":true,
                        "order":28
                     },
                     "end":{
                        "name":"End Date",
                        "type":"time",
                        "expression":"TO_DATE(@INTERACTION.\"END\")",
                        "isDefault":true,
                        "order":29
                     },
                     "startdatetime":{
                        "name":"Start Date/Time",
                        "type":"datetime",
                        "expression":"@INTERACTION.\"START\"",
                        "isDefault":true,
                        "order":30
                     }
                  }
               },
               "biobank":{
                  "name":"Biobank",
                  "defaultFilter":"@INTERACTION.INTERACTION_TYPE = 'BIOBANK'",
                  "defaultFilterKey":"BIOBANK",
                  "order":5,
                  "attributes":{
                     "status":{
                        "name":"Sample Status",
                        "type":"text",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'BIOBANK_STATUS'",
                        "expression":"@CODE.VALUE",
                        "order":1
                     },
                     "tType":{
                        "name":"Tissue / Liquid Type",
                        "type":"text",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'BIOBANK_TYPE'",
                        "expression":"@CODE.VALUE",
                        "order":2
                     },
                     "calYear":{
                        "name":"Start Year",
                        "type":"num",
                        "expression":"YEAR(@INTERACTION.\"START\")",
                        "isDefault":true,
                        "order":26
                     },
                     "calMonth":{
                        "name":"Start Month",
                        "type":"num",
                        "expression":"MONTH(@INTERACTION.\"START\")",
                        "referenceFilter":"@REF.VOCABULARY_ID='mri.CAT.MONTHS'",
                        "referenceExpression":"@REF.CODE",
                        "isDefault":true,
                        "order":27
                     },
                     "start":{
                        "name":"Start Date",
                        "type":"time",
                        "expression":"TO_DATE(@INTERACTION.\"START\")",
                        "isDefault":true,
                        "order":28
                     },
                     "end":{
                        "name":"End Date",
                        "type":"time",
                        "expression":"TO_DATE(@INTERACTION.\"END\")",
                        "isDefault":true,
                        "order":29
                     },
                     "startdatetime":{
                        "name":"Start Date/Time",
                        "type":"datetime",
                        "expression":"@INTERACTION.\"START\"",
                        "isDefault":true,
                        "order":30
                     }
                  }
               },
               "chemo":{
                  "name":"Chemotherapy",
                  "defaultFilter":"@INTERACTION.INTERACTION_TYPE = 'ACME_M07_CHEMO'",
                  "defaultFilterKey":"ACME_M07_CHEMO",
                  "order":6,
                  "parentInteraction":[
                     "patient.conditions.acme.interactions.priDiag"
                  ],
                  "parentInteractionLabel":"parent",
                  "attributes":{
                     "interactionCount":{
                        "name":"Interaction Count",
                        "type":"num",
                        "measureExpression":"COUNT(DISTINCT(@INTERACTION.INTERACTION_ID))",
                        "order":1,
                        "defaultFilter":""
                     },
                     "chemo_ops":{
                        "name":"OPS Code",
                        "type":"text",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'CHEMO_OPS'",
                        "expression":"@CODE.VALUE",
                        "order":2
                     },
                     "chemo_prot":{
                        "name":"Protocol",
                        "type":"text",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'CHEMO_PROT'",
                        "expression":"@CODE.VALUE",
                        "order":3
                     },
                     "interactionsPerPatient":{
                        "name":"Interactions per Patient",
                        "type":"num",
                        "measureExpression":"COUNT(DISTINCT(@INTERACTION.INTERACTION_ID)) / COUNT(DISTINCT(@PATIENT.PATIENT_ID))",
                        "order":4,
                        "defaultFilter":""
                     },
                     "calYear":{
                        "name":"Start Year",
                        "type":"num",
                        "expression":"YEAR(@INTERACTION.\"START\")",
                        "isDefault":true,
                        "order":26
                     },
                     "calMonth":{
                        "name":"Start Month",
                        "type":"num",
                        "expression":"MONTH(@INTERACTION.\"START\")",
                        "referenceFilter":"@REF.VOCABULARY_ID='mri.CAT.MONTHS'",
                        "referenceExpression":"@REF.CODE",
                        "isDefault":true,
                        "order":27
                     },
                     "start":{
                        "name":"Start Date",
                        "type":"time",
                        "expression":"TO_DATE(@INTERACTION.\"START\")",
                        "isDefault":true,
                        "order":28
                     },
                     "end":{
                        "name":"End Date",
                        "type":"time",
                        "expression":"TO_DATE(@INTERACTION.\"END\")",
                        "isDefault":true,
                        "order":29
                     },
                     "startdatetime":{
                        "name":"Start Date/Time",
                        "type":"datetime",
                        "expression":"@INTERACTION.\"START\"",
                        "isDefault":true,
                        "order":30
                     }
                  }
               },
               "radio":{
                  "name":"Radiotherapy",
                  "defaultFilter":"@INTERACTION.INTERACTION_TYPE = 'ACME_M07_RADIO'",
                  "defaultFilterKey":"ACME_M07_RADIO",
                  "order":7,
                  "attributes":{
                     "radio_dosage":{
                        "name":"Radio Dosage (Gy)",
                        "type":"num",
                        "defaultFilter":"@MEASURE.ATTRIBUTE = 'DOSAGE' AND @MEASURE.UNIT = 'Gy'",
                        "expression":"@MEASURE.VALUE",
                        "order":1
                     },
                     "radio_ops":{
                        "name":"OPS Code",
                        "type":"text",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'RADIO_OPS'",
                        "expression":"@CODE.VALUE",
                        "order":2
                     },
                     "calYear":{
                        "name":"Start Year",
                        "type":"num",
                        "expression":"YEAR(@INTERACTION.\"START\")",
                        "isDefault":true,
                        "order":26
                     },
                     "calMonth":{
                        "name":"Start Month",
                        "type":"num",
                        "expression":"MONTH(@INTERACTION.\"START\")",
                        "referenceFilter":"@REF.VOCABULARY_ID='mri.CAT.MONTHS'",
                        "referenceExpression":"@REF.CODE",
                        "isDefault":true,
                        "order":27
                     },
                     "start":{
                        "name":"Start Date",
                        "type":"time",
                        "expression":"TO_DATE(@INTERACTION.\"START\")",
                        "isDefault":true,
                        "order":28
                     },
                     "end":{
                        "name":"End Date",
                        "type":"time",
                        "expression":"TO_DATE(@INTERACTION.\"END\")",
                        "isDefault":true,
                        "order":29
                     },
                     "startdatetime":{
                        "name":"Start Date/Time",
                        "type":"datetime",
                        "expression":"@INTERACTION.\"START\"",
                        "isDefault":true,
                        "order":30
                     }
                  }
               },
               "surgery":{
                  "name":"Surgery",
                  "defaultFilter":"@INTERACTION.INTERACTION_TYPE = 'ACME_M07_SURGERY'",
                  "defaultFilterKey":"ACME_M07_SURGERY",
                  "order":8,
                  "attributes":{
                     "exist":{
                        "name":"Exist",
                        "type":"text",
                        "expression":"CASE WHEN @INTERACTION.INTERACTION_ID IS NULL THEN NULL ELSE 'YES' END",
                        "order":1,
                        "defaultFilter":""
                     },
                     "surgery_ops":{
                        "name":"OPS Code",
                        "type":"text",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'SURGERY_OPS'",
                        "expression":"@CODE.VALUE",
                        "order":2
                     },
                     "calYear":{
                        "name":"Start Year",
                        "type":"num",
                        "expression":"YEAR(@INTERACTION.\"START\")",
                        "isDefault":true,
                        "order":26
                     },
                     "calMonth":{
                        "name":"Start Month",
                        "type":"num",
                        "expression":"MONTH(@INTERACTION.\"START\")",
                        "referenceFilter":"@REF.VOCABULARY_ID='mri.CAT.MONTHS'",
                        "referenceExpression":"@REF.CODE",
                        "isDefault":true,
                        "order":27
                     },
                     "start":{
                        "name":"Start Date",
                        "type":"time",
                        "expression":"TO_DATE(@INTERACTION.\"START\")",
                        "isDefault":true,
                        "order":28
                     },
                     "end":{
                        "name":"End Date",
                        "type":"time",
                        "expression":"TO_DATE(@INTERACTION.\"END\")",
                        "isDefault":true,
                        "order":29
                     },
                     "startdatetime":{
                        "name":"Start Date/Time",
                        "type":"datetime",
                        "expression":"@INTERACTION.\"START\"",
                        "isDefault":true,
                        "order":30
                     }
                  }
               },
               "tnm":{
                  "name":"TNM Classification",
                  "defaultFilter":"@INTERACTION.INTERACTION_TYPE = 'ACME_M03TS'",
                  "defaultFilterKey":"ACME_M03TS",
                  "order":9,
                  "attributes":{
                     "tnmM":{
                        "name":"M-Component",
                        "type":"text",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'TNM_M'",
                        "expression":"'M' || @CODE.VALUE",
                        "order":1
                     },
                     "tnmN":{
                        "name":"N-Component",
                        "type":"text",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'TNM_N'",
                        "expression":"'N' || @CODE.VALUE",
                        "order":2
                     },
                     "tnmT":{
                        "name":"T-Component",
                        "type":"text",
                        "defaultFilter":"@CODE.ATTRIBUTE = 'TNM_T'",
                        "expression":"'T' || @CODE.VALUE",
                        "order":3
                     },
                     "calYear":{
                        "name":"Start Year",
                        "type":"num",
                        "expression":"YEAR(@INTERACTION.\"START\")",
                        "isDefault":true,
                        "order":26
                     },
                     "calMonth":{
                        "name":"Start Month",
                        "type":"num",
                        "expression":"MONTH(@INTERACTION.\"START\")",
                        "referenceFilter":"@REF.VOCABULARY_ID='mri.CAT.MONTHS'",
                        "referenceExpression":"@REF.CODE",
                        "isDefault":true,
                        "order":27
                     },
                     "start":{
                        "name":"Start Date",
                        "type":"time",
                        "expression":"TO_DATE(@INTERACTION.\"START\")",
                        "isDefault":true,
                        "order":28
                     },
                     "end":{
                        "name":"End Date",
                        "type":"time",
                        "expression":"TO_DATE(@INTERACTION.\"END\")",
                        "isDefault":true,
                        "order":29
                     },
                     "startdatetime":{
                        "name":"Start Date/Time",
                        "type":"datetime",
                        "expression":"@INTERACTION.\"START\"",
                        "isDefault":true,
                        "order":30
                     }
                  }
               }
            },
            "name":"Tumor Case"
         }
      },
      "interactions":{
         "vStatus":{
            "name":"Vital Status",
            "defaultFilter":"@INTERACTION.INTERACTION_TYPE = 'ACME_M16'",
            "defaultFilterKey":"ACME_M16",
            "order":3,
            "attributes":{
               "age":{
                  "name":"Age at Last Contact",
                  "type":"num",
                  "defaultFilter":"@PATIENT.DOB <= @INTERACTION.\"END\"",
                  "expression":"FLOOR(DAYS_BETWEEN(@PATIENT.DOB,@INTERACTION.\"END\") / 365)"
               },
               "status":{
                  "name":"Vital Status",
                  "type":"text",
                  "defaultFilter":"@CODE.ATTRIBUTE = 'VITALSTATUS'",
                  "expression":"@CODE.VALUE"
               },
               "year":{
                  "name":"Year of Last Contact",
                  "type":"num",
                  "expression":"YEAR(@INTERACTION.\"START\")",
                  "defaultFilter":""
               },
               "calYear":{
                  "name":"Start Year",
                  "type":"num",
                  "expression":"YEAR(@INTERACTION.\"START\")",
                  "isDefault":true,
                  "order":26
               },
               "calMonth":{
                  "name":"Start Month",
                  "type":"num",
                  "expression":"MONTH(@INTERACTION.\"START\")",
                  "referenceFilter":"@REF.VOCABULARY_ID='mri.CAT.MONTHS'",
                  "referenceExpression":"@REF.CODE",
                  "isDefault":true,
                  "order":27
               },
               "start":{
                  "name":"Start Date",
                  "type":"time",
                  "expression":"TO_DATE(@INTERACTION.\"START\")",
                  "isDefault":true,
                  "order":28
               },
               "end":{
                  "name":"End Date",
                  "type":"time",
                  "expression":"TO_DATE(@INTERACTION.\"END\")",
                  "isDefault":true,
                  "order":29
               },
               "startdatetime":{
                  "name":"Start Date/Time",
                  "type":"datetime",
                  "expression":"@INTERACTION.\"START\"",
                  "isDefault":true,
                  "order":30
               }
            }
         },
         "ga_sample":{
            "name":"Genome Sequencing",
            "defaultFilter":"@INTERACTION.INTERACTION_TYPE = 'Genomic'",
            "defaultFilterKey":"Genomic",
            "order":1,
            "attributes":{
               "sample_id":{
                  "name":"Sample Id",
                  "type":"text",
                  "expression":"@CODE.VALUE",
                  "defaultFilter":"@CODE.ATTRIBUTE = 'SampleIndex'",
                  "eavExpressionKey":"SampleIndex",
                  "order":1,
                  "annotations":[
                     "genomics_sample_id"
                  ]
               },
               "reference_id":{
                  "name":"Genome Reference",
                  "type":"text",
                  "expression":"@CODE.VALUE",
                  "defaultFilter":"@CODE.ATTRIBUTE = 'ReferenceGenome'",
                  "eavExpressionKey":"ReferenceGenome",
                  "order":2
               },
               "sample_class":{
                  "name":"Sample Class",
                  "type":"text",
                  "expression":"@CODE.VALUE",
                  "defaultFilter":"@CODE.ATTRIBUTE = 'SampleClass'",
                  "eavExpressionKey":"SampleClass",
                  "order":3
               },
               "calYear":{
                  "name":"Start Year",
                  "type":"num",
                  "expression":"YEAR(@INTERACTION.\"START\")",
                  "isDefault":true,
                  "order":26
               },
               "calMonth":{
                  "name":"Start Month",
                  "type":"num",
                  "expression":"MONTH(@INTERACTION.\"START\")",
                  "referenceFilter":"@REF.VOCABULARY_ID='mri.CAT.MONTHS'",
                  "referenceExpression":"@REF.CODE",
                  "isDefault":true,
                  "order":27
               },
               "start":{
                  "name":"Start Date",
                  "type":"time",
                  "expression":"TO_DATE(@INTERACTION.\"START\")",
                  "isDefault":true,
                  "order":28
               },
               "end":{
                  "name":"End Date",
                  "type":"time",
                  "expression":"TO_DATE(@INTERACTION.\"END\")",
                  "isDefault":true,
                  "order":29
               },
               "startdatetime":{
                  "name":"Start Date/Time",
                  "type":"datetime",
                  "expression":"@INTERACTION.\"START\"",
                  "isDefault":true,
                  "order":30
               }
            }
         }
      },
      "attributes":{
         "pid":{
            "name":"Patient ID",
            "type":"text",
            "expression":"@PATIENT.PATIENT_ID",
            "order":1
         },
         "smoker":{
            "name":"Smoker",
            "type":"text",
            "defaultFilter":"@OBS.OBS_TYPE = 'SMOKER'",
            "expression":"@OBS.OBS_CHAR_VAL",
            "referenceFilter":"@REF.VOCABULARY_ID='mri.CAT.YES-NO'",
            "referenceExpression":"@REF.CODE",
            "order":2
         },
         "pcount":{
            "name":"Patient Count",
            "type":"num",
            "measureExpression":"COUNT(DISTINCT(@PATIENT.PATIENT_ID))",
            "order":3
         },
         "nationality":{
            "name":"Nationality",
            "type":"text",
            "expression":"@PATIENT.NATIONALITY",
            "order":4
         },
         "cohort":{
            "name":"Cohort",
            "type":"text",
            "defaultFilter":"@OBS.OBS_CHAR_VAL=@OBS.OBS_CHAR_VAL",
            "expression":"@OBS.OBS_CHAR_VAL",
            "order":5,
            "from":{
               "@OBS":"\"CDMDEFAULT\".\"pa.db::CollectionsAsObservation\""
            }
         },
         "firstName":{
            "name":"First Name",
            "type":"text",
            "expression":"@PATIENT.FIRSTNAME",
            "order":6
         },
         "lastName":{
            "name":"Last Name",
            "type":"text",
            "expression":"@PATIENT.LASTNAME",
            "order":7
         },
         "street":{
            "name":"Street",
            "type":"text",
            "expression":"@PATIENT.STREET",
            "order":8
         },
         "city":{
            "name":"City",
            "type":"text",
            "expression":"@PATIENT.CITY",
            "order":9
         },
         "zipcode":{
            "name":"ZIP Code",
            "type":"text",
            "expression":"@PATIENT.POSTCODE",
            "order":10
         },
         "region":{
            "name":"Region",
            "type":"text",
            "expression":"@PATIENT.REGION",
            "order":11
         },
         "country":{
            "name":"Country",
            "type":"text",
            "expression":"@PATIENT.COUNTRY",
            "order":12
         },
         "gender":{
            "name":"Gender",
            "type":"text",
            "expression":"@PATIENT.GENDER",
            "referenceFilter":"@REF.VOCABULARY_ID='mri.CAT.GENDER'",
            "referenceExpression":"@REF.Code",
            "order":13
         },
         "monthOfBirth":{
            "name":"Month of Birth",
            "type":"num",
            "expression":"MONTH(@PATIENT.DOB)",
            "order":14
         },
         "yearOfBirth":{
            "name":"Year of Birth",
            "type":"num",
            "expression":"YEAR(@PATIENT.DOB)",
            "order":15
         },
         "dateOfBirth":{
            "name":"Date of Birth",
            "type":"time",
            "expression":"@PATIENT.DOB",
            "order":16
         },
         "dateOfDeath":{
            "name":"Date of Death",
            "type":"time",
            "expression":"@PATIENT.DOD",
            "order":17
         },
         "maritalStatus":{
            "name":"Marital Status",
            "type":"text",
            "expression":"@PATIENT.MARITAL_STATUS",
            "order":18
         },
         "title":{
            "name":"Title",
            "type":"text",
            "expression":"@PATIENT.TITLE",
            "order":19
         },
         "biomarker":{
            "name":"Biomarker Type",
            "type":"text",
            "defaultFilter":"@OBS.OBS_TYPE = 'BIOMARKER'",
            "expression":"@OBS.OBS_CHAR_VAL",
            "order":20
         },
         "packYearsSmoked":{
            "name":"Pack-Years Smoked",
            "type":"num",
            "expression":"@OBS.OBS_NUM_VAL",
            "defaultFilter":"@OBS.OBS_TYPE = 'PACK_YEARS_SMOKED'",
            "order":21
         },
         "smokingOnset":{
            "name":"Smoking Onset Year",
            "type":"num",
            "expression":"@OBS.OBS_NUM_VAL",
            "defaultFilter":"@OBS.OBS_TYPE = 'SMOKING_ONSET'",
            "order":22
         },
         "smokingOnsetAge":{
            "name":"Smoking Onset Age",
            "type":"num",
            "expression":"@OBS.OBS_NUM_VAL",
            "defaultFilter":"@OBS.OBS_TYPE = 'SMOKING_ONSET_AGE'",
            "order":23
         },
         "smokingStopped":{
            "name":"Smoking Stopped Year",
            "type":"num",
            "expression":"@OBS.OBS_NUM_VAL",
            "defaultFilter":"@OBS.OBS_TYPE = 'SMOKING_STOPPED'",
            "order":24
         },
         "dwSource":{
            "name":"DW Source",
            "type":"text",
            "expression":"@PATIENT.SOURCE",
            "order":25
         }
      }
   }
};



//Generate SQL
  var oSql =  queryEngine.getSQL(oModelConfig,       //data model config (CDM)
						oPlaceholderTableMap, 
						oBuilder.getFast()
						);


  console.log(oSql); //print sql
