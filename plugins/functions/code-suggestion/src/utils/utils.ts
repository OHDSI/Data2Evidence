import { env } from "../env";

export const getModels = async (llm) => {
  console.info(`AI: ${llm}`);
  if (llm === null || llm === undefined || llm === "null") {
    console.info(
      "No AI_MODEL specified in environment variables. Defaulting to 'local' model.",
    );

    return "local";
  }

  const requiredKeys: Record<string, (keyof typeof env)[]> = {
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

  const providerKey = Object.keys(requiredKeys).find((k) => llm.startsWith(k));
  if (!providerKey) {
    console.warn(
      `AI_MODEL '${llm}' has no known provider prefix. Defaulting to 'local'.`,
    );
    return "local";
  }
  const missing = requiredKeys[providerKey].filter((k) => !env[k]);
  if (missing.length > 0) {
    console.warn(
      `AI_MODEL '${llm}' needs ${missing.join(", ")} but they are not set. Defaulting to 'local'.`,
    );
    return "local";
  }

  const pattern = {
    // OpenRouter — uses the OpenAI-compatible API with a custom base URL
    "openrouter:": () =>
      import("@langchain/openai").then(
        ({ ChatOpenAI }) =>
          new ChatOpenAI({
            model: llm.replace("openrouter:", ""),
            apiKey: env.OPENROUTER_API_KEY,
            configuration: {
              baseURL:
                env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
              defaultHeaders: {
                "HTTP-Referer": "https://github.com/Data2Evidence",
                "X-Title": "Data2Evidence",
              },
            },
          }),
      ),
    // OpenAI direct
    gpt: () =>
      import("@langchain/openai").then(
        ({ ChatOpenAI }) =>
          new ChatOpenAI({
            model: llm.replace("gpt:", ""),
            apiKey: env.OPENAI_API_KEY,
          }),
      ),
    azure: () =>
      import("@langchain/openai").then(
        ({ AzureChatOpenAI }) =>
          new AzureChatOpenAI({
            model: llm.replace("azure:", ""),
            azureOpenAIApiKey: env.AZURE_OPENAI_API_KEY,
            azureOpenAIApiVersion: env.AZURE_OPENAI_API_VERSION,
            azureOpenAIApiDeploymentName: env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
            azureOpenAIApiInstanceName: env.AZURE_OPENAI_API_INSTANCE_NAME,
          }),
      ),
    ollama: () =>
      import("@langchain/ollama").then(
        ({ ChatOllama }) =>
          new ChatOllama({
            model: llm.replace("ollama:", ""),
            baseUrl: env.OLLAMA_BASE_URL,
            ...(env.OLLAMA_API_KEY && {
              headers: { Authorization: `Bearer ${env.OLLAMA_API_KEY}` },
            }),
          }),
      ),
    anthropic: () =>
      import("@langchain/anthropic").then(
        ({ ChatAnthropic }) =>
          new ChatAnthropic({
            model: llm.replace("anthropic:", ""),
            apiKey: env.ANTHROPIC_API_KEY,
          }),
      ),
    gemini: () =>
      import("@langchain/google").then(
        ({ ChatGoogle }) =>
          new ChatGoogle({
            model: llm.replace("gemini:", ""),
            apiKey: env.GOOGLE_API_KEY,
          }),
      ),
  };
  const key = Object.keys(pattern).find((k) => llm.startsWith(k));
  return await pattern[key]();
};
