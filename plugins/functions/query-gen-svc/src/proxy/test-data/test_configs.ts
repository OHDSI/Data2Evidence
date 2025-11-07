// export { pholderTableMap } from "./pholdertablemap";
// export { dw_views_pholderTableMap } from "./dw_views_pholdertablemap";

/**
 * This config uses interfaceViews (pre FP3)
 * This config is used for mri-tests
 */
const mockConfig = {
    patient: {
        layoutPrio: 1,
        conditions: {
            acme: {
                name: "ACME Tumor Case",
                id: "91cb65bc-8cd0-485a-975b-99897998483d",
                interactions: {
                    priDiag: {
                        name: "Primary Tumor Diagnosis",
                        defaultFilter:
                            "@INTERACTION.INTERACTION_TYPE = 'ACME_M03'",
                        layoutPrio: 2,
                        id: "8137ba52-40a5-4740-9c1a-da990e0a4bcb",
                        attributes: {
                            icd: {
                                name: "ICD Code",
                                type: "text",
                                expression: "SUBSTR(@CODE.VALUE,0,3)",
                                defaultFilter: "@CODE.ATTRIBUTE = 'ICD'",
                                referenceFilter:
                                    "@REF.CATALOG = 'ICDO3.1-TOPO-DIMDI'",
                                id: "01af816a-58da-4e6d-84cc-ffec52078960",
                                isFreeText: false,
                            },
                            _interaction_id: {
                                name: "ICD Code",
                                type: "text",
                                expression: "SUBSTR(@CODE.VALUE,0,3)",
                                defaultFilter: "@CODE.ATTRIBUTE = 'ICD'",
                                referenceFilter:
                                    "@REF.CATALOG = 'ICDO3.1-TOPO-DIMDI'",
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
                                referenceFilter:
                                    "@REF.CATALOG = 'ICDO3.1-TOPO-DIMDI'",
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
                                defaultFilter:
                                    '@PATIENT.DOB <= @INTERACTION."END"',
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
                        defaultFilter:
                            "@INTERACTION.INTERACTION_TYPE = 'ACME_M03TS'",
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
                        defaultFilter:
                            "@INTERACTION.INTERACTION_TYPE = 'ACME_M07_CHEMO'",
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
                        defaultFilter:
                            "@INTERACTION.INTERACTION_TYPE = 'ACME_M07_RADIO'",
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
                        defaultFilter:
                            "@INTERACTION.INTERACTION_TYPE = 'ACME_M07_SURGERY'",
                        id: "c244653b-b16c-4684-9dc6-44f504a5d6ef",
                        attributes: {
                            surgery_ops: {
                                name: " OPS Code",
                                type: "text",
                                defaultFilter:
                                    "@CODE.ATTRIBUTE = 'SURGERY_OPS'",
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
                        defaultFilter:
                            "@INTERACTION.INTERACTION_TYPE = 'BIOBANK'",
                        id: "59147495-66b4-43da-b1a2-15792c754066",
                        attributes: {
                            tType: {
                                name: "Tissue / Liquid Type",
                                type: "text",
                                expression: "@OBS.OBS_CHAR_VAL",
                                defaultFilter:
                                    "@OBS.OBS_TYPE IN ('BIOBANK', 'LIQUIDBANK')",
                                id: "7297d599-2c37-4907-a5f8-6413b95dbb4b",
                                isFreeText: false,
                            },
                            status: {
                                name: "Sample Status",
                                type: "text",
                                expression: "@OBS.OBS_STATUS",
                                defaultFilter:
                                    "@OBS.OBS_TYPE IN ('BIOBANK', 'LIQUIDBANK')",
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
            "@MEASURE":
                '"legacy.cdw.db.models::DWViewsEAV.Interaction_Measures"',
            "@PATIENT": '"legacy.cdw.db.models::DWViews.Patient"',
            "@TEXT": '"legacy.cdw.db.models::DWViewsEAV.Interaction_Text"',
            "@REF": '"legacy.ots.services::Views.Terms"',
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
            "@REF.VOCABULARY_ID": '"VocabularyID"',
            "@REF.CODE": '"Code"',
            "@REF.TEXT": '"Text"',
            "@TEXT.INTERACTION_TEXT_ID": '"InteractionTextID"',
            "@TEXT.INTERACTION_ID": '"InteractionID"',
            "@TEXT.VALUE": '"Value"',
            "@PATIENT.PATIENT_ID": '"PatientID"',
            "@PATIENT.DOD": '"DeceasedDate"',
            "@PATIENT.DOB": '"BirthDate"',
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
    },
    chartOptions: {
        stacked: {
            enabled: true,
            visible: true,
            fillMissingValuesEnabled: true,
        },
        boxplot: {
            enabled: true,
            visible: true,
            fillMissingValuesEnabled: true,
        },
        km: {
            enabled: true,
            visible: true,
            confidenceInterval: 1.95996398454,
            selectedInteractions: [
                {
                    defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M03'",
                    name: "Primary Tumor Diagnosis",
                },
                {
                    defaultFilter:
                        "@INTERACTION.INTERACTION_TYPE = 'ACME_M03TS'",
                    name: "TNM Classification",
                },
                {
                    defaultFilter:
                        "@INTERACTION.INTERACTION_TYPE = 'ACME_M07_RADIO'",
                    name: "Radiotherapy",
                },
                {
                    defaultFilter:
                        "@INTERACTION.INTERACTION_TYPE = 'ACME_M07_CHEMO'",
                    name: "Chemotherapy",
                },
                {
                    defaultFilter:
                        "@INTERACTION.INTERACTION_TYPE = 'ACME_M07_SURGERY'",
                    name: "Surgery",
                },
                {
                    defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'Genomic'",
                    name: "Genome Sequencing",
                },
                {
                    defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M16'",
                    name: "Vital Status",
                },
                {
                    defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'BIOBANK'",
                    name: "Biobank",
                },
            ],
        },
        list: {
            enabled: true,
        },
        vb: {
            enabled: true,
            visible: true,
        },
        minCohortSize: 1,
    },
    panelOptions: {
        afp: {
            visible: true,
            enabled: true,
        },
    },
};

export const dw_views_config = {
    patient: {
        conditions: {
            acme: {
                interactions: {
                    priDiag: {
                        name: "Primary Tumor Diagnosis",
                        defaultFilter:
                            "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M03'",
                        defaultFilterKey: "ACME_M03",
                        order: 4,
                        parentInteraction: [],
                        parentInteractionLabel: "parent",
                        attributes: {
                            icd_10: {
                                name: "ICD-10-CM Code",
                                type: "text",
                                expression: 'LEFT(@CODE."Value",3)',
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'ICD_10'",
                                referenceFilter: `@REF.\"VocabularyID\" = 'ots.ICD.ICD10GM'
                                                    AND (LENGTH(@REF.\"Code\")=3 OR (LENGTH(@REF.\"Code\")=5
                                                    AND @REF.\"Code\" LIKE '%.-'))`,
                                referenceExpression: 'LEFT(@REF."Code",3)',
                                order: 1,
                            },
                            icd: {
                                name: "ICD-10-CM Code",
                                type: "text",
                                expression: 'LEFT(@CODE."Value",3)',
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'ICD_10'",
                                referenceFilter: `@REF.\"VocabularyID\" = 'ots.ICD.ICD10GM' AND (LENGTH(@REF.\"Code\")=3
                                                    OR (LENGTH(@REF.\"Code\")=5 AND @REF.\"Code\" LIKE '%.-'))`,
                                referenceExpression: 'LEFT(@REF."Code",3)',
                                order: 1,
                            },
                            icd_10_smoker: {
                                name: "ICD-10-CM Code AND Smoker",
                                type: "text",
                                expression: `CONCAT(LEFT(@CODE."Value",3), @OBS."ObsCharValue") `,
                                defaultFilter: `@CODE."AttributeValue" = 'ICD_10' AND @OBS."ObsType" = 'SMOKER'`,
                                referenceFilter: `@REF.\"VocabularyID\" = 'ots.ICD.ICD10GM' AND (LENGTH(@REF.\"Code\")=3
                                                    OR (LENGTH(@REF.\"Code\")=5 AND @REF.\"Code\" LIKE '%.-'))`,
                                referenceExpression: 'LEFT(@REF."Code",3)',
                                order: 1,
                            },
                            icd_9: {
                                name: "ICD-9-CM Code",
                                type: "text",
                                expression: 'LEFT(@CODE."Value",3)',
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'ICD_9'",
                                order: 2,
                            },
                            age: {
                                name: "Age at Diagnosis",
                                type: "num",
                                expression:
                                    'FLOOR(DAYS_BETWEEN(@PATIENT."BirthDate",@INTERACTION."PeriodEnd") / 365)',
                                defaultFilter:
                                    '@PATIENT."BirthDate" <= @INTERACTION."PeriodEnd"',
                                order: 3,
                            },
                            nsclc: {
                                name: "Lung Cancer Subtype",
                                type: "text",
                                expression: '@CODE."Value"',
                                eavExpressionKey: "LC_TYPE",
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'LC_TYPE'",
                                order: 4,
                            },
                            freetextDiag: {
                                name: "Diagnosis Free Text",
                                type: "freetext",
                                expression: '@TEXT."Value"',
                                defaultFilter:
                                    "@TEXT.\"Attribute\" = 'INTERACTIONS_FREETEXT'",
                                order: 5,
                                fuzziness: 0.8,
                            },
                            histology: {
                                name: "Histology",
                                type: "text",
                                expression: '@CODE."Value"',
                                eavExpressionKey: "Histology",
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'Histology'",
                                order: 6,
                            },
                            tcgaCode: {
                                name: "Cancer Abbreviation",
                                type: "text",
                                expression: '@CODE."Value"',
                                eavExpressionKey: "TCGA_CODE",
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'TCGA_CODE'",
                                order: 7,
                            },
                            tcgaCancer: {
                                name: "Cancer Type",
                                type: "text",
                                expression: '@CODE."Value"',
                                eavExpressionKey: "TCGA_CANCER",
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'TCGA_CANCER'",
                                order: 8,
                            },
                        },
                    },
                    biobank: {
                        name: "Biobank",
                        defaultFilter:
                            "@INTERACTION.\"InteractionTypeValue\" = 'BIOBANK'",
                        defaultFilterKey: "BIOBANK",
                        order: 5,
                        parentInteraction: [],
                        parentInteractionLabel: "parent",
                        attributes: {
                            status: {
                                name: "Sample Status",
                                type: "text",
                                expression: '@CODE."Value"',
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'BIOBANK_STATUS'",
                                order: 1,
                            },
                            tType: {
                                name: "Tissue / Liquid Type",
                                type: "text",
                                expression: '@CODE."Value"',
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'BIOBANK_TYPE'",
                                order: 2,
                            },
                        },
                    },
                    chemo: {
                        name: "Chemotherapy",
                        defaultFilter:
                            "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M07_CHEMO'",
                        defaultFilterKey: "ACME_M07_CHEMO",
                        order: 6,
                        parentInteraction: [
                            "patient.conditions.acme.interactions.priDiag",
                        ],
                        parentInteractionLabel: "parent",
                        attributes: {
                            interactionCount: {
                                name: "Interaction Count",
                                type: "num",
                                measureExpression:
                                    'COUNT(DISTINCT(@INTERACTION."InteractionID"))',
                                order: 1,
                            },
                            chemo_ops: {
                                name: "OPS Code",
                                type: "text",
                                expression: '@CODE."Value"',
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'CHEMO_OPS'",
                                order: 2,
                            },
                            chemo_prot: {
                                name: "Protocol",
                                type: "text",
                                expression: '@CODE."Value"',
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'CHEMO_PROT'",
                                order: 3,
                            },
                            interactionsPerPatient: {
                                name: "Interactions per Patient",
                                type: "num",
                                measureExpression:
                                    'COUNT(DISTINCT(@INTERACTION."InteractionID")) / COUNT(DISTINCT(@PATIENT."PatientID"))',
                                order: 4,
                            },
                        },
                    },
                    radio: {
                        name: "Radiotherapy",
                        defaultFilter:
                            "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M07_RADIO'",
                        defaultFilterKey: "ACME_M07_RADIO",
                        order: 7,
                        parentInteraction: [],
                        parentInteractionLabel: "parent",
                        attributes: {
                            radio_dosage: {
                                name: "Radio Dosage (Gy)",
                                type: "num",
                                expression: '@MEASURE."Value"',
                                defaultFilter:
                                    "@MEASURE.\"AttributeValue\" = 'DOSAGE' AND @MEASURE.\"Unit\" = 'Gy'",
                                order: 1,
                            },
                            radio_ops: {
                                name: "OPS Code",
                                type: "text",
                                expression: '@CODE."Value"',
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'RADIO_OPS'",
                                order: 2,
                            },
                        },
                    },
                    surgery: {
                        name: "Surgery",
                        defaultFilter:
                            "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M07_SURGERY'",
                        defaultFilterKey: "ACME_M07_SURGERY",
                        order: 8,
                        parentInteraction: [],
                        parentInteractionLabel: "parent",
                        attributes: {
                            exist: {
                                name: "Exist",
                                type: "text",
                                expression:
                                    "CASE WHEN @INTERACTION.\"InteractionID\" IS NULL THEN NULL ELSE 'YES' END",
                                order: 1,
                            },
                            surgery_ops: {
                                name: "OPS Code",
                                type: "text",
                                expression: '@CODE."Value"',
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'SURGERY_OPS'",
                                order: 2,
                            },
                        },
                    },
                    tnm: {
                        name: "TNM Classification",
                        defaultFilter:
                            "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M03TS'",
                        defaultFilterKey: "ACME_M03TS",
                        order: 9,
                        parentInteraction: [],
                        parentInteractionLabel: "parent",
                        attributes: {
                            tnmM: {
                                name: "M-Component",
                                type: "text",
                                expression: "'M' || @CODE.\"Value\"",
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'TNM_M'",
                                order: 1,
                            },
                            tnmN: {
                                name: "N-Component",
                                type: "text",
                                expression: "'N' || @CODE.\"Value\"",
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'TNM_N'",
                                order: 2,
                            },
                            tnmT: {
                                name: "T-Component",
                                type: "text",
                                expression: "'T' || @CODE.\"Value\"",
                                defaultFilter:
                                    "@CODE.\"AttributeValue\" = 'TNM_T'",
                                order: 3,
                            },
                        },
                    },
                },
                name: "acme",
            },
        },
        interactions: {
            vStatus: {
                name: "Vital Status",
                defaultFilter:
                    "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M16'",
                defaultFilterKey: "ACME_M16",
                order: 3,
                parentInteraction: [],
                parentInteractionLabel: "parent",
                attributes: {
                    age: {
                        name: "Age at Last Contact",
                        type: "num",
                        expression:
                            'FLOOR(DAYS_BETWEEN(@PATIENT."BirthDate",@INTERACTION."PeriodEnd") / 365)',
                        defaultFilter:
                            '@PATIENT."BirthDate" <= @INTERACTION."PeriodEnd"',
                        order: 0,
                    },
                    status: {
                        name: "Vital Status",
                        type: "text",
                        expression: '@CODE."Value"',
                        defaultFilter:
                            "@CODE.\"AttributeValue\" = 'VITALSTATUS'",
                        order: 1,
                    },
                    year: {
                        name: "Year of Last Contact",
                        type: "num",
                        expression: 'YEAR(@INTERACTION."PeriodStart")',
                        order: 2,
                    },
                },
            },
            ga_sample: {
                name: "Genome Sequencing",
                defaultFilter:
                    "@INTERACTION.\"InteractionTypeValue\" = 'Genomic'",
                defaultFilterKey: "Genomic",
                order: 1,
                parentInteraction: [],
                parentInteractionLabel: "parent",
                attributes: {
                    sample_id: {
                        name: "Sample Id",
                        type: "text",
                        expression: '@CODE."Value"',
                        eavExpressionKey: "SampleIndex",
                        defaultFilter:
                            "@CODE.\"AttributeValue\" = 'SampleIndex'",
                        order: 1,
                        annotations: ["genomics_sample_id"],
                    },
                    reference_id: {
                        name: "Genome Reference",
                        type: "text",
                        expression: '@CODE."Value"',
                        eavExpressionKey: "ReferenceGenome",
                        defaultFilter:
                            "@CODE.\"AttributeValue\" = 'ReferenceGenome'",
                        order: 2,
                    },
                    sample_class: {
                        name: "Sample Class",
                        type: "text",
                        expression: '@CODE."Value"',
                        eavExpressionKey: "SampleClass",
                        defaultFilter:
                            "@CODE.\"AttributeValue\" = 'SampleClass'",
                        order: 3,
                    },
                },
            },
            ga_mutation: {
                name: "Genetic Variant",
                defaultFilter: "1=1",
                order: 2,
                from: {
                    "@INTERACTION":
                        '"legacy.genomics.db.models::MRI.VariantInteractions"',
                },
                parentInteraction: [],
                parentInteractionLabel: "parent",
                attributes: {
                    location: {
                        name: "Location",
                        type: "num",
                        expression: "@INTERACTION.POSITION_START",
                        relationExpressionKey: "POSITION_START",
                        order: 1,
                        annotations: ["genomics_variant_location"],
                    },
                    gene: {
                        name: "Gene",
                        type: "text",
                        expression: "@INTERACTION.GENE_NAME",
                        relationExpressionKey: "GENE_NAME",
                        order: 2,
                    },
                    region: {
                        name: "Region",
                        type: "text",
                        expression: "@INTERACTION.REGION",
                        relationExpressionKey: "REGION",
                        order: 3,
                    },
                    variant_type: {
                        name: "Variant Type",
                        type: "text",
                        expression: "@INTERACTION.VARIANT_TYPE",
                        relationExpressionKey: "VARIANT_TYPE",
                        order: 4,
                    },
                    seq_alteration: {
                        name: "Sequence Alteration",
                        type: "text",
                        expression: "@INTERACTION.SEQUENCE_ALTERATION",
                        relationExpressionKey: "SEQUENCE_ALTERATION",
                        order: 5,
                    },
                    aa_ref: {
                        name: "Amino Acid Reference",
                        type: "text",
                        expression: "@INTERACTION.AA_REF",
                        relationExpressionKey: "AA_REF",
                        order: 6,
                    },
                    aa_alt: {
                        name: "Amino Acid",
                        type: "text",
                        expression: "@INTERACTION.AA_ALT",
                        relationExpressionKey: "AA_ALT",
                        order: 7,
                    },
                },
            },
        },
        attributes: {
            pid: {
                name: "Patient ID",
                type: "text",
                expression: '@PATIENT."PatientID"',
                order: 1,
            },
            smoker: {
                name: "Smoker",
                type: "text",
                expression: '@OBS."ObsCharValue"',
                defaultFilter: "@OBS.\"ObsType\"= 'SMOKER'",
                referenceFilter: "@REF.\"VocabularyID\"='mri.CAT.YES-NO'",
                referenceExpression: '@REF."Code"',
                order: 2,
            },
            pcount: {
                name: "Patient Count",
                type: "num",
                measureExpression: 'COUNT(DISTINCT(@PATIENT."PatientID"))',
                order: 3,
            },
            nationality: {
                name: "Nationality",
                type: "text",
                expression: '@PATIENT."NationalityValue"',
                order: 4,
            },
            cohort: {
                name: "Cohort",
                type: "text",
                expression: '@OBS."OBS_CHAR_VAL"',
                defaultFilter: '@OBS."OBS_CHAR_VAL"=@OBS."OBS_CHAR_VAL"',
                order: 5,
                from: {
                    "@OBS": '"pa.db::CollectionsAsObservation"',
                },
            },
            firstName: {
                name: "First name",
                type: "text",
                expression: '@PATIENT."GivenName"',
                order: 6,
            },
            lastName: {
                name: "Last name",
                type: "text",
                expression: '@PATIENT."FamilyName"',
                order: 7,
            },
            street: {
                name: "Street",
                type: "text",
                expression: '@PATIENT."StreetName"',
                order: 8,
            },
            city: {
                name: "City",
                type: "text",
                expression: '@PATIENT."City"',
                order: 9,
            },
            zipcode: {
                name: "ZIP Code",
                type: "text",
                expression: '@PATIENT."PostalCode"',
                order: 10,
            },
            region: {
                name: "Region",
                type: "text",
                expression: '@PATIENT."State"',
                order: 11,
            },
            country: {
                name: "Country",
                type: "text",
                expression: '@PATIENT."CountryValue"',
                order: 12,
            },
            gender: {
                name: "Gender",
                type: "text",
                expression: '@PATIENT."GenderValue"',
                referenceFilter: "@REF.\"VocabularyID\"='mri.CAT.GENDER'",
                referenceExpression: '@REF."Code"',
                order: 13,
            },
            monthOfBirth: {
                name: "Month of Birth",
                type: "num",
                expression: 'MONTH(@PATIENT."BirthDate")',
                order: 14,
            },
            yearOfBirth: {
                name: "Year of Birth",
                type: "num",
                expression: 'YEAR(@PATIENT."BirthDate")',
                order: 15,
            },
            dateOfBirth: {
                name: "Date of Birth",
                type: "time",
                expression: '@PATIENT."BirthDate"',
                order: 16,
            },
            dateOfDeath: {
                name: "Date of Death",
                type: "time",
                expression: '@PATIENT."DeceasedDate"',
                order: 17,
            },
            maritalStatus: {
                name: "Marital Status",
                type: "text",
                expression: '@PATIENT."MaritalStatusValue"',
                order: 18,
            },
            title: {
                name: "Title",
                type: "text",
                expression: '@PATIENT."TitleValue"',
                order: 19,
            },
            biomarker: {
                name: "Biomarker Type",
                type: "text",
                expression: '@OBS."ObsCharValue"',
                defaultFilter: "@OBS.\"ObsType\"= 'BIOMARKER'",
                order: 20,
            },
            packYearsSmoked: {
                name: "Pack-Years Smoked",
                type: "num",
                expression: '@OBS."ObsNumValue"',
                defaultFilter: "@OBS.\"ObsType\"= 'PACK_YEARS_SMOKED'",
                order: 21,
            },
            smokingOnset: {
                name: "Smoking Onset Year",
                type: "num",
                expression: '@OBS."ObsNumValue"',
                defaultFilter: "@OBS.\"ObsType\"= 'SMOKING_ONSET'",
                order: 22,
            },
            smokingOnsetAge: {
                name: "Smoking Onset Age",
                type: "num",
                expression: '@OBS."ObsNumValue"',
                defaultFilter: "@OBS.\"ObsType\"= 'SMOKING_ONSET_AGE'",
                order: 23,
            },
            smokingStopped: {
                name: "Smoking Stopped Year",
                type: "num",
                expression: '@OBS."ObsNumValue"',
                defaultFilter: "@OBS.\"ObsType\"= 'SMOKING_STOPPED'",
                order: 24,
            },
            dwSource: {
                name: "DW Source",
                type: "text",
                expression: '@PATIENT."Source"',
                order: 25,
            },
            calYear: {
                name: "Start Year",
                type: "num",
                expression: 'YEAR(@INTERACTION."PeriodStart")',
                order: 26,
                isDefault: true,
            },
            calMonth: {
                name: "Start Month",
                type: "num",
                expression: 'MONTH(@INTERACTION."PeriodStart")',
                referenceFilter: "@REF.\"VocabularyID\"='mri.CAT.MONTHS'",
                referenceExpression: '@REF."Code"',
                order: 27,
                isDefault: true,
            },
            start: {
                name: "Start Date",
                type: "time",
                expression: 'TO_DATE(@INTERACTION."PeriodStart")',
                order: 28,
                isDefault: true,
            },
            end: {
                name: "End Date",
                type: "time",
                expression: 'TO_DATE(@INTERACTION."PeriodEnd")',
                order: 29,
                isDefault: true,
            },
            startdatetime: {
                name: "Start Date/Time",
                type: "datetime",
                expression: '@INTERACTION."PeriodStart"',
                order: 30,
                isDefault: true,
            },
        },
    },
    chartOptions: {
        initialAttributes: {
            measures: ["patient.attributes.pcount"],
            categories: [
                "patient.conditions.acme.interactions.priDiag.attributes.icd_10",
            ],
        },
        initialChart: "stacked",
        stacked: {
            visible: true,
            downloadEnabled: true,
            pdfDownloadEnabled: true,
            collectionEnabled: true,
            beginVisible: true,
            fillMissingValuesEnabled: true,
            enabled: true,
        },
        boxplot: {
            visible: true,
            downloadEnabled: true,
            pdfDownloadEnabled: true,
            collectionEnabled: true,
            beginVisible: true,
            fillMissingValuesEnabled: true,
            enabled: true,
        },
        km: {
            visible: true,
            enabled: true,
            downloadEnabled: true,
            pdfDownloadEnabled: true,
            collectionEnabled: true,
            beginVisible: true,
            confidenceInterval: 1.95996398454,
            selectedInteractions: [
                {
                    defaultFilter:
                        "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M03'",
                    name: "Primary Tumor Diagnosis",
                },
                {
                    defaultFilter:
                        "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M03TS'",
                    name: "TNM Classification",
                },
                {
                    defaultFilter:
                        "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M07_RADIO'",
                    name: "Radiotherapy",
                },
                {
                    defaultFilter:
                        "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M07_CHEMO'",
                    name: "Chemotherapy",
                },
                {
                    defaultFilter:
                        "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M07_SURGERY'",
                    name: "Surgery",
                },
                {
                    defaultFilter:
                        "@INTERACTION.\"InteractionTypeValue\" = 'Genomic'",
                    name: "Genome Sequencing",
                },
                {
                    defaultFilter:
                        "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M16'",
                    name: "Vital Status",
                },
                {
                    defaultFilter:
                        "@INTERACTION.\"InteractionTypeValue\" = 'BIOBANK'",
                    name: "Biobank",
                },
            ],
        },
        list: {
            visible: true,
            downloadEnabled: true,
            pdfDownloadEnabled: true,
            collectionEnabled: true,
            beginVisible: true,
            pageSize: 20,
            enabled: true,
        },
        vb: {
            visible: true,
            referenceName: "GRCh37",
            enabled: true,
        },
        minCohortSize: 1,
    },
    configInformations: {
        note: "",
    },
    panelOptions: {
        afp: {
            visible: true,
            enabled: true,
        },
    },
};

////////////// PLACE HOLDE TABLE MAPS ///////////
const patient_id = `"PATIENT_ID"`;
const interaction_id = `"INTERACTION_ID"`;
const condition_id = `"CONDITION_ID"`;
const parent_interact_id = `"PARENT_INTERACT_ID"`;
const start = `"START"`;
const end = `"END"`;
const observation_id = `"OBSERVATION_ID"`;

let testSchemaName = Deno.env.get("TESTSCHEMA") || "MRI";
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

export const dw_views_pholderTableMap =
    mockConfig.advancedSettings.tableMapping;

export const mock_config = mockConfig;

//////////////// HTTP TEST configs ////////////////
export const httptest_acme_mri_cdw_config = {
    config: {
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
                            defaultFilter:
                                "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M03'",
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
                                    expression: 'LEFT(@CODE."Value",3)',
                                    defaultFilter:
                                        "@CODE.\"AttributeValue\" = 'ICD_10'",
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
                                    defaultFilter:
                                        "@CODE.\"AttributeValue\" = 'LC_TYPE'",
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
                                    defaultFilter:
                                        "@TEXT.\"Attribute\" = 'INTERACTIONS_FREETEXT'",
                                    expression: '@TEXT."Value"',
                                    fuzziness: 0.8,
                                    order: 5,
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
                                    defaultFilter:
                                        "@CODE.\"AttributeValue\" = 'CHEMO_OPS'",
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
                                    defaultFilter:
                                        "@CODE.\"AttributeValue\" = 'CHEMO_PROT'",
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
                                    defaultFilter:
                                        "@CODE.\"AttributeValue\" = 'RADIO_OPS'",
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
                    defaultFilter:
                        "@INTERACTION.\"InteractionTypeValue\" = 'ACME_M16'",
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
                            defaultFilter:
                                '@PATIENT."BirthDate" <= @INTERACTION."PeriodEnd"',
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
                            defaultFilter:
                                "@CODE.\"AttributeValue\" = 'VITALSTATUS'",
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
                    referenceFilter:
                        "@REF.\"ConceptVocabularyID\"='HPH.MRI-YES-NO-CAT'",
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
                    referenceFilter:
                        "@REF.\"ConceptVocabularyID\"='HPH.MRI-GENDER-CAT'",
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
                    referenceFilter:
                        "@REF.\"ConceptVocabularyID\"='HPH.MRI-MONTHS-CAT'",
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
                "@INTERACTION": '"legacy.cdw.db.models::DWViews.Interactions"',
                "@OBS": '"legacy.cdw.db.models::DWViews.Observations"',
                "@CODE":
                    '"legacy.cdw.db.models::DWViewsEAV.Interaction_Details"',
                "@MEASURE":
                    '"legacy.cdw.db.models::DWViewsEAV.Interaction_Measures"',
                "@PATIENT": '"legacy.cdw.db.models::DWViews.Patient"',
                "@TEXT": '"legacy.cdw.db.models::DWViewsEAV.Interaction_Text"',
                "@REF": '"legacy.ots::Views.ConceptTerms"',
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
                normalizeCsvData: false,
                enableFreeText: true,
                freetextTempTable: '"legacy.cdw.db.models::Helper.TmpTextKeys"',
                genomicsEnabled: true,
                vbEnabled: true,
                afpEnabled: true,
                patientDataAccessLogging: false,
                dateFormat: "YYYY-MM-dd",
                timeFormat: "HH:mm:ss",
                csvDelimiter: ";",
                cdwValidationEnabled: true,
                otsTableMap: {
                    "@CODE":
                        '"legacy.cdw.db.models::DWViews.InteractionDetailsOTS"',
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
        filtercards: [
            {
                source: "patient",
                visible: true,
                order: 1,
                initial: true,
                attributes: [
                    {
                        source: "patient.attributes.pid",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 1,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Patient ID",
                    },
                    {
                        source: "patient.attributes.smoker",
                        ordered: false,
                        cached: true,
                        useRefText: true,
                        useRefValue: true,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 2,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Smoker",
                    },
                    {
                        source: "patient.attributes.pcount",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: false,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: false,
                            order: 3,
                        },
                        patientlist: {
                            initial: false,
                            visible: false,
                            linkColumn: false,
                        },
                        modelName: "Patient Count",
                    },
                    {
                        source: "patient.attributes.nationality",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Nationality",
                    },
                    {
                        source: "patient.attributes.firstName",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 5,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "First Name",
                    },
                    {
                        source: "patient.attributes.lastName",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 6,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Last Name",
                    },
                    {
                        source: "patient.attributes.gender",
                        ordered: false,
                        cached: true,
                        useRefText: true,
                        useRefValue: true,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 7,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Gender",
                    },
                    {
                        source: "patient.attributes.monthOfBirth",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 8,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Month of Birth",
                    },
                    {
                        source: "patient.attributes.yearOfBirth",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 9,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Year of Birth",
                    },
                    {
                        source: "patient.attributes.dateOfBirth",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 10,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Date of Birth",
                    },
                    {
                        source: "patient.attributes.dateOfDeath",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 11,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Date of Death",
                    },
                    {
                        source: "patient.attributes.biomarker",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 12,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Biomarker Type",
                    },
                ],
                modelName: "Basic Data",
            },
            {
                source: "patient.interactions.vStatus",
                visible: true,
                order: 2,
                initial: false,
                attributes: [
                    {
                        source: "patient.interactions.vStatus.attributes.age",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 1,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Age at Last Contact",
                    },
                    {
                        source: "patient.interactions.vStatus.attributes.calYear",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 2,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Start Year",
                    },
                    {
                        source: "patient.interactions.vStatus.attributes.status",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 3,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Vital Status",
                    },
                    {
                        source: "patient.interactions.vStatus.attributes.calMonth",
                        ordered: true,
                        cached: true,
                        useRefText: true,
                        useRefValue: true,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Start Month",
                    },
                    {
                        source: "patient.interactions.vStatus.attributes.year",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 5,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Year of Last Contact",
                    },
                    {
                        source: "patient.interactions.vStatus.attributes.start",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 6,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Start Date",
                    },
                    {
                        source: "patient.interactions.vStatus.attributes.end",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 7,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "End Date",
                    },
                ],
                modelName: "Vital Status",
            },
            {
                source: "patient.conditions.acme.interactions.priDiag",
                visible: true,
                order: 3,
                initial: false,
                attributes: [
                    {
                        source: "patient.conditions.acme.interactions.priDiag.attributes.calYear",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 1,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Start Year",
                    },
                    {
                        source: "patient.conditions.acme.interactions.priDiag.attributes.icd_10",
                        ordered: false,
                        cached: true,
                        useRefText: true,
                        useRefValue: true,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 2,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "ICD-10-CM Code",
                    },
                    {
                        source: "patient.conditions.acme.interactions.priDiag.attributes.calMonth",
                        ordered: true,
                        cached: true,
                        useRefText: true,
                        useRefValue: true,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 3,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Start Month",
                    },
                    {
                        source: "patient.conditions.acme.interactions.priDiag.attributes.start",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Start Date",
                    },
                    {
                        source: "patient.conditions.acme.interactions.priDiag.attributes.age",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 5,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Age at Diagnosis",
                    },
                    {
                        source: "patient.conditions.acme.interactions.priDiag.attributes.end",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 6,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "End Date",
                    },
                    {
                        source: "patient.conditions.acme.interactions.priDiag.attributes.nsclc",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 7,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Lung Cancer Subtype",
                    },
                    {
                        source: "patient.conditions.acme.interactions.priDiag.attributes.freetextDiag",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: false,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 8,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Diagnosis Free Text",
                    },
                ],
                modelName: "Primary Tumor Diagnosis",
            },
            {
                source: "patient.conditions.acme.interactions.chemo",
                visible: true,
                order: 4,
                initial: false,
                attributes: [
                    {
                        source: "patient.conditions.acme.interactions.chemo.attributes.interactionCount",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: false,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: false,
                            order: 1,
                        },
                        patientlist: {
                            initial: false,
                            visible: false,
                            linkColumn: false,
                        },
                        modelName: "Interaction Count",
                    },
                    {
                        source: "patient.conditions.acme.interactions.chemo.attributes.calYear",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 2,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Start Year",
                    },
                    {
                        source: "patient.conditions.acme.interactions.chemo.attributes.chemo_ops",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 3,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "OPS Code",
                    },
                    {
                        source: "patient.conditions.acme.interactions.chemo.attributes.calMonth",
                        ordered: true,
                        cached: true,
                        useRefText: true,
                        useRefValue: true,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Start Month",
                    },
                    {
                        source: "patient.conditions.acme.interactions.chemo.attributes.chemo_prot",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 5,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Protocol",
                    },
                    {
                        source: "patient.conditions.acme.interactions.chemo.attributes.start",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 6,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Start Date",
                    },
                    {
                        source: "patient.conditions.acme.interactions.chemo.attributes.interactionsPerPatient",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: false,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: false,
                            order: 7,
                        },
                        patientlist: {
                            initial: false,
                            visible: false,
                            linkColumn: false,
                        },
                        modelName: "Interactions per Patient",
                    },
                    {
                        source: "patient.conditions.acme.interactions.chemo.attributes.end",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 8,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "End Date",
                    },
                ],
                modelName: "Chemotherapy",
            },
            {
                source: "patient.conditions.acme.interactions.radio",
                visible: true,
                order: 5,
                initial: false,
                attributes: [
                    {
                        source: "patient.conditions.acme.interactions.radio.attributes.radio_dosage",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 1,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Radio Dosage (Gy)",
                    },
                    {
                        source: "patient.conditions.acme.interactions.radio.attributes.calYear",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 2,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Start Year",
                    },
                    {
                        source: "patient.conditions.acme.interactions.radio.attributes.radio_ops",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 3,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "OPS Code",
                    },
                    {
                        source: "patient.conditions.acme.interactions.radio.attributes.calMonth",
                        ordered: true,
                        cached: true,
                        useRefText: true,
                        useRefValue: true,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Start Month",
                    },
                    {
                        source: "patient.conditions.acme.interactions.radio.attributes.start",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 5,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Start Date",
                    },
                    {
                        source: "patient.conditions.acme.interactions.radio.attributes.end",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 6,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "End Date",
                    },
                ],
                modelName: "Radiotherapy",
            },
        ],
        chartOptions: {
            initialAttributes: {
                measures: ["patient.attributes.pcount"],
                categories: ["patient.attributes.gender"],
            },
            initialChart: "stacked",
            stacked: {
                visible: true,
                pdfDownloadEnabled: true,
                downloadEnabled: true,
                imageDownloadEnabled: true,
                collectionEnabled: true,
                beginVisible: true,
                fillMissingValuesEnabled: true,
                enabled: true,
            },
            boxplot: {
                visible: true,
                pdfDownloadEnabled: true,
                downloadEnabled: true,
                imageDownloadEnabled: true,
                collectionEnabled: true,
                beginVisible: true,
                fillMissingValuesEnabled: true,
            },
            km: {
                visible: true,
                pdfDownloadEnabled: true,
                downloadEnabled: true,
                imageDownloadEnabled: true,
                collectionEnabled: true,
                beginVisible: true,
                confidenceInterval: 1.95996398454,
                filters: [],
                selectedInteractions: [
                    "patient.interactions.vStatus",
                    "patient.conditions.acme.interactions.priDiag",
                    "patient.conditions.acme.interactions.chemo",
                    "patient.conditions.acme.interactions.radio",
                ],
                selectedEndInteractions: [],
            },
            list: {
                visible: true,
                zipDownloadEnabled: true,
                downloadEnabled: true,
                collectionEnabled: true,
                beginVisible: true,
                pageSize: 20,
            },
            vb: {
                visible: true,
                referenceName: "GRCh37",
                enabled: true,
            },
            minCohortSize: 0,
        },
        panelOptions: {
            addToCohorts: true,
            domainValuesLimit: 50,
            maxFiltercardCount: 10,
            calcViewAccessPoint: true,
            externalAccessPoints: true,
            cohortEntryExit: false,
        },
        configInformations: {
            note: "MRI configuration for HTTP integration tests",
        },
    },
    meta: {
        configId: "ABCD1234B",
        configVersion: "A",
        configStatus: "",
        configName: "OMOP_GDM_PA_CONF",
        configType: "HC/MRI/PA",
        dependentConfig: {
            configId: "ABCD1234A",
            configVersion: "1",
        },
        creator: "ALICE",
        created: "2021-09-15T15:30:54.000Z",
        modifier: "ALICE",
        modified: "2022-09-13T17:56:54.000Z",
    },
    schemaName: "",
};
export const httptest_groupedinteraction_mri_cdw_config = {
    config: {
        patient: {
            conditions: {},
            interactions: {
                Grouped_Interaction: {
                    name: [
                        {
                            lang: "",
                            value: "Grouped Interaction",
                        },
                    ],
                    defaultFilter:
                        "@INTERACTION.\"InteractionTypeValue\"='GROUP_ME'",
                    order: 0,
                    parentInteraction: [],
                    parentInteractionLabel: "parent",
                    attributes: {
                        Attribute: {
                            name: [
                                {
                                    lang: "",
                                    value: "Attribute",
                                },
                            ],
                            type: "text",
                            expression: '@CODE."Value"',
                            defaultFilter:
                                "@CODE.\"AttributeValue\" = 'GROUPING_ATTR_NAME'",
                            order: 0,
                            annotations: ["interaction_attribute_name"],
                        },
                        Value: {
                            name: [
                                {
                                    lang: "",
                                    value: "Value",
                                },
                            ],
                            type: "text",
                            expression: '@CODE."Value"',
                            defaultFilter:
                                "@CODE.\"AttributeValue\" = 'GROUPING_ATTR_VALUE'",
                            order: 1,
                            annotations: ["interaction_attribute_value"],
                        },
                        Value_2: {
                            name: [
                                {
                                    lang: "",
                                    value: "Value 2",
                                },
                            ],
                            type: "text",
                            expression: '@CODE."Value"',
                            defaultFilter:
                                "@CODE.\"AttributeValue\" = 'GROUPING_ATTR_VALUE_2'",
                            order: 1,
                            annotations: ["interaction_attribute_value"],
                        },
                        Group: {
                            name: [
                                {
                                    lang: "",
                                    value: "Group",
                                },
                            ],
                            type: "text",
                            expression: '@CODE."Value"',
                            defaultFilter:
                                "@CODE.\"AttributeValue\" = 'GROUP_BY_ATTR'",
                            order: 2,
                            annotations: ["interaction_grouping_attribute"],
                        },
                    },
                },
                dummy: {
                    name: [
                        {
                            lang: "",
                            value: "Dummy interaction for guarded patients",
                        },
                    ],
                    defaultFilter:
                        "@INTERACTION.\"InteractionTypeValue\"='DUMMY'",
                    order: 0,
                    parentInteraction: [],
                    parentInteractionLabel: "parent",
                    attributes: {},
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
                    order: 0,
                },
                pcount: {
                    name: [
                        {
                            lang: "",
                            value: "Patient count",
                        },
                        {
                            lang: "en",
                            value: "Patient count",
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
                    order: 1,
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
                    order: 2,
                },
                firstName: {
                    name: [
                        {
                            lang: "",
                            value: "First name",
                        },
                        {
                            lang: "en",
                            value: "First name",
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
                    order: 2,
                },
                lastName: {
                    name: [
                        {
                            lang: "",
                            value: "Last name",
                        },
                        {
                            lang: "en",
                            value: "Last name",
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
                    order: 2,
                },
                start: {
                    name: [
                        {
                            lang: "",
                            value: "Start",
                        },
                        {
                            lang: "en",
                            value: "Start",
                        },
                        {
                            lang: "de",
                            value: "Start",
                        },
                        {
                            lang: "fr",
                            value: "Date de Début",
                        },
                    ],
                    type: "time",
                    expression: '@INTERACTION."PeriodStart"',
                    order: 0,
                    isDefault: true,
                },
                end: {
                    name: [
                        {
                            lang: "",
                            value: "End",
                        },
                        {
                            lang: "en",
                            value: "End",
                        },
                        {
                            lang: "de",
                            value: "Ende",
                        },
                        {
                            lang: "fr",
                            value: "Date de Fin",
                        },
                    ],
                    type: "time",
                    expression: '@INTERACTION."PeriodEnd"',
                    order: 1,
                    isDefault: true,
                },
            },
        },
        mapping: {},
        censor: {},
        advancedSettings: {
            tableMapping: {
                "@INTERACTION": '"legacy.cdw.db.models::DWViews.Interactions"',
                "@OBS": '"legacy.cdw.db.models::DWViews.Observations"',
                "@CODE":
                    '"legacy.cdw.db.models::DWViewsEAV.Interaction_Details"',
                "@MEASURE":
                    '"legacy.cdw.db.models::DWViewsEAV.Interaction_Measures"',
                "@PATIENT": '"legacy.cdw.db.models::DWViews.Patient"',
                "@TEXT": '"legacy.cdw.db.models::DWViewsEAV.Interaction_Text"',
                "@REF": '"legacy.ots::Views.ConceptTerms"',
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
            tableTypePlaceholderMap: {
                factTable: {
                    placeholder: "@PATIENT",
                    attributeTables: [
                        {
                            placeholder: "@OBS",
                            oneToN: true,
                        },
                    ],
                },
                dimTables: [
                    {
                        placeholder: "@INTERACTION",
                        hierarchy: true,
                        time: true,
                        oneToN: true,
                        attributeTables: [
                            {
                                placeholder: "@CODE",
                                oneToN: true,
                            },
                            {
                                placeholder: "@MEASURE",
                                oneToN: true,
                            },
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
                normalizeCsvData: false,
                enableFreeText: true,
                freetextTempTable: '"legacy.cdw.db.models::Helper.TmpTextKeys"',
                genomicsEnabled: true,
                vbEnabled: true,
                afpEnabled: true,
                patientDataAccessLogging: false,
                dateFormat: "YYYY-MM-dd",
                timeFormat: "HH:mm:ss",
                csvDelimiter: ";",
                cdwValidationEnabled: true,
                otsTableMap: {
                    "@CODE":
                        '"legacy.cdw.db.models::DWViews.InteractionDetailsOTS"',
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
        filtercards: [
            {
                source: "patient",
                visible: true,
                order: 1,
                initial: true,
                attributes: [
                    {
                        source: "patient.attributes.pid",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 1,
                        },
                        patientlist: {
                            initial: true,
                            visible: true,
                            linkColumn: true,
                            order: 0,
                        },
                        modelName: "Patient ID",
                    },
                    {
                        source: "patient.attributes.pcount",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: false,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: false,
                            order: 2,
                        },
                        patientlist: {
                            initial: false,
                            visible: false,
                            linkColumn: false,
                        },
                        modelName: "Patient count",
                    },
                    {
                        source: "patient.attributes.gender",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 3,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Gender",
                    },
                    {
                        source: "patient.attributes.firstName",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: true,
                            visible: true,
                            linkColumn: false,
                            order: 1,
                        },
                        modelName: "First name",
                    },
                    {
                        source: "patient.attributes.lastName",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 5,
                        },
                        patientlist: {
                            initial: true,
                            visible: true,
                            linkColumn: false,
                            order: 2,
                        },
                        modelName: "Last name",
                    },
                ],
                modelName: "Basic Data",
            },
            {
                source: "patient.interactions.Grouped_Interaction",
                visible: true,
                order: 2,
                initial: false,
                attributes: [
                    {
                        source: "patient.interactions.Grouped_Interaction.attributes.Attribute",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 1,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Attribute",
                    },
                    {
                        source: "patient.interactions.Grouped_Interaction.attributes.start",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 2,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Start",
                    },
                    {
                        source: "patient.interactions.Grouped_Interaction.attributes.Value",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 3,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Value",
                    },
                    {
                        source: "patient.interactions.Grouped_Interaction.attributes.end",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "End",
                    },
                    {
                        source: "patient.interactions.Grouped_Interaction.attributes.Group",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 5,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Group",
                    },
                ],
                modelName: "Grouped Interaction",
            },
        ],
        chartOptions: {
            initialAttributes: {
                measures: ["patient.attributes.pcount"],
                categories: ["patient.attributes.gender"],
            },
            initialChart: "stacked",
            stacked: {
                visible: true,
                pdfDownloadEnabled: true,
                downloadEnabled: true,
                imageDownloadEnabled: true,
                collectionEnabled: true,
                beginVisible: true,
                fillMissingValuesEnabled: true,
            },
            boxplot: {
                visible: true,
                pdfDownloadEnabled: true,
                downloadEnabled: true,
                imageDownloadEnabled: true,
                collectionEnabled: true,
                beginVisible: true,
                fillMissingValuesEnabled: true,
            },
            km: {
                visible: true,
                pdfDownloadEnabled: true,
                downloadEnabled: true,
                imageDownloadEnabled: true,
                collectionEnabled: true,
                beginVisible: true,
                confidenceInterval: 1.95996398454,
                filters: [],
                selectedInteractions: [],
                selectedEndInteractions: [],
            },
            list: {
                visible: true,
                zipDownloadEnabled: true,
                downloadEnabled: true,
                collectionEnabled: true,
                beginVisible: true,
                pageSize: 20,
            },
            vb: {
                visible: true,
                referenceName: "GRCh37",
                enabled: true,
            },
            minCohortSize: 0,
        },
        panelOptions: {
            addToCohorts: true,
            domainValuesLimit: 50,
            maxFiltercardCount: 10,
            calcViewAccessPoint: true,
            externalAccessPoints: true,
            cohortEntryExit: false,
        },
        configInformations: {
            note: "MRI configuration for HTTP integration tests",
        },
    },
    meta: {
        configId: "GROUP_INTB",
        configVersion: "A",
        configStatus: "",
        configName: "OMOP_GDM_PA_CONF",
        configType: "HC/MRI/PA",
        dependentConfig: {
            configId: "GROUP_INTA",
            configVersion: "1",
        },
        creator: "ALICE",
        created: "2021-09-15T15:30:54.000Z",
        modifier: "ALICE",
        modified: "2022-09-13T17:56:54.000Z",
    },
    schemaName: "",
};
export const httptest_test_mri_cdw_config = {
    config: {
        censor: {},
        mapping: {},
        patient: {
            attributes: {
                pid: {
                    name: [
                        {
                            lang: "",
                            value: "Patient ID",
                        },
                    ],
                    type: "text",
                    expression: '@PATIENT."PatientID"',
                    annotations: ["patient_id"],
                },
                lastName: {
                    name: [
                        {
                            lang: "",
                            value: "Last name",
                        },
                    ],
                    type: "text",
                    expression: '@PATIENT."FamilyName"',
                },
                multiple_birth_order: {
                    name: [
                        {
                            lang: "",
                            value: "Multiple birth order",
                        },
                    ],
                    type: "num",
                    expression: '@PATIENT."MultipleBirthOrder"',
                },
                dateOfBirth: {
                    name: [
                        {
                            lang: "",
                            value: "Date of Birth",
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
                    ],
                    type: "time",
                    expression: '@PATIENT."DeceasedDate"',
                    annotations: ["date_of_death"],
                },
                obs_char: {
                    name: [
                        {
                            lang: "",
                            value: "Patient observation text value",
                        },
                    ],
                    type: "text",
                    defaultFilter: "@OBS.\"ObsType\" = 'TEST_OBS1'",
                    expression: '@OBS."ObsCharValue"',
                },
                obs_num: {
                    name: [
                        {
                            lang: "",
                            value: "Observation numerical value",
                        },
                    ],
                    type: "num",
                    defaultFilter: "@OBS.\"ObsType\" = 'TEST_OBS2'",
                    expression: '@OBS."ObsNumValue"',
                },
                obs_unit: {
                    name: [
                        {
                            lang: "",
                            value: "Observation unit of measurement",
                        },
                    ],
                    type: "text",
                    defaultFilter: "@OBS.\"ObsType\" = 'TEST_OBS3'",
                    expression: '@OBS."ObsUnit"',
                },
                obs_time: {
                    name: [
                        {
                            lang: "",
                            value: "Observation time",
                        },
                    ],
                    type: "time",
                    defaultFilter: "@OBS.\"ObsType\" = 'TEST_OBS4'",
                    expression: '@OBS."ObsTime"',
                },
                pcount: {
                    name: [
                        {
                            lang: "",
                            value: "Patient Count",
                        },
                    ],
                    type: "num",
                    measureExpression: 'COUNT(DISTINCT(@PATIENT."PatientID"))',
                },
                start: {
                    name: [
                        {
                            lang: "",
                            value: "Start",
                        },
                    ],
                    type: "time",
                    expression: '@INTERACTION."PeriodStart"',
                    order: 0,
                    isDefault: true,
                },
                end: {
                    name: [
                        {
                            lang: "",
                            value: "End",
                        },
                    ],
                    type: "time",
                    expression: '@INTERACTION."PeriodEnd"',
                    order: 1,
                    isDefault: true,
                },
            },
            interactions: {
                patient_interaction_1: {
                    name: [
                        {
                            lang: "",
                            value: "Patient interaction 1",
                        },
                    ],
                    defaultFilter:
                        "@INTERACTION.\"InteractionTypeValue\" = 'PI1'",
                    attributes: {
                        char_attr: {
                            name: [
                                {
                                    lang: "",
                                    value: "Text attribute",
                                },
                            ],
                            type: "text",
                            defaultFilter:
                                "@CODE.\"AttributeValue\" = 'PI1_CHAR_ATTR'",
                            expression: '@CODE."Value"',
                        },
                        num_attr: {
                            name: [
                                {
                                    lang: "",
                                    value: "Numerical attribute value",
                                },
                            ],
                            type: "num",
                            defaultFilter:
                                "@MEASURE.\"AttributeValue\" = 'PI1_NUM_ATTR'",
                            expression: '@MEASURE."Value"',
                        },
                        num_attr_unit: {
                            name: [
                                {
                                    lang: "",
                                    value: "Numerical attribute unit",
                                },
                            ],
                            type: "text",
                            defaultFilter:
                                "@MEASURE.\"AttributeValue\" = 'PI1_NUM_ATTR'",
                            expression: '@MEASURE."Unit"',
                        },
                        freetext_attr: {
                            name: [
                                {
                                    lang: "",
                                    value: "Freetext attribute",
                                },
                            ],
                            type: "freetext",
                            defaultFilter:
                                "@TEXT.\"Attribute\" = 'PI1_FREETEXT_ATTR'",
                            expression: '@TEXT."Value"',
                        },
                    },
                },
                patient_interaction_2: {
                    name: [
                        {
                            lang: "",
                            value: "Patient interaction 2",
                        },
                    ],
                    defaultFilter:
                        "@INTERACTION.\"InteractionTypeValue\" = 'PI2'",
                    attributes: {
                        char_attr: {
                            name: [
                                {
                                    lang: "",
                                    value: "Text attribute",
                                },
                            ],
                            type: "text",
                            defaultFilter:
                                "@CODE.\"AttributeValue\" = 'PI2_CHAR_ATTR'",
                            expression: '@CODE."Value"',
                        },
                        num_attr: {
                            name: [
                                {
                                    lang: "",
                                    value: "Numerical attribute value",
                                },
                            ],
                            type: "num",
                            defaultFilter:
                                "@MEASURE.\"AttributeValue\" = 'PI2_NUM_ATTR'",
                            expression: '@MEASURE."Value"',
                        },
                        num_attr_unit: {
                            name: [
                                {
                                    lang: "",
                                    value: "Numerical attribute unit",
                                },
                            ],
                            type: "text",
                            defaultFilter:
                                "@MEASURE.\"AttributeValue\" = 'PI2_NUM_ATTR'",
                            expression: '@MEASURE."Unit"',
                        },
                        freetext_attr: {
                            name: [
                                {
                                    lang: "",
                                    value: "Freetext attribute",
                                },
                            ],
                            type: "freetext",
                            defaultFilter:
                                "@TEXT.\"Attribute\" = 'PI2_FREETEXT_ATTR'",
                            expression: '@TEXT."Value"',
                            fuzziness: 0.8,
                        },
                    },
                },
            },
            conditions: {
                condition_a: {
                    name: "Condition A",
                    interactions: {
                        cond_a_interaction_1: {
                            name: [
                                {
                                    lang: "",
                                    value: "Condition A interaction 1",
                                },
                            ],
                            defaultFilter:
                                "@INTERACTION.\"InteractionTypeValue\" = 'CAI1'",
                            attributes: {
                                char_attr: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Text attribute",
                                        },
                                    ],
                                    type: "text",
                                    defaultFilter:
                                        "@CODE.\"AttributeValue\" = 'CAI1_CHAR_ATTR'",
                                    expression: '@CODE."Value"',
                                    order: 1,
                                },
                                num_attr: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Numerical attribute value",
                                        },
                                    ],
                                    type: "num",
                                    defaultFilter:
                                        "@MEASURE.\"AttributeValue\" = 'CAI1_NUM_ATTR'",
                                    expression: '@MEASURE."Value"',
                                    order: 2,
                                },
                                num_attr_unit: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Numerical attribute unit",
                                        },
                                    ],
                                    type: "text",
                                    defaultFilter:
                                        "@MEASURE.\"AttributeValue\" = 'CAI1_NUM_ATTR'",
                                    expression: '@MEASURE."Unit"',
                                    order: 3,
                                },
                                freetext_attr: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Freetext attribute",
                                        },
                                    ],
                                    type: "freetext",
                                    defaultFilter:
                                        "@TEXT.\"Attribute\" = 'CAI1_FREETEXT_ATTR'",
                                    expression: '@TEXT."Value"',
                                    fuzziness: 0.8,
                                    order: 4,
                                },
                            },
                        },
                        cond_a_interaction_2: {
                            name: [
                                {
                                    lang: "",
                                    value: "Condition A interaction 2",
                                },
                            ],
                            defaultFilter:
                                "@INTERACTION.\"InteractionTypeValue\" = 'CAI2'",
                            attributes: {
                                char_attr: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Text attribute",
                                        },
                                    ],
                                    type: "text",
                                    defaultFilter:
                                        "@CODE.\"AttributeValue\" = 'CAI2_CHAR_ATTR'",
                                    expression: '@CODE."Value"',
                                    order: 1,
                                },
                                num_attr: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Numerical attribute value",
                                        },
                                    ],
                                    type: "num",
                                    defaultFilter:
                                        "@MEASURE.\"AttributeValue\" = 'CAI2_NUM_ATTR'",
                                    expression: '@MEASURE."Value"',
                                    order: 2,
                                },
                                num_attr_unit: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Numerical attribute unit",
                                        },
                                    ],
                                    type: "text",
                                    defaultFilter:
                                        "@MEASURE.\"AttributeValue\" = 'CAI2_NUM_ATTR'",
                                    expression: '@MEASURE."Unit"',
                                    order: 3,
                                },
                                freetext_attr: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Freetext attribute",
                                        },
                                    ],
                                    type: "freetext",
                                    defaultFilter:
                                        "@TEXT.\"Attribute\" = 'CAI2_FREETEXT_ATTR'",
                                    expression: '@TEXT."Value"',
                                    fuzziness: 0.8,
                                    order: 4,
                                },
                            },
                        },
                    },
                },
                condition_b: {
                    name: "Condition B",
                    interactions: {
                        cond_b_interaction_1: {
                            name: [
                                {
                                    lang: "",
                                    value: "Condition B interaction 1",
                                },
                            ],
                            defaultFilter:
                                "@INTERACTION.\"InteractionTypeValue\" = 'CBI1'",
                            attributes: {
                                char_attr: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Text attribute",
                                        },
                                    ],
                                    type: "text",
                                    defaultFilter:
                                        "@CODE.\"AttributeValue\" = 'CBI1_CHAR_ATTR'",
                                    expression: '@CODE."Value"',
                                    order: 1,
                                },
                                num_attr: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Numerical attribute value",
                                        },
                                    ],
                                    type: "num",
                                    defaultFilter:
                                        "@MEASURE.\"AttributeValue\" = 'CBI1_NUM_ATTR'",
                                    expression: '@MEASURE."Value"',
                                    order: 2,
                                },
                                num_attr_unit: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Numerical attribute unit",
                                        },
                                    ],
                                    type: "text",
                                    defaultFilter:
                                        "@MEASURE.\"AttributeValue\" = 'CBI1_NUM_ATTR'",
                                    expression: '@MEASURE."Unit"',
                                    order: 3,
                                },
                                freetext_attr: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Freetext attribute",
                                        },
                                    ],
                                    type: "freetext",
                                    defaultFilter:
                                        "@TEXT.\"Attribute\" = 'CBI1_FREETEXT_ATTR'",
                                    expression: '@TEXT."Value"',
                                    fuzziness: 0.8,
                                    order: 4,
                                },
                            },
                        },
                        cond_b_interaction_2: {
                            name: [
                                {
                                    lang: "",
                                    value: "Condition B interaction 2",
                                },
                            ],
                            defaultFilter:
                                "@INTERACTION.\"InteractionTypeValue\" = 'CBI2'",
                            attributes: {
                                char_attr: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Text attribute",
                                        },
                                    ],
                                    type: "text",
                                    defaultFilter:
                                        "@CODE.\"AttributeValue\" = 'CBI2_CHAR_ATTR'",
                                    expression: '@CODE."Value"',
                                    order: 1,
                                },
                                num_attr: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Numerical attribute value",
                                        },
                                    ],
                                    type: "num",
                                    defaultFilter:
                                        "@MEASURE.\"AttributeValue\" = 'CBI2_NUM_ATTR'",
                                    expression: '@MEASURE."Value"',
                                    order: 2,
                                },
                                num_attr_unit: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Numerical attribute unit",
                                        },
                                    ],
                                    type: "text",
                                    defaultFilter:
                                        "@MEASURE.\"AttributeValue\" = 'CBI2_NUM_ATTR'",
                                    expression: '@MEASURE."Unit"',
                                    order: 3,
                                },
                                freetext_attr: {
                                    name: [
                                        {
                                            lang: "",
                                            value: "Freetext attribute",
                                        },
                                    ],
                                    type: "freetext",
                                    defaultFilter:
                                        "@TEXT.\"Attribute\" = 'CBI2_FREETEXT_ATTR'",
                                    expression: '@TEXT."Value"',
                                    fuzziness: 0.8,
                                    order: 4,
                                },
                            },
                        },
                    },
                },
            },
        },
        advancedSettings: {
            tableMapping: {
                "@INTERACTION": '"legacy.cdw.db.models::DWViews.Interactions"',
                "@OBS": '"legacy.cdw.db.models::DWViews.Observations"',
                "@CODE":
                    '"legacy.cdw.db.models::DWViewsEAV.Interaction_Details"',
                "@MEASURE":
                    '"legacy.cdw.db.models::DWViewsEAV.Interaction_Measures"',
                "@PATIENT": '"legacy.cdw.db.models::DWViews.Patient"',
                "@TEXT": '"legacy.cdw.db.models::DWViewsEAV.Interaction_Text"',
                "@REF": '"legacy.ots::Views.ConceptTerms"',
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
            tableTypePlaceholderMap: {
                factTable: {
                    placeholder: "@PATIENT",
                    attributeTables: [
                        {
                            placeholder: "@OBS",
                            oneToN: true,
                        },
                    ],
                },
                dimTables: [
                    {
                        placeholder: "@INTERACTION",
                        hierarchy: true,
                        time: true,
                        oneToN: true,
                        attributeTables: [
                            {
                                placeholder: "@CODE",
                                oneToN: true,
                            },
                            {
                                placeholder: "@MEASURE",
                                oneToN: true,
                            },
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
                normalizeCsvData: false,
                enableFreeText: true,
                freetextTempTable: '"legacy.cdw.db.models::Helper.TmpTextKeys"',
                genomicsEnabled: true,
                vbEnabled: true,
                afpEnabled: true,
                patientDataAccessLogging: false,
                dateFormat: "YYYY-MM-dd",
                timeFormat: "HH:mm:ss",
                csvDelimiter: ";",
                cdwValidationEnabled: true,
                otsTableMap: {
                    "@CODE":
                        '"legacy.cdw.db.models::DWViews.InteractionDetailsOTS"',
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
        filtercards: [
            {
                source: "patient",
                visible: true,
                order: 1,
                initial: true,
                attributes: [
                    {
                        source: "patient.attributes.pid",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 1,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                            order: 0,
                        },
                        modelName: "Patient ID",
                    },
                    {
                        source: "patient.attributes.lastName",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 2,
                        },
                        patientlist: {
                            initial: true,
                            visible: true,
                            linkColumn: true,
                            order: 1,
                        },
                        modelName: "Last name",
                    },
                    {
                        source: "patient.attributes.multiple_birth_order",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 3,
                        },
                        patientlist: {
                            initial: true,
                            visible: true,
                            linkColumn: false,
                            order: 3,
                        },
                        defaultBinSize: 2,
                        modelName: "Multiple birth order",
                    },
                    {
                        source: "patient.attributes.dateOfBirth",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: true,
                            visible: true,
                            linkColumn: false,
                            order: 2,
                        },
                        modelName: "Date of Birth",
                    },
                    {
                        source: "patient.attributes.dateOfDeath",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 5,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Date of Death",
                    },
                    {
                        source: "patient.attributes.obs_char",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 6,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Patient observation text value",
                    },
                    {
                        source: "patient.attributes.obs_num",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 7,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        defaultBinSize: 2,
                        modelName: "Observation numerical value",
                    },
                    {
                        source: "patient.attributes.obs_unit",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 8,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Observation unit of measurement",
                    },
                    {
                        source: "patient.attributes.obs_time",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 9,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Observation time",
                    },
                    {
                        source: "patient.attributes.pcount",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: false,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: false,
                            order: 10,
                        },
                        patientlist: {
                            initial: false,
                            visible: false,
                            linkColumn: false,
                        },
                        modelName: "Patient Count",
                    },
                ],
                modelName: "Basic Data",
            },
            {
                source: "patient.interactions.patient_interaction_1",
                visible: true,
                order: 2,
                initial: true,
                attributes: [
                    {
                        source: "patient.interactions.patient_interaction_1.attributes.char_attr",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: true,
                            visible: true,
                            order: 1,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                            order: 3,
                        },
                        modelName: "Text attribute",
                    },
                    {
                        source: "patient.interactions.patient_interaction_1.attributes.num_attr",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 2,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Numerical attribute value",
                    },
                    {
                        source: "patient.interactions.patient_interaction_1.attributes.num_attr_unit",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 3,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Numerical attribute unit",
                    },
                    {
                        source: "patient.interactions.patient_interaction_1.attributes.freetext_attr",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: false,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Freetext attribute",
                    },
                ],
                modelName: "Patient interaction 1",
            },
            {
                source: "patient.interactions.patient_interaction_2",
                visible: true,
                order: 3,
                initial: false,
                attributes: [
                    {
                        source: "patient.interactions.patient_interaction_2.attributes.char_attr",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 1,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Text attribute",
                    },
                    {
                        source: "patient.interactions.patient_interaction_2.attributes.num_attr",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 2,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Numerical attribute value",
                    },
                    {
                        source: "patient.interactions.patient_interaction_2.attributes.num_attr_unit",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 3,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Numerical attribute unit",
                    },
                    {
                        source: "patient.interactions.patient_interaction_2.attributes.freetext_attr",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: false,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Freetext attribute",
                    },
                ],
                modelName: "Patient interaction 2",
            },
            {
                source: "patient.conditions.condition_a.interactions.cond_a_interaction_1",
                visible: true,
                order: 4,
                initial: false,
                attributes: [
                    {
                        source: "patient.conditions.condition_a.interactions.cond_a_interaction_1.attributes.char_attr",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 1,
                        },
                        patientlist: {
                            initial: true,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Text attribute",
                    },
                    {
                        source: "patient.conditions.condition_a.interactions.cond_a_interaction_1.attributes.num_attr",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 2,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Numerical attribute value",
                    },
                    {
                        source: "patient.conditions.condition_a.interactions.cond_a_interaction_1.attributes.num_attr_unit",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 3,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Numerical attribute unit",
                    },
                    {
                        source: "patient.conditions.condition_a.interactions.cond_a_interaction_1.attributes.freetext_attr",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: false,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Freetext attribute",
                    },
                ],
                modelName: "Condition A interaction 1",
            },
            {
                source: "patient.conditions.condition_a.interactions.cond_a_interaction_2",
                visible: true,
                order: 5,
                initial: false,
                attributes: [
                    {
                        source: "patient.conditions.condition_a.interactions.cond_a_interaction_2.attributes.char_attr",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 1,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Text attribute",
                    },
                    {
                        source: "patient.conditions.condition_a.interactions.cond_a_interaction_2.attributes.num_attr",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 2,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Numerical attribute value",
                    },
                    {
                        source: "patient.conditions.condition_a.interactions.cond_a_interaction_2.attributes.num_attr_unit",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 3,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Numerical attribute unit",
                    },
                    {
                        source: "patient.conditions.condition_a.interactions.cond_a_interaction_2.attributes.freetext_attr",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: false,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Freetext attribute",
                    },
                ],
                modelName: "Condition A interaction 2",
            },
            {
                source: "patient.conditions.condition_b.interactions.cond_b_interaction_1",
                visible: true,
                order: 6,
                initial: false,
                attributes: [
                    {
                        source: "patient.conditions.condition_b.interactions.cond_b_interaction_1.attributes.char_attr",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 1,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Text attribute",
                    },
                    {
                        source: "patient.conditions.condition_b.interactions.cond_b_interaction_1.attributes.num_attr",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 2,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Numerical attribute value",
                    },
                    {
                        source: "patient.conditions.condition_b.interactions.cond_b_interaction_1.attributes.num_attr_unit",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 3,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Numerical attribute unit",
                    },
                    {
                        source: "patient.conditions.condition_b.interactions.cond_b_interaction_1.attributes.freetext_attr",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: false,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Freetext attribute",
                    },
                ],
                modelName: "Condition B interaction 1",
            },
            {
                source: "patient.conditions.condition_b.interactions.cond_b_interaction_2",
                visible: true,
                order: 7,
                initial: false,
                attributes: [
                    {
                        source: "patient.conditions.condition_b.interactions.cond_b_interaction_2.attributes.char_attr",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 1,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Text attribute",
                    },
                    {
                        source: "patient.conditions.condition_b.interactions.cond_b_interaction_2.attributes.num_attr",
                        ordered: true,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: true,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 2,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Numerical attribute value",
                    },
                    {
                        source: "patient.conditions.condition_b.interactions.cond_b_interaction_2.attributes.num_attr_unit",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: true,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 3,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Numerical attribute unit",
                    },
                    {
                        source: "patient.conditions.condition_b.interactions.cond_b_interaction_2.attributes.freetext_attr",
                        ordered: false,
                        cached: true,
                        useRefText: false,
                        useRefValue: false,
                        category: false,
                        measure: false,
                        filtercard: {
                            initial: false,
                            visible: true,
                            order: 4,
                        },
                        patientlist: {
                            initial: false,
                            visible: true,
                            linkColumn: false,
                        },
                        modelName: "Freetext attribute",
                    },
                ],
                modelName: "Condition B interaction 2",
            },
        ],
        chartOptions: {
            initialAttributes: {
                measures: ["patient.attributes.pcount"],
                categories: [
                    "patient.interactions.patient_interaction_1.attributes.char_attr",
                ],
            },
            initialChart: "stacked",
            stacked: {
                visible: true,
                pdfDownloadEnabled: true,
                downloadEnabled: true,
                imageDownloadEnabled: true,
                collectionEnabled: true,
                beginVisible: true,
                fillMissingValuesEnabled: true,
                enabled: true,
            },
            boxplot: {
                visible: true,
                pdfDownloadEnabled: true,
                downloadEnabled: true,
                imageDownloadEnabled: true,
                collectionEnabled: true,
                beginVisible: true,
                fillMissingValuesEnabled: true,
            },
            km: {
                visible: true,
                pdfDownloadEnabled: true,
                downloadEnabled: true,
                imageDownloadEnabled: true,
                collectionEnabled: true,
                beginVisible: true,
                confidenceInterval: 1.95996398454,
                filters: [],
                selectedInteractions: [],
                selectedEndInteractions: [],
            },
            list: {
                visible: true,
                zipDownloadEnabled: true,
                downloadEnabled: true,
                collectionEnabled: true,
                beginVisible: true,
                pageSize: 20,
            },
            vb: {
                visible: false,
                referenceName: "GRCh37",
                enabled: true,
            },
            minCohortSize: 0,
        },
        panelOptions: {
            addToCohorts: true,
            domainValuesLimit: 50,
            maxFiltercardCount: 10,
            calcViewAccessPoint: true,
            externalAccessPoints: true,
            cohortEntryExit: false,
        },
    },
    meta: {
        configId: "4321DCBAB",
        configVersion: "A",
        configStatus: "",
        configName: "OMOP_GDM_PA_CONF",
        configType: "HC/MRI/PA",
        dependentConfig: {
            configId: "4321DCBAA",
            configVersion: "1",
        },
        creator: "ALICE",
        created: "2021-09-15T15:30:54.000Z",
        modifier: "ALICE",
        modified: "2022-09-13T17:56:54.000Z",
    },
    schemaName: "",
};
