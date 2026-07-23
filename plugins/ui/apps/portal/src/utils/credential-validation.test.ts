import { PASSWORD_RULES, isPasswordValid, validateUsername, PASSWORD_MAX_LENGTH } from "./credential-validation";

describe("PASSWORD_RULES", () => {
  const byId = Object.fromEntries(PASSWORD_RULES.map((r) => [r.id, r]));

  it("defines exactly the four checklist rules", () => {
    expect(PASSWORD_RULES.map((r) => r.id)).toEqual(["minLength", "letter", "number", "special"]);
  });

  it("minLength requires 8 characters", () => {
    expect(byId.minLength.test("Ab1!efg")).toBe(false);
    expect(byId.minLength.test("Ab1!efgh")).toBe(true);
  });

  it("letter / number / special detect their character class", () => {
    expect(byId.letter.test("12345678!")).toBe(false);
    expect(byId.number.test("Abcdefg!")).toBe(false);
    expect(byId.special.test("Abcdefg1")).toBe(false);
    expect(byId.special.test("Abcdefg1_")).toBe(true); // underscore counts as special
  });

  it("whitespace is not a special character", () => {
    expect(byId.special.test("Abcdef 1")).toBe(false);
  });
});

describe("isPasswordValid", () => {
  it("rejects whitespace-only, short, and single-class passwords", () => {
    expect(isPasswordValid("        ")).toBe(false);
    expect(isPasswordValid("a1!")).toBe(false);
    expect(isPasswordValid("abcdefgh")).toBe(false);
  });
  it("accepts a compliant password", () => {
    expect(isPasswordValid("Passw0rd!")).toBe(true);
  });
});

describe("validateUsername", () => {
  it("trims before validating", () => {
    expect(validateUsername("  alice  ")).toBeNull();
    expect(validateUsername("   ")).toBe("required");
  });
  it("enforces length 3-32", () => {
    expect(validateUsername("ab")).toBe("tooShort");
    expect(validateUsername("a".repeat(33))).toBe("tooLong");
    expect(validateUsername("abc")).toBeNull();
    expect(validateUsername("a".repeat(32))).toBeNull();
  });
  it("rejects invalid characters and leading digits (Logto constraint)", () => {
    expect(validateUsername("ali ce")).toBe("invalidChars");
    expect(validateUsername("ali-ce")).toBe("invalidChars");
    expect(validateUsername("1alice")).toBe("invalidChars");
  });
  it("rejects underscore-only usernames", () => {
    expect(validateUsername("___")).toBe("noLetterOrNumber");
  });
});

describe("PASSWORD_MAX_LENGTH", () => {
  it("is 64 (D1)", () => {
    expect(PASSWORD_MAX_LENGTH).toBe(64);
  });
});
