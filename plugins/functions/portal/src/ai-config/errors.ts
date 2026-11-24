import { HttpException } from "@danet/core";

export const AI_CONFIG_DUPLICATE = "AI_CONFIG_DUPLICATE";
export const AI_CONFIG_KEY_REQUIRED = "AI_CONFIG_KEY_REQUIRED";
export const AI_CONFIG_ACTIVE_DELETE = "AI_CONFIG_ACTIVE_DELETE";
export const AI_CONFIG_INVALID = "AI_CONFIG_INVALID";
export const AI_CONFIG_NOT_FOUND = "AI_CONFIG_NOT_FOUND";
export const AI_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED =
  "AI_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED";

export type AiConfigErrorCode =
  | typeof AI_CONFIG_DUPLICATE
  | typeof AI_CONFIG_KEY_REQUIRED
  | typeof AI_CONFIG_ACTIVE_DELETE
  | typeof AI_CONFIG_INVALID
  | typeof AI_CONFIG_NOT_FOUND
  | typeof AI_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED;

/**
 * Response body (Danet 2.4.3 default handler): { status, name, code, field?, message }.
 * Keep `code` and `field` as constructor parameter properties; errors.test.ts checks
 * that they reach the response body.
 * `field` is set only for AI_CONFIG_INVALID (including `newActiveId` on delete) and AI_CONFIG_DUPLICATE.
 */
export class AiConfigError extends HttpException {
  constructor(
    status: number,
    readonly code: AiConfigErrorCode,
    description: string,
    readonly field?: string,
  ) {
    super(status, description);
  }
}
