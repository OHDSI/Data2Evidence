export let config = {
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
                                isFreeText: false
                            },
                            nsclc: {
                                name: "Lung Cancer Subtype",
                                type: "text",
                                expression: "@CODE.VALUE",
                                defaultFilter: "@CODE.ATTRIBUTE = 'LC_TYPE'",
                                id: "6ef81fd7-a0e8-4db7-9697-6b1d5efab17b",
                                isFreeText: false
                            },
                            age: {
                                name: "Age at Diagnosis",
                                type: "num",
                                expression: "TO_INTEGER(DAYS_BETWEEN(@PATIENT.DOB,@INTERACTION.\"END\") / 365)",
                                defaultFilter: "@PATIENT.DOB <= @INTERACTION.\"END\"",
                                id: "ee531fc9-4c49-44ba-9e14-ff8b5c7ae05c",
                                isFreeText: false
                            },
                            calYear: {
                                name: "Year",
                                type: "text",
                                expression: "YEAR(@INTERACTION.\"START\")",
                                default: "Y",
                                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                                isFreeText: false
                            },
                            calMonth: {
                                name: "Month",
                                type: "text",
                                expression: "MONTH(@INTERACTION.\"START\")",
                                default: "Y",
                                id: "58141f22-874a-4012-a273-4913b60a392f",
                                isFreeText: false
                            },
                            freetext: {
                                isFreeText: true
                            },
                            _absTime: {
                                isIntTime: true,
                                isFreeText: false
                            },
                            _succ: {
                                isRelTime: true,
                                isFreeText: false
                            }
                        }
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
                                isFreeText: false
                            },
                            tnmN: {
                                name: "N-Component",
                                type: "text",
                                expression: "'N' || @CODE.VALUE",
                                defaultFilter: "@CODE.ATTRIBUTE = 'TNM_N'",
                                id: "7ef49c48-a0b6-4fac-8b09-91941dd8de57",
                                isFreeText: false
                            },
                            tnmM: {
                                name: "M-Component",
                                type: "text",
                                expression: "'M' || @CODE.VALUE",
                                defaultFilter: "@CODE.ATTRIBUTE = 'TNM_M'",
                                id: "021487c8-9181-484f-b8bb-ea6c670a0b7c",
                                isFreeText: false
                            },
                            calYear: {
                                name: "Year",
                                type: "text",
                                expression: "YEAR(@INTERACTION.\"START\")",
                                default: "Y",
                                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                                isFreeText: false
                            },
                            calMonth: {
                                name: "Month",
                                type: "text",
                                expression: "MONTH(@INTERACTION.\"START\")",
                                default: "Y",
                                id: "58141f22-874a-4012-a273-4913b60a392f",
                                isFreeText: false
                            },
                            freetext: {
                                isFreeText: true
                            },
                            _absTime: {
                                isIntTime: true,
                                isFreeText: false
                            },
                            _succ: {
                                isRelTime: true,
                                isFreeText: false
                            }
                        }
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
                                isFreeText: false
                            },
                            chemo_prot: {
                                name: "Protocol",
                                type: "text",
                                defaultFilter: "@CODE.ATTRIBUTE = 'CHEMO_PROT'",
                                expression: "@CODE.VALUE",
                                new_definition: "",
                                id: "b6a6d715-4ebe-498c-a895-0a4cf0f61369",
                                isFreeText: false
                            },
                            calYear: {
                                name: "Year",
                                type: "text",
                                expression: "YEAR(@INTERACTION.\"START\")",
                                default: "Y",
                                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                                isFreeText: false
                            },
                            calMonth: {
                                name: "Month",
                                type: "text",
                                expression: "MONTH(@INTERACTION.\"START\")",
                                default: "Y",
                                id: "58141f22-874a-4012-a273-4913b60a392f",
                                isFreeText: false
                            },
                            freetext: {
                                isFreeText: true
                            },
                            _absTime: {
                                isIntTime: true,
                                isFreeText: false
                            },
                            _succ: {
                                isRelTime: true,
                                isFreeText: false
                            },
                            interactionCount: {
                                name: "interaction count",
                                type: "num",
                                measureExpression: "COUNT(DISTINCT @INTERACTION.INTERACTION_ID)"
                            }
                        }
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
                                isFreeText: false
                            },
                            radio_dosage: {
                                name: "Radio Dosage",
                                type: "text",
                                defaultFilter: "@MEASURE.ATTRIBUTE = 'DOSAGE'",
                                expression: "TO_NVARCHAR(@MEASURE.VALUE) || ' ' || @MEASURE.UNIT",
                                id: "ea9b537c-fc76-4ee8-a00d-176016e3531f",
                                isFreeText: false
                            },
                            radio_dosage_value: {
                                name: "Radio Dosage Value (in Gy)",
                                type: "num",
                                defaultFilter: "@MEASURE.ATTRIBUTE = 'DOSAGE'",
                                expression: "@MEASURE.VALUE",
                                id: "ef9b888c-fc76-4ee8-a00d-176016e3531f",
                                isFreeText: false
                            },
                            calYear: {
                                name: "Year",
                                type: "text",
                                expression: "YEAR(@INTERACTION.\"START\")",
                                default: "Y",
                                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                                isFreeText: false
                            },
                            calMonth: {
                                name: "Month",
                                type: "text",
                                expression: "MONTH(@INTERACTION.\"START\")",
                                default: "Y",
                                id: "58141f22-874a-4012-a273-4913b60a392f",
                                isFreeText: false
                            },
                            freetext: {
                                isFreeText: true
                            },
                            _absTime: {
                                isIntTime: true,
                                isFreeText: false
                            },
                            _succ: {
                                isRelTime: true,
                                isFreeText: false
                            }
                        }
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
                                isFreeText: false
                            },
                            exist: {
                                name: "Exist",
                                type: "text",
                                expression: "CASE WHEN @INTERACTION.INTERACTION_ID IS NULL THEN NULL ELSE 'YES' END",
                                id: "e8c181f3-e454-45fb-9b2d-9d18e6c0189c",
                                isFreeText: false
                            },
                            calYear: {
                                name: "Year",
                                type: "text",
                                expression: "YEAR(@INTERACTION.\"START\")",
                                default: "Y",
                                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                                isFreeText: false
                            },
                            calMonth: {
                                name: "Month",
                                type: "text",
                                expression: "MONTH(@INTERACTION.\"START\")",
                                default: "Y",
                                id: "58141f22-874a-4012-a273-4913b60a392f",
                                isFreeText: false
                            },
                            freetext: {
                                isFreeText: true
                            },
                            _absTime: {
                                isIntTime: true,
                                isFreeText: false
                            },
                            _succ: {
                                isRelTime: true,
                                isFreeText: false
                            }
                        }
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
                                isFreeText: false
                            },
                            status: {
                                name: "Sample Status",
                                type: "text",
                                expression: "@OBS.OBS_STATUS",
                                defaultFilter: "@OBS.OBS_TYPE IN ('BIOBANK', 'LIQUIDBANK')",
                                id: "241dca00-63e0-4ce4-945a-efbc2c633621",
                                isFreeText: false
                            },
                            calYear: {
                                name: "Year",
                                type: "text",
                                expression: "YEAR(@INTERACTION.\"START\")",
                                default: "Y",
                                id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                                isFreeText: false
                            },
                            calMonth: {
                                name: "Month",
                                type: "text",
                                expression: "MONTH(@INTERACTION.\"START\")",
                                default: "Y",
                                id: "58141f22-874a-4012-a273-4913b60a392f",
                                isFreeText: false
                            },
                            freetext: {
                                isFreeText: true
                            },
                            _absTime: {
                                isIntTime: true,
                                isFreeText: false
                            },
                            _succ: {
                                isRelTime: true,
                                isFreeText: false
                            }
                        }
                    }
                }
            }
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
                        isFreeText: false
                    },
                    age: {
                        name: "Age at Last Contact",
                        type: "num",
                        expression: "TO_INTEGER(DAYS_BETWEEN(@PATIENT.DOB,@INTERACTION.\"END\") / 365)",
                        defaultFilter: "@PATIENT.DOB <= @INTERACTION.\"END\"",
                        id: "b5a43ac8-d029-4451-b198-b01929757cae",
                        isFreeText: false
                    },
                    year: {
                        name: "Year of Last Contact",
                        type: "text",
                        expression: "YEAR(@INTERACTION.\"START\")",
                        id: "e60204ca-b953-4df2-a534-8bdea72a1f92",
                        isFreeText: false
                    },
                    calYear: {
                        name: "Year",
                        type: "text",
                        expression: "YEAR(@INTERACTION.\"START\")",
                        default: "Y",
                        id: "a26703b6-cfde-402a-b92b-cc181564bc13",
                        isFreeText: false
                    },
                    calMonth: {
                        name: "Month",
                        type: "text",
                        expression: "MONTH(@INTERACTION.\"START\")",
                        default: "Y",
                        id: "58141f22-874a-4012-a273-4913b60a392f",
                        isFreeText: false
                    },
                    freetext: {
                        isFreeText: true
                    },
                    _absTime: {
                        isIntTime: true,
                        isFreeText: false
                    },
                    _succ: {
                        isRelTime: true,
                        isFreeText: false
                    }
                }
            }
        },
        attributes: {
            nationality: {
                name: "Nationality",
                type: "text",
                expression: "@PATIENT.NATIONALITY",
                id: "2fc759a1-727c-453b-b2f7-19f11d13e011",
                isFreeText: false
            },
            pcount: {
                name: "Patient Count",
                type: "num",
                measureExpression: "COUNT(DISTINCT(@PATIENT.PATIENT_ID))",
                id: "17208821-863e-4e59-a31b-1c9a9f5b18b2",
                isFreeText: false
            },
            gender: {
                name: "Gender",
                type: "text",
                expression: "@PATIENT.GENDER",
                id: "c542e629-5c04-4f10-92b6-a3abe002a5f3",
                isFreeText: false
            },
            biomarker: {
                name: "Biomarker Type",
                defaultFilter: "@OBS.OBS_TYPE = 'BIOMARKER'",
                type: "text",
                expression: "@OBS.OBS_CHAR_VAL",
                id: "b41c85dc-ae6b-4493-981c-875370ca402b",
                isFreeText: false
            },
            smoker: {
                name: "Smoker",
                defaultFilter: "@OBS.OBS_TYPE = 'SMOKER'",
                type: "text",
                expression: "@OBS.OBS_CHAR_VAL",
                id: "a61c2776-0de0-46e0-8492-95273c8cfa6b",
                isFreeText: false
            },
            firstname: {
                name: "First name",
                type: "text",
                expression: "@PDATA.FIRSTNAME",
                id: "afed670c-8e47-4b0b-a36b-1b2a2f81218c",
                isFreeText: false
            },
            lastname: {
                name: "Last name",
                type: "text",
                expression: "@PDATA.LASTNAME",
                id: "34ce65a9-6f4f-4cef-aff4-a3fa360ef90b",
                isFreeText: false
            },
            dob: {
                name: "Date of birth",
                type: "time",
                expression: "@PATIENT.DOB",
                id: "9e3b9c5e-8e8e-4221-ab18-9e47541ce72f",
                isFreeText: false
            },
            yearOfBirth: {
                name: "Year of birth",
                type: "text",
                expression: "YEAR(@PATIENT.DOB)",
                id: "9e3b9c5e-8e8e-4221-ab18-9e47541ce72g",
                isFreeText: false
            },
            pid: {
                name: "Patient Id",
                type: "text",
                expression: "@PATIENT.PATIENT_ID",
                id: "9e3b9c5e-8e8e-4221-ab18-9e47541ce72h",
                isFreeText: false
            },
            freetext: {
                isFreeText: true
            }
        }
    }
};
