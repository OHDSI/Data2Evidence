import { env } from "../env";

export const getModelInstance = async (llm) => {
  const pattern = {
    openai: () =>
      import("@langchain/openai").then(
        ({ ChatOpenAI }) => 
          new ChatOpenAI(
            { 
              model: llm.replace("openai:", ""),
              api_key: env.OPENAI_API_KEY
            }
          )
      ),
    azure: () =>
      import("@langchain/openai").then(
        ({ AzureChatOpenAI }) =>
          // new AzureChatOpenAI({ model: llm})
          new AzureChatOpenAI(
            { 
            model: llm.replace("azure:", ""),
            azureOpenAIApiKey: env.AZURE_OPENAI_API_KEY,
            azureOpenAIApiVersion: env.AZURE_OPENAI_API_VERSION,
            azureOpenAIApiDeploymentName: env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
            azureOpenAIApiInstanceName: env.AZURE_OPENAI_API_INSTANCE_NAME
          }
        )
      ),
  };
  const key = Object.keys(pattern).find((k) => llm.startsWith(k));
  return key ? await pattern[key]() : "NULL";
};
