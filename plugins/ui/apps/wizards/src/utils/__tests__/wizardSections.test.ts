import { describe, expect, it } from "vitest";
import type { FieldDefinition, WizardFormSection } from "../../types/wizard";
import {
  getFieldGroupCompletionHint,
  getFieldGroupValidationMessage,
  isFieldDisabledByGroupLimit,
  resolveWizardFormLayout,
} from "../wizardSections";

const fields: FieldDefinition[] = [
  { id: "height", type: "num", label: "Height", required: false },
  { id: "weight", type: "num", label: "Weight", required: false },
  { id: "bmi", type: "num", label: "BMI", required: false },
  { id: "condition1", type: "text", label: "Condition", required: false },
];

const sections: WizardFormSection[] = [
  {
    id: "measurement",
    title: "Measurement",
    groups: [
      {
        id: "body-measurement",
        fieldIds: ["height", "weight", "bmi", "not-in-this-wizard"],
        columns: 3,
        validation: {
          minAnswered: 1,
          maxAnswered: 2,
          minMessage: "Choose at least one measurement.",
          maxMessage: "Choose no more than two measurements.",
        },
      },
    ],
  },
];

describe("resolveWizardFormLayout", () => {
  it("resolves a wizard layout while ignoring missing field IDs", () => {
    const layout = resolveWizardFormLayout(fields, sections);

    expect(layout.sections).toHaveLength(1);
    expect(layout.sections[0].groups[0].fields.map((field) => field.id)).toEqual(["height", "weight", "bmi"]);
    expect(layout.ungroupedFields.map((field) => field.id)).toEqual(["condition1"]);
  });

  it("falls back to the flat field list when sections are not configured", () => {
    const layout = resolveWizardFormLayout(fields);

    expect(layout.sections).toEqual([]);
    expect(layout.ungroupedFields).toEqual(fields);
  });
});

describe("getFieldGroupValidationMessage", () => {
  const group = resolveWizardFormLayout(fields, sections).sections[0].groups[0];

  it("requires the configured minimum number of answered fields", () => {
    expect(getFieldGroupValidationMessage(group, {})).toBe("Choose at least one measurement.");
  });

  it("accepts values between the configured minimum and maximum", () => {
    expect(getFieldGroupValidationMessage(group, { height: "170" })).toBeNull();
    expect(getFieldGroupValidationMessage(group, { height: "170", weight: "70" })).toBeNull();
  });

  it("returns the configured group message when too many fields are answered", () => {
    expect(getFieldGroupValidationMessage(group, { height: "170", weight: "70", bmi: "24" })).toBe(
      "Choose no more than two measurements.",
    );
  });

  it("describes the configured completion range", () => {
    expect(getFieldGroupCompletionHint(group)).toBe("Complete 1 to 2 fields");
  });

  it("disables only unanswered fields after the group reaches its maximum", () => {
    expect(isFieldDisabledByGroupLimit(group, "bmi", { height: "170", weight: "70" })).toBe(true);
    expect(isFieldDisabledByGroupLimit(group, "height", { height: "170", weight: "70" })).toBe(false);
    expect(isFieldDisabledByGroupLimit(group, "bmi", { height: "170" })).toBe(false);
  });
});
