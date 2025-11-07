import {
  buildRecommendation,
  generateConfigWithDefaultAttributes,
} from "../../../src/qe/config/configSuggestion";
import { dw_views_pholderTableMap } from "../../data/global/dw_views_pholdertablemap";
import { Settings } from "../../../src/qe/settings/Settings";
import { Constants } from "@alp/alp-base-utils";
Constants.getInstance().setEnvVar("genomicsEnabled", "true");

describe("CDM Config suggestion test", () => {
  it("builds correct config based on db values", () => {
    let inputConfig = {
      patient: {
        interactions: {},
      },
    };

    let dbValues = [
      {
        INTERACTION_TYPE: "Beatmung",
        ATTRIBUTE: "(E) VTE",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Beatmung",
        ATTRIBUTE: "(E) VTe [L]",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Beatmung",
        ATTRIBUTE: "(E) VTe [ml]",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Beatmung",
        ATTRIBUTE: "(E) VTe spontan [mL]",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Beatmung",
        ATTRIBUTE: "Attribute",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Beatmung",
        ATTRIBUTE: "AttributeID",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Beatmung",
        ATTRIBUTE: "Intervention",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Beatmung",
        ATTRIBUTE: "InterventionID",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Beatmung",
        ATTRIBUTE: "PaO2/FiO2",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Beatmung",
        ATTRIBUTE: "Station",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Bilanz4H6",
        ATTRIBUTE: "DRE",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Bilanz4H6",
        ATTRIBUTE: "Infiltrate_Links",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Bilanz4H6",
        ATTRIBUTE: "Infiltrate_Links",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Bilanz4H6",
        ATTRIBUTE: "Infiltrate_Rechts",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Bilanz4H6",
        ATTRIBUTE: "Infiltrate_Rechts",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Bilanz4H6",
        ATTRIBUTE: "Intervention",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Bilanz4H6",
        ATTRIBUTE: "InterventionID",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Bilanz4H6",
        ATTRIBUTE: "Nettobilanz (24h)",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Bilanz4H6",
        ATTRIBUTE: "Station",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Vitalparameter",
        ATTRIBUTE: "Atemfrequenz",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Vitalparameter",
        ATTRIBUTE: "Attribute",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Vitalparameter",
        ATTRIBUTE: "AttributeID",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Vitalparameter",
        ATTRIBUTE: "Herzfrequenz",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Vitalparameter",
        ATTRIBUTE: "Intervention",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Vitalparameter",
        ATTRIBUTE: "InterventionID",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Vitalparameter",
        ATTRIBUTE: "SpO2",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Vitalparameter",
        ATTRIBUTE: "Station",
        ORIGIN: "INTERACTION_DETAILS",
        DATATYPE: "NVARCHAR",
      },
      {
        INTERACTION_TYPE: "Vitalparameter",
        ATTRIBUTE: "Temp (°C)",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Vitalparameter",
        ATTRIBUTE: "ZVD",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Vitalparameter",
        ATTRIBUTE: "diast",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Vitalparameter",
        ATTRIBUTE: "mean",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
      {
        INTERACTION_TYPE: "Vitalparameter",
        ATTRIBUTE: "syst",
        ORIGIN: "INTERACTION_MEASURES",
        DATATYPE: "DECIMAL",
      },
    ];

    let output = buildRecommendation(
      inputConfig,
      dbValues,
      dw_views_pholderTableMap
    );
    expect(
      Object.keys(output.patient.interactions["Beatmung"].attributes).length
    ).toEqual(10);
    expect(
      Object.keys(output.patient.interactions["Bilanz4H6"].attributes).length
    ).toEqual(9);
    expect(
      Object.keys(output.patient.interactions["Vitalparameter"].attributes)
        .length
    ).toEqual(13);
  });
});

describe("CDM Config generate config with default attributes", () => {
  it("returns a config with default attributes", () => {
    generateConfigWithDefaultAttributes(new Settings(), (err, output) => {
      expect(Object.keys(output.patient.interactions).length).toEqual(2);
      expect(output.patient.attributes.pid).toBeDefined();
      expect(output.patient.attributes.pcount).toBeDefined();
      expect(output.patient.attributes.cohort).toBeDefined();
      expect(output.patient.attributes.cohortStatus).toBeDefined();
      expect(output.patient.attributes.monthOfBirth).toBeDefined();
      expect(output.patient.attributes.yearOfBirth).toBeDefined();
      expect(output.patient.attributes.dateOfBirth).toBeDefined();
      expect(output.patient.attributes.dateOfDeath).toBeDefined();
      expect(output.patient.attributes.calYear).toBeDefined();
      expect(output.patient.attributes.calMonth).toBeDefined();
      expect(output.patient.attributes.start).toBeDefined();
      expect(output.patient.attributes.end).toBeDefined();
    });
  });
});
