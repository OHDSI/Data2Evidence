import type { WizardDefinition, FieldDefinition } from "../types/wizard";
import { fetchCdwConfig, getAttributeByPath } from "./cdwConfig";
import type { CdwConfig } from "./cdwConfig";
import client from "../axios/request";

const isDev = import.meta.env.DEV;

/**
 * Enrich a field definition using CDW config data looked up via configPath.
 */
function enrichField(field: FieldDefinition, cdwConfig: CdwConfig): FieldDefinition {
  if (!field.configPath) return field;

  const attr = getAttributeByPath(cdwConfig, field.configPath);
  if (!attr) return field;

  return {
    ...field,
    type: attr.type,
    label: field.label || attr.name,
  };
}

/**
 * Enrich all fields in a wizard definition using CDW config.
 */
function enrichWizard(wizard: WizardDefinition, cdwConfig: CdwConfig): WizardDefinition {
  return {
    ...wizard,
    fields: wizard.fields.map((field) => enrichField(field, cdwConfig)),
    wizardFields: wizard.wizardFields?.map((field) => enrichField(field, cdwConfig)),
  };
}

/**
 * Dev-only mock definitions used when running locally without the portal backend.
 */
const WIZARD_FIELDS: FieldDefinition[] = [
  {
    id: "age",
    type: "num",
    label: "Age Range",
    required: false,
    configPath: "patient.attributes.Age",
  },
  {
    id: "gender",
    type: "text",
    label: "Gender",
    required: false,
    configPath: "patient.attributes.Gender_concept_name",
  },
  {
    id: "ethnicity",
    type: "text",
    label: "Ethnicity",
    required: false,
    configPath: "patient.attributes.ethnicityName",
  },
  {
    id: "race",
    type: "text",
    label: "Race",
    required: false,
    configPath: "patient.attributes.raceName",
  },
  // Commenting to provide example of having conditions as a filter
  // {
  //   id: "condition",
  //   type: "text",
  //   label: "Condition",
  //   required: false,
  //   configPath: "patient.interactions.conditionoccurrence.attributes.condition_occ_concept_name",
  // },
  // {
  //   id: "condition2",
  //   type: "text",
  //   label: "Condition2",
  //   required: false,
  //   configPath: "patient.interactions.conditionoccurrence.attributes.condition_occ_concept_name",
  // },
  {
    id: "height",
    type: "num",
    label: "Height",
    required: false,
    configPath: "patient.interactions.measurement.attributes.numval",
    filterCardPath: "patient.interactions.measurement",
    fixedAttributes: [
      {
        configPath: "patient.interactions.measurement.attributes.meas_concept_name",
        operator: "=",
        value: "Body Height",
      },
    ],
  },
  {
    id: "weight",
    type: "num",
    label: "Weight",
    required: false,
    configPath: "patient.interactions.measurement.attributes.numval",
    filterCardPath: "patient.interactions.measurement",
    fixedAttributes: [
      {
        configPath: "patient.interactions.measurement.attributes.meas_concept_name",
        operator: "=",
        value: "Body Weight",
      },
    ],
  },
  {
    id: "bmi",
    type: "num",
    label: "BMI",
    required: false,
    configPath: "patient.interactions.measurement.attributes.numval",
    filterCardPath: "patient.interactions.measurement",
    fixedAttributes: [
      {
        configPath: "patient.interactions.measurement.attributes.meas_concept_name",
        operator: "=",
        value: "Body mass index",
      },
    ],
  },
  {
    id: "respRate",
    type: "num",
    label: "Resp Rate",
    required: false,
    configPath: "patient.interactions.measurement.attributes.numval",
    filterCardPath: "patient.interactions.measurement",
    fixedAttributes: [
      {
        configPath: "patient.interactions.measurement.attributes.meas_concept_name",
        operator: "=",
        value: "Respiratory rate",
      },
    ],
  },
  {
    id: "pulseRate",
    type: "num",
    label: "Pulse Rate",
    required: false,
    configPath: "patient.interactions.measurement.attributes.numval",
    filterCardPath: "patient.interactions.measurement",
    fixedAttributes: [
      {
        configPath: "patient.interactions.measurement.attributes.meas_concept_name",
        operator: "=",
        value: "Pulse rate",
      },
    ],
  },
  {
    id: "systolicBp",
    type: "num",
    label: "Systolic Blood Pressure",
    required: false,
    configPath: "patient.interactions.measurement.attributes.numval",
    filterCardPath: "patient.interactions.measurement",
    fixedAttributes: [
      {
        configPath: "patient.interactions.measurement.attributes.meas_concept_name",
        operator: "=",
        value: "Systolic blood pressure",
      },
    ],
  },
  {
    id: "diastolicBp",
    type: "num",
    label: "Diastolic Blood Pressure",
    required: false,
    configPath: "patient.interactions.measurement.attributes.numval",
    filterCardPath: "patient.interactions.measurement",
    fixedAttributes: [
      {
        configPath: "patient.interactions.measurement.attributes.meas_concept_name",
        operator: "=",
        value: "Diastolic blood pressure",
      },
    ],
  },
];

const WIZARD_ONLY_FIELDS: FieldDefinition[] = [
  {
    id: "year",
    type: "yearRange",
    label: "Years",
    required: false,
  },
  {
    id: "condition1",
    type: "text",
    label: "Condition 1",
    required: false,
    configPath: "patient.interactions.conditionoccurrence.attributes.condition_occ_concept_name",
  },
  {
    id: "condition2",
    type: "text",
    label: "Condition 2",
    required: false,
    configPath: "patient.interactions.conditionoccurrence.attributes.condition_occ_concept_name",
  },
  {
    id: "condition3",
    type: "text",
    label: "Condition 3",
    required: false,
    configPath: "patient.interactions.conditionoccurrence.attributes.condition_occ_concept_name",
  },
  {
    id: "condition4",
    type: "text",
    label: "Condition 4",
    required: false,
    configPath: "patient.interactions.conditionoccurrence.attributes.condition_occ_concept_name",
  },
  {
    id: "condition5",
    type: "text",
    label: "Condition 5",
    required: false,
    configPath: "patient.interactions.conditionoccurrence.attributes.condition_occ_concept_name",
  },
  {
    id: "condition6",
    type: "text",
    label: "Condition 6",
    required: false,
    configPath: "patient.interactions.conditionoccurrence.attributes.condition_occ_concept_name",
  },
];

const mockWizardDefinitions: WizardDefinition[] = [
  {
    id: "calculate-incidence",
    name: "Calculate Incidence",
    description:
      "This wizard will calculate the incidence for a particular clinical condition. This calculation is done in SQL, and this works by finding the first instance of the condition (the diagnostic code) and determining if it occurs between a particular set of dates that you specify.",
    fields: WIZARD_FIELDS,
    wizardFields: WIZARD_ONLY_FIELDS,
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
    fields: WIZARD_FIELDS,
    wizardFields: WIZARD_ONLY_FIELDS,
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
    fields: WIZARD_FIELDS,
    wizardFields: WIZARD_ONLY_FIELDS,
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
    fields: WIZARD_FIELDS,
    wizardFields: WIZARD_ONLY_FIELDS,
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
 * Fetch wizard definitions from the portal backend API.
 * Falls back to mock definitions in dev mode.
 */
async function fetchWizardDefinitions(datasetId?: string): Promise<WizardDefinition[]> {
  if (isDev) {
    return mockWizardDefinitions;
  }

  const response = await client.get("/d2e/pa-config-svc/wizards/config", {
    params: { datasetId },
  });

  // Validate response is an object
  if (!response.data || typeof response.data !== "object") {
    console.warn("[Wizards] Invalid config response:", response.data);
    return [];
  }

  const wizards = response.data.wizards;

  // Validate that wizards is an array
  if (!Array.isArray(wizards)) {
    console.warn("[Wizards] Invalid config: wizards is not an array", wizards);
    return [];
  }

  // Filter out invalid wizard entries
  return wizards.filter((wizard) => {
    if (!wizard || typeof wizard !== "object") {
      console.warn("[Wizards] Skipping invalid wizard entry:", wizard);
      return false;
    }
    if (!wizard.id || typeof wizard.id !== "string") {
      console.warn("[Wizards] Skipping wizard without valid id:", wizard);
      return false;
    }
    if (!Array.isArray(wizard.fields)) {
      console.warn("[Wizards] Skipping wizard without fields array:", wizard.id);
      return false;
    }
    if (!Array.isArray(wizard.steps)) {
      console.warn("[Wizards] Skipping wizard without steps array:", wizard.id);
      return false;
    }
    return true;
  });
}

/**
 * Get all available wizard definitions, enriched with CDW config data.
 */
export async function getWizardDefinitions(datasetId?: string): Promise<WizardDefinition[]> {
  const [definitions, { config: cdwConfig }] = await Promise.all([
    fetchWizardDefinitions(datasetId),
    fetchCdwConfig(datasetId),
  ]);
  return definitions.map((wizard) => enrichWizard(wizard, cdwConfig));
}

/**
 * Get a specific wizard definition by ID, enriched with CDW config data.
 */
export async function getWizardById(id: string, datasetId?: string): Promise<WizardDefinition | undefined> {
  const definitions = await fetchWizardDefinitions(datasetId);
  const wizard = definitions.find((w) => w.id === id);
  if (!wizard) return undefined;

  const { config: cdwConfig } = await fetchCdwConfig(datasetId);
  return enrichWizard(wizard, cdwConfig);
}
