import { env } from "../env";

/**
 * Resolve AI_MODEL to a Vercel AI SDK language model.
 *
 * Mirrors utils/utils.ts getModels — same `<provider>:<model>` AI_MODEL syntax
 * and the same required-key checks — but returns an AI SDK model instead of a
 * LangChain chat model. The two live side by side on purpose: /chat and / stay
 * on LangChain, /agent needs the AI SDK's client-side tool round-trip (a tool
 * with no `execute` is handed to the browser), which LangChain has no notion of.
 *
 * Unlike getModels there is NO "local" Trex fallback: this endpoint is entirely
 * tool-driven, and the bundled local model does not support tool calling — it
 * would silently answer without ever touching a cohort. Returning null lets the
 * route say so plainly instead.
 */
const REQUIRED_KEYS: Record<string, (keyof typeof env)[]> = {
  gpt: ["OPENAI_API_KEY"],
  azure: [
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_API_VERSION",
    "AZURE_OPENAI_API_DEPLOYMENT_NAME",
    "AZURE_OPENAI_API_INSTANCE_NAME",
  ],
  ollama: ["OLLAMA_BASE_URL"],
  anthropic: ["ANTHROPIC_API_KEY"],
  gemini: ["GOOGLE_API_KEY"],
};

const PROVIDERS: Record<string, (modelId: string) => Promise<any>> = {
  gpt: (modelId) =>
    import("@ai-sdk/openai").then(({ createOpenAI }) =>
      createOpenAI({ apiKey: env.OPENAI_API_KEY })(modelId),
    ),
  // Deliberately `.chat(...)` + useDeploymentBasedUrls, NOT the provider's
  // default `azure(deployment)`. That default returns a Responses-API model and,
  // with no explicit baseURL, targets `<resource>.openai.azure.com/openai/v1/...`
  // — a surface that only accepts `api-version=preview`, so the resource rejects
  // our configured AZURE_OPENAI_API_VERSION with "API version not supported".
  // This wiring produces the classic deployment URL
  // (`/openai/deployments/<deployment>/chat/completions?api-version=…`), the same
  // one LangChain's AzureChatOpenAI already uses with these env vars.
  azure: (modelId) =>
    import("@ai-sdk/azure").then(({ createAzure }) =>
      createAzure({
        apiKey: env.AZURE_OPENAI_API_KEY,
        apiVersion: env.AZURE_OPENAI_API_VERSION,
        resourceName: env.AZURE_OPENAI_API_INSTANCE_NAME,
        useDeploymentBasedUrls: true,
      }).chat(env.AZURE_OPENAI_API_DEPLOYMENT_NAME || modelId),
    ),
  ollama: (modelId) =>
    import("ollama-ai-provider-v2").then(({ createOllama }) =>
      createOllama({
        baseURL: env.OLLAMA_BASE_URL,
        ...(env.OLLAMA_API_KEY && {
          headers: { Authorization: `Bearer ${env.OLLAMA_API_KEY}` },
        }),
      })(modelId),
    ),
  anthropic: (modelId) =>
    import("@ai-sdk/anthropic").then(({ createAnthropic }) =>
      createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(modelId),
    ),
  gemini: (modelId) =>
    import("@ai-sdk/google").then(({ createGoogleGenerativeAI }) =>
      createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })(modelId),
    ),
};

export interface ModelResolution {
  model?: any;
  /** Why no model could be resolved — surfaced to the caller verbatim. */
  error?: string;
}

export async function getAgentModel(llm?: string): Promise<ModelResolution> {
  if (!llm || llm === "null") {
    return {
      error:
        "No AI_MODEL is configured for the code-suggestion function, so the AI assistant is " +
        "unavailable. Set AI_MODEL (e.g. anthropic:claude-sonnet-4-5) and the matching API key.",
    };
  }

  const provider = Object.keys(REQUIRED_KEYS).find((p) => llm.startsWith(`${p}:`));
  if (!provider) {
    return {
      error:
        `AI_MODEL "${llm}" has no known provider prefix. Use one of: ` +
        `${Object.keys(REQUIRED_KEYS).map((p) => `${p}:<model>`).join(", ")}.`,
    };
  }

  const missing = REQUIRED_KEYS[provider].filter((key) => !env[key]);
  if (missing.length > 0) {
    return {
      error: `AI_MODEL "${llm}" needs ${missing.join(", ")}, which ${missing.length === 1 ? "is" : "are"} not set.`,
    };
  }

  return { model: await PROVIDERS[provider](llm.slice(provider.length + 1)) };
}
