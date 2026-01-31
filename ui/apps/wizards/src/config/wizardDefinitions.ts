import type { WizardDefinition, FieldDefinition } from "../types/wizard";

/**
 * Shared MVP field definitions for new wizards.
 */
const MVP_FIELDS: FieldDefinition[] = [
  {
    id: "height",
    type: "number",
    label: "Height (cm)",
    required: true,
    validation: {
      min: 0,
    },
    placeholder: "Height (cm)",
  },
  {
    id: "weight",
    type: "number",
    label: "Weight (kg)",
    required: true,
    validation: {
      min: 0,
    },
    placeholder: "Weight (kg)",
  },
  {
    id: "gender",
    type: "select",
    label: "Gender",
    required: false,
    options: [
      { label: "Male", value: "8507" },
      { label: "Female", value: "8532" },
    ],
    placeholder: "Gender",
  },
];

/**
 * Hardcoded wizard definitions.
 * This will be replaced with API calls in the future.
 */
const wizardDefinitions: WizardDefinition[] = [
  {
    id: "patient-count",
    name: "Patient Count Estimation",
    description: "Estimate patient counts based on age criteria",
    hidden: true,
    fields: [
      {
        id: "minAge",
        type: "number",
        label: "Minimum Age",
        required: true,
        validation: {
          min: 0,
          max: 120,
        },
      },
      {
        id: "maxAge",
        type: "number",
        label: "Maximum Age",
        required: true,
        validation: {
          min: 0,
          max: 120,
        },
      },
    ],
    steps: [
      { id: "intro", type: "intro" as const, title: "Introduction" },
      {
        id: "form",
        type: "form" as const,
        title: "Form",
        config: { submitLabel: "Submit", submitAction: "next-step" as const },
      },
      { id: "results", type: "results" as const, title: "Results" },
    ],
    resultActions: [
      {
        id: "view-cohort",
        type: "deep-link",
        label: "View Cohort on D2E",
        urlTemplate:
          "/d2e/portal/researcher/cohort?datasetId={datasetId}&linkType=cohort-definition&query=eJzVVl1v2jAU_SvIzwkjTQoVD5PC14a0loqyp2lCN_YNWAtJ5DgIVvHfex1ooCNtWLVp2ksUX597fO6X7EcWykijYt1HxpM4lItb1CBAg7FIwbrMCzm6POjY7lUQ2l7gte0bHgAt0Qs7HXA8IZjF1qgymcTk4LOdxTgokR1YNcaadb-d_dNp96CX5JKClmbDYjLONMQc7_JVYGS1jqbx4AUyhhWSoQeZ5I2BUWygwLVckz2EKEMyZMNYq-3peiN1udTb1HCMihz0STJxgNZKBrnGKvlnkptHeNNfIKuWe446nOw_28lE9JlWIGN9dvIBPdykCrMizRZLUlSgE8oR-2jyD1FOmOvW7nvJ3kuSCCHuExPRUjqNF9knU7bbWfUBfcJYoJoTjGOq50XG6wOs9vqdgP9cBCtyXE7CnlSEqJf-C_wvaK6H-XcDM0Ag1kbpTK5wdBjROI-iC6trXdC5FAN1EM0LhdQkhJDmN-E8Vwrp6IppdF5JYR1V0zkObP95uzEp9xv-vxneWt0nvVFuHxo7Q_1aR9Wno574_-29i4_JEkXq2e10PL_35_3P_nQ2f5jQZzAc-V-_zIp7ZAlKz_Z0lGn-A4syb2T2gBEWKS7KW-ZzLC4a7YAKJ38a1viDuTk4aFwkalu4b5xigl5y7nFv-1290899p59X4VcRe8qTvLgz32TbOkXtVicPgPJSd6kUxki9Od4_ClrXEPDQdtuibXt4c2OD5wkbhIPoQitotZHtngC7x-Rw",
      },
      {
        id: "download-sql",
        type: "placeholder",
        label: "Download SQL",
      },
    ],
  },
  {
    id: "calculate-incidence",
    name: "Calculate Incidence",
    description:
      "This wizard will calculate the incidence for a particular clinical condition. This calculation is done in SQL, and this works by finding the first instance of the condition (the diagnostic code) and determining if it occurs between a particular set of dates that you specify.",
    fields: MVP_FIELDS,
    steps: [
      {
        id: "form",
        type: "form" as const,
        title: "Form",
        note: "Note: this is a very rough approximation that is just a starting a more comprehensive analysis.",
        config: { submitLabel: "Open cohort", submitAction: "deep-link" as const },
      },
    ],
    resultActions: [],
  },
  {
    id: "calculate-prevalence",
    name: "Calculate Prevalence",
    description:
      "This wizard will calculate the prevalence for a particular clinical condition. This calculation is done in SQL, and this works by finding the first instance of a condition.",
    fields: MVP_FIELDS,
    steps: [
      {
        id: "form",
        type: "form" as const,
        title: "Form",
        config: { submitLabel: "Open cohort", submitAction: "deep-link" as const },
      },
    ],
    resultActions: [],
  },
  {
    id: "calculate-mortality",
    name: "Calculate Mortality",
    description:
      "This wizard will calculate the mortality rate for a particular clinical condition, and works by death dates that co-occur with a condition between a particular set of dates that you specify.",
    fields: MVP_FIELDS,
    steps: [
      {
        id: "form",
        type: "form" as const,
        title: "Form",
        config: { submitLabel: "Open cohort", submitAction: "deep-link" as const },
      },
    ],
    resultActions: [],
  },
  {
    id: "cross-sectional-demographics",
    name: "Cross sectional Demographics",
    description: "Assessment of hypertension and cholesterol levels in post-operative patients.",
    fields: MVP_FIELDS,
    steps: [
      {
        id: "form",
        type: "form" as const,
        title: "Form",
        config: { submitLabel: "Open cohort", submitAction: "deep-link" as const },
      },
    ],
    resultActions: [],
  },
];

/**
 * Get all available wizard definitions.
 * Returns a promise to mimic future API calls.
 */
export async function getWizardDefinitions(): Promise<WizardDefinition[]> {
  return Promise.resolve(wizardDefinitions);
}

/**
 * Get a specific wizard definition by ID.
 * Returns undefined if the wizard is not found.
 */
export async function getWizardById(id: string): Promise<WizardDefinition | undefined> {
  return Promise.resolve(wizardDefinitions.find((wizard) => wizard.id === id));
}
