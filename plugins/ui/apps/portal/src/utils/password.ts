export const MIN_PASSWORD_LENGTH = 8;

export const isPasswordLongEnough = (password: string): boolean => password.length >= MIN_PASSWORD_LENGTH;

/** True when a typed password is present but shorter than the policy allows. */
export const isPasswordTooShort = (password: string): boolean => password.length > 0 && !isPasswordLongEnough(password);
