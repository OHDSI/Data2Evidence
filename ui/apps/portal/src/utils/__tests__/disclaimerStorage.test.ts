import {
  hasDisclaimerBeenAccepted,
  setDisclaimerAccepted,
  clearDisclaimerAcceptance,
} from "../disclaimerStorage";

const DISCLAIMER_ACCEPTED_KEY = "disclaimer-accepted";

describe("disclaimerStorage", () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  describe("hasDisclaimerBeenAccepted", () => {
    it("should return false when sessionStorage has no value", () => {
      expect(hasDisclaimerBeenAccepted()).toBe(false);
    });

    it("should return true when sessionStorage value is 'true'", () => {
      sessionStorage.setItem(DISCLAIMER_ACCEPTED_KEY, "true");
      expect(hasDisclaimerBeenAccepted()).toBe(true);
    });

    it("should return false when sessionStorage value is 'false'", () => {
      sessionStorage.setItem(DISCLAIMER_ACCEPTED_KEY, "false");
      expect(hasDisclaimerBeenAccepted()).toBe(false);
    });

    it("should return false when sessionStorage value is something else", () => {
      sessionStorage.setItem(DISCLAIMER_ACCEPTED_KEY, "something");
      expect(hasDisclaimerBeenAccepted()).toBe(false);
    });
  });

  describe("setDisclaimerAccepted", () => {
    it("should set sessionStorage value to 'true' when passed true", () => {
      setDisclaimerAccepted(true);
      expect(sessionStorage.getItem(DISCLAIMER_ACCEPTED_KEY)).toBe("true");
    });

    it("should not set sessionStorage value when passed false", () => {
      setDisclaimerAccepted(false);
      expect(sessionStorage.getItem(DISCLAIMER_ACCEPTED_KEY)).toBeNull();
    });

    it("should not overwrite existing value when passed false", () => {
      sessionStorage.setItem(DISCLAIMER_ACCEPTED_KEY, "true");
      setDisclaimerAccepted(false);
      expect(sessionStorage.getItem(DISCLAIMER_ACCEPTED_KEY)).toBe("true");
    });
  });

  describe("clearDisclaimerAcceptance", () => {
    it("should remove the disclaimer acceptance from sessionStorage", () => {
      sessionStorage.setItem(DISCLAIMER_ACCEPTED_KEY, "true");
      clearDisclaimerAcceptance();
      expect(sessionStorage.getItem(DISCLAIMER_ACCEPTED_KEY)).toBeNull();
    });

    it("should not throw when sessionStorage has no value", () => {
      expect(() => clearDisclaimerAcceptance()).not.toThrow();
    });
  });
});
