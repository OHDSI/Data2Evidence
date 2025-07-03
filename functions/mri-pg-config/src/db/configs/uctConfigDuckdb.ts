export const cdwUCTConfigDuckdb = {
  patient: {
    conditions: {},
    interactions: {
        "episode_event_type": {
            "name": [
                {
                    "lang": "",
                    "value": "Episode Event Type"
                }
            ],
            "disabledLangName": [
                {
                    "lang": "en",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "de",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "fr",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "es",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "pt",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "zh",
                    "value": "",
                    "visible": true
                }
            ],
            "defaultFilter": "1=1",
            "defaultPlaceholder": "@episode_event_type",
            "order": 1,
            "parentInteraction": [],
            "parentInteractionLabel": "parent",
            "cohortDefinitionKey": "episode_event_type",
            "conceptIdentifierType": "",
            "attributes": {
                "episode_event_id": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Episode Event Id"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@episode_event_type.\"episode_event_type_id\"",
                    "order": 1,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": ""
                },
                "episode_event_description": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Episode Event Description"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@episode_event_type.\"episode_event_description\"",
                    "order": 2,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": "",
                },
                "episode_event_group": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Episode Event Group"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@episode_event_type.\"episode_event_group\"",
                    "order": 3,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": "",
                }
            }
        },
        "data_source": {
            "name": [
                {
                    "lang": "",
                    "value": "Data Source"
                }
            ],
            "disabledLangName": [
                {
                    "lang": "en",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "de",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "fr",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "es",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "pt",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "zh",
                    "value": "",
                    "visible": true
                }
            ],
            "defaultFilter": "1=1",
            "defaultPlaceholder": "@datasources",
            "order": 1,
            "parentInteraction": [],
            "parentInteractionLabel": "parent",
            "cohortDefinitionKey": "datasources",
            "conceptIdentifierType": "",
            "attributes": {
                "datasource_id": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Data Source Id"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@datasources.\"datasource_id\"",
                    "order": 1,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": ""
                },
                "datasource_name": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Data Source Name"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@datasources.\"datasource_name\"",
                    "order": 2,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": "",
                },
                "data_first_added_date": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Data First Added Date"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@datasources.\"data_first_added_date\"",
                    "order": 3,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": "",
                },
                "data_last_added_date": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Data Last Added Date"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@datasources.\"data_last_added_date\"",
                    "order": 4,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": "",
                },
                "encounter_precedence": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Encounter Precedence"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@datasources.\"encounter_precedence\"",
                    "order": 5,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": "",
                },
                "datasource_category": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Data Source Category"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@datasources.\"datasource_category\"",
                    "order": 6,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": "",
                },
                "data_load_frequency": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Data Load Frequency"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@datasources.\"data_load_frequency\"",
                    "order": 7,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": "",
                },
                "datasource_data_type": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Data Source Data Type"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@datasources.\"datasource_data_type\"",
                    "order": 8,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": "",
                },
                "datasource_connection_type": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Data Source Connection Type"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@datasources.\"datasource_connection_type\"",
                    "order": 9,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": "",
                }
            }
        },
        "episode_evidences": {
            "name": [
                {
                    "lang": "",
                    "value": "Episode Evidence"
                }
            ],
            "disabledLangName": [
                {
                    "lang": "en",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "de",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "fr",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "es",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "pt",
                    "value": "",
                    "visible": true
                },
                {
                    "lang": "zh",
                    "value": "",
                    "visible": true
                }
            ],
            "defaultFilter": "1=1",
            "defaultPlaceholder": "@episode_evidences",
            "order": 1,
            "parentInteraction": [],
            "parentInteractionLabel": "parent",
            "cohortDefinitionKey": "episode_evidences",
            "conceptIdentifierType": "",
            "attributes": {
                "pid": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Patient Id"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@episode_evidences.\"study_patient_id\"",
                    "order": 1,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": ""
                },
                "episode_event_date": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Episode Event Date"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@episode_evidences.\"episode_event_date\"",
                    "order": 2,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": "",
                },
                "episode_type_id": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Episode Event Type Id"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@episode_evidences.\"episode_type_id\"",
                    "order": 3,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": "",
                },
                "episode_type_description": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Episode Type Description"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@episode_evidences.\"episode_type_description\"",
                    "order": 4,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "cohortDefinitionKey": "",
                    "conceptIdentifierType": "",
                },
                "data_source": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Data Source"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@REF.datasource_name",
                    "defaultPlaceholder": "@REF",
                    "referenceFilter": "CAST (@REF.datasource_name AS VARCHAR) LIKE_REGEXPR '@SEARCH_QUERY' FLAG 'i'",
                    "referenceExpression": "@REF.datasource_name",
                    "order": 5,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "useRefValue": true
                },
                "episode_type": {
                    "name": [
                        {
                            "lang": "",
                            "value": "Episode Event Type"
                        }
                    ],
                    "disabledLangName": [
                        {
                            "lang": "en",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "de",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "fr",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "es",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "pt",
                            "value": "",
                            "visible": true
                        },
                        {
                            "lang": "zh",
                            "value": "",
                            "visible": true
                        }
                    ],
                    "type": "text",
                    "expression": "@episode_event_type.\"episode_event_description\"",
                    "referenceFilter": "CAST (@episode_event_type.episode_event_description AS VARCHAR) LIKE_REGEXPR '@SEARCH_QUERY' FLAG 'i'",
                    "referenceExpression": "@episode_event_type.episode_event_description",
                    "order": 6,
                    "domainFilter": "",
                    "standardConceptCodeFilter": "",
                    "useRefValue": false
                },
            }
        }
    },
    attributes: {
      pid: {
        name: [
          {
            lang: "",
            value: "Patient id",
          },
        ],
        disabledLangName: [
          {
            lang: "en",
            value: "",
          },
          {
            lang: "de",
            value: "",
          },
          {
            lang: "fr",
            value: "",
          },
          {
            lang: "es",
            value: "",
          },
          {
            lang: "pt",
            value: "",
          },
          {
            lang: "zh",
            value: "",
          },
        ],
        type: "text",
        "expression": "@PATIENT.\"PERSON_ID\"",
        order: 0,
        "annotations": [
					"patient_id"
				],
        domainFilter: "",
        standardConceptCodeFilter: "",
      },
      pcount: {
        name: [
          {
            lang: "",
            value: "Patient Count",
          },
        ],
        disabledLangName: [
          {
            lang: "en",
            value: "",
          },
          {
            lang: "de",
            value: "",
          },
          {
            lang: "fr",
            value: "",
          },
          {
            lang: "es",
            value: "",
          },
          {
            lang: "pt",
            value: "",
          },
          {
            lang: "zh",
            value: "",
          },
        ],
        type: "num",
        measureExpression: "COUNT(DISTINCT(@PATIENT.\"PERSON_ID\"))",
        order: 1,
        domainFilter: "",
        standardConceptCodeFilter: "",
      },
    },
  },
  censor: {},
  advancedSettings: {
    tableTypePlaceholderMap: {
      factTable: {
        placeholder: "@PATIENT",
        attributeTables: [],
      },
      dimTables: [
        {
          placeholder: "@episode_event_type",
          attributeTables: [],
          hierarchy: false,
          time: true,
          oneToN: false,
          condition: false,
        },
        {
          placeholder: "@datasources",
          attributeTables: [],
          hierarchy: false,
          time: true,
          oneToN: false,
          condition: false,
        },
        {
          placeholder: "@episode_evidences",
          attributeTables: [],
          hierarchy: false,
          time: true,
          oneToN: false,
          condition: false,
        },
      ],
    },
    tableMapping: {
        "@episode_event_type": "$$SCHEMA$$.episode_event_type",
        "@PATIENT": "$$SCHEMA$$.\"person\"",
        "@PATIENT.PATIENT_ID": "\"person_id\"",
        "@datasources": "$$SCHEMA$$.datasources",
        "@episode_evidences": "$$SCHEMA$$.episode_evidences",
        "@episode_evidences.PATIENT_ID": "study_patient_id",
        "@REF": "$$VOCAB_SCHEMA$$.datasources",
        "@REF.CODE": "\"datasource_id\"",
        "@REF.TEXT": "\"datasource_name\"",
        // "@TEXT": "$$VOCAB_SCHEMA$$.\"episode_event_type\"",
        // "@TEXT.INTERACTION_ID": "\"episode_event_description\"",
        // "@TEXT.INTERACTION_TEXT_ID": "\"episode_event_description\"",
        // "@TEXT.VALUE": "\"episode_event_description\""
    },
    guardedTableMapping: {
      "@PATIENT": "$$SCHEMA$$.\"PERSON\""
    },
    language: ["en", "de", "fr", "es", "pt", "zh"],
    others: {},
    settings: {
      fuzziness: 0.7,
      maxResultSize: 5000,
      sqlReturnOn: false,
      errorDetailsReturnOn: false,
      errorStackTraceReturnOn: false,
      enableFreeText: true,
      vbEnabled: true,
      dateFormat: "YYYY-MM-dd",
      timeFormat: "HH:mm:ss",
      otsTableMap: {
        "@code": "$$VOCAB_SCHEMA$$.concept",
      },
    },
    shared: {},
    schemaVersion: "3",
  },
};

export const paUCTConfigDuckdb = {
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
            linkColumn: false,
          },
          modelName: "Person id",
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
          modelName: "Patient Count",
        }
      ],
      initialPatientlistColumn: true,
      modelName: "MRI_PA_SERVICES_FILTERCARD_TITLE_BASIC_DATA",
    },
    {
      source: "patient.interactions.episode_evidences",
      visible: true,
      order: 2,
      initial: true,
      attributes: [
        {
          source: "patient.interactions.episode_evidences.attributes.pid",
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
        },
        {
          source: "patient.interactions.episode_evidences.attributes.episode_event_date",
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
            initial: false,
            visible: true,
            linkColumn: false,
          },
        },
        {
          source: "patient.interactions.episode_evidences.attributes.episode_type_id",
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
          }
        },
        {
          source: "patient.interactions.episode_evidences.attributes.episode_type_description",
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
            initial: false,
            visible: true,
            linkColumn: false,
          }
        },
        {
          source: "patient.interactions.episode_evidences.attributes.data_source",
          ordered: false,
          cached: true,
          useRefText: true,
          useRefValue: true,
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
          }
        },
        {
          source: "patient.interactions.episode_evidences.attributes.episode_type",
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
          }
        }
      ],
      initialPatientlistColumn: false,
    },
  ],
  chartOptions: {
    initialAttributes: {
      measures: ["patient.attributes.pcount"],
      categories: [],
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
      enabled: false,
    },
    custom: {
      visible: true,
      customCharts: [],
    },
    sac: {
      visible: false,
      sacCharts: [],
      enabled: true,
    },
    shared: {
      enabled: false,
      systemName: "MRI",
    },
    minCohortSize: 0,
  },
  configInformations: {
    note: "",
  },
  panelOptions: {
    addToCohorts: true,
    domainValuesLimit: 5000,
    calcViewAccessPoint: true,
    externalAccessPoints: true,
    cohortEntryExit: false,
  },
};
