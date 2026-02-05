export type FieldType = "text" | "num" | "datetime" | "time" | "yearRange";

export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  configPath?: string;
  placeholder?: string;
  /** For compound fields: override the filter card path (e.g. "patient.interactions.measurement") */
  filterCardPath?: string;
  /** For compound fields: fixed attributes added to the same filter card */
  fixedAttributes?: Array<{
    configPath: string;
    operator: string;
    value: string | number;
  }>;
  /** If true, this field is stored in the wizards query param only, not in the MRI bookmark */
  isWizardField?: boolean;
}

/**
 * Step types supported by the wizard system.
 * - selection: Wizard selection grid
 * - form: Form input step
 * - results: Results display step
 * - intro: Introduction/overview step
 */
export type StepType = "selection" | "form" | "results" | "intro";

/**
 * Configuration for a form step.
 */
export interface FormStepConfig {
  /** Label for the submit button */
  submitLabel: string;
  /** Action to perform on submit */
  submitAction: "deep-link" | "next-step";
}

/**
 * Configuration for an intro step.
 */
export interface IntroStepConfig {
  /** List of input concepts for this scenario */
  inputs: string[];
  /** List of output concepts for this scenario */
  outputs: string[];
}

/**
 * Union type for step-specific configurations.
 */
export type StepTypeConfig = FormStepConfig | IntroStepConfig | Record<string, any>;

/**
 * Configuration for a single step in a wizard's flow.
 */
export interface WizardStepConfig {
  /** Unique identifier for this step */
  id: string;
  /** Type of step determines which component renders it */
  type: StepType;
  /** Optional title override (defaults to wizard name) */
  title?: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Optional note text displayed in the step */
  note?: string;
  /** Step-type-specific configuration */
  config?: StepTypeConfig;
}

/**
 * External wizard configuration (from backend/config).
 * Simplified to only contain the variable parts - fields and metadata.
 */
export interface WizardConfig {
  id: string;
  name: string;
  description: string;
  /** All fields — MRI bookmark fields and wizard-only fields (isWizardField: true) */
  fields: FieldDefinition[];
}

/**
 * Internal wizard definition with hardcoded steps.
 * Extended from WizardConfig with runtime-added properties.
 */
export interface WizardDefinition extends WizardConfig {
  /** Step configuration - hardcoded in the app */
  steps: WizardStepConfig[];
}

/**
 * Wizard state tracking current position and selections.
 * currentStepIndex values:
 * - -1: Selection page (choosing a wizard)
 * - 0+: Index into the wizard's steps array
 */
export interface WizardState {
  currentStepIndex: number;
  selectedWizardId: string | null;
  selectedWizard: WizardDefinition | null;
  formData: Record<string, any>;
}
