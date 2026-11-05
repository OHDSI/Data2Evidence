import { HttpException } from "@danet/core";

export const AI_PROVIDER_CONFIG_DUPLICATE = "AI_PROVIDER_CONFIG_DUPLICATE";
export const AI_PROVIDER_CONFIG_KEY_REQUIRED = "AI_PROVIDER_CONFIG_KEY_REQUIRED";
export const AI_PROVIDER_CONFIG_SELECTED_DELETE =
  "AI_PROVIDER_CONFIG_SELECTED_DELETE";
export const AI_PROVIDER_CONFIG_INVALID = "AI_PROVIDER_CONFIG_INVALID";
export const AI_PROVIDER_CONFIG_NOT_FOUND = "AI_PROVIDER_CONFIG_NOT_FOUND";
export const AI_PROVIDER_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED =
  "AI_PROVIDER_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED";

export type AiProviderConfigErrorCode =
  | typeof AI_PROVIDER_CONFIG_DUPLICATE
  | typeof AI_PROVIDER_CONFIG_KEY_REQUIRED
  | typeof AI_PROVIDER_CONFIG_SELECTED_DELETE
  | typeof AI_PROVIDER_CONFIG_INVALID
  | typeof AI_PROVIDER_CONFIG_NOT_FOUND
  | typeof AI_PROVIDER_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED;

/**
 * Response body (Danet 2.4.3 default handler): { status, name, code, field?, message }.
 * The parameter-property form is required: it is the form verified to reach the body.
 * `field` is set only for AI_PROVIDER_CONFIG_INVALID.
 */
export class AiProviderConfigError extends HttpException {
  constructor(
    status: number,
    readonly code: AiProviderConfigErrorCode,
    description: string,
    readonly field?: string,
  ) {
    super(status, description);
  }
}
