export const cdwFHIRConfigDuckdb = {
  patient: {
    conditions: {},
    interactions: {
      questionnaire: {
        name: [
          {
            lang: "",
            value: "Questionnaire",
          },
        ],
        disabledLangName: [
          {
            lang: "de",
            value: "",
            visible: true,
          },
          {
            lang: "fr",
            value: "",
            visible: true,
          },
          {
            lang: "es",
            value: "",
            visible: true,
          },
          {
            lang: "pt",
            value: "",
            visible: true,
          },
          {
            lang: "zh",
            value: "",
            visible: true,
          },
          {
            lang: "en",
            value: "",
            visible: true,
          },
        ],
        defaultFilter: "1=1",
        defaultPlaceholder: "@response",
        order: 1,
        parentInteraction: [],
        parentInteractionLabel: "parent",
        attributes: {
          linkID: {
            name: [
              {
                lang: "",
                value: "Link ID",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@response.LINK_ID",
            order: 0,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          valueCodingValue: {
            name: [
              {
                lang: "",
                value: "Value coding value",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@response.VALUECODING_CODE",
            order: 1,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          recordID: {
            name: [
              {
                lang: "",
                value: "Record ID",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@response.ID",
            order: 2,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          questionnaireLanguage: {
            name: [
              {
                lang: "",
                value: "Questionnaire language",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@response.LANGUAGE",
            order: 3,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          questionnaireStatus: {
            name: [
              {
                lang: "",
                value: "Questionnaire status",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@response.STATUS",
            order: 4,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          questionnaireAuthored: {
            name: [
              {
                lang: "",
                value: "Questionnaire authored",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@response.AUTHORED",
            order: 5,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          text: {
            name: [
              {
                lang: "",
                value: "Text",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@response.TEXT",
            order: 6,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          valueType: {
            name: [
              {
                lang: "",
                value: "Value type",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@response.VALUE_TYPE",
            order: 7,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          value: {
            name: [
              {
                lang: "",
                value: "Value",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@response.VALUE",
            order: 8,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          questionnaireReference: {
            name: [
              {
                lang: "",
                value: "Questionnaire reference",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@response.QUESTIONNAIRE_REFERENCE",
            order: 9,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          questionnaireVersion: {
            name: [
              {
                lang: "",
                value: "Questionnaire version",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@response.QUESTIONNAIRE_VERSION",
            order: 10,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          extensionEffectiveDateUrl: {
            name: [
              {
                lang: "",
                value: "Questionaire extension effective date url",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
              },
              {
                lang: "fr",
                value: "",
                visible: true,
              },
              {
                lang: "es",
                value: "",
                visible: true,
              },
              {
                lang: "pt",
                value: "",
                visible: true,
              },
              {
                lang: "zh",
                value: "",
                visible: true,
              },
            ],
            type: "text",
            expression: "@response.EXTENSION_EFFECTIVE_DATE_URL",
            order: 11,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          extensionValuedate: {
            name: [
              {
                lang: "",
                value: "Questionaire extension valuedate",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
              },
              {
                lang: "fr",
                value: "",
                visible: true,
              },
              {
                lang: "es",
                value: "",
                visible: true,
              },
              {
                lang: "pt",
                value: "",
                visible: true,
              },
              {
                lang: "zh",
                value: "",
                visible: true,
              },
            ],
            type: "text",
            expression: "@response.EXTENSION_VALUEDATE",
            order: 12,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
        },
      },
      answer: {
        name: [
          {
            lang: "",
            value: "Answer",
          },
        ],
        disabledLangName: [
          {
            lang: "de",
            value: "",
            visible: true,
          },
          {
            lang: "fr",
            value: "",
            visible: true,
          },
          {
            lang: "es",
            value: "",
            visible: true,
          },
          {
            lang: "pt",
            value: "",
            visible: true,
          },
          {
            lang: "zh",
            value: "",
            visible: true,
          },
          {
            lang: "en",
            value: "",
            visible: true,
          },
        ],
        defaultFilter: "1=1",
        defaultPlaceholder: "@answer",
        order: 3,
        parentInteraction: ["patient.interactions.item"],
        parentInteractionLabel: "Item Parent",
        attributes: {
          linkID: {
            name: [
              {
                lang: "",
                value: "Link ID",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@answer.LINK_ID",
            order: 0,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          valueCodingValue: {
            name: [
              {
                lang: "",
                value: "Value coding value",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@answer.VALUECODING_CODE",
            order: 1,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          valueType: {
            name: [
              {
                lang: "",
                value: "Value type",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@answer.VALUE_TYPE",
            order: 2,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          value: {
            name: [
              {
                lang: "",
                value: "Value",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@answer.VALUE",
            order: 3,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
        },
      },
      item: {
        name: [
          {
            lang: "",
            value: "Item",
          },
        ],
        disabledLangName: [
          {
            lang: "de",
            value: "",
            visible: true,
          },
          {
            lang: "fr",
            value: "",
            visible: true,
          },
          {
            lang: "es",
            value: "",
            visible: true,
          },
          {
            lang: "pt",
            value: "",
            visible: true,
          },
          {
            lang: "zh",
            value: "",
            visible: true,
          },
          {
            lang: "en",
            value: "",
            visible: true,
          },
        ],
        defaultFilter: "1=1",
        defaultPlaceholder: "@item",
        order: 2,
        parentInteraction: ["patient.interactions.questionnaire"],
        parentInteractionLabel: "Questionnaire Parent",
        attributes: {
          linkID: {
            name: [
              {
                lang: "",
                value: "Link ID",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@item.LINK_ID",
            order: 0,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          recordID: {
            name: [
              {
                lang: "",
                value: "Item ID",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@item.ITEM_ID",
            order: 1,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
          text: {
            name: [
              {
                lang: "",
                value: "Text",
              },
            ],
            disabledLangName: [
              {
                lang: "en",
                value: "",
                visible: true,
              },
              {
                lang: "de",
                value: "",
                visible: true,
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
            expression: "@item.TEXT",
            order: 2,
            domainFilter: "",
            standardConceptCodeFilter: "",
          },
        },
      },
    },
    attributes: {
      pid: {
        name: [
          {
            lang: "",
            value: "Person id",
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
        expression: "@PATIENT.content.id",
        order: 0,
        annotations: ["person_id"],
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
        measureExpression: "COUNT(DISTINCT(@PATIENT.content.id))",
        order: 1,
        domainFilter: "",
        standardConceptCodeFilter: "",
      },
      monthOfBirth: {
        name: [
          {
            lang: "",
            value: "Month of Birth",
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
        expression: "@PATIENT.birthDate",
        order: 2,
        domainFilter: "",
        standardConceptCodeFilter: "",
      },
      yearOfBirth: {
        name: [
          {
            lang: "",
            value: "Year of Birth",
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
        expression: "@PATIENT.birthDate",
        order: 3,
        domainFilter: "",
        standardConceptCodeFilter: "",
      },
      dateOfBirth: {
        name: [
          {
            lang: "",
            value: "Birth Datetime",
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
        type: "datetime",
        expression: "@PATIENT.birthDate",
        order: 4,
        annotations: ["birth_datetime"],
        domainFilter: "",
        standardConceptCodeFilter: "",
      },
      gendersourcevalue: {
        name: [
          {
            lang: "",
            value: "Gender source value",
          },
        ],
        disabledLangName: [
          {
            lang: "en",
            value: "",
            visible: true,
          },
          {
            lang: "de",
            value: "",
            visible: true,
          },
          {
            lang: "fr",
            value: "",
            visible: true,
          },
          {
            lang: "es",
            value: "",
            visible: true,
          },
          {
            lang: "pt",
            value: "",
            visible: true,
          },
          {
            lang: "zh",
            value: "",
            visible: true,
          },
        ],
        type: "text",
        expression: "@PATIENT.gender",
        order: 5,
        domainFilter: "",
        standardConceptCodeFilter: "",
      },
      Age: {
        name: [
          {
            lang: "",
            value: "Age",
          },
        ],
        disabledLangName: [
          {
            lang: "de",
            value: "",
            visible: true,
          },
          {
            lang: "fr",
            value: "",
            visible: true,
          },
          {
            lang: "es",
            value: "",
            visible: true,
          },
          {
            lang: "pt",
            value: "",
            visible: true,
          },
          {
            lang: "zh",
            value: "",
            visible: true,
          },
          {
            lang: "en",
            value: "",
          },
        ],
        type: "num",
        expression: "YEAR(CURRENT_DATE) - YEAR(@PATIENT.birthDate::DATE)",
        order: 6,
        domainFilter: "",
        standardConceptCodeFilter: "",
      },
      patientname: {
        name: [
          {
            lang: "",
            value: "Patient Name",
          },
        ],
        disabledLangName: [
          {
            lang: "de",
            value: "",
            visible: true,
          },
          {
            lang: "fr",
            value: "",
            visible: true,
          },
          {
            lang: "es",
            value: "",
            visible: true,
          },
          {
            lang: "pt",
            value: "",
            visible: true,
          },
          {
            lang: "zh",
            value: "",
            visible: true,
          },
          {
            lang: "en",
            value: "",
          },
        ],
        type: "text",
        // TODO: Remove/fix for searching on both given and family name at the same time
        // expression:
        //   "(SELECT unnest(givenname) from (SELECT unnest(name).given as givenname))",
        expression: "(SELECT unnest(name).family)",
        order: 7,
        domainFilter: "",
        standardConceptCodeFilter: "",
      },
      familyname: {
        name: [
          {
            lang: "",
            value: "Family Name",
          },
        ],
        disabledLangName: [
          {
            lang: "de",
            value: "",
            visible: true,
          },
          {
            lang: "fr",
            value: "",
            visible: true,
          },
          {
            lang: "es",
            value: "",
            visible: true,
          },
          {
            lang: "pt",
            value: "",
            visible: true,
          },
          {
            lang: "zh",
            value: "",
            visible: true,
          },
          {
            lang: "en",
            value: "",
          },
        ],
        type: "text",
        expression: "name[1].family",
        order: 7,
        domainFilter: "",
        standardConceptCodeFilter: "",
      },
      givenname: {
        name: [
          {
            lang: "",
            value: "Given Name",
          },
        ],
        disabledLangName: [
          {
            lang: "de",
            value: "",
            visible: true,
          },
          {
            lang: "fr",
            value: "",
            visible: true,
          },
          {
            lang: "es",
            value: "",
            visible: true,
          },
          {
            lang: "pt",
            value: "",
            visible: true,
          },
          {
            lang: "zh",
            value: "",
            visible: true,
          },
          {
            lang: "en",
            value: "",
          },
        ],
        type: "text",
        expression: "name[1].given",
        order: 8,
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
          placeholder: "@response",
          attributeTables: [],
          hierarchy: false,
          time: true,
          oneToN: false,
          condition: false,
        },
        {
          placeholder: "@answer",
          attributeTables: [],
          hierarchy: false,
          time: true,
          oneToN: false,
          condition: false,
        },
        {
          placeholder: "@item",
          attributeTables: [],
          hierarchy: false,
          time: true,
          oneToN: false,
          condition: false,
        },
      ],
    },
    tableMapping: {
      "@response": "$$SCHEMA$$.VIEW::GDM.QUESTIONNAIRE_RESPONSE_BASE",
      "@RESPONSE.PATIENT_ID": "PERSON_ID",
      "@RESPONSE.INTERACTION_ID": "ID",
      "@RESPONSE.CONDITION_ID": "VALUE",
      "@RESPONSE.PARENT_INTERACT_ID": "ANSWER_ID",
      "@response.START": "AUTHORED",
      "@RESPONSE.END": "AUTHORED",
      "@RESPONSE.INTERACTION_TYPE": "VALUE_TYPE",
      "@answer": "$$SCHEMA$$.VIEW::GDM.QUESTIONNAIRE_RESPONSE_BASE",
      "@ANSWER.PATIENT_ID": "PERSON_ID",
      "@ANSWER.INTERACTION_ID": "ANSWER_ID",
      "@ANSWER.CONDITION_ID": "VALUE",
      "@ANSWER.PARENT_INTERACT_ID": "ITEM_ID",
      "@answer.START": "AUTHORED",
      "@ANSWER.END": "AUTHORED",
      "@ANSWER.INTERACTION_TYPE": "VALUE_TYPE",
      "@item": "$$SCHEMA$$.VIEW::GDM.QUESTIONNAIRE_RESPONSE_BASE",
      "@ITEM.PATIENT_ID": "PERSON_ID",
      "@ITEM.INTERACTION_ID": "ITEM_ID",
      "@ITEM.CONDITION_ID": "VALUE",
      "@ITEM.PARENT_INTERACT_ID": "QUESTIONNAIRE_REFERENCE",
      "@item.START": "AUTHORED",
      "@ITEM.END": "AUTHORED",
      "@ITEM.INTERACTION_TYPE": "VALUE_TYPE",
      "@PATIENT": "$$SCHEMA$$.Patient",
      "@PATIENT.PATIENT_ID": "id",
      "@PATIENT.DOD": "deathDate",
      "@PATIENT.DOB": "birthDate",
    },
    guardedTableMapping: {
      "@PATIENT": "$$SCHEMA$$.Patient",
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

export const paFHIRConfigDuckdb = {
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
            order: 3,
          },
          patientlist: {
            initial: true,
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
            order: 4,
          },
          patientlist: {
            initial: true,
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
            order: 5,
          },
          patientlist: {
            initial: false,
            visible: true,
            linkColumn: false,
          },
          modelName: "Birth Datetime",
        },
        {
          source: "patient.attributes.gendersourcevalue",
          ordered: false,
          cached: true,
          useRefText: true,
          useRefValue: true,
          category: true,
          measure: false,
          filtercard: {
            initial: false,
            visible: true,
            order: 6,
          },
          patientlist: {
            initial: true,
            visible: true,
            linkColumn: false,
          },
          modelName: "Gender source value",
        },
        {
          source: "patient.attributes.Age",
          ordered: true,
          cached: true,
          useRefText: false,
          useRefValue: false,
          category: true,
          measure: true,
          filtercard: {
            initial: false,
            visible: true,
            order: 7,
          },
          patientlist: {
            initial: true,
            visible: true,
            linkColumn: false,
          },
          modelName: "Age",
        },
        {
          source: "patient.attributes.patientname",
          ordered: true,
          cached: true,
          useRefText: true,
          useRefValue: true,
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
          modelName: "Patient Name",
        },
        {
          source: "patient.attributes.familyname",
          ordered: true,
          cached: true,
          useRefText: true,
          useRefValue: true,
          category: true,
          measure: true,
          filtercard: {
            initial: false,
            visible: true,
            order: 9,
          },
          patientlist: {
            initial: true,
            visible: true,
            linkColumn: false,
          },
          modelName: "Family Name",
        },
        {
          source: "patient.attributes.givenname",
          ordered: true,
          cached: true,
          useRefText: true,
          useRefValue: true,
          category: true,
          measure: true,
          filtercard: {
            initial: false,
            visible: true,
            order: 10,
          },
          patientlist: {
            initial: true,
            visible: true,
            linkColumn: false,
          },
          modelName: "Given Name",
        },
      ],
      initialPatientlistColumn: true,
      modelName: "MRI_PA_SERVICES_FILTERCARD_TITLE_BASIC_DATA",
    },
    {
      source: "patient.interactions.questionnaire",
      visible: true,
      order: 2,
      initial: false,
      attributes: [
        {
          source: "patient.interactions.questionnaire.attributes.linkID",
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
          modelName: "Link ID",
        },
        {
          source:
            "patient.interactions.questionnaire.attributes.valueCodingValue",
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
          modelName: "Value coding value",
        },
        {
          source: "patient.interactions.questionnaire.attributes.recordID",
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
          modelName: "Record ID",
        },
        {
          source:
            "patient.interactions.questionnaire.attributes.questionnaireLanguage",
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
          modelName: "Questionnaire language",
        },
        {
          source:
            "patient.interactions.questionnaire.attributes.questionnaireStatus",
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
          modelName: "Questionnaire status",
        },
        {
          source:
            "patient.interactions.questionnaire.attributes.questionnaireAuthored",
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
          modelName: "Questionnaire authored",
        },
        {
          source: "patient.interactions.questionnaire.attributes.text",
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
          modelName: "Text",
        },
        {
          source: "patient.interactions.questionnaire.attributes.valueType",
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
          modelName: "Value type",
        },
        {
          source: "patient.interactions.questionnaire.attributes.value",
          ordered: false,
          cached: true,
          useRefText: false,
          useRefValue: false,
          category: true,
          measure: false,
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
          modelName: "Value",
        },
        {
          source:
            "patient.interactions.questionnaire.attributes.questionnaireReference",
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
          modelName: "Questionnaire reference",
        },
        {
          source:
            "patient.interactions.questionnaire.attributes.questionnaireVersion",
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
          modelName: "Questionnaire version",
        },
        {
          source:
            "patient.interactions.questionnaire.attributes.extensionEffectiveDateUrl",
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
          modelName: "Questionaire extension effective date url",
        },
        {
          source:
            "patient.interactions.questionnaire.attributes.extensionValuedate",
          ordered: false,
          cached: true,
          useRefText: false,
          useRefValue: false,
          category: true,
          measure: false,
          filtercard: {
            initial: false,
            visible: true,
            order: 13,
          },
          patientlist: {
            initial: false,
            visible: true,
            linkColumn: false,
          },
          modelName: "Questionaire extension valuedate",
        },
      ],
      initialPatientlistColumn: false,
      modelName: "Questionnaire",
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
