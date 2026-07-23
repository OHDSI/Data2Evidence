export const PASSWORD_MAX_LENGTH = 64; // D1: mirrors the Logto policy length.max

export interface PasswordRule {
  id: "minLength" | "letter" | "number" | "special";
  i18nKey:
    | "PASSWORD_RULES__MIN_LENGTH"
    | "PASSWORD_RULES__LETTER"
    | "PASSWORD_RULES__NUMBER"
    | "PASSWORD_RULES__SPECIAL";
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "minLength", i18nKey: "PASSWORD_RULES__MIN_LENGTH", test: (p) => p.length >= 8 },
  { id: "letter", i18nKey: "PASSWORD_RULES__LETTER", test: (p) => /[A-Za-z]/.test(p) },
  { id: "number", i18nKey: "PASSWORD_RULES__NUMBER", test: (p) => /[0-9]/.test(p) },
  { id: "special", i18nKey: "PASSWORD_RULES__SPECIAL", test: (p) => /[^A-Za-z0-9\s]/.test(p) },
];

export const isPasswordValid = (password: string): boolean => PASSWORD_RULES.every((rule) => rule.test(password));

export type UsernameError = "required" | "tooShort" | "tooLong" | "invalidChars" | "noLetterOrNumber";

// Validates the trimmed username. Callers must also submit the trimmed value.
// The leading-digit rejection mirrors Logto's own username constraint (today it
// surfaces as an opaque ERR_BAD_REQUEST after submit — see MemberRouter's catch block).
export const validateUsername = (raw: string): UsernameError | null => {
  const username = raw.trim();
  if (!username) return "required";
  if (username.length < 3) return "tooShort";
  if (username.length > 32) return "tooLong";
  if (!/^\w+$/.test(username) || /^[0-9]/.test(username)) return "invalidChars";
  if (!/[A-Za-z0-9]/.test(username)) return "noLetterOrNumber";
  return null;
};
