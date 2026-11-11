export type AiConfigProvider = "bedrock" | "anthropic" | "openai-compatible";

/** An AI configuration as the portal API returns it. `apiKey` is always the redaction placeholder. */
export interface AiConfig {
  id: number;
  name: string;
  provider: AiConfigProvider;
  model: string;
  baseUrl: string | null;
  region: string | null;
  workspaceId: string | null;
  apiKey: string;
  /** Present (and false) only when the stored key cannot be decrypted with the current key. */
  keyReadable?: false;
  isActive: boolean;
}

/**
 * Body of a create or update. On update only, send the redaction placeholder as `apiKey` to keep the
 * stored key; the backend refuses it on create, and on update when `provider` or `baseUrl` changed.
 */
export interface AiConfigInput {
  name: string;
  provider: AiConfigProvider;
  model: string;
  apiKey: string;
  baseUrl?: string | null;
  region?: string | null;
  workspaceId?: string | null;
}
