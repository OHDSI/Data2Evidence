export const inclusionReportbasicDataConfig = {
    name: [
        {
            lang: "",
            value: "Basic Data",
        },
    ],
    disabledLangName: [
        {
            lang: "en",
            value: "",
            visible: true,
        },
    ],
    defaultFilter: "1=1",
    defaultPlaceholder: "@PATIENT",
    order: 99,
    parentInteraction: [],
    parentInteractionLabel: "parent",
    cohortDefinitionKey: "Patient",
    conceptIdentifierType: "",
    attributes: {}, // To be updated with values from config.patient.attributes
};
