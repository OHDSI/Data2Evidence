export const AI_CONFIG_PROVIDERS = [
  "bedrock",
  "anthropic",
  "openai-compatible",
] as const;

export type AiConfigProvider = (typeof AI_CONFIG_PROVIDERS)[number];

// Bodies are validated by hand in the service, not by a class-validator DTO: Danet 2.4.3's @Body()
// ignores class-validator and only runs @danet/validatte, before the handler, with its own error body.

/** Redacted response shape. Audit columns and the ciphertext are never returned. */
export interface AiConfigResponse {
  id: number;
  name: string;
  provider: string;
  model: string;
  baseUrl: string | null;
  region: string | null;
  workspaceId: string | null;
  keyReadable?: false;
  isActive: boolean;
}

/** Validated and normalised input (field rule applied). */
export interface NormalisedAiConfig {
  name: string;
  provider: AiConfigProvider;
  model: string;
  baseUrl: string | null;
  region: string | null;
  workspaceId: string | null;
  /** Always set on create; on update undefined means "keep the stored key". */
  apiKey?: string;
}
