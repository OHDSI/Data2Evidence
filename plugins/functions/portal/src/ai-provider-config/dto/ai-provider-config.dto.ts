export const AI_PROVIDER_HOSTS = [
  "bedrock",
  "anthropic",
  "openai-compatible",
] as const;

export type AiProviderHost = (typeof AI_PROVIDER_HOSTS)[number];

// Bodies are validated by hand in the service, not by a class-validator DTO: Danet 2.4.3's @Body()
// ignores class-validator and only runs @danet/validatte, before the handler, with its own error body.

/** Redacted response shape. Audit columns and the ciphertext are never returned. */
export interface AiProviderConfigResponse {
  id: number;
  host: string;
  model: string;
  baseUrl: string | null;
  region: string | null;
  workspaceId: string | null;
  apiKey: string;
  keyReadable?: false;
  isSelected: boolean;
}

/** Validated and normalised input (field rule applied). */
export interface NormalisedAiProviderConfig {
  host: AiProviderHost;
  model: string;
  baseUrl: string | null;
  region: string | null;
  workspaceId: string | null;
  apiKey: string;
}
