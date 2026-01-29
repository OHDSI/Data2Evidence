import { describe, it, expect } from "vitest";
import { getWizardDefinitions, getWizardById } from "../wizardDefinitions";

describe("wizardDefinitions", () => {
  describe("getWizardDefinitions", () => {
    it("should return an array with at least 1 wizard", async () => {
      const wizards = await getWizardDefinitions();
      expect(Array.isArray(wizards)).toBe(true);
      expect(wizards.length).toBeGreaterThanOrEqual(1);
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
          expect(["text", "number", "date", "select"]).toContain(field.type);
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
    it("should return the wizard with id 'patient-count'", async () => {
      const wizard = await getWizardById("patient-count");

      expect(wizard).toBeDefined();
      expect(wizard?.id).toBe("patient-count");
      expect(wizard?.name).toBe("Patient Count Estimation");
      expect(wizard?.fields.length).toBeGreaterThan(0);
      expect(wizard?.resultActions.length).toBeGreaterThan(0);
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
});
