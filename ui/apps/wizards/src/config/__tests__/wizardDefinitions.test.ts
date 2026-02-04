import { describe, it, expect, vi } from "vitest";
import { getWizardDefinitions, getWizardById } from "../wizardDefinitions";

// Mock cdwConfig - tests run in dev mode so they use hardcoded definitions
vi.mock("../cdwConfig", () => ({
  fetchCdwConfig: vi.fn().mockResolvedValue({
    config: {},
    meta: { configId: "test", configVersion: "1" },
  }),
  getAttributeByPath: vi.fn(),
}));

describe("wizardDefinitions", () => {
  describe("getWizardDefinitions", () => {
    it("should return an array with exactly 4 wizards", async () => {
      const wizards = await getWizardDefinitions();
      expect(Array.isArray(wizards)).toBe(true);
      expect(wizards.length).toBe(4);
    });

    it("should return wizards with required fields", async () => {
      const wizards = await getWizardDefinitions();

      wizards.forEach((wizard) => {
        expect(wizard).toHaveProperty("id");
        expect(wizard).toHaveProperty("name");
        expect(wizard).toHaveProperty("description");
        expect(wizard).toHaveProperty("fields");
        expect(wizard).toHaveProperty("resultActions");

        expect(typeof wizard.id).toBe("string");
        expect(typeof wizard.name).toBe("string");
        expect(typeof wizard.description).toBe("string");
        expect(Array.isArray(wizard.fields)).toBe(true);
        expect(Array.isArray(wizard.resultActions)).toBe(true);
      });
    });

    it("should return wizards with valid field definitions", async () => {
      const wizards = await getWizardDefinitions();

      wizards.forEach((wizard) => {
        wizard.fields.forEach((field) => {
          expect(field).toHaveProperty("id");
          expect(field).toHaveProperty("type");
          expect(field).toHaveProperty("label");
          expect(field).toHaveProperty("required");

          expect(typeof field.id).toBe("string");
          expect(typeof field.type).toBe("string");
          expect(["text", "num", "datetime", "time", "yearRange"]).toContain(field.type);
          expect(typeof field.label).toBe("string");
          expect(typeof field.required).toBe("boolean");
        });
      });
    });

    it("should return wizards with valid result actions", async () => {
      const wizards = await getWizardDefinitions();

      wizards.forEach((wizard) => {
        wizard.resultActions.forEach((action) => {
          expect(action).toHaveProperty("id");
          expect(action).toHaveProperty("type");
          expect(action).toHaveProperty("label");

          expect(typeof action.id).toBe("string");
          expect(typeof action.type).toBe("string");
          expect(["deep-link", "download", "placeholder"]).toContain(action.type);
          expect(typeof action.label).toBe("string");
        });
      });
    });
  });

  describe("getWizardById", () => {
    it("should return the wizard with id 'calculate-incidence'", async () => {
      const wizard = await getWizardById("calculate-incidence");

      expect(wizard).toBeDefined();
      expect(wizard?.id).toBe("calculate-incidence");
      expect(wizard?.name).toBe("Calculate Incidence");
      expect(wizard?.fields.length).toBeGreaterThan(0);
      expect(wizard?.resultActions).toEqual([]);
    });

    it("should return undefined for nonexistent wizard id", async () => {
      const wizard = await getWizardById("nonexistent");

      expect(wizard).toBeUndefined();
    });

    it("should return undefined for empty string", async () => {
      const wizard = await getWizardById("");

      expect(wizard).toBeUndefined();
    });

    it("should return the correct wizard when multiple wizards exist", async () => {
      const allWizards = await getWizardDefinitions();

      if (allWizards.length > 0) {
        const firstWizardId = allWizards[0].id;
        const wizard = await getWizardById(firstWizardId);

        expect(wizard).toBeDefined();
        expect(wizard?.id).toBe(firstWizardId);
      }
    });
  });

  describe("new wizard definitions", () => {
    it("should have calculate-incidence wizard with correct structure", async () => {
      const wizard = await getWizardById("calculate-incidence");

      expect(wizard).toBeDefined();
      expect(wizard?.id).toBe("calculate-incidence");
      expect(wizard?.name).toBe("Calculate Incidence");
      expect(wizard?.description).toBe(
        "This wizard will calculate the incidence for a particular clinical condition. This calculation is done in SQL, and this works by finding the first instance of the condition (the diagnostic code) and determining if it occurs between a particular set of dates that you specify.",
      );
      expect(wizard?.resultActions).toEqual([]);
      expect(wizard?.steps).toHaveLength(1);
      expect(wizard?.steps[0].type).toBe("form");
      expect(wizard?.steps[0].note).toBe(
        "Note: this is a very rough approximation that is just a starting a more comprehensive analysis.",
      );
      expect(wizard?.steps[0].config).toEqual({
        submitLabel: "Open cohort",
        submitAction: "deep-link",
      });
    });

    it("should have calculate-prevalence wizard with correct structure", async () => {
      const wizard = await getWizardById("calculate-prevalence");

      expect(wizard).toBeDefined();
      expect(wizard?.id).toBe("calculate-prevalence");
      expect(wizard?.name).toBe("Calculate Prevalence");
      expect(wizard?.description).toBe(
        "This wizard will calculate the prevalence for a particular clinical condition. This calculation is done in SQL, and this works by finding the first instance of a condition.",
      );
      expect(wizard?.resultActions).toEqual([]);
      expect(wizard?.steps).toHaveLength(1);
      expect(wizard?.steps[0].type).toBe("form");
      expect(wizard?.steps[0].config).toEqual({
        submitLabel: "Open cohort",
        submitAction: "deep-link",
      });
    });

    it("should have calculate-mortality wizard with correct structure", async () => {
      const wizard = await getWizardById("calculate-mortality");

      expect(wizard).toBeDefined();
      expect(wizard?.id).toBe("calculate-mortality");
      expect(wizard?.name).toBe("Calculate Mortality");
      expect(wizard?.description).toBe(
        "This wizard will calculate the mortality rate for a particular clinical condition, and works by death dates that co-occur with a condition between a particular set of dates that you specify.",
      );
      expect(wizard?.resultActions).toEqual([]);
      expect(wizard?.steps).toHaveLength(1);
      expect(wizard?.steps[0].type).toBe("form");
      expect(wizard?.steps[0].config).toEqual({
        submitLabel: "Open cohort",
        submitAction: "deep-link",
      });
    });

    it("should have cross-sectional-demographics wizard with correct structure", async () => {
      const wizard = await getWizardById("cross-sectional-demographics");

      expect(wizard).toBeDefined();
      expect(wizard?.id).toBe("cross-sectional-demographics");
      expect(wizard?.name).toBe("Cross sectional Demographics");
      expect(wizard?.description).toBe("Assessment of hypertension and cholesterol levels in post-operative patients.");
      expect(wizard?.resultActions).toEqual([]);
      expect(wizard?.steps).toHaveLength(1);
      expect(wizard?.steps[0].type).toBe("form");
      expect(wizard?.steps[0].config).toEqual({
        submitLabel: "Open cohort",
        submitAction: "deep-link",
      });
    });

    it("should have all new wizards with age field mapped to config", async () => {
      const wizardIds = [
        "calculate-incidence",
        "calculate-prevalence",
        "calculate-mortality",
        "cross-sectional-demographics",
      ];

      for (const id of wizardIds) {
        const wizard = await getWizardById(id);

        expect(wizard?.fields).toHaveLength(11);

        const ageField = wizard?.fields.find((f) => f.id === "age");
        expect(ageField).toBeDefined();
        expect(ageField?.type).toBe("num");
        expect(ageField?.label).toBe("Age Range");
        expect(ageField?.required).toBe(false);
        expect(ageField?.configPath).toBe("patient.attributes.Age");

        const genderField = wizard?.fields.find((f) => f.id === "gender");
        expect(genderField).toBeDefined();
        expect(genderField?.type).toBe("text");
        expect(genderField?.label).toBe("Gender");
        expect(genderField?.configPath).toBe("patient.attributes.Gender_concept_name");
        // Options are no longer preloaded — fetched on user interaction via TypeaheadField
        expect(genderField?.options).toBeUndefined();

        // Condition fields are now in wizardFields, not fields
        const heightField = wizard?.fields.find((f) => f.id === "height");
        expect(heightField).toBeDefined();
        expect(heightField?.type).toBe("num");
        expect(heightField?.label).toBe("Height");
        expect(heightField?.configPath).toBe("patient.interactions.measurement.attributes.numval");
      }
    });
  });
});
