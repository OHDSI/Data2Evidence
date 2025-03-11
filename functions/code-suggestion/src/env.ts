const _env = Deno.env.toObject();

export const env = {
  AI_MODEL: _env.AI_MODEL,
};
