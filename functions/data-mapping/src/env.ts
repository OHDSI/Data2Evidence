const _env = Deno.env.toObject();

const model = _env.AI_MODEL;
let extraConfig = {};

if (model.includes("azure")) {
  extraConfig = {
    AZURE_OPENAI_API_INSTANCE_NAME: _env.AZURE_OPENAI_API_INSTANCE_NAME,
    AZURE_OPENAI_API_DEPLOYMENT_NAME: _env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_KEY: _env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_VERSION: _env.AZURE_OPENAI_API_VERSION
  };
}
export const env = {
  AI_MODEL: model,
  OPENAI_API_KEY: _env.OPENAI_API_KEY,
  ...extraConfig
};
