import { describe, it, expect } from "vitest";
import { generateDeepLink, encodeWizardConfig, decodeWizardConfig } from "../deepLinks";
import type { ResultAction } from "../../types/wizard";

describe("deepLinks", () => {
  describe("generateDeepLink", () => {
    it("should return URL string for deep-link actions", () => {
      const action: ResultAction = {
        id: "open-cohort",
        label: "Open in Cohort Builder",
        type: "deep-link",
        urlTemplate: "https://d2e.example.com/portal?datasetId={datasetId}&route=cohort&query={encodedConfig}",
      };

      const formData = { condition: "Diabetes", ageMin: 18 };
      const result = generateDeepLink(action, formData, "dataset-123");

      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result).toContain("dataset-123");
      expect(result).toContain("https://d2e.example.com/portal");
    });

    it("should return null for placeholder actions", () => {
      const action: ResultAction = {
        id: "download-csv",
        label: "Download CSV",
        type: "placeholder",
      };

      const formData = { condition: "Diabetes" };
      const result = generateDeepLink(action, formData);

      expect(result).toBeNull();
    });

    it("should return null for non-deep-link actions", () => {
      const action: ResultAction = {
        id: "download-json",
        label: "Download JSON",
        type: "download",
      };

      const formData = { condition: "Diabetes" };
      const result = generateDeepLink(action, formData);

      expect(result).toBeNull();
    });

    it("should include datasetId in URL", () => {
      const action: ResultAction = {
        id: "open-cohort",
        label: "Open in Cohort Builder",
        type: "deep-link",
        urlTemplate: "https://example.com?datasetId={datasetId}",
      };

      const result = generateDeepLink(action, {}, "my-dataset-456");

      expect(result).toContain("my-dataset-456");
    });

    it("should include base64-encoded config in URL", () => {
      const action: ResultAction = {
        id: "open-cohort",
        label: "Open in Cohort Builder",
        type: "deep-link",
        urlTemplate: "https://example.com?query={encodedConfig}",
      };

      const formData = { field1: "value1", field2: 42 };
      const result = generateDeepLink(action, formData);

      expect(result).toBeTruthy();
      expect(result).toContain("query=");
      // Should be URL-encoded base64 string (base64 chars encoded: + becomes %2B, / becomes %2F, = becomes %3D)
      const queryParam = result!.split("query=")[1];
      expect(queryParam).toMatch(/^[A-Za-z0-9%]+=*$/);
    });

    it("should use provided datasetId over placeholder", () => {
      const action: ResultAction = {
        id: "open-cohort",
        label: "Open in Cohort Builder",
        type: "deep-link",
        urlTemplate: "https://example.com?datasetId={datasetId}",
      };

      const result = generateDeepLink(action, {}, "explicit-dataset");

      expect(result).toContain("explicit-dataset");
      expect(result).not.toContain("placeholder-dataset-id");
    });

    it("should use placeholder datasetId when none provided", () => {
      const action: ResultAction = {
        id: "open-cohort",
        label: "Open in Cohort Builder",
        type: "deep-link",
        urlTemplate: "https://example.com?datasetId={datasetId}",
      };

      const result = generateDeepLink(action, {});

      expect(result).toContain("placeholder-dataset-id");
    });

    it("should return null when urlTemplate is missing", () => {
      const action: ResultAction = {
        id: "broken-link",
        label: "Broken Link",
        type: "deep-link",
        // urlTemplate intentionally missing
      };

      const result = generateDeepLink(action, { data: "test" });

      expect(result).toBeNull();
    });

    it("should handle empty formData", () => {
      const action: ResultAction = {
        id: "open-cohort",
        label: "Open in Cohort Builder",
        type: "deep-link",
        urlTemplate: "https://example.com?query={encodedConfig}",
      };

      const result = generateDeepLink(action, {});

      expect(result).toBeTruthy();
      expect(result).toContain("query=");
    });
  });

  describe("encodeWizardConfig", () => {
    it("should produce valid base64 string", () => {
      const formData = { condition: "Diabetes", age: 65 };
      const encoded = encodeWizardConfig(formData);

      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);
      // Base64 pattern: alphanumeric + / + = padding
      expect(encoded).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it("should encode empty object", () => {
      const encoded = encodeWizardConfig({});

      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);
    });

    it("should encode complex objects", () => {
      const formData = {
        string: "test",
        number: 123,
        boolean: true,
        nested: { key: "value" },
        array: [1, 2, 3],
      };

      const encoded = encodeWizardConfig(formData);

      expect(typeof encoded).toBe("string");
      expect(encoded).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it("should handle Unicode characters (accented names)", () => {
      const formData = { patientName: "José García", condition: "Müller" };
      const encoded = encodeWizardConfig(formData);

      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);
      expect(encoded).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it("should handle Unicode characters (CJK characters)", () => {
      const formData = { patientName: "田中太郎", condition: "糖尿病" };
      const encoded = encodeWizardConfig(formData);

      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);
      expect(encoded).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it("should preserve Unicode in encode/decode roundtrip", () => {
      const original = {
        name: "François Müller",
        city: "São Paulo",
        patient: "田中太郎",
        emoji: "🏥",
      };
      const encoded = encodeWizardConfig(original);
      const decoded = decodeWizardConfig(encoded);

      expect(decoded).toEqual(original);
    });
  });

  describe("decodeWizardConfig", () => {
    it("should reverse encodeWizardConfig", () => {
      const original = { condition: "Diabetes", ageMin: 18, ageMax: 65 };
      const encoded = encodeWizardConfig(original);
      const decoded = decodeWizardConfig(encoded);

      expect(decoded).toEqual(original);
    });

    it("should decode empty object", () => {
      const original = {};
      const encoded = encodeWizardConfig(original);
      const decoded = decodeWizardConfig(encoded);

      expect(decoded).toEqual(original);
    });

    it("should preserve data types", () => {
      const original = {
        stringField: "text",
        numberField: 42,
        booleanField: true,
        nullField: null,
      };
      const encoded = encodeWizardConfig(original);
      const decoded = decodeWizardConfig(encoded);

      expect(decoded).toEqual(original);
      expect(typeof decoded.stringField).toBe("string");
      expect(typeof decoded.numberField).toBe("number");
      expect(typeof decoded.booleanField).toBe("boolean");
      expect(decoded.nullField).toBeNull();
    });

    it("should handle nested objects and arrays", () => {
      const original = {
        nested: { key: "value", deep: { level: 2 } },
        array: [1, "two", { three: 3 }],
      };
      const encoded = encodeWizardConfig(original);
      const decoded = decodeWizardConfig(encoded);

      expect(decoded).toEqual(original);
    });

    it("should throw on invalid base64", () => {
      const invalidBase64 = "not-valid-base64!!!";

      expect(() => decodeWizardConfig(invalidBase64)).toThrow("Invalid wizard configuration format");
    });

    it("should throw on invalid JSON", () => {
      // Valid base64 but invalid JSON
      const validBase64InvalidJson = btoa("{ invalid json }");

      expect(() => decodeWizardConfig(validBase64InvalidJson)).toThrow("Invalid wizard configuration format");
    });
  });

  describe("generateDeepLink URL encoding", () => {
    it("should URL-encode query parameters", () => {
      const action: ResultAction = {
        id: "open-cohort",
        label: "Open in Cohort Builder",
        type: "deep-link",
        urlTemplate: "https://example.com?datasetId={datasetId}&query={encodedConfig}",
      };

      // Base64 can contain +, /, = which need URL encoding
      const formData = { condition: "Test with special chars" };
      const result = generateDeepLink(action, formData, "dataset/with/slash");

      expect(result).toBeTruthy();
      // DatasetId should be URL-encoded (slash becomes %2F)
      expect(result).toContain("dataset%2Fwith%2Fslash");
      // Base64 characters should be URL-encoded if they contain special chars
      expect(result).not.toContain("dataset/with/slash");
    });
  });
});
