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
  };
  const key = Object.keys(pattern).find((k) => llm.startsWith(k));
  return key ? await pattern[key]() : null; // `Selected LLM model name '${llm}' is not supported`
};
