export type FieldType = "text" | "num" | "datetime" | "time";

export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  validation?: Record<string, any>;
  options?: Array<{ label: string; value: string }>; // For select fields
  configPath?: string;
  group?: string;
  placeholder?: string;
}

export interface ResultAction {
  id: string;
  label: string;
  type: "deep-link" | "download" | "placeholder";
  urlTemplate?: string;
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

export interface WizardDefinition {
  id: string;
  name: string;
  description: string;
  fields: FieldDefinition[];
  resultActions: ResultAction[];
  /** Step configuration defining the wizard's flow */
  steps: WizardStepConfig[];
  hidden?: boolean;
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
