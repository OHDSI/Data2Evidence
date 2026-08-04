// Waveform extension config for the DuckDB-flavored CDW/PA config (cdwConfigDuckdb /
// paConfigDuckdb, defined in ../seeds/03_Config.ts). Adds WAVEFORM_OCCURRENCE and
// WAVEFORM_REGISTRY (+ nested channel-metadata/feature attributes) as interactions and
// filter cards, per the waveform extension tables added in
// plugins/flows/data_management/data_management_plugin/db/migrations/hana/changesets/waveform/.
//
// The actual merge with the base OMOP config (cdwWaveformConfig / paWaveformConfig)
// happens in 03_Config.ts, not here, since those spreads need cdwConfigDuckdb /
// paConfigDuckdb which live there — importing them back into this file would create a
// circular import.

export const waveformOccurrenceInteraction = {
    "name": [
        {
            "lang": "",
            "value": "Waveform Occurrence"
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
    "defaultPlaceholder": "@WAVEFORMOCC",
    "order": 15,
    "parentInteraction": [
        "patient.interactions.visit"
    ],
    "parentInteractionsMapping": [
        {
            "currentMappingInteractionId": "@WAVEFORMOCC.visit_occurrence_id",
            "parentInteraction": "patient.interactions.visit",
            "parentMappingInteraction": "@VISIT",
            "parentMappingInteractionLabel": "Visit parent"
        }
    ],
    "parentInteractionLabel": "Visit parent",
    "cohortDefinitionKey": "",
    "conceptIdentifierType": "",
    "attributes": {
        "occstartdatetime": {
            "name": [
                {
                    "lang": "",
                    "value": "Start Date/Time"
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
            "type": "datetime",
            "expression": "@WAVEFORMOCC.\"WAVEFORM_OCCURRENCE_START_DATETIME\"",
            "order": 1,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "OccurrenceStartDate",
            "conceptIdentifierType": ""
        },
        "occenddatetime": {
            "name": [
                {
                    "lang": "",
                    "value": "End Date/Time"
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
            "type": "datetime",
            "expression": "@WAVEFORMOCC.\"WAVEFORM_OCCURRENCE_END_DATETIME\"",
            "order": 2,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "OccurrenceEndDate",
            "conceptIdentifierType": ""
        },
        "occconceptset": {
            "name": [
                {
                    "lang": "",
                    "value": "Waveform Occurrence Concept Set"
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
            "type": "conceptSet",
            "expression": "@WAVEFORMOCC.\"WAVEFORM_OCCURRENCE_CONCEPT_ID\"",
            "order": 3,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "CodesetId",
            "conceptIdentifierType": ""
        },
        "pid": {
            "name": [
                {
                    "lang": "",
                    "value": "Person id"
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
            "expression": "@WAVEFORMOCC.person_id",
            "order": 4,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "visitid": {
            "name": [
                {
                    "lang": "",
                    "value": "Visit Occurrence id"
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
            "type": "num",
            "expression": "@WAVEFORMOCC.visit_occurrence_id",
            "order": 5,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "visitdetailid": {
            "name": [
                {
                    "lang": "",
                    "value": "Visit Detail id"
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
            "type": "num",
            "expression": "@WAVEFORMOCC.visit_detail_id",
            "order": 6,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "precedingoccid": {
            "name": [
                {
                    "lang": "",
                    "value": "Preceding Waveform Occurrence id"
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
            "type": "num",
            "expression": "@WAVEFORMOCC.preceding_waveform_occurrence_id",
            "order": 7,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "formatconceptset": {
            "name": [
                {
                    "lang": "",
                    "value": "Waveform Format Concept Set"
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
            "type": "conceptSet",
            "expression": "@WAVEFORMOCC.\"WAVEFORM_FORMAT_CONCEPT_ID\"",
            "order": 8,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "occsourcevalue": {
            "name": [
                {
                    "lang": "",
                    "value": "Waveform Occurrence Source Value"
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
            "expression": "@WAVEFORMOCC.\"WAVEFORM_OCCURRENCE_SOURCE_VALUE\"",
            "order": 9,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        
        "numoffiles": {
            "name": [
                {
                    "lang": "",
                    "value": "Num Of Files"
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
            "type": "num",
            "expression": "@WAVEFORMOCC.\"NUM_OF_FILES\"",
            "order": 10,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "formatsourcevalue": {
            "name": [
                {
                    "lang": "",
                    "value": "Waveform Format Source Value"
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
            "expression": "@WAVEFORMOCC.\"WAVEFORM_FORMAT_SOURCE_VALUE\"",
            "order": 11,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        
        "startdate": {
            "name": [
                {
                    "lang": "",
                    "value": "Start Date"
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
            "type": "datetime",
            "expression": "@WAVEFORMOCC.\"WAVEFORM_OCCURRENCE_START_DATETIME\"",
            "order": 12,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "OccurrenceStartDate",
            "conceptIdentifierType": ""
        },
        "enddate": {
            "name": [
                {
                    "lang": "",
                    "value": "End Date"
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
            "type": "datetime",
            "expression": "@WAVEFORMOCC.\"WAVEFORM_OCCURRENCE_END_DATETIME\"",
            "order": 13,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "OccurrenceEndDate",
            "conceptIdentifierType": ""
        },
        "durationhours": {
            "name": [
                {
                    "lang": "",
                    "value": "Recording Duration (hours)"
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
            "type": "num",
            "expression": "date_diff('hour', @WAVEFORMOCC.\"WAVEFORM_OCCURRENCE_START_DATETIME\", @WAVEFORMOCC.\"WAVEFORM_OCCURRENCE_END_DATETIME\")",
            "order": 14,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        }
    }
};

export const waveformRegistryInteraction = {
    "name": [
        {
            "lang": "",
            "value": "Waveform Registry"
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
    "defaultPlaceholder": "@WAVEFORMREG",
    "order": 16,
    "parentInteraction": [
        "patient.interactions.visit"
    ],
    "parentInteractionsMapping": [
        {
            "currentMappingInteractionId": "@WAVEFORMREG.visit_occurrence_id",
            "parentInteraction": "patient.interactions.visit",
            "parentMappingInteraction": "@VISIT",
            "parentMappingInteractionLabel": "Visit parent"
        }
    ],
    "parentInteractionLabel": "Visit parent",
    "cohortDefinitionKey": "",
    "conceptIdentifierType": "",
    "attributes": {
        "filestartdatetime": {
            "name": [
                {
                    "lang": "",
                    "value": "File Start Date/Time"
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
            "type": "datetime",
            "expression": "@WAVEFORMREG.\"WAVEFORM_FILE_START_DATETIME\"",
            "order": 1,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "OccurrenceStartDate",
            "conceptIdentifierType": ""
        },
        "fileenddatetime": {
            "name": [
                {
                    "lang": "",
                    "value": "File End Date/Time"
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
            "type": "datetime",
            "expression": "@WAVEFORMREG.\"WAVEFORM_FILE_END_DATETIME\"",
            "order": 2,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "OccurrenceEndDate",
            "conceptIdentifierType": ""
        },
        "fileextensionconceptset": {
            "name": [
                {
                    "lang": "",
                    "value": "File Extension Concept Set"
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
            "type": "conceptSet",
            "expression": "@WAVEFORMREG.\"FILE_EXTENSION_CONCEPT_ID\"",
            "order": 3,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "CodesetId",
            "conceptIdentifierType": ""
        },
        "pid": {
            "name": [
                {
                    "lang": "",
                    "value": "Person id"
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
            "expression": "@WAVEFORMREG.person_id",
            "order": 4,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "visitid": {
            "name": [
                {
                    "lang": "",
                    "value": "Visit Occurrence id"
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
            "type": "num",
            "expression": "@WAVEFORMREG.visit_occurrence_id",
            "order": 5,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "visitdetailid": {
            "name": [
                {
                    "lang": "",
                    "value": "Visit Detail id"
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
            "type": "num",
            "expression": "@WAVEFORMREG.visit_detail_id",
            "order": 6,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "waveformoccid": {
            "name": [
                {
                    "lang": "",
                    "value": "Waveform Occurrence id"
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
            "type": "num",
            "expression": "@WAVEFORMREG.waveform_occurrence_id",
            "order": 7,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "waveformfeatureid": {
            "name": [
                {
                    "lang": "",
                    "value": "Waveform Feature id"
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
            "type": "num",
            "expression": "@WAVEFORMREG.waveform_feature_id",
            "order": 8,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "fileextensionsourcevalue": {
            "name": [
                {
                    "lang": "",
                    "value": "File Extension Source Value"
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
            "expression": "@WAVEFORMREG.\"FILE_EXTENSION_SOURCE_VALUE\"",
            "order": 9,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        
        "sourcefileuri": {
            "name": [
                {
                    "lang": "",
                    "value": "Waveform Source File URI"
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
            "expression": "@WAVEFORMREG.\"WAVEFORM_SOURCE_FILE_URI\"",
            "order": 10,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "targetfileuri": {
            "name": [
                {
                    "lang": "",
                    "value": "Waveform Target File URI"
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
            "expression": "@WAVEFORMREG.\"WAVEFORM_TARGET_FILE_URI\"",
            "order": 11,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        }
,
        
        
        "chanmeta_channelsourcevalue": {
            "name": [
                {
                    "lang": "",
                    "value": "Channel Metadata: Channel Source Value"
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
            "expression": "@WAVEFORMCHANMETA.\"WAVEFORM_CHANNEL_SOURCE_VALUE\"",
            "order": 20,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "chanmeta_metadatasourcevalue": {
            "name": [
                {
                    "lang": "",
                    "value": "Channel Metadata: Metadata Source Value"
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
            "expression": "@WAVEFORMCHANMETA.\"METADATA_SOURCE_VALUE\"",
            "order": 22,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "chanmeta_procedureid": {
            "name": [
                {
                    "lang": "",
                    "value": "Channel Metadata: Procedure Occurrence id"
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
            "type": "num",
            "expression": "@WAVEFORMCHANMETA.procedure_occurrence_id",
            "order": 18,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "chanmeta_deviceexpid": {
            "name": [
                {
                    "lang": "",
                    "value": "Channel Metadata: Device Exposure id"
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
            "type": "num",
            "expression": "@WAVEFORMCHANMETA.device_exposure_id",
            "order": 19,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        
        "chanmeta_channelconceptset": {
            "name": [
                {
                    "lang": "",
                    "value": "Channel Metadata: Channel Concept Set"
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
            "type": "conceptSet",
            "expression": "@WAVEFORMCHANMETA.\"CHANNEL_CONCEPT_ID\"",
            "order": 21,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        
        "chanmeta_metadataconceptset": {
            "name": [
                {
                    "lang": "",
                    "value": "Channel Metadata: Metadata Concept Set"
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
            "type": "conceptSet",
            "expression": "@WAVEFORMCHANMETA.\"METADATA_CONCEPT_ID\"",
            "order": 23,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "chanmeta_valueasnumber": {
            "name": [
                {
                    "lang": "",
                    "value": "Channel Metadata: Value As Number"
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
            "type": "num",
            "expression": "@WAVEFORMCHANMETA.\"VALUE_AS_NUMBER\"",
            "order": 24,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "chanmeta_valueasconceptset": {
            "name": [
                {
                    "lang": "",
                    "value": "Channel Metadata: Value As Concept Set"
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
            "type": "conceptSet",
            "expression": "@WAVEFORMCHANMETA.\"VALUE_AS_CONCEPT_ID\"",
            "order": 25,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "chanmeta_valueasstring": {
            "name": [
                {
                    "lang": "",
                    "value": "Channel Metadata: Value As String"
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
            "expression": "@WAVEFORMCHANMETA.\"VALUE_AS_STRING\"",
            "order": 26,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "chanmeta_unitconceptset": {
            "name": [
                {
                    "lang": "",
                    "value": "Channel Metadata: Unit Concept Set"
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
            "type": "conceptSet",
            "expression": "@WAVEFORMCHANMETA.\"UNIT_CONCEPT_ID\"",
            "order": 27,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "chanmeta_unitsourcevalue": {
            "name": [
                {
                    "lang": "",
                    "value": "Channel Metadata: Unit Source Value"
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
            "expression": "@WAVEFORMCHANMETA.\"UNIT_SOURCE_VALUE\"",
            "order": 28,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        
        
        "feat_channelmetadataid": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Waveform Channel Metadata id"
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
            "type": "num",
            "expression": "@WFFEAT.waveform_channel_metadata_id",
            "order": 30,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "feat_measurementid": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Measurement id"
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
            "type": "num",
            "expression": "@WFFEAT.measurement_id",
            "order": 31,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "feat_observationid": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Observation id"
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
            "type": "num",
            "expression": "@WFFEAT.observation_id",
            "order": 32,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "feat_algorithmconceptset": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Algorithm Concept Set"
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
            "type": "conceptSet",
            "expression": "@WFFEAT.\"ALGORITHM_CONCEPT_ID\"",
            "order": 33,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "feat_algorithmsourcevalue": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Algorithm Source Value"
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
            "expression": "@WFFEAT.\"ALGORITHM_SOURCE_VALUE\"",
            "order": 34,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        
        "feat_anatomicsiteconceptset": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Anatomic Site Concept Set"
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
            "type": "conceptSet",
            "expression": "@WFFEAT.\"ANATOMIC_SITE_CONCEPT_ID\"",
            "order": 35,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "feat_featurestarttime": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Start Time"
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
            "type": "time",
            "expression": "@WFFEAT.\"WAVEFORM_FEATURE_START_TIMESTAMP\"",
            "order": 36,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "feat_featureendtime": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: End Time"
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
            "type": "time",
            "expression": "@WFFEAT.\"WAVEFORM_FEATURE_END_TIMESTAMP\"",
            "order": 37,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "startdate": {
            "name": [
                {
                    "lang": "",
                    "value": "Start Date"
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
            "type": "time",
            "expression": "@WFFEAT.\"WAVEFORM_FEATURE_START_TIMESTAMP\"",
            "order": 38,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "OccurrenceStartDate",
            "conceptIdentifierType": ""
        },
        "enddate": {
            "name": [
                {
                    "lang": "",
                    "value": "End Date"
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
            "type": "time",
            "expression": "@WFFEAT.\"WAVEFORM_FEATURE_END_TIMESTAMP\"",
            "order": 39,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "OccurrenceEndDate",
            "conceptIdentifierType": ""
        },
        "feat_isfeatureoverflow": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Is Feature Overflow"
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
            "expression": "@WFFEAT.\"IS_FEATURE_OVERFLOW\"",
            "order": 38,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "feat_valueasnumber": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Value As Number"
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
            "type": "num",
            "expression": "@WFFEAT.\"VALUE_AS_NUMBER\"",
            "order": 39,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "feat_valueasconceptset": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Value As Concept Set"
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
            "type": "conceptSet",
            "expression": "@WFFEAT.\"VALUE_AS_CONCEPT_ID\"",
            "order": 40,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "feat_valueasstring": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Value As String"
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
            "expression": "@WFFEAT.\"VALUE_AS_STRING\"",
            "order": 41,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "feat_valueisaregistryfile": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Value Is A Registry File"
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
            "expression": "@WFFEAT.\"VALUE_IS_A_REGISTRY_FILE\"",
            "order": 42,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "feat_unitconceptset": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Unit Concept Set"
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
            "type": "conceptSet",
            "expression": "@WFFEAT.\"UNIT_CONCEPT_ID\"",
            "order": 43,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },
        "feat_unitsourcevalue": {
            "name": [
                {
                    "lang": "",
                    "value": "Feature: Unit Source Value"
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
            "expression": "@WFFEAT.\"UNIT_SOURCE_VALUE\"",
            "order": 44,
            "domainFilter": "",
            "includeDescendants": false,
            "includeDescendantsExpression": "",
            "optionalFiltering": false,
            "standardConceptCodeFilter": "",
            "cohortDefinitionKey": "",
            "conceptIdentifierType": ""
        },    }
};

export const dimWaveformOcc = {
    "placeholder": "@WAVEFORMOCC",
    "attributeTables": [],
    "hierarchy": false,
    "time": true,
    "oneToN": false,
    "condition": false
};

export const dimWaveformReg = {
    "placeholder": "@WAVEFORMREG",
    "attributeTables": [
        {
            "placeholder": "@WAVEFORMCHANMETA",
            "oneToN": true
        },
        {
            "placeholder": "@WFFEAT",
            "oneToN": true
        }
    ],
    "hierarchy": false,
    "time": true,
    "oneToN": false,
    "condition": false
};

export const waveformTableMappingAdditions = {
    "@WAVEFORMOCC": "$$SCHEMA$$.\"waveform_occurrence\"",
    "@WAVEFORMOCC.PATIENT_ID": "\"person_id\"",
    "@WAVEFORMOCC.INTERACTION_ID": "\"waveform_occurrence_id\"",
    "@WAVEFORMOCC.CONDITION_ID": "\"waveform_occurrence_concept_id\"",
    "@WAVEFORMOCC.PARENT_INTERACT_ID": "\"visit_occurrence_id\"",
    "@WAVEFORMOCC.START": "\"waveform_occurrence_start_datetime\"",
    "@WAVEFORMOCC.END": "\"waveform_occurrence_end_datetime\"",
    "@WAVEFORMOCC.INTERACTION_TYPE": "\"waveform_occurrence_concept_id\"",
    "@WAVEFORMREG": "$$SCHEMA$$.\"waveform_registry\"",
    "@WAVEFORMREG.PATIENT_ID": "\"person_id\"",
    "@WAVEFORMREG.INTERACTION_ID": "\"waveform_registry_id\"",
    "@WAVEFORMREG.CONDITION_ID": "\"file_extension_concept_id\"",
    "@WAVEFORMREG.PARENT_INTERACT_ID": "\"visit_occurrence_id\"",
    "@WAVEFORMREG.START": "\"waveform_file_start_datetime\"",
    "@WAVEFORMREG.END": "\"waveform_file_end_datetime\"",
    "@WAVEFORMREG.INTERACTION_TYPE": "\"file_extension_concept_id\"",
    "@WAVEFORMCHANMETA": "$$SCHEMA$$.\"waveform_channel_metadata\"",
    "@WAVEFORMCHANMETA.INTERACTION_ID": "\"waveform_registry_id\"",
    "@WAVEFORMCHANMETA.ATTRIBUTE": "\"metadata_concept_id\"",
    "@WAVEFORMCHANMETA.VALUE": "\"value_as_number\"",
    "@WFFEAT": "$$SCHEMA$$.\"waveform_feature\"",
    "@WFFEAT.INTERACTION_ID": "\"waveform_registry_id\"",
    "@WFFEAT.ATTRIBUTE": "\"algorithm_concept_id\"",
    "@WFFEAT.VALUE": "\"value_as_number\""
};

export const waveformOccurrenceInteractionFiltercard = {
    "source": "patient.interactions.waveformoccurrence",
    "visible": true,
    "order": 22,
    "initial": false,
    "attributes": [
        {
            "source": "patient.interactions.waveformoccurrence.attributes.occstartdatetime",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 1
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Start Date/Time"
        },
        {
            "source": "patient.interactions.waveformoccurrence.attributes.occenddatetime",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 2
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "End Date/Time"
        },
        {
            "source": "patient.interactions.waveformoccurrence.attributes.occconceptset",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 3
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Waveform Occurrence Concept Set"
        },
        {
            "source": "patient.interactions.waveformoccurrence.attributes.visitid",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 4
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Visit Occurrence id"
        },
        {
            "source": "patient.interactions.waveformoccurrence.attributes.visitdetailid",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 5
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Visit Detail id"
        },
        {
            "source": "patient.interactions.waveformoccurrence.attributes.precedingoccid",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 6
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Preceding Waveform Occurrence id"
        },
        {
            "source": "patient.interactions.waveformoccurrence.attributes.formatconceptset",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 7
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Waveform Format Concept Set"
        },
        {
            "source": "patient.interactions.waveformoccurrence.attributes.occsourcevalue",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 8
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Waveform Occurrence Source Value"
        },
        
        {
            "source": "patient.interactions.waveformoccurrence.attributes.numoffiles",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": false,
            "measure": true,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 9
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Num Of Files"
        },
        {
            "source": "patient.interactions.waveformoccurrence.attributes.formatsourcevalue",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 10
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Waveform Format Source Value"
        },
        {
            "source": "patient.interactions.waveformoccurrence.attributes.durationhours",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": false,
            "measure": true,
            "defaultBinSize": 24,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 11
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Recording Duration (hours)"
        },
    ]
};

export const waveformRegistryInteractionFiltercard = {
    "source": "patient.interactions.wfreg",
    "visible": true,
    "order": 23,
    "initial": false,
    "attributes": [
        {
            "source": "patient.interactions.wfreg.attributes.filestartdatetime",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 1
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "File Start Date/Time"
        },
        {
            "source": "patient.interactions.wfreg.attributes.fileenddatetime",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 2
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "File End Date/Time"
        },
        {
            "source": "patient.interactions.wfreg.attributes.fileextensionconceptset",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 3
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "File Extension Concept Set"
        },
        {
            "source": "patient.interactions.wfreg.attributes.waveformoccid",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 4
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Waveform Occurrence id"
        },
        {
            "source": "patient.interactions.wfreg.attributes.waveformfeatureid",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 5
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Waveform Feature id"
        },
        {
            "source": "patient.interactions.wfreg.attributes.fileextensionsourcevalue",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 8
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "File Extension Source Value"
        },
        {
            "source": "patient.interactions.wfreg.attributes.visitid",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 6
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Visit Occurrence id"
        },
        {
            "source": "patient.interactions.wfreg.attributes.visitdetailid",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 7
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Visit Detail id"
        },
        
        {
            "source": "patient.interactions.wfreg.attributes.sourcefileuri",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 9
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Waveform Source File URI"
        },
        {
            "source": "patient.interactions.wfreg.attributes.targetfileuri",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 10
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Waveform Target File URI"
        }
,
        
        
        {
            "source": "patient.interactions.wfreg.attributes.chanmeta_channelsourcevalue",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 20
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Channel Metadata: Channel Source Value"
        },
        {
            "source": "patient.interactions.wfreg.attributes.chanmeta_metadatasourcevalue",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 22
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Channel Metadata: Metadata Source Value"
        },
        {
            "source": "patient.interactions.wfreg.attributes.chanmeta_procedureid",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 18
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Channel Metadata: Procedure Occurrence id"
        },
        {
            "source": "patient.interactions.wfreg.attributes.chanmeta_deviceexpid",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 19
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Channel Metadata: Device Exposure id"
        },
        
        {
            "source": "patient.interactions.wfreg.attributes.chanmeta_channelconceptset",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 21
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Channel Metadata: Channel Concept Set"
        },
        
        {
            "source": "patient.interactions.wfreg.attributes.chanmeta_metadataconceptset",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 23
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Channel Metadata: Metadata Concept Set"
        },
        {
            "source": "patient.interactions.wfreg.attributes.chanmeta_valueasnumber",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": true,
            "defaultBinSize": 50,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 24
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Channel Metadata: Value As Number"
        },
        {
            "source": "patient.interactions.wfreg.attributes.chanmeta_valueasconceptset",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 25
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Channel Metadata: Value As Concept Set"
        },
        {
            "source": "patient.interactions.wfreg.attributes.chanmeta_valueasstring",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 26
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Channel Metadata: Value As String"
        },
        {
            "source": "patient.interactions.wfreg.attributes.chanmeta_unitconceptset",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 27
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Channel Metadata: Unit Concept Set"
        },
        {
            "source": "patient.interactions.wfreg.attributes.chanmeta_unitsourcevalue",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 28
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Channel Metadata: Unit Source Value"
        },
        
        
        {
            "source": "patient.interactions.wfreg.attributes.feat_channelmetadataid",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 30
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Waveform Channel Metadata id"
        },
        {
            "source": "patient.interactions.wfreg.attributes.feat_measurementid",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 31
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Measurement id"
        },
        {
            "source": "patient.interactions.wfreg.attributes.feat_observationid",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 32
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Observation id"
        },
        {
            "source": "patient.interactions.wfreg.attributes.feat_algorithmconceptset",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 33
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Algorithm Concept Set"
        },
        {
            "source": "patient.interactions.wfreg.attributes.feat_algorithmsourcevalue",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 34
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Algorithm Source Value"
        },
        
        {
            "source": "patient.interactions.wfreg.attributes.feat_anatomicsiteconceptset",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 35
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Anatomic Site Concept Set"
        },
        {
            "source": "patient.interactions.wfreg.attributes.feat_featurestarttime",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 36
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Start Time"
        },
        {
            "source": "patient.interactions.wfreg.attributes.feat_featureendtime",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 37
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: End Time"
        },
        {
            "source": "patient.interactions.wfreg.attributes.feat_isfeatureoverflow",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 38
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Is Feature Overflow"
        },
        {
            "source": "patient.interactions.wfreg.attributes.feat_valueasnumber",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": true,
            "defaultBinSize": 10,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 39
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Value As Number"
        },
        {
            "source": "patient.interactions.wfreg.attributes.feat_valueasconceptset",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 40
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Value As Concept Set"
        },
        {
            "source": "patient.interactions.wfreg.attributes.feat_valueasstring",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 41
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Value As String"
        },
        {
            "source": "patient.interactions.wfreg.attributes.feat_valueisaregistryfile",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 42
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Value Is A Registry File"
        },
        {
            "source": "patient.interactions.wfreg.attributes.feat_unitconceptset",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 43
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Unit Concept Set"
        },
        {
            "source": "patient.interactions.wfreg.attributes.feat_unitsourcevalue",
            "ordered": true,
            "cached": true,
            "useRefText": false,
            "useRefValue": false,
            "category": true,
            "measure": false,
            "filtercard": {
                "initial": false,
                "visible": true,
                "order": 44
            },
            "patientlist": {
                "initial": false,
                "visible": true,
                "linkColumn": false
            },
            "modelName": "Feature: Unit Source Value"
        },
    ]
};

