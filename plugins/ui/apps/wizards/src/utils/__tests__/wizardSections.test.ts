import { describe, expect, it } from "vitest";
import type { FieldDefinition, WizardFormSection } from "../../types/wizard";
import {
  getFieldGroupCompletionHint,
  getFieldGroupValidationMessage,
  getFirstInvalidTarget,
  getFormGroupValidationErrors,
  getYearRangeErrors,
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
          message: "Enter 1 or 2 of Height, Weight, and BMI.",
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
    expect(getFieldGroupCompletionHint(group)).toBe("Enter 1 or 2 of Height, Weight, and BMI.");
  });

  it("disables only unanswered fields after the group reaches its maximum", () => {
    expect(isFieldDisabledByGroupLimit(group, "bmi", { height: "170", weight: "70" })).toBe(true);
    expect(isFieldDisabledByGroupLimit(group, "height", { height: "170", weight: "70" })).toBe(false);
    expect(isFieldDisabledByGroupLimit(group, "bmi", { height: "170" })).toBe(false);
  });
});

describe("getFormGroupValidationErrors", () => {
  const layout = resolveWizardFormLayout(fields, sections);

  it("maps each invalid group ID to its message", () => {
    expect(getFormGroupValidationErrors(layout, {})).toEqual({
      "body-measurement": "Choose at least one measurement.",
    });
  });

  it("returns no errors when every group is valid", () => {
    expect(getFormGroupValidationErrors(layout, { height: "170" })).toEqual({});
  });

  it("returns no errors for a layout without sections", () => {
    expect(getFormGroupValidationErrors(resolveWizardFormLayout(fields), {})).toEqual({});
  });
});

describe("getFirstInvalidTarget", () => {
  const yearField: FieldDefinition = { id: "year", type: "yearRange", label: "Year", required: true };
  const layout = resolveWizardFormLayout([...fields, yearField], sections);
  const groupErrors = { "body-measurement": "Choose at least one measurement." };

  it("returns a group error displayed above a later field error", () => {
    expect(getFirstInvalidTarget(layout, ["year_from", "year_to"], groupErrors)).toEqual({
      kind: "group",
      groupId: "body-measurement",
    });
  });

  it("returns a field error inside a group before that group's own error", () => {
    expect(getFirstInvalidTarget(layout, ["condition1", "weight"], groupErrors)).toEqual({
      kind: "field",
      name: "weight",
    });
  });

  it("returns the first ungrouped field error in display order when groups are valid", () => {
    expect(getFirstInvalidTarget(layout, ["year_to", "condition1"], {})).toEqual({ kind: "field", name: "condition1" });
  });

  it("returns the from input of a year range before its to input", () => {
    const yearOnlyLayout = resolveWizardFormLayout([yearField]);
    expect(getFirstInvalidTarget(yearOnlyLayout, ["year_to", "year_from"], {})).toEqual({
      kind: "field",
      name: "year_from",
    });
  });

  it("returns field errors in display order for a layout without sections", () => {
    expect(getFirstInvalidTarget(resolveWizardFormLayout(fields), ["condition1", "bmi"], {})).toEqual({
      kind: "field",
      name: "bmi",
    });
  });

  it("returns null when nothing is invalid", () => {
    expect(getFirstInvalidTarget(layout, [], {})).toBeNull();
  });
});

describe("getYearRangeErrors", () => {
  it("accepts an empty optional range", () => {
    expect(getYearRangeErrors("", "", false)).toEqual({});
    expect(getYearRangeErrors(undefined, undefined, false)).toEqual({});
  });

  it("requires both years of an empty required range", () => {
    expect(getYearRangeErrors("", "", true)).toEqual({
      from: "From year is required",
      to: "To year is required",
    });
  });

  it("requires the to year when only the from year is set", () => {
    expect(getYearRangeErrors("2010", "", false)).toEqual({ to: "To year is required" });
  });

  it("requires the from year when only the to year is set", () => {
    expect(getYearRangeErrors("", "2010", false)).toEqual({ from: "From year is required" });
  });

  it("rejects a to year before the from year", () => {
    expect(getYearRangeErrors("2015", "2010", true)).toEqual({
      to: "To year must be greater than or equal to from year",
    });
  });

  it("accepts a range that starts and ends in the same year", () => {
    expect(getYearRangeErrors("2010", "2010", true)).toEqual({});
  });
});
