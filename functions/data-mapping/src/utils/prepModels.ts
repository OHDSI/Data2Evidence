import { env } from "../env";

export const getModels = async (llm) => {
  console.log("[amit_log] LLM : ", llm);
  // if (env.AZURE_OPENAI_API_KEY === null) {
  //   return ["local", "201"];
  // }

  // else{
  //   return ["azure: ", ""]
  // }

  const pattern = {
    gpt: () =>
      import("@langchain/openai").then(
        ({ ChatOpenAI }) => new ChatOpenAI({ model: llm })
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
  console.log("[amit_log] Key :", key);
  return key ? [await pattern[key](), "200"] : [`Selected LLM model name '${llm}' is not supported`, "501"];
};
