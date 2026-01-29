import type { WizardDefinition } from "../types/wizard";

/**
 * Hardcoded wizard definitions.
 * This will be replaced with API calls in the future.
 */
const wizardDefinitions: WizardDefinition[] = [
  {
    id: "patient-count",
    name: "Patient Count Estimation",
    description: "Estimate patient counts based on age criteria",
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
    resultActions: [
      {
        id: "view-cohort",
        type: "deep-link",
        label: "View Cohort on D2E",
        urlTemplate:
          "/d2e/portal/researcher?datasetId={datasetId}&route=cohort&linkType=cohort-definition&query={encodedConfig}",
      },
      {
        id: "download-sql",
        type: "placeholder",
        label: "Download SQL",
      },
    ],
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
