/**
 * Turn a failed MCP call into a real tool error.
 *
 * MCP reports failure as a NORMAL result carrying `isError: true`, and
 * `@ai-sdk/mcp` returns that object instead of throwing. So a write that never
 * happened arrives looking exactly like one that did: the SDK emits
 * `output-available`, the assistant drawer renders a ✓, and the model sees a
 * payload whose only hint of failure is a boolean sitting next to the text. That
 * is how a `create_concept_set` that 500'd got narrated to the user as "created".
 *
 * Rethrowing makes the SDK emit `tool-error`, which reaches the model as an
 * `error-text` tool result — so it survives the transcript the drawer resubmits —
 * and reaches the drawer as `output-error`, which renders in the failed state.
 *
 * Kept free of the `ai` / env imports that the agent module pulls in, so it stays
 * cheap to test.
 */

/** Flatten an MCP error result's text content into one message. */
export function mcpErrorText(result: any): string {
  const parts = Array.isArray(result?.content) ? result.content : [];
  const text = parts
    .filter((part: any) => part?.type === "text" && typeof part.text === "string")
    .map((part: any) => part.text.trim())
    .filter(Boolean)
    .join("\n");
  return text || "the tool reported an error without a message";
}

/**
 * Wrap each tool's `execute` so an `isError` result throws instead of being
 * returned as output. Tools with no `execute` (the browser `pa_*` tools and the
 * `ui_*` ones, which the SDK forwards to the client) are passed through untouched.
 */
export function throwOnToolError(
  tools: Record<string, any>,
): Record<string, any> {
  return Object.fromEntries(
    Object.entries(tools).map(([name, definition]) => {
      const run = definition?.execute;
      if (typeof run !== "function") return [name, definition];
      return [
        name,
        {
          ...definition,
          execute: async (args: unknown, options: unknown) => {
            const result = await run(args, options);
            if (result?.isError) {
              throw new Error(`${name} failed: ${mcpErrorText(result)}`);
            }
            return result;
          },
        },
      ];
    }),
  );
}
