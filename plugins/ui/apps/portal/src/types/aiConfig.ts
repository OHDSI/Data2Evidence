export type AiConfigProvider = "bedrock" | "anthropic" | "openai-compatible";

/** An AI configuration as the portal API returns it. The key is never returned. */
export interface AiConfig {
  id: number;
  name: string;
  provider: AiConfigProvider;
  model: string;
  baseUrl: string | null;
  region: string | null;
  workspaceId: string | null;
  /** Present (and false) only when the stored key cannot be decrypted with the current key. */
  keyReadable?: false;
  isActive: boolean;
}

/** Body of a create: the API key is required. */
export interface AiConfigInput {
  name: string;
  provider: AiConfigProvider;
  model: string;
  apiKey: string;
  baseUrl?: string | null;
  region?: string | null;
  workspaceId?: string | null;
}

/**
 * Body of an update. Omit `apiKey` to keep the stored key; the backend refuses that when `provider`
 * or `baseUrl` changed, or when the stored key cannot be decrypted.
 */
export type AiConfigUpdateInput = Omit<AiConfigInput, "apiKey"> & { apiKey?: string };
