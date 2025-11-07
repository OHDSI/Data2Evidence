const _env = Deno.env.toObject();

export const env = {
  AI_MODEL: _env.AI_MODEL,
  OPENAI_API_KEY: _env.OPENAI_API_KEY,
  AZURE_OPENAI_API_KEY: _env.AZURE_OPENAI_API_KEY,
};
