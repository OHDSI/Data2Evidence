import { isPasswordLongEnough, isPasswordTooShort, MIN_PASSWORD_LENGTH } from "../password";

describe("password policy", () => {
  it("requires at least eight characters", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(isPasswordLongEnough("1234567")).toBe(false);
    expect(isPasswordLongEnough("12345678")).toBe(true);
  });

  it("only reports a password as too short once something is typed", () => {
    expect(isPasswordTooShort("")).toBe(false);
    expect(isPasswordTooShort("short")).toBe(true);
    expect(isPasswordTooShort("longenough")).toBe(false);
  });
});
