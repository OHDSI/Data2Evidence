import type { WizardDefinition, FieldDefinition } from "../types/wizard";
import { fetchCdwConfig, getAttributeByPath } from "./cdwConfig";
import type { CdwConfig } from "./cdwConfig";

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
    label: attr.name || field.label,
    placeholder: attr.name || field.placeholder,
  };
}

/**
 * Enrich all fields in a wizard definition using CDW config.
 */
function enrichWizard(wizard: WizardDefinition, cdwConfig: CdwConfig): WizardDefinition {
  return {
    ...wizard,
    fields: wizard.fields.map((field) => enrichField(field, cdwConfig)),
  };
}

/**
 * Shared field definitions mapped to CDW config paths.
 * Type, label, and placeholder are defaults that get overridden by CDW config.
 */
const WIZARD_FIELDS: FieldDefinition[] = [
  {
    id: "age",
    type: "num",
    label: "Age",
    required: false,
    configPath: "patient.attributes.Age",
    placeholder: "Age",
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
        type: "num",
        label: "Minimum Age",
        required: true,
        validation: {
          min: 0,
          max: 120,
        },
      },
      {
        id: "maxAge",
        type: "num",
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
    fields: WIZARD_FIELDS,
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
 * Get all available wizard definitions, enriched with CDW config data.
 */
export async function getWizardDefinitions(datasetId?: string): Promise<WizardDefinition[]> {
  const cdwConfig = await fetchCdwConfig(datasetId);
  return wizardDefinitions.map((wizard) => enrichWizard(wizard, cdwConfig));
}

/**
 * Get a specific wizard definition by ID, enriched with CDW config data.
 */
export async function getWizardById(id: string, datasetId?: string): Promise<WizardDefinition | undefined> {
  const wizard = wizardDefinitions.find((w) => w.id === id);
  if (!wizard) return undefined;

  const cdwConfig = await fetchCdwConfig(datasetId);
  return enrichWizard(wizard, cdwConfig);
}
