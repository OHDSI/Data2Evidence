export type FieldType = "text" | "number" | "date" | "select";

export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  validation?: Record<string, any>;
  options?: Array<{ label: string; value: string }>; // For select fields
}

export interface ResultAction {
  id: string;
  label: string;
  type: "deep-link" | "download" | "placeholder";
  urlTemplate?: string;
}

export interface WizardDefinition {
  id: string;
  name: string;
  description: string;
  fields: FieldDefinition[];
  resultActions: ResultAction[];
}

export interface WizardState {
  currentStep: 1 | 2 | 3 | 4;
  selectedWizardId: string | null;
  selectedWizard: WizardDefinition | null;
  formData: Record<string, any>;
}
