import { env } from "../env";

export const getModels = async (llm) => {
  if (env.AZURE_OPENAI_API_KEY === null && env.OPENAI_API_KEY === null) {
    return "local";
  }

  const pattern = {
    gpt: () =>
      import("@langchain/openai").then(
        ({ ChatOpenAI }) => new ChatOpenAI({ model: llm })
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
          })
      ),
    ollama: () =>
      import("@langchain_ollama").then(
        ({ ChatOllama }) =>
          new ChatOllama({
            model: llm.replace("ollama:", ""),
            baseUrl: env.OLLAMA_BASE_URL,
            ...(env.OLLAMA_API_KEY && {
              headers: { Authorization: `Bearer ${env.OLLAMA_API_KEY}` },
            }),
          })
      ),
    anthropic: () =>
      import("@langchain/anthropic").then(
        ({ ChatAnthropic }) =>
          new ChatAnthropic({
            model: llm.replace("anthropic:", ""),
            apiKey: env.ANTHROPIC_API_KEY,
          })
      ),
    gemini: () =>
      import("@langchain/google").then(
        ({ ChatGoogle }) =>
          new ChatGoogle({
            model: llm.replace("gemini:", ""),
            apiKey: env.GOOGLE_API_KEY,
          })
      ),
  };
  const key = Object.keys(pattern).find((k) => llm.startsWith(k));
  return key ? await pattern[key]() : null; // `Selected LLM model name '${llm}' is not supported`
};
