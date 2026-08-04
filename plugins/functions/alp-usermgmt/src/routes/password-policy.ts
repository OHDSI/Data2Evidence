import { LogtoAPI } from '../api'

/**
 * Message returned to the client when Logto's sign-in-experience policy
 * rejects a password. It is intentionally generic: Logto's raw `rejection`
 * payload must never be echoed back to the caller.
 */
export const PASSWORD_POLICY_MESSAGE = `Password does not meet the policy: at least 8 characters, at most 64, and at least 3 of: lowercase, uppercase, number, symbol.`

/** Minimal logger surface used by the guard, so it is trivial to stub in tests. */
export interface PasswordPolicyLogger {
  warn(message: string): void
  error(message: string): void
}

export type PasswordPolicyResult =
  /** The password satisfies the policy; the caller may continue. */
  | { status: 'accepted' }
  /** The policy rejected the password; the caller should reply 400 with `message`. */
  | { status: 'rejected'; message: string }
  /** The check itself failed; the caller should forward `error` to `next()`. */
  | { status: 'error'; error: any }

/**
 * Check a password against Logto's password policy and report the outcome to
 * the caller. Deliberately does not touch `res`/`next` so it stays
 * framework-light and unit testable; the route handler decides what to send.
 */
export const validatePasswordPolicy = async (
  logtoAPI: LogtoAPI,
  logger: PasswordPolicyLogger,
  password: string
): Promise<PasswordPolicyResult> => {
  try {
    const policyCheck = await logtoAPI.checkPasswordPolicy(password)
    if (!policyCheck.accepted) {
      logger.warn(`Password rejected by policy: ${JSON.stringify(policyCheck.rejection)}`)
      return { status: 'rejected', message: PASSWORD_POLICY_MESSAGE }
    }
    return { status: 'accepted' }
  } catch (err) {
    // Do not serialize the error: AxiosError.toJSON() includes the request config
    // (password body and Authorization header)
    logger.error(`Error when checking password policy: ${err?.message} (status: ${err?.response?.status ?? 'n/a'})`)
    return { status: 'error', error: err }
  }
}
