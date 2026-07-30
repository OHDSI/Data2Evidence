import type { FieldDefinition, WizardFieldGroup, WizardFormSection } from "../types/wizard";

export interface ResolvedWizardFieldGroup extends WizardFieldGroup {
  fields: FieldDefinition[];
}

export interface ResolvedWizardFormSection extends Omit<WizardFormSection, "groups"> {
  groups: ResolvedWizardFieldGroup[];
}

export interface ResolvedWizardFormLayout {
  sections: ResolvedWizardFormSection[];
  ungroupedFields: FieldDefinition[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function isFieldAnswered(field: FieldDefinition, formValues: Record<string, unknown>): boolean {
  if (field.type === "yearRange") {
    return hasValue(formValues[`${field.id}_from`]) || hasValue(formValues[`${field.id}_to`]);
  }

  return hasValue(formValues[field.id]);
}

/**
 * Resolves config field IDs to the fields available on a particular wizard.
 * Missing IDs are ignored and unreferenced fields are returned separately so
 * a wizard layout remains resilient when its field list changes.
 */
export function resolveWizardFormLayout(
  fields: FieldDefinition[],
  sections?: WizardFormSection[],
): ResolvedWizardFormLayout {
  if (!sections?.length) {
    return { sections: [], ungroupedFields: fields };
  }

  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const renderedFieldIds = new Set<string>();

  const resolvedSections = sections
    .map((section) => {
      const groups = section.groups
        .map((group) => {
          const resolvedFields = group.fieldIds.flatMap((fieldId) => {
            const field = fieldsById.get(fieldId);
            if (!field || renderedFieldIds.has(fieldId)) return [];
            renderedFieldIds.add(fieldId);
            return [field];
          });

          return { ...group, fields: resolvedFields };
        })
        .filter((group) => group.fields.length > 0);

      return { ...section, groups };
    })
    .filter((section) => section.groups.length > 0);

  return {
    sections: resolvedSections,
    ungroupedFields: fields.filter((field) => !renderedFieldIds.has(field.id)),
  };
}

export function getFieldGroupValidationMessage(
  group: ResolvedWizardFieldGroup,
  formValues: Record<string, unknown>,
): string | null {
  const minAnswered = group.validation?.minAnswered;
  const maxAnswered = group.validation?.maxAnswered;
  if (minAnswered === undefined && maxAnswered === undefined) return null;

  const answeredCount = group.fields.filter((field) => isFieldAnswered(field, formValues)).length;
  if (minAnswered !== undefined && answeredCount < minAnswered) {
    return (
      group.validation?.minMessage ||
      group.validation?.message ||
      `Complete at least ${minAnswered} ${minAnswered === 1 ? "field" : "fields"} in this group.`
    );
  }
  if (maxAnswered !== undefined && answeredCount > maxAnswered) {
    return (
      group.validation?.maxMessage ||
      group.validation?.message ||
      `Complete no more than ${maxAnswered} ${maxAnswered === 1 ? "field" : "fields"} in this group.`
    );
  }

  return null;
}

export function getFieldGroupCompletionHint(group: ResolvedWizardFieldGroup): string | null {
  const minAnswered = group.validation?.minAnswered;
  const maxAnswered = group.validation?.maxAnswered;

  if (minAnswered !== undefined && maxAnswered !== undefined) {
    if (minAnswered === maxAnswered) {
      return `Complete exactly ${minAnswered} ${minAnswered === 1 ? "field" : "fields"}`;
    }
    return `Complete ${minAnswered} to ${maxAnswered} fields`;
  }
  if (minAnswered !== undefined) {
    return `Complete at least ${minAnswered} ${minAnswered === 1 ? "field" : "fields"}`;
  }
  if (maxAnswered !== undefined) {
    return `Complete up to ${maxAnswered} ${maxAnswered === 1 ? "field" : "fields"}`;
  }

  return null;
}

/**
 * Prevents a new value from being entered after a group reaches maxAnswered.
 * Fields that already contain a value remain enabled so users can edit or
 * clear them, including when opening an older form that exceeds the limit.
 */
export function isFieldDisabledByGroupLimit(
  group: ResolvedWizardFieldGroup,
  fieldId: string,
  formValues: Record<string, unknown>,
): boolean {
  const maxAnswered = group.validation?.maxAnswered;
  if (maxAnswered === undefined) return false;

  const field = group.fields.find((candidate) => candidate.id === fieldId);
  if (!field || isFieldAnswered(field, formValues)) return false;

  return group.fields.filter((candidate) => isFieldAnswered(candidate, formValues)).length >= maxAnswered;
}
