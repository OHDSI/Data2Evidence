export const OLD_GLOBAL_SETTINGS = {
  tableMapping: {
    "@INTERACTION": '"legacy.cdw.db.models::DWViews.Interactions"',
    "@OBS": '"legacy.cdw.db.models::DWViews.Observations"',
    "@CODE": '"legacy.cdw.db.models::DWViewsEAV.Interaction_Details"',
    "@MEASURE": '"legacy.cdw.db.models::DWViewsEAV.Interaction_Measures"',
    "@PATIENT": '"legacy.cdw.db.models::DWViews.Patient"',
    "@TEXT": '"legacy.cdw.db.models::DWViewsEAV.Interaction_Text"',
    "@REF": '"legacy.ots::Views.ConceptPreferredTerms"',
    "@INTERACTION.PATIENT_ID": '"PatientID"',
    "@INTERACTION.INTERACTION_ID": '"InteractionID"',
    "@INTERACTION.CONDITION_ID": '"ConditionID"',
    "@INTERACTION.PARENT_INTERACT_ID": '"ParentInteractionID"',
    "@INTERACTION.START": '"PeriodStart"',
    "@INTERACTION.END": '"PeriodEnd"',
    "@INTERACTION.INTERACTION_TYPE": '"InteractionTypeValue"',
    "@OBS.PATIENT_ID": '"PatientID"',
    "@OBS.OBSERVATION_ID": '"ObsID"',
    "@OBS.OBS_TYPE": '"ObsType"',
    "@OBS.OBS_CHAR_VAL": '"ObsCharValue"',
    "@CODE.INTERACTION_ID": '"InteractionID"',
    "@CODE.ATTRIBUTE": '"AttributeValue"',
    "@CODE.VALUE": '"Value"',
    "@MEASURE.INTERACTION_ID": '"InteractionID"',
    "@MEASURE.ATTRIBUTE": '"AttributeValue"',
    "@MEASURE.VALUE": '"Value"',
    "@REF.VOCABULARY_ID": '"ConceptVocabularyID"',
    "@REF.CODE": '"ConceptCode"',
    "@REF.TEXT": '"TermText"',
    "@TEXT.INTERACTION_TEXT_ID": '"InteractionTextID"',
    "@TEXT.INTERACTION_ID": '"InteractionID"',
    "@TEXT.VALUE": '"Value"',
    "@PATIENT.PATIENT_ID": '"PatientID"',
    "@PATIENT.DOD": '"DeceasedDate"',
    "@PATIENT.DOB": '"BirthDate"',
  },
  guardedTableMapping: {
    "@PATIENT": '"legacy.cdw.db.models::DWViews.V_GuardedPatient"',
  },
  language: ["en", "de", "fr"],
  settings: {
    fuzziness: 0.7,
    maxResultSize: 5000,
    sqlReturnOn: true,
    errorDetailsReturnOn: true,
    errorStackTraceReturnOn: true,
    enableFreeText: true,
    vbEnabled: true,
    dateFormat: "YYYY-MM-dd",
    timeFormat: "HH:mm:ss",
  },
  others: {
    sqlReturnOn: false,
    errorDetailsReturnOn: false,
    errorStackTraceReturnOn: false,
  },
  shared: {},
  configId: "",
  schemaVersion: "1.0",
};

export const OLD_CDW = {
  patient: {
    layoutPrio: 1,
    conditions: {
      acme: {
        name: "ACME Tumor Case",
        id: "91cb65bc-8cd0-485a-975b-99897998483d",
        interactions: {
          priDiag: {
            name: "Primary Tumor Diagnosis",
            defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M03'",
            layoutPrio: 2,
            id: "8137ba52-40a5-4740-9c1a-da990e0a4bcb",
            attributes: {
              icd: {
                name: "ICD Code",
                type: "text",
                expression: "SUBSTR(@CODE.VALUE,0,3)",
                defaultFilter: "@CODE.ATTRIBUTE = 'ICD'",
                referenceFilter: "@REF.CATALOG = 'ICDO3.1-TOPO-DIMDI'",
                id: "01af816a-58da-4e6d-84cc-ffec52078960",
                isFreeText: false,
              },
              icd_smoker: {
                name: "ICD Code",
                type: "text",
                expression:
                  "CONCAT(SUBSTR(@CODE.VALUE,0,3), @OBS.OBS_CHAR_VAL)",
                defaultFilter:
                  "@CODE.ATTRIBUTE = 'ICD' AND @OBS.OBS_TYPE = 'SMOKER'",
                referenceFilter: "@REF.CATALOG = 'ICDO3.1-TOPO-DIMDI'",
                id: "01af816a-58da-4e6d-84cc-ffec52078960",
                isFreeText: false,
              },
              nsclc: {
                name: "Lung Cancer Subtype",
                type: "text",
                expression: "@CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'LC_TYPE'",
                id: "6ef81fd7-a0e8-4db7-9697-6b1d5efab17b",
                isFreeText: false,
              },
              age: {
                name: "Age at Diagnosis",
                type: "num",
                expression:
                  'TO_INTEGER(DAYS_BETWEEN(@PATIENT.DOB,@INTERACTION."END") / 365)',
                defaultFilter: '@PATIENT.DOB <= @INTERACTION."END"',
                id: "ee531fc9-4c49-44ba-9e14-ff8b5c7ae05c",
                isFreeText: false,
              },
              calYear: {
                name: "Year",
                type: "text",
                expression: 'YEAR(@INTERACTION."START")',
                default: "Y",
                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                isFreeText: false,
              },
              calMonth: {
                name: "Month",
                type: "text",
                expression: 'MONTH(@INTERACTION."START")',
                default: "Y",
                id: "58141f22-874a-4012-a273-4913b60a392f",
                isFreeText: false,
              },
              freetext: {
                expression: "@TEXT.VALUE",
                isFreeText: true,
              },
              _absTime: {
                isIntTime: true,
                isFreeText: false,
              },
              _succ: {
                isRelTime: true,
                isFreeText: false,
              },
              start: {
                name: "Start Date",
                type: "time",
                expression: '@INTERACTION."START"',
                relationExpressionKey: "START",
                annotations: ["interaction_start"],
                isDefault: true,
                order: 28,
              },
              end: {
                name: "End Date",
                type: "time",
                expression: '@INTERACTION."END"',
                relationExpressionKey: "END",
                annotations: ["interaction_end"],
                isDefault: true,
                order: 29,
              },
              freetextDiag: {
                name: "Diagnosis Free Text",
                type: "freetext",
                expression: "@TEXT.VALUE",
                order: 5,
                fuzziness: 0.8,
              },
              startdatetime: {
                name: "Start Date/Time",
                type: "datetime",
                expression: '@INTERACTION."START"',
                order: 30,
                isDefault: true,
              },
            },
          },
          tnm: {
            name: "TNM Classification",
            defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M03TS'",
            id: "095a9ae6-3e93-47ec-8396-ce6dfada1e53",
            attributes: {
              tnmT: {
                name: "T-Component",
                type: "text",
                expression: "'T' || @CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'TNM_T'",
                id: "6258e431-c003-4417-94db-074b1e40db09",
                isFreeText: false,
              },
              tnmN: {
                name: "N-Component",
                type: "text",
                expression: "'N' || @CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'TNM_N'",
                id: "7ef49c48-a0b6-4fac-8b09-91941dd8de57",
                isFreeText: false,
              },
              tnmM: {
                name: "M-Component",
                type: "text",
                expression: "'M' || @CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'TNM_M'",
                id: "021487c8-9181-484f-b8bb-ea6c670a0b7c",
                isFreeText: false,
              },
              calYear: {
                name: "Year",
                type: "text",
                expression: 'YEAR(@INTERACTION."START")',
                default: "Y",
                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                isFreeText: false,
              },
              calMonth: {
                name: "Month",
                type: "text",
                expression: 'MONTH(@INTERACTION."START")',
                default: "Y",
                id: "58141f22-874a-4012-a273-4913b60a392f",
                isFreeText: false,
              },
              freetext: {
                expression: "@TEXT.VALUE",
                isFreeText: true,
              },
              _absTime: {
                isIntTime: true,
                isFreeText: false,
              },
              _succ: {
                isRelTime: true,
                isFreeText: false,
              },
            },
          },
          chemo: {
            name: "Chemotherapy",
            defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M07_CHEMO'",
            id: "8ad82789-11bc-4988-8402-866616209b0e",
            attributes: {
              chemo_ops: {
                name: "OPS Code",
                type: "text",
                defaultFilter: "@CODE.ATTRIBUTE = 'CHEMO_OPS'",
                expression: "@CODE.VALUE",
                id: "0afe6263-5989-4f75-a244-d12bce7e67a4",
                isFreeText: false,
              },
              chemo_prot: {
                name: "Protocol",
                type: "text",
                defaultFilter: "@CODE.ATTRIBUTE = 'CHEMO_PROT'",
                expression: "@CODE.VALUE",
                new_definition: "",
                id: "b6a6d715-4ebe-498c-a895-0a4cf0f61369",
                isFreeText: false,
              },
              calYear: {
                name: "Year",
                type: "text",
                expression: 'YEAR(@INTERACTION."START")',
                default: "Y",
                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                isFreeText: false,
              },
              calMonth: {
                name: "Month",
                type: "text",
                expression: 'MONTH(@INTERACTION."START")',
                default: "Y",
                id: "58141f22-874a-4012-a273-4913b60a392f",
                isFreeText: false,
              },
              freetext: {
                expression: "@TEXT.VALUE",
                isFreeText: true,
              },
              _absTime: {
                isIntTime: true,
                isFreeText: false,
              },
              _succ: {
                isRelTime: true,
                isFreeText: false,
              },
              interactionCount: {
                name: "interaction count",
                type: "num",
                measureExpression:
                  "COUNT(DISTINCT @INTERACTION.INTERACTION_ID)",
              },
              start: {
                name: "Start Date",
                type: "time",
                expression: '@INTERACTION."START"',
                relationExpressionKey: "START",
                annotations: ["interaction_start"],
                isDefault: true,
                order: 28,
              },
              end: {
                name: "End Date",
                type: "time",
                expression: '@INTERACTION."END"',
                relationExpressionKey: "END",
                annotations: ["interaction_end"],
                isDefault: true,
                order: 29,
              },
            },
          },
          radio: {
            name: "Radiotherapy",
            defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M07_RADIO'",
            id: "9c00e46d-10da-4aae-b09e-f01433495332",
            attributes: {
              radio_ops: {
                name: " OPS Code",
                type: "text",
                defaultFilter: "@CODE.ATTRIBUTE = 'RADIO_OPS'",
                expression: "@CODE.VALUE",
                id: "8acc95f6-c997-49a9-b538-5a4a949ef7c1",
                isFreeText: false,
              },
              radio_dosage: {
                name: "Radio Dosage",
                type: "text",
                defaultFilter: "@MEASURE.ATTRIBUTE = 'DOSAGE'",
                expression:
                  "TO_NVARCHAR(@MEASURE.VALUE) || ' ' || @MEASURE.UNIT",
                id: "ea9b537c-fc76-4ee8-a00d-176016e3531f",
                isFreeText: false,
              },
              radio_dosage_value: {
                name: "Radio Dosage Value (in Gy)",
                type: "num",
                defaultFilter: "@MEASURE.ATTRIBUTE = 'DOSAGE'",
                expression: "@MEASURE.VALUE",
                id: "ef9b888c-fc76-4ee8-a00d-176016e3531f",
                isFreeText: false,
              },
              calYear: {
                name: "Year",
                type: "text",
                expression: 'YEAR(@INTERACTION."START")',
                default: "Y",
                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                isFreeText: false,
              },
              calMonth: {
                name: "Month",
                type: "text",
                expression: 'MONTH(@INTERACTION."START")',
                default: "Y",
                id: "58141f22-874a-4012-a273-4913b60a392f",
                isFreeText: false,
              },
              freetext: {
                expression: "@TEXT.VALUE",
                isFreeText: true,
              },
              _absTime: {
                isIntTime: true,
                isFreeText: false,
              },
              _succ: {
                isRelTime: true,
                isFreeText: false,
              },
            },
          },
          surgery: {
            name: "Surgery",
            defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M07_SURGERY'",
            id: "c244653b-b16c-4684-9dc6-44f504a5d6ef",
            attributes: {
              surgery_ops: {
                name: " OPS Code",
                type: "text",
                defaultFilter: "@CODE.ATTRIBUTE = 'SURGERY_OPS'",
                expression: "@CODE.VALUE",
                id: "4513b3cb-f232-4624-b10f-7f121ea9a399",
                isFreeText: false,
              },
              exist: {
                name: "Exist",
                type: "text",
                expression:
                  "CASE WHEN @INTERACTION.INTERACTION_ID IS NULL THEN NULL ELSE 'YES' END",
                id: "e8c181f3-e454-45fb-9b2d-9d18e6c0189c",
                isFreeText: false,
              },
              calYear: {
                name: "Year",
                type: "text",
                expression: 'YEAR(@INTERACTION."START")',
                default: "Y",
                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                isFreeText: false,
              },
              calMonth: {
                name: "Month",
                type: "text",
                expression: 'MONTH(@INTERACTION."START")',
                default: "Y",
                id: "58141f22-874a-4012-a273-4913b60a392f",
                isFreeText: false,
              },
              freetext: {
                expression: "@TEXT.VALUE",
                isFreeText: true,
              },
              _absTime: {
                isIntTime: true,
                isFreeText: false,
              },
              _succ: {
                isRelTime: true,
                isFreeText: false,
              },
            },
          },
          biobank: {
            name: "Biobank",
            defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'BIOBANK'",
            id: "59147495-66b4-43da-b1a2-15792c754066",
            attributes: {
              tType: {
                name: "Tissue / Liquid Type",
                type: "text",
                expression: "@OBS.OBS_CHAR_VAL",
                defaultFilter: "@OBS.OBS_TYPE IN ('BIOBANK', 'LIQUIDBANK')",
                id: "7297d599-2c37-4907-a5f8-6413b95dbb4b",
                isFreeText: false,
              },
              status: {
                name: "Sample Status",
                type: "text",
                expression: "@OBS.OBS_STATUS",
                defaultFilter: "@OBS.OBS_TYPE IN ('BIOBANK', 'LIQUIDBANK')",
                id: "241dca00-63e0-4ce4-945a-efbc2c633621",
                isFreeText: false,
              },
              calYear: {
                name: "Year",
                type: "text",
                expression: 'YEAR(@INTERACTION."START")',
                default: "Y",
                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                isFreeText: false,
              },
              calMonth: {
                name: "Month",
                type: "text",
                expression: 'MONTH(@INTERACTION."START")',
                default: "Y",
                id: "58141f22-874a-4012-a273-4913b60a392f",
                isFreeText: false,
              },
              freetext: {
                expression: "@TEXT.VALUE",
                isFreeText: true,
              },
              _absTime: {
                isIntTime: true,
                isFreeText: false,
              },
              _succ: {
                isRelTime: true,
                isFreeText: false,
              },
            },
          },
        },
      },
    },
    interactions: {
      vStatus: {
        name: "Vital Status",
        defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M16'",
        id: "491af278-6d65-4c27-a9dc-d3b0c5a5505f",
        attributes: {
          status: {
            name: "Vital Status",
            type: "text",
            expression: "@CODE.VALUE",
            defaultFilter: "@CODE.ATTRIBUTE = 'VITALSTATUS'",
            id: "f646f487-537d-48e6-9b8e-297d3fb75c75",
            isFreeText: false,
          },
          age: {
            name: "Age at Last Contact",
            type: "num",
            expression:
              'TO_INTEGER(DAYS_BETWEEN(@PATIENT.DOB,@INTERACTION."END") / 365)',
            defaultFilter: '@PATIENT.DOB <= @INTERACTION."END"',
            id: "b5a43ac8-d029-4451-b198-b01929757cae",
            isFreeText: false,
          },
          year: {
            name: "Year of Last Contact",
            type: "text",
            expression: 'YEAR(@INTERACTION."START")',
            id: "e60204ca-b953-4df2-a534-8bdea72a1f92",
            isFreeText: false,
          },
          calYear: {
            name: "Year",
            type: "text",
            expression: 'YEAR(@INTERACTION."START")',
            default: "Y",
            id: "a26703b6-cfde-402a-b92b-cc181564bc13",
            isFreeText: false,
          },
          calMonth: {
            name: "Month",
            type: "text",
            expression: 'MONTH(@INTERACTION."START")',
            default: "Y",
            id: "58141f22-874a-4012-a273-4913b60a392f",
            isFreeText: false,
          },
          freetext: {
            expression: "@TEXT.VALUE",
            isFreeText: true,
          },
          _absTime: {
            isIntTime: true,
            isFreeText: false,
          },
          _succ: {
            isRelTime: true,
            isFreeText: false,
          },
        },
      },
      ga_sample: {
        name: "Genome Sequencing",
        defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'Genomic'",
        attributes: {
          sample_id: {
            name: "Sample Id",
            type: "text",
            defaultFilter: "@CODE.ATTRIBUTE = 'SampleIndex'",
            expression: "@CODE.VALUE",
            annotations: ["genomics_sample_id"],
          },
        },
      },
    },
    attributes: {
      pid: {
        name: "Patient Id",
        type: "text",
        expression: "@PATIENT.PATIENT_ID",
        id: "9e3b9c5e-8e8e-4221-ab18-9e47541ce72h",
        isFreeText: false,
      },
      nationality: {
        name: "Nationality",
        type: "text",
        expression: "@PATIENT.NATIONALITY",
        id: "2fc759a1-727c-453b-b2f7-19f11d13e011",
        isFreeText: false,
      },
      pcount: {
        name: "Patient Count",
        type: "num",
        measureExpression: "COUNT(DISTINCT(@PATIENT.PATIENT_ID))",
        id: "17208821-863e-4e59-a31b-1c9a9f5b18b2",
        isFreeText: false,
      },
      gender: {
        name: "Gender",
        type: "text",
        expression: "@PATIENT.GENDER",
        id: "c542e629-5c04-4f10-92b6-a3abe002a5f3",
        isFreeText: false,
      },
      biomarker: {
        name: "Biomarker Type",
        defaultFilter: "@OBS.OBS_TYPE = 'BIOMARKER'",
        type: "text",
        expression: "@OBS.OBS_CHAR_VAL",
        id: "b41c85dc-ae6b-4493-981c-875370ca402b",
        isFreeText: false,
      },
      smoker: {
        name: "Smoker",
        defaultFilter: "@OBS.OBS_TYPE = 'SMOKER'",
        type: "text",
        expression: "@OBS.OBS_CHAR_VAL",
        id: "a61c2776-0de0-46e0-8492-95273c8cfa6b",
        isFreeText: false,
      },
      firstname: {
        name: "First name",
        type: "text",
        expression: "@PATIENT.FIRSTNAME",
        id: "afed670c-8e47-4b0b-a36b-1b2a2f81218c",
        isFreeText: false,
      },
      lastname: {
        name: "Last name",
        type: "text",
        expression: "@PATIENT.LASTNAME",
        id: "34ce65a9-6f4f-4cef-aff4-a3fa360ef90b",
        isFreeText: false,
      },
      dob: {
        name: "Date of birth",
        type: "time",
        expression: "@PATIENT.DOB",
        id: "9e3b9c5e-8e8e-4221-ab18-9e47541ce72f",
        isFreeText: false,
      },
      dateOfBirth: {
        name: "Date of birth",
        type: "time",
        expression: "@PATIENT.DOB",
        id: "1e3b9c5e-8e8e-4221-ab18-9e47541ce72f",
        isFreeText: false,
      },
      dateOfDeath: {
        name: "Date of Death",
        type: "time",
        expression: "@PATIENT.DOD",
        id: "5e3b9c5e-8e8e-4221-ab18-9e47541ce72f",
        isFreeText: false,
      },
      monthOfBirth: {
        name: "Month of Birth",
        type: "num",
        expression: 'MONTH(@PATIENT."BirthDate")',
        order: 14,
        isFreeText: false,
      },
      yearOfBirth: {
        name: "Year of birth",
        type: "text",
        expression: "YEAR(@PATIENT.DOB)",
        id: "9e3b9c5e-8e8e-4221-ab18-9e47541ce72g",
        isFreeText: false,
      },
      freetext: {
        isFreeText: true,
      },
      start: {
        name: "Start Date",
        type: "time",
        expression: '@INTERACTION."START"',
        relationExpressionKey: "START",
        annotations: ["interaction_start"],
        isDefault: true,
        order: 28,
      },
      end: {
        name: "End Date",
        type: "time",
        expression: '@INTERACTION."END"',
        relationExpressionKey: "END",
        annotations: ["interaction_end"],
        isDefault: true,
        order: 29,
      },
      packYearsSmoked: {
        name: "Pack-Years Smoked",
        type: "num",
        expression: "@OBS.OBS_NUM_VAL",
        defaultFilter: "@OBS.OBS_TYPE = 'PACK_YEARS_SMOKED'",
        order: 21,
      },
    },
  },
  censor: {},
  mapping: {},
};

export const CDW = {
  patient: {
    layoutPrio: 1,
    conditions: {
      acme: {
        name: "ACME Tumor Case",
        id: "91cb65bc-8cd0-485a-975b-99897998483d",
        interactions: {
          priDiag: {
            name: "Primary Tumor Diagnosis",
            defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M03'",
            layoutPrio: 2,
            id: "8137ba52-40a5-4740-9c1a-da990e0a4bcb",
            attributes: {
              icd: {
                name: "ICD Code",
                type: "text",
                expression: "SUBSTR(@CODE.VALUE,0,3)",
                defaultFilter: "@CODE.ATTRIBUTE = 'ICD'",
                referenceFilter: "@REF.CATALOG = 'ICDO3.1-TOPO-DIMDI'",
                id: "01af816a-58da-4e6d-84cc-ffec52078960",
                isFreeText: false,
              },
              icd_smoker: {
                name: "ICD Code",
                type: "text",
                expression:
                  "CONCAT(SUBSTR(@CODE.VALUE,0,3), @OBS.OBS_CHAR_VAL)",
                defaultFilter:
                  "@CODE.ATTRIBUTE = 'ICD' AND @OBS.OBS_TYPE = 'SMOKER'",
                referenceFilter: "@REF.CATALOG = 'ICDO3.1-TOPO-DIMDI'",
                id: "01af816a-58da-4e6d-84cc-ffec52078960",
                isFreeText: false,
              },
              nsclc: {
                name: "Lung Cancer Subtype",
                type: "text",
                expression: "@CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'LC_TYPE'",
                id: "6ef81fd7-a0e8-4db7-9697-6b1d5efab17b",
                isFreeText: false,
              },
              age: {
                name: "Age at Diagnosis",
                type: "num",
                expression:
                  'TO_INTEGER(DAYS_BETWEEN(@PATIENT.DOB,@INTERACTION."END") / 365)',
                defaultFilter: '@PATIENT.DOB <= @INTERACTION."END"',
                id: "ee531fc9-4c49-44ba-9e14-ff8b5c7ae05c",
                isFreeText: false,
              },
              calYear: {
                name: "Year",
                type: "text",
                expression: 'YEAR(@INTERACTION."START")',
                default: "Y",
                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                isFreeText: false,
              },
              calMonth: {
                name: "Month",
                type: "text",
                expression: 'MONTH(@INTERACTION."START")',
                default: "Y",
                id: "58141f22-874a-4012-a273-4913b60a392f",
                isFreeText: false,
              },
              freetext: {
                expression: "@TEXT.VALUE",
                isFreeText: true,
              },
              _absTime: {
                isIntTime: true,
                isFreeText: false,
              },
              _succ: {
                isRelTime: true,
                isFreeText: false,
              },
              start: {
                name: "Start Date",
                type: "time",
                expression: '@INTERACTION."START"',
                relationExpressionKey: "START",
                annotations: ["interaction_start"],
                isDefault: true,
                order: 28,
              },
              end: {
                name: "End Date",
                type: "time",
                expression: '@INTERACTION."END"',
                relationExpressionKey: "END",
                annotations: ["interaction_end"],
                isDefault: true,
                order: 29,
              },
              freetextDiag: {
                name: "Diagnosis Free Text",
                type: "freetext",
                expression: "@TEXT.VALUE",
                order: 5,
                fuzziness: 0.8,
              },
              startdatetime: {
                name: "Start Date/Time",
                type: "datetime",
                expression: '@INTERACTION."START"',
                order: 30,
                isDefault: true,
              },
            },
          },
          tnm: {
            name: "TNM Classification",
            defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M03TS'",
            id: "095a9ae6-3e93-47ec-8396-ce6dfada1e53",
            attributes: {
              tnmT: {
                name: "T-Component",
                type: "text",
                expression: "'T' || @CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'TNM_T'",
                id: "6258e431-c003-4417-94db-074b1e40db09",
                isFreeText: false,
              },
              tnmN: {
                name: "N-Component",
                type: "text",
                expression: "'N' || @CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'TNM_N'",
                id: "7ef49c48-a0b6-4fac-8b09-91941dd8de57",
                isFreeText: false,
              },
              tnmM: {
                name: "M-Component",
                type: "text",
                expression: "'M' || @CODE.VALUE",
                defaultFilter: "@CODE.ATTRIBUTE = 'TNM_M'",
                id: "021487c8-9181-484f-b8bb-ea6c670a0b7c",
                isFreeText: false,
              },
              calYear: {
                name: "Year",
                type: "text",
                expression: 'YEAR(@INTERACTION."START")',
                default: "Y",
                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                isFreeText: false,
              },
              calMonth: {
                name: "Month",
                type: "text",
                expression: 'MONTH(@INTERACTION."START")',
                default: "Y",
                id: "58141f22-874a-4012-a273-4913b60a392f",
                isFreeText: false,
              },
              freetext: {
                expression: "@TEXT.VALUE",
                isFreeText: true,
              },
              _absTime: {
                isIntTime: true,
                isFreeText: false,
              },
              _succ: {
                isRelTime: true,
                isFreeText: false,
              },
            },
          },
          chemo: {
            name: "Chemotherapy",
            defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M07_CHEMO'",
            id: "8ad82789-11bc-4988-8402-866616209b0e",
            attributes: {
              chemo_ops: {
                name: "OPS Code",
                type: "text",
                defaultFilter: "@CODE.ATTRIBUTE = 'CHEMO_OPS'",
                expression: "@CODE.VALUE",
                id: "0afe6263-5989-4f75-a244-d12bce7e67a4",
                isFreeText: false,
              },
              chemo_prot: {
                name: "Protocol",
                type: "text",
                defaultFilter: "@CODE.ATTRIBUTE = 'CHEMO_PROT'",
                expression: "@CODE.VALUE",
                new_definition: "",
                id: "b6a6d715-4ebe-498c-a895-0a4cf0f61369",
                isFreeText: false,
              },
              calYear: {
                name: "Year",
                type: "text",
                expression: 'YEAR(@INTERACTION."START")',
                default: "Y",
                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                isFreeText: false,
              },
              calMonth: {
                name: "Month",
                type: "text",
                expression: 'MONTH(@INTERACTION."START")',
                default: "Y",
                id: "58141f22-874a-4012-a273-4913b60a392f",
                isFreeText: false,
              },
              freetext: {
                expression: "@TEXT.VALUE",
                isFreeText: true,
              },
              _absTime: {
                isIntTime: true,
                isFreeText: false,
              },
              _succ: {
                isRelTime: true,
                isFreeText: false,
              },
              interactionCount: {
                name: "interaction count",
                type: "num",
                measureExpression:
                  "COUNT(DISTINCT @INTERACTION.INTERACTION_ID)",
              },
              start: {
                name: "Start Date",
                type: "time",
                expression: '@INTERACTION."START"',
                relationExpressionKey: "START",
                annotations: ["interaction_start"],
                isDefault: true,
                order: 28,
              },
              end: {
                name: "End Date",
                type: "time",
                expression: '@INTERACTION."END"',
                relationExpressionKey: "END",
                annotations: ["interaction_end"],
                isDefault: true,
                order: 29,
              },
            },
          },
          radio: {
            name: "Radiotherapy",
            defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M07_RADIO'",
            id: "9c00e46d-10da-4aae-b09e-f01433495332",
            attributes: {
              radio_ops: {
                name: " OPS Code",
                type: "text",
                defaultFilter: "@CODE.ATTRIBUTE = 'RADIO_OPS'",
                expression: "@CODE.VALUE",
                id: "8acc95f6-c997-49a9-b538-5a4a949ef7c1",
                isFreeText: false,
              },
              radio_dosage: {
                name: "Radio Dosage",
                type: "text",
                defaultFilter: "@MEASURE.ATTRIBUTE = 'DOSAGE'",
                expression:
                  "TO_NVARCHAR(@MEASURE.VALUE) || ' ' || @MEASURE.UNIT",
                id: "ea9b537c-fc76-4ee8-a00d-176016e3531f",
                isFreeText: false,
              },
              radio_dosage_value: {
                name: "Radio Dosage Value (in Gy)",
                type: "num",
                defaultFilter: "@MEASURE.ATTRIBUTE = 'DOSAGE'",
                expression: "@MEASURE.VALUE",
                id: "ef9b888c-fc76-4ee8-a00d-176016e3531f",
                isFreeText: false,
              },
              calYear: {
                name: "Year",
                type: "text",
                expression: 'YEAR(@INTERACTION."START")',
                default: "Y",
                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                isFreeText: false,
              },
              calMonth: {
                name: "Month",
                type: "text",
                expression: 'MONTH(@INTERACTION."START")',
                default: "Y",
                id: "58141f22-874a-4012-a273-4913b60a392f",
                isFreeText: false,
              },
              freetext: {
                expression: "@TEXT.VALUE",
                isFreeText: true,
              },
              _absTime: {
                isIntTime: true,
                isFreeText: false,
              },
              _succ: {
                isRelTime: true,
                isFreeText: false,
              },
            },
          },
          surgery: {
            name: "Surgery",
            defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M07_SURGERY'",
            id: "c244653b-b16c-4684-9dc6-44f504a5d6ef",
            attributes: {
              surgery_ops: {
                name: " OPS Code",
                type: "text",
                defaultFilter: "@CODE.ATTRIBUTE = 'SURGERY_OPS'",
                expression: "@CODE.VALUE",
                id: "4513b3cb-f232-4624-b10f-7f121ea9a399",
                isFreeText: false,
              },
              exist: {
                name: "Exist",
                type: "text",
                expression:
                  "CASE WHEN @INTERACTION.INTERACTION_ID IS NULL THEN NULL ELSE 'YES' END",
                id: "e8c181f3-e454-45fb-9b2d-9d18e6c0189c",
                isFreeText: false,
              },
              calYear: {
                name: "Year",
                type: "text",
                expression: 'YEAR(@INTERACTION."START")',
                default: "Y",
                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                isFreeText: false,
              },
              calMonth: {
                name: "Month",
                type: "text",
                expression: 'MONTH(@INTERACTION."START")',
                default: "Y",
                id: "58141f22-874a-4012-a273-4913b60a392f",
                isFreeText: false,
              },
              freetext: {
                expression: "@TEXT.VALUE",
                isFreeText: true,
              },
              _absTime: {
                isIntTime: true,
                isFreeText: false,
              },
              _succ: {
                isRelTime: true,
                isFreeText: false,
              },
            },
          },
          biobank: {
            name: "Biobank",
            defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'BIOBANK'",
            id: "59147495-66b4-43da-b1a2-15792c754066",
            attributes: {
              tType: {
                name: "Tissue / Liquid Type",
                type: "text",
                expression: "@OBS.OBS_CHAR_VAL",
                defaultFilter: "@OBS.OBS_TYPE IN ('BIOBANK', 'LIQUIDBANK')",
                id: "7297d599-2c37-4907-a5f8-6413b95dbb4b",
                isFreeText: false,
              },
              status: {
                name: "Sample Status",
                type: "text",
                expression: "@OBS.OBS_STATUS",
                defaultFilter: "@OBS.OBS_TYPE IN ('BIOBANK', 'LIQUIDBANK')",
                id: "241dca00-63e0-4ce4-945a-efbc2c633621",
                isFreeText: false,
              },
              calYear: {
                name: "Year",
                type: "text",
                expression: 'YEAR(@INTERACTION."START")',
                default: "Y",
                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                isFreeText: false,
              },
              calMonth: {
                name: "Month",
                type: "text",
                expression: 'MONTH(@INTERACTION."START")',
                default: "Y",
                id: "58141f22-874a-4012-a273-4913b60a392f",
                isFreeText: false,
              },
              freetext: {
                expression: "@TEXT.VALUE",
                isFreeText: true,
              },
              _absTime: {
                isIntTime: true,
                isFreeText: false,
              },
              _succ: {
                isRelTime: true,
                isFreeText: false,
              },
            },
          },
        },
      },
    },
    interactions: {
      vStatus: {
        name: "Vital Status",
        defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M16'",
        id: "491af278-6d65-4c27-a9dc-d3b0c5a5505f",
        attributes: {
          status: {
            name: "Vital Status",
            type: "text",
            expression: "@CODE.VALUE",
            defaultFilter: "@CODE.ATTRIBUTE = 'VITALSTATUS'",
            id: "f646f487-537d-48e6-9b8e-297d3fb75c75",
            isFreeText: false,
          },
          age: {
            name: "Age at Last Contact",
            type: "num",
            expression:
              'TO_INTEGER(DAYS_BETWEEN(@PATIENT.DOB,@INTERACTION."END") / 365)',
            defaultFilter: '@PATIENT.DOB <= @INTERACTION."END"',
            id: "b5a43ac8-d029-4451-b198-b01929757cae",
            isFreeText: false,
          },
          year: {
            name: "Year of Last Contact",
            type: "text",
            expression: 'YEAR(@INTERACTION."START")',
            id: "e60204ca-b953-4df2-a534-8bdea72a1f92",
            isFreeText: false,
          },
          calYear: {
            name: "Year",
            type: "text",
            expression: 'YEAR(@INTERACTION."START")',
            default: "Y",
            id: "a26703b6-cfde-402a-b92b-cc181564bc13",
            isFreeText: false,
          },
          calMonth: {
            name: "Month",
            type: "text",
            expression: 'MONTH(@INTERACTION."START")',
            default: "Y",
            id: "58141f22-874a-4012-a273-4913b60a392f",
            isFreeText: false,
          },
          freetext: {
            expression: "@TEXT.VALUE",
            isFreeText: true,
          },
          _absTime: {
            isIntTime: true,
            isFreeText: false,
          },
          _succ: {
            isRelTime: true,
            isFreeText: false,
          },
        },
      },
      ga_sample: {
        name: "Genome Sequencing",
        defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'Genomic'",
        attributes: {
          sample_id: {
            name: "Sample Id",
            type: "text",
            defaultFilter: "@CODE.ATTRIBUTE = 'SampleIndex'",
            expression: "@CODE.VALUE",
            annotations: ["genomics_sample_id"],
          },
        },
      },
    },
    attributes: {
      pid: {
        name: "Patient Id",
        type: "text",
        expression: "@PATIENT.PATIENT_ID",
        id: "9e3b9c5e-8e8e-4221-ab18-9e47541ce72h",
        isFreeText: false,
      },
      nationality: {
        name: "Nationality",
        type: "text",
        expression: "@PATIENT.NATIONALITY",
        id: "2fc759a1-727c-453b-b2f7-19f11d13e011",
        isFreeText: false,
      },
      pcount: {
        name: "Patient Count",
        type: "num",
        measureExpression: "COUNT(DISTINCT(@PATIENT.PATIENT_ID))",
        id: "17208821-863e-4e59-a31b-1c9a9f5b18b2",
        isFreeText: false,
      },
      gender: {
        name: "Gender",
        type: "text",
        expression: "@PATIENT.GENDER",
        id: "c542e629-5c04-4f10-92b6-a3abe002a5f3",
        isFreeText: false,
      },
      biomarker: {
        name: "Biomarker Type",
        defaultFilter: "@OBS.OBS_TYPE = 'BIOMARKER'",
        type: "text",
        expression: "@OBS.OBS_CHAR_VAL",
        id: "b41c85dc-ae6b-4493-981c-875370ca402b",
        isFreeText: false,
      },
      smoker: {
        name: "Smoker",
        defaultFilter: "@OBS.OBS_TYPE = 'SMOKER'",
        type: "text",
        expression: "@OBS.OBS_CHAR_VAL",
        id: "a61c2776-0de0-46e0-8492-95273c8cfa6b",
        isFreeText: false,
      },
      firstname: {
        name: "First name",
        type: "text",
        expression: "@PATIENT.FIRSTNAME",
        id: "afed670c-8e47-4b0b-a36b-1b2a2f81218c",
        isFreeText: false,
      },
      lastname: {
        name: "Last name",
        type: "text",
        expression: "@PATIENT.LASTNAME",
        id: "34ce65a9-6f4f-4cef-aff4-a3fa360ef90b",
        isFreeText: false,
      },
      dob: {
        name: "Date of birth",
        type: "time",
        expression: "@PATIENT.DOB",
        id: "9e3b9c5e-8e8e-4221-ab18-9e47541ce72f",
        isFreeText: false,
      },
      dateOfBirth: {
        name: "Date of birth",
        type: "time",
        expression: "@PATIENT.DOB",
        id: "1e3b9c5e-8e8e-4221-ab18-9e47541ce72f",
        isFreeText: false,
      },
      dateOfDeath: {
        name: "Date of Death",
        type: "time",
        expression: "@PATIENT.DOD",
        id: "5e3b9c5e-8e8e-4221-ab18-9e47541ce72f",
        isFreeText: false,
      },
      monthOfBirth: {
        name: "Month of Birth",
        type: "num",
        expression: 'MONTH(@PATIENT."BirthDate")',
        order: 14,
        isFreeText: false,
      },
      yearOfBirth: {
        name: "Year of birth",
        type: "text",
        expression: "YEAR(@PATIENT.DOB)",
        id: "9e3b9c5e-8e8e-4221-ab18-9e47541ce72g",
        isFreeText: false,
      },
      freetext: {
        isFreeText: true,
      },
      start: {
        name: "Start Date",
        type: "time",
        expression: '@INTERACTION."START"',
        relationExpressionKey: "START",
        annotations: ["interaction_start"],
        isDefault: true,
        order: 28,
      },
      end: {
        name: "End Date",
        type: "time",
        expression: '@INTERACTION."END"',
        relationExpressionKey: "END",
        annotations: ["interaction_end"],
        isDefault: true,
        order: 29,
      },
      packYearsSmoked: {
        name: "Pack-Years Smoked",
        type: "num",
        expression: "@OBS.OBS_NUM_VAL",
        defaultFilter: "@OBS.OBS_TYPE = 'PACK_YEARS_SMOKED'",
        order: 21,
      },
    },
  },
  advancedSettings: {
    tableMapping: {
      "@INTERACTION": '"legacy.cdw.db.models::DWViews.Interactions"',
      "@OBS": '"legacy.cdw.db.models::DWViews.Observations"',
      "@CODE": '"legacy.cdw.db.models::DWViewsEAV.Interaction_Details"',
      "@MEASURE": '"legacy.cdw.db.models::DWViewsEAV.Interaction_Measures"',
      "@PATIENT": '"legacy.cdw.db.models::DWViews.Patient"',
      "@TEXT": '"legacy.cdw.db.models::DWViewsEAV.Interaction_Text"',
      "@REF": '"legacy.ots::Views.ConceptPreferredTerms"',
      "@INTERACTION.PATIENT_ID": '"PatientID"',
      "@INTERACTION.INTERACTION_ID": '"InteractionID"',
      "@INTERACTION.CONDITION_ID": '"ConditionID"',
      "@INTERACTION.PARENT_INTERACT_ID": '"ParentInteractionID"',
      "@INTERACTION.START": '"PeriodStart"',
      "@INTERACTION.END": '"PeriodEnd"',
      "@INTERACTION.INTERACTION_TYPE": '"InteractionTypeValue"',
      "@OBS.PATIENT_ID": '"PatientID"',
      "@OBS.OBSERVATION_ID": '"ObsID"',
      "@OBS.OBS_TYPE": '"ObsType"',
      "@OBS.OBS_CHAR_VAL": '"ObsCharValue"',
      "@CODE.INTERACTION_ID": '"InteractionID"',
      "@CODE.ATTRIBUTE": '"AttributeValue"',
      "@CODE.VALUE": '"Value"',
      "@MEASURE.INTERACTION_ID": '"InteractionID"',
      "@MEASURE.ATTRIBUTE": '"AttributeValue"',
      "@MEASURE.VALUE": '"Value"',
      "@REF.VOCABULARY_ID": '"ConceptVocabularyID"',
      "@REF.CODE": '"ConceptCode"',
      "@REF.TEXT": '"TermText"',
      "@TEXT.INTERACTION_TEXT_ID": '"InteractionTextID"',
      "@TEXT.INTERACTION_ID": '"InteractionID"',
      "@TEXT.VALUE": '"Value"',
      "@PATIENT.PATIENT_ID": '"PatientID"',
      "@PATIENT.DOD": '"DeceasedDate"',
      "@PATIENT.DOB": '"BirthDate"',
    },
    guardedTableMapping: {
      "@PATIENT": '"legacy.cdw.db.models::DWViews.V_GuardedPatient"',
    },
    language: ["en", "de", "fr"],
    settings: {
      fuzziness: 0.7,
      maxResultSize: 5000,
      sqlReturnOn: true,
      errorDetailsReturnOn: true,
      errorStackTraceReturnOn: true,
      enableFreeText: true,
      vbEnabled: true,
      patientDataAccessLogging: false,
      dateFormat: "YYYY-MM-dd",
      timeFormat: "HH:mm:ss",
      otsTableMap: {
        "@CODE": '"legacy.cdw.db.models::DWViews.InteractionDetailsOTS"',
      },
    },
    others: {
      sqlReturnOn: false,
      errorDetailsReturnOn: false,
      errorStackTraceReturnOn: false,
    },
    shared: {},
    configId: "",
    schemaVersion: "1.0",
  },
  censor: {},
  mapping: {},
};

export const CDW_FP2 = {
  censor: {},
  mapping: {},
  patient: {
    conditions: {
      acme: {
        interactions: {
          priDiag: {
            name: [
              {
                lang: "",
                value: "Primary Tumor Diagnosis",
              },
              {
                lang: "en",
                value: "Primary Tumor Diagnosis",
              },
              {
                lang: "de",
                value: "Primärtumor-Diagnose",
              },
              {
                lang: "fr",
                value: "Diagnostic Primaire",
              },
            ],
            defaultFilter: "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M03'",
            attributes: {
              icd_10: {
                name: [
                  {
                    lang: "",
                    value: "ICD-10-CM Code",
                  },
                  {
                    lang: "en",
                    value: "ICD-10-CM Code",
                  },
                  {
                    lang: "de",
                    value: "ICD-10-CM-Code",
                  },
                  {
                    lang: "fr",
                    value: "Code CIM-10",
                  },
                ],
                type: "text",
                expression: 'SUBSTR(@CODE."Value",0,3)',
                defaultFilter: "@CODE.\"AttributeValue\" = 'ICD_10'",
                referenceExpression: '@REF."ConceptCode"',
                referenceFilter:
                  '@REF."ConceptVocabularyID" = \'ICDO3.1-TOPO-DIMDI\' AND LENGTH(@REF."ConceptCode")=3',
                order: 1,
              },
              age: {
                name: [
                  {
                    lang: "",
                    value: "Age at Diagnosis",
                  },
                  {
                    lang: "en",
                    value: "Age at Diagnosis",
                  },
                  {
                    lang: "de",
                    value: "Alter bei Diagnose",
                  },
                  {
                    lang: "fr",
                    value: "Age au Diagnostic",
                  },
                ],
                type: "num",
                defaultFilter:
                  '@PATIENT."BirthDate" <= @INTERACTION."PeriodEnd"',
                expression:
                  'FLOOR(DAYS_BETWEEN(@PATIENT."BirthDate",@INTERACTION."PeriodEnd") / 365)',
                order: 3,
              },
              nsclc: {
                name: [
                  {
                    lang: "",
                    value: "Lung Cancer Subtype",
                  },
                  {
                    lang: "en",
                    value: "Lung Cancer Subtype",
                  },
                  {
                    lang: "de",
                    value: "Lungenkrebs Subtyp",
                  },
                  {
                    lang: "fr",
                    value: "Type de Cancer Pulmonaire",
                  },
                ],
                type: "text",
                defaultFilter: "@CODE.\"AttributeValue\" = 'LC_TYPE'",
                expression: '@CODE."Value"',
                order: 4,
              },
              freetextDiag: {
                name: [
                  {
                    lang: "",
                    value: "Diagnosis Free Text",
                  },
                  {
                    lang: "en",
                    value: "Diagnosis Free Text",
                  },
                  {
                    lang: "de",
                    value: "Diagnose-Freitext",
                  },
                  {
                    lang: "fr",
                    value: "Texte Libre au Diagnostic",
                  },
                ],
                type: "freetext",
                defaultFilter: "@TEXT.\"Attribute\" = 'INTERACTIONS_FREETEXT'",
                expression: '@TEXT."Value"',
                fuzziness: 0.8,
                order: 5,
              },
            },
          },
          chemo: {
            name: [
              {
                lang: "",
                value: "Chemotherapy",
              },
              {
                lang: "en",
                value: "Chemotherapy",
              },
              {
                lang: "de",
                value: "Chemotherapie",
              },
              {
                lang: "fr",
                value: "Chimiothérapie",
              },
            ],
            defaultFilter:
              "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M07_CHEMO'",
            attributes: {
              interactionCount: {
                name: [
                  {
                    lang: "",
                    value: "Interaction Count",
                  },
                  {
                    lang: "en",
                    value: "Interaction Count",
                  },
                  {
                    lang: "de",
                    value: "Anzahl der Interaktionen",
                  },
                  {
                    lang: "fr",
                    value: "Nombre d'Interactions",
                  },
                ],
                type: "num",
                measureExpression:
                  'COUNT(DISTINCT(@INTERACTION."InteractionID"))',
              },
              chemo_ops: {
                name: [
                  {
                    lang: "",
                    value: "OPS Code",
                  },
                  {
                    lang: "en",
                    value: "OPS Code",
                  },
                  {
                    lang: "de",
                    value: "OPS-Code",
                  },
                  {
                    lang: "fr",
                    value: "Code OPS",
                  },
                ],
                type: "text",
                defaultFilter: "@CODE.\"AttributeValue\" = 'CHEMO_OPS'",
                expression: '@CODE."Value"',
              },
              chemo_prot: {
                name: [
                  {
                    lang: "",
                    value: "Protocol",
                  },
                  {
                    lang: "en",
                    value: "Protocol",
                  },
                  {
                    lang: "de",
                    value: "Protokoll",
                  },
                  {
                    lang: "fr",
                    value: "Protocole",
                  },
                ],
                type: "text",
                defaultFilter: "@CODE.\"AttributeValue\" = 'CHEMO_PROT'",
                expression: '@CODE."Value"',
              },
              interactionsPerPatient: {
                name: [
                  {
                    lang: "",
                    value: "Interactions per Patient",
                  },
                  {
                    lang: "en",
                    value: "Interactions per Patient",
                  },
                  {
                    lang: "de",
                    value: "Interaktionen pro Patient",
                  },
                  {
                    lang: "fr",
                    value: "Nb d'Interactions par Patient",
                  },
                ],
                type: "num",
                measureExpression:
                  'COUNT(DISTINCT(@INTERACTION."InteractionID")) / COUNT(DISTINCT(@PATIENT."PatientID"))',
              },
            },
          },
          radio: {
            name: [
              {
                lang: "",
                value: "Radiotherapy",
              },
              {
                lang: "en",
                value: "Radiotherapy",
              },
              {
                lang: "de",
                value: "Röntgentherapie",
              },
              {
                lang: "fr",
                value: "Radiothérapie",
              },
            ],
            defaultFilter:
              "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M07_RADIO'",
            attributes: {
              radio_dosage: {
                name: [
                  {
                    lang: "",
                    value: "Radio Dosage (Gy)",
                  },
                  {
                    lang: "en",
                    value: "Radio Dosage (Gy)",
                  },
                  {
                    lang: "de",
                    value: "Strahlendosis (Gy)",
                  },
                  {
                    lang: "fr",
                    value: "Dose de Rayonnement (Gy)",
                  },
                ],
                type: "num",
                defaultFilter:
                  "@MEASURE.\"AttributeValue\" = 'DOSAGE' AND @MEASURE.\"Unit\" = 'Gy'",
                expression: '@MEASURE."Value"',
              },
              radio_ops: {
                name: [
                  {
                    lang: "",
                    value: "OPS Code",
                  },
                  {
                    lang: "en",
                    value: "OPS Code",
                  },
                  {
                    lang: "de",
                    value: "OPS-Code",
                  },
                  {
                    lang: "fr",
                    value: "Code OPS",
                  },
                ],
                type: "text",
                defaultFilter: "@CODE.\"AttributeValue\" = 'RADIO_OPS'",
                expression: '@CODE."Value"',
              },
            },
          },
        },
        name: "Tumor Case",
      },
    },
    interactions: {
      vStatus: {
        name: [
          {
            lang: "",
            value: "Vital Status",
          },
          {
            lang: "en",
            value: "Vital Status",
          },
          {
            lang: "de",
            value: "Vitalstatus",
          },
          {
            lang: "fr",
            value: "Statut Vital",
          },
        ],
        defaultFilter: "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M16'",
        attributes: {
          age: {
            name: [
              {
                lang: "",
                value: "Age at Last Contact",
              },
              {
                lang: "en",
                value: "Age at Last Contact",
              },
              {
                lang: "de",
                value: "Alter beim letzten Kontakt",
              },
              {
                lang: "fr",
                value: "Age au Dernier Contact",
              },
            ],
            type: "num",
            defaultFilter: '@PATIENT."BirthDate" <= @INTERACTION."PeriodEnd"',
            expression:
              'FLOOR(DAYS_BETWEEN(@PATIENT."BirthDate",@INTERACTION."PeriodEnd") / 365)',
          },
          status: {
            name: [
              {
                lang: "",
                value: "Vital Status",
              },
              {
                lang: "en",
                value: "Vital Status",
              },
              {
                lang: "de",
                value: "Vitalstatus",
              },
              {
                lang: "fr",
                value: "Statut Vital",
              },
            ],
            type: "text",
            defaultFilter: "@CODE.\"AttributeValue\" = 'VITALSTATUS'",
            expression: '@CODE."Value"',
          },
          year: {
            name: [
              {
                lang: "",
                value: "Year of Last Contact",
              },
              {
                lang: "en",
                value: "Year of Last Contact",
              },
              {
                lang: "de",
                value: "Jahr beim letzten Kontakt",
              },
              {
                lang: "fr",
                value: "Année du Dernier Contact",
              },
            ],
            type: "num",
            expression: 'YEAR(@INTERACTION."PeriodStart")',
          },
        },
      },
    },
    attributes: {
      pid: {
        name: [
          {
            lang: "",
            value: "Patient ID",
          },
          {
            lang: "en",
            value: "Patient ID",
          },
          {
            lang: "de",
            value: "Patienten-ID",
          },
          {
            lang: "fr",
            value: "ID du Patient",
          },
        ],
        type: "text",
        expression: '@PATIENT."PatientID"',
        annotations: ["patient_id"],
      },
      smoker: {
        name: [
          {
            lang: "",
            value: "Smoker",
          },
          {
            lang: "en",
            value: "Smoker",
          },
          {
            lang: "de",
            value: "Raucher",
          },
          {
            lang: "fr",
            value: "Fumeur",
          },
        ],
        type: "text",
        defaultFilter: "@OBS.\"ObsType\" = 'SMOKER'",
        expression: '@OBS."ObsCharValue"',
        referenceFilter: "@REF.\"ConceptVocabularyID\"='HPH.MRI-YES-NO-CAT'",
        referenceExpression: '@REF."ConceptCode"',
      },
      pcount: {
        name: [
          {
            lang: "",
            value: "Patient Count",
          },
          {
            lang: "en",
            value: "Patient Count",
          },
          {
            lang: "de",
            value: "Patientenanzahl",
          },
          {
            lang: "fr",
            value: "Nombre de Patients",
          },
        ],
        type: "num",
        measureExpression: 'COUNT(DISTINCT(@PATIENT."PatientID"))',
      },
      nationality: {
        name: [
          {
            lang: "",
            value: "Nationality",
          },
          {
            lang: "en",
            value: "Nationality",
          },
          {
            lang: "de",
            value: "Staatsangehörigkeit",
          },
          {
            lang: "fr",
            value: "Nationalité",
          },
        ],
        type: "text",
        expression: '@PATIENT."NationalityValue"',
      },
      firstName: {
        name: [
          {
            lang: "",
            value: "First name",
          },
          {
            lang: "en",
            value: "First Name",
          },
          {
            lang: "de",
            value: "Vorname",
          },
          {
            lang: "fr",
            value: "Prénom",
          },
        ],
        type: "text",
        expression: '@PATIENT."GivenName"',
      },
      lastName: {
        name: [
          {
            lang: "",
            value: "Last name",
          },
          {
            lang: "en",
            value: "Last Name",
          },
          {
            lang: "de",
            value: "Nachname",
          },
          {
            lang: "fr",
            value: "Nom",
          },
        ],
        type: "text",
        expression: '@PATIENT."FamilyName"',
      },
      gender: {
        name: [
          {
            lang: "",
            value: "Gender",
          },
          {
            lang: "en",
            value: "Gender",
          },
          {
            lang: "de",
            value: "Geschlecht",
          },
          {
            lang: "fr",
            value: "Sexe",
          },
        ],
        type: "text",
        expression: '@PATIENT."GenderValue"',
        referenceFilter: "@REF.\"ConceptVocabularyID\"='HPH.MRI-GENDER-CAT'",
        referenceExpression: '@REF."ConceptCode"',
      },
      monthOfBirth: {
        name: [
          {
            lang: "",
            value: "Month of Birth",
          },
          {
            lang: "en",
            value: "Month of Birth",
          },
          {
            lang: "de",
            value: "Geburtsmonat",
          },
          {
            lang: "fr",
            value: "Mois de Naissance",
          },
        ],
        type: "num",
        expression: 'MONTH(@PATIENT."BirthDate")',
      },
      yearOfBirth: {
        name: [
          {
            lang: "",
            value: "Year of Birth",
          },
          {
            lang: "en",
            value: "Year of Birth",
          },
          {
            lang: "de",
            value: "Geburtsjahr",
          },
          {
            lang: "fr",
            value: "Année de Naissance",
          },
        ],
        type: "num",
        expression: 'YEAR(@PATIENT."BirthDate")',
      },
      dateOfBirth: {
        name: [
          {
            lang: "",
            value: "Date of Birth",
          },
          {
            lang: "en",
            value: "Date of Birth",
          },
          {
            lang: "de",
            value: "Geburtsdatum",
          },
          {
            lang: "fr",
            value: "Date de Naissance",
          },
        ],
        type: "time",
        expression: '@PATIENT."BirthDate"',
        annotations: ["date_of_birth"],
      },
      dateOfDeath: {
        name: [
          {
            lang: "",
            value: "Date of Death",
          },
          {
            lang: "en",
            value: "Date of Death",
          },
          {
            lang: "de",
            value: "Todesdatum",
          },
          {
            lang: "fr",
            value: "Date du Décès",
          },
        ],
        type: "time",
        expression: '@PATIENT."DeceasedDate"',
        annotations: ["date_of_death"],
      },
      biomarker: {
        name: [
          {
            lang: "",
            value: "Biomarker Type",
          },
          {
            lang: "en",
            value: "Biomarker Type",
          },
          {
            lang: "de",
            value: "Biomarkertyp",
          },
          {
            lang: "fr",
            value: "Biomarqueur",
          },
        ],
        type: "text",
        defaultFilter: "@OBS.\"ObsType\" = 'BIOMARKER'",
        expression: '@OBS."ObsCharValue"',
      },
      calYear: {
        name: [
          {
            lang: "",
            value: "Start Year",
          },
          {
            lang: "en",
            value: "Start Year",
          },
          {
            lang: "de",
            value: "Startjahr",
          },
          {
            lang: "fr",
            value: "Année de Début",
          },
        ],
        type: "num",
        expression: 'YEAR(@INTERACTION."PeriodStart")',
        isDefault: true,
      },
      calMonth: {
        name: [
          {
            lang: "",
            value: "Start Month",
          },
          {
            lang: "en",
            value: "Start Month",
          },
          {
            lang: "de",
            value: "Startmonat",
          },
          {
            lang: "fr",
            value: "Mois de Début",
          },
        ],
        type: "num",
        expression: 'MONTH(@INTERACTION."PeriodStart")',
        referenceFilter: "@REF.\"ConceptVocabularyID\"='HPH.MRI-MONTHS-CAT'",
        referenceExpression: '@REF."ConceptCode"',
        isDefault: true,
      },
      start: {
        name: [
          {
            lang: "",
            value: "Start Date",
          },
          {
            lang: "en",
            value: "Start Date",
          },
          {
            lang: "de",
            value: "Startdatum",
          },
          {
            lang: "fr",
            value: "Date de Début",
          },
        ],
        type: "time",
        expression: '@INTERACTION."PeriodStart"',
        annotations: ["interaction_start"],
        isDefault: true,
      },
      end: {
        name: [
          {
            lang: "",
            value: "End Date",
          },
          {
            lang: "en",
            value: "End Date",
          },
          {
            lang: "de",
            value: "Enddatum",
          },
          {
            lang: "fr",
            value: "Date de Fin",
          },
        ],
        type: "time",
        expression: '@INTERACTION."PeriodEnd"',
        annotations: ["interaction_end"],
        isDefault: true,
      },
    },
  },
  advancedSettings: {
    tableMapping: {
      "@INTERACTION":
        'CDMDEFAULT." legacy.cdw.db.models::InterfaceViews.INTERACTIONS"',
      "@OBS": 'CDMDEFAULT." legacy.cdw.db.models::InterfaceViews.OBSERVATIONS"',
      "@CODE":
        'CDMDEFAULT." legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_EAV"',
      "@MEASURE":
        'CDMDEFAULT." legacy.cdw.db.models::InterfaceViews.INTERACTION_MEASURES_EAV"',
      "@REF": 'CDMDEFAULT." legacy.ots::Views.ConceptPreferredTerms"',
      "@PATIENT": 'CDMDEFAULT." legacy.cdw.db.models::InterfaceViews.PATIENT"',
      "@TEXT":
        'CDMDEFAULT." legacy.cdw.db.models::InterfaceViews.INTERACTION_TEXT_EAV"',
      "@INTERACTION.PATIENT_ID": '"PATIENT_ID"',
      "@INTERACTION.INTERACTION_ID": '"INTERACTION_ID"',
      "@INTERACTION.CONDITION_ID": '"CONDITION_ID"',
      "@INTERACTION.PARENT_INTERACT_ID": '"PARENT_INTERACT_ID"',
      "@INTERACTION.START": '"START"',
      "@INTERACTION.END": '"END"',
      "@INTERACTION.INTERACTION_TYPE": '"INTERACTION_TYPE"',
      "@OBS.PATIENT_ID": '"PATIENT_ID"',
      "@OBS.OBSERVATION_ID": '"OBS_ID"',
      "@OBS.OBS_TYPE": '"OBS_TYPE"',
      "@OBS.OBS_CHAR_VAL": '"OBS_CHAR_VAL"',
      "@CODE.INTERACTION_ID": '"INTERACTION_ID"',
      "@CODE.ATTRIBUTE": '"ATTRIBUTE"',
      "@CODE.VALUE": '"VALUE"',
      "@MEASURE.INTERACTION_ID": '"INTERACTION_ID"',
      "@MEASURE.ATTRIBUTE": '"ATTRIBUTE"',
      "@MEASURE.VALUE": '"VALUE"',
      "@REF.VOCABULARY_ID": '"ConceptVocabularyID"',
      "@REF.CODE": '"ConceptCode"',
      "@REF.TEXT": '"TermText"',
      "@TEXT.INTERACTION_TEXT_ID": '"INTERACTION_TEXT_ID"',
      "@TEXT.INTERACTION_ID": '"INTERACTION_ID"',
      "@TEXT.VALUE": '"VALUE"',
      "@PATIENT.PATIENT_ID": '"PATIENT_ID"',
      "@PATIENT.DOD": '"DOD"',
      "@PATIENT.DOB": '"DOB"',
    },
    guardedTableMapping: {
      "@PATIENT":
        '" CDMDEFAULT "." legacy.cdw.db.models::InterfaceViews.GUARDED_PATIENT"',
    },
    language: ["en", "de", "fr"],
    settings: {
      fuzziness: 0.7,
      maxResultSize: 5000,
      sqlReturnOn: false,
      errorDetailsReturnOn: false,
      errorStackTraceReturnOn: false,
      hhpSchemaName: "CDMDEFAULT",
      refSchemaName: "CDMDEFAULT",
      kaplanMeierTable: 'CDMDEFAULT." pa.db::MRIEntities.KaplanMeierInput "',
      medexSchemaName: "CDMDEFAULT",
      vbEnabled: true,
    },
    others: {
      sqlReturnOn: false,
      errorDetailsReturnOn: false,
      errorStackTraceReturnOn: false,
    },
    shared: {},
    configId: "",
    schemaVersion: "1.0",
  },
};

export const MRI3_ADVANCED_SETTINGS = {
  tableMapping: {
    "@INTERACTION": `"legacy.cdw.db.models::DWViews.Interactions"`,
    "@OBS": `"legacy.cdw.db.models::DWViews.Observations"`,
    "@CODE": `"legacy.cdw.db.models::DWViewsEAV.Interaction_Details"`,
    "@MEASURE": `"legacy.cdw.db.models::DWViewsEAV.Interaction_Measures"`,
    "@PATIENT": `"legacy.cdw.db.models::DWViews.Patient"`,
    "@TEXT": `"legacy.cdw.db.models::DWViewsEAV.Interaction_Text"`,
    "@REF": `"CDMVOCAB"."CONCEPT"`,
    "@INTERACTION.PATIENT_ID": `"PatientID"`,
    "@INTERACTION.INTERACTION_ID": `"InteractionID"`,
    "@INTERACTION.CONDITION_ID": `"ConditionID"`,
    "@INTERACTION.PARENT_INTERACT_ID": `"ParentInteractionID"`,
    "@INTERACTION.START": `"PeriodStart"`,
    "@INTERACTION.END": `"PeriodEnd"`,
    "@INTERACTION.INTERACTION_TYPE": `"InteractionTypeValue"`,
    "@OBS.PATIENT_ID": `"PatientID"`,
    "@OBS.OBSERVATION_ID": `"ObsID"`,
    "@OBS.OBS_TYPE": `"ObsType"`,
    "@OBS.OBS_CHAR_VAL": `"ObsCharValue"`,
    "@CODE.INTERACTION_ID": `"InteractionID"`,
    "@CODE.ATTRIBUTE": `"AttributeValue"`,
    "@CODE.VALUE": `"Value"`,
    "@MEASURE.INTERACTION_ID": `"InteractionID"`,
    "@MEASURE.ATTRIBUTE": `"AttributeValue"`,
    "@MEASURE.VALUE": `"Value"`,
    "@REF.VOCABULARY_ID": `"ConceptVocabularyID"`,
    "@REF.CODE": `"ConceptCode"`,
    "@REF.TEXT": `"TermText"`,
    "@TEXT.INTERACTION_TEXT_ID": `"InteractionTextID"`,
    "@TEXT.INTERACTION_ID": `"InteractionID"`,
    "@TEXT.VALUE": `"Value"`,
    "@PATIENT.PATIENT_ID": `"PatientID"`,
    "@PATIENT.DOD": `"DeceasedDate"`,
    "@PATIENT.DOB": `"BirthDate"`,
  },
  tableTypePlaceholderMap: {
    factTable: {
      placeholder: "@PATIENT",
      attributeTables: [{ placeholder: "@OBS", oneToN: true }],
    },
    dimTables: [
      {
        placeholder: "@INTERACTION",
        hierarchy: true,
        time: true,
        oneToN: true,
        attributeTables: [
          { placeholder: "@CODE", oneToN: true },
          { placeholder: "@MEASURE", oneToN: true },
        ],
      },
    ],
  },
  guardedTableMapping: {
    "@PATIENT": '"legacy.cdw.db.models::DWViews.V_GuardedPatient"',
  },
  language: ["en", "de", "fr"],
  settings: {
    fuzziness: 0.7,
    maxResultSize: 5000,
    sqlReturnOn: true,
    errorDetailsReturnOn: true,
    errorStackTraceReturnOn: true,
    enableFreeText: true,
    vbEnabled: true,
    dateFormat: "YYYY-MM-dd",
    timeFormat: "HH:mm:ss",
  },
  others: {
    sqlReturnOn: false,
    errorDetailsReturnOn: false,
    errorStackTraceReturnOn: false,
  },
  shared: {},
  configId: "",
  schemaVersion: "1.0",
};
