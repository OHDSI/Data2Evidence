import { PholderTableMapType } from "../../../src/qe/settings/Settings";

const patient_id = `"PATIENT_ID"`;
const interaction_id = `"INTERACTION_ID"`;
const condition_id = `"CONDITION_ID"`;
const parent_interact_id = `"PARENT_INTERACT_ID"`;
const start = `"START"`;
const end = `"END"`;
const observation_id = `"OBSERVATION_ID"`;

let testSchemaName = process.env.TESTSCHEMA || "MRI";
export const pholderTableMap: any = {
  "@INTERACTION": `${testSchemaName}."legacy.cdw.db.models::InterfaceViews.INTERACTIONS"`,
  "@OBS": `${testSchemaName}."legacy.cdw.db.models::InterfaceViews.OBSERVATIONS"`,
  "@CODE": `${testSchemaName}."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_EAV"`,
  "@MEASURE": `${testSchemaName}."legacy.cdw.db.models::InterfaceViews.INTERACTION_MEASURES_EAV"`,
  "@PATIENT": `${testSchemaName}."legacy.cdw.db.models::InterfaceViews.PATIENT"`,
  "@TEXT": `${testSchemaName}."legacy.cdw.db.models::InterfaceViews.INTERACTION_TEXT_EAV"`,
  "@REF": `${testSchemaName}."legacy.cdw.db.models::InterfaceViews.CODES"`,
  "@INTERACTION.PATIENT_ID": patient_id,
  "@INTERACTION.INTERACTION_ID": interaction_id,
  "@INTERACTION.CONDITION_ID": condition_id,
  "@INTERACTION.PARENT_INTERACT_ID": parent_interact_id,
  "@INTERACTION.START": start,
  "@INTERACTION.END": end,
  "@INTERACTION.INTERACTION_TYPE": `"INTERACTION_TYPE"`,
  "@OBS.PATIENT_ID": patient_id,
  "@OBS.OBSERVATION_ID": observation_id,
  "@OBS.OBS_TYPE": `"OBS_TYPE"`,
  "@OBS.OBS_CHAR_VAL": `"OBS_CHAR_VAL"`,
  "@CODE.INTERACTION_ID": interaction_id,
  "@CODE.ATTRIBUTE": `"ATTRIBUTE"`,
  "@CODE.VALUE": `"VALUE"`,
  "@MEASURE.INTERACTION_ID": interaction_id,
  "@MEASURE.ATTRIBUTE": `"ATTRIBUTE"`,
  "@MEASURE.VALUE": `"VALUE"`,
  "@REF.VOCABULARY_ID": `"VOCABULARY_ID"`,
  "@REF.CODE": `"CODE"`,
  "@REF.TEXT": `"DESCRIPTION"`,
  "@TEXT.INTERACTION_TEXT_ID": `"INTERACTION_TEXT_ID"`,
  "@TEXT.INTERACTION_ID": interaction_id,
  "@TEXT.VALUE": `"VALUE"`,
  "@PATIENT.PATIENT_ID": patient_id,
  "@PATIENT.DOD": `"DOD"`,
  "@PATIENT.DOB": `"DOB"`,
};
