import {
  hasDisclaimerBeenAccepted,
  setDisclaimerAccepted,
  clearDisclaimerAcceptance,
} from "../disclaimerStorage";

const DISCLAIMER_ACCEPTED_KEY = "disclaimer-accepted";

describe("disclaimerStorage", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe("hasDisclaimerBeenAccepted", () => {
    it("should return false when localStorage has no value", () => {
      expect(hasDisclaimerBeenAccepted()).toBe(false);
    });

    it("should return true when localStorage value is 'true'", () => {
      localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, "true");
      expect(hasDisclaimerBeenAccepted()).toBe(true);
    });

    it("should return false when localStorage value is 'false'", () => {
      localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, "false");
      expect(hasDisclaimerBeenAccepted()).toBe(false);
    });

    it("should return false when localStorage value is something else", () => {
      localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, "something");
      expect(hasDisclaimerBeenAccepted()).toBe(false);
    });
  });

  describe("setDisclaimerAccepted", () => {
    it("should set localStorage value to 'true' when passed true", () => {
      setDisclaimerAccepted(true);
      expect(localStorage.getItem(DISCLAIMER_ACCEPTED_KEY)).toBe("true");
    });

    it("should set localStorage value to 'false' when passed false", () => {
      setDisclaimerAccepted(false);
      expect(localStorage.getItem(DISCLAIMER_ACCEPTED_KEY)).toBe("false");
    });
  });

  describe("clearDisclaimerAcceptance", () => {
    it("should remove the disclaimer acceptance from localStorage", () => {
      localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, "true");
      clearDisclaimerAcceptance();
      expect(localStorage.getItem(DISCLAIMER_ACCEPTED_KEY)).toBeNull();
    });

    it("should not throw when localStorage has no value", () => {
      expect(() => clearDisclaimerAcceptance()).not.toThrow();
    });
  });
});
