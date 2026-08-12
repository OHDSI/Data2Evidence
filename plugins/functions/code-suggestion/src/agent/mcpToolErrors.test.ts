/**
 * The guard against narrating a failed tool call as success.
 *
 * MCP returns a failed call as a normal result carrying `isError: true`, so
 * without this wrapper a `create_concept_set` that 500'd reaches the model as a
 * successful tool output and the drawer renders a ✓ — which is exactly how a
 * concept set that was never written got reported to the user as created.
 *
 * Run (deno lives in the trex container, not on the host):
 *   docker exec d2e-trex deno test --allow-read --sloppy-imports --no-check \
 *     /usr/src/plugins/d2ef/code-suggestion/src/agent/mcpToolErrors.test.ts
 */

import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mcpErrorText, throwOnToolError } from "./mcpToolErrors.ts";

const errorResult = (text: string) => ({
  isError: true,
  content: [{ type: "text", text }],
});

Deno.test("an isError result throws instead of returning as output", async () => {
  const tools = throwOnToolError({
    create_concept_set: {
      execute: () =>
        Promise.resolve(
          errorResult(
            "Concept set 'Diabetes' was NOT created and nothing was saved.",
          ),
        ),
    },
  });

  const error = await assertRejects(
    () => tools.create_concept_set.execute({}, {}),
    Error,
  );
  // The tool name matters: the model has to know WHICH call failed.
  assertEquals(
    error.message,
    "create_concept_set failed: Concept set 'Diabetes' was NOT created and nothing was saved.",
  );
});

Deno.test("a successful result is passed through untouched", async () => {
  const output = { content: [{ type: "text", text: "Found 3 concept sets." }] };
  const tools = throwOnToolError({
    list_concept_sets: { execute: () => Promise.resolve(output) },
  });

  assertEquals(await tools.list_concept_sets.execute({}, {}), output);
});

Deno.test("arguments and options reach the wrapped execute", async () => {
  let seen: unknown[] = [];
  const tools = throwOnToolError({
    search_concepts: {
      execute: (args: unknown, options: unknown) => {
        seen = [args, options];
        return Promise.resolve({ content: [] });
      },
    },
  });

  await tools.search_concepts.execute({ query: "diabetes" }, { signal: "x" });
  assertEquals(seen, [{ query: "diabetes" }, { signal: "x" }]);
});

Deno.test("tools with no execute are left alone", () => {
  // `pa_*` and `ui_*` tools deliberately have no execute — the SDK forwards them
  // to the browser. Wrapping one would give it an execute and stop it reaching
  // the client at all.
  const uiTool = { description: "confirm concepts" };
  const tools = throwOnToolError({ ui_confirm_concepts: uiTool });

  assertEquals(tools.ui_confirm_concepts, uiTool);
  assertEquals("execute" in tools.ui_confirm_concepts, false);
});

Deno.test("other tool properties survive wrapping", () => {
  const tools = throwOnToolError({
    get_concept_set: {
      description: "Get one concept set",
      inputSchema: { type: "object" },
      type: "dynamic-tool",
      execute: () => Promise.resolve({}),
    },
  });
  const wrapped = tools.get_concept_set;

  assertEquals(wrapped.description, "Get one concept set");
  assertEquals(wrapped.inputSchema, { type: "object" });
  // The SDK routes on `type`; dropping it would reclassify the tool.
  assertEquals(wrapped.type, "dynamic-tool");
});

Deno.test("mcpErrorText joins every text part and ignores the rest", () => {
  assertEquals(
    mcpErrorText({
      content: [
        { type: "text", text: "  first  " },
        { type: "image", data: "ignored" },
        { type: "text", text: "second" },
      ],
    }),
    "first\nsecond",
  );
});

Deno.test("mcpErrorText still says something when there is no message", () => {
  // An empty error must not produce "tool failed: " with a dangling colon — the
  // model would have nothing to report and might treat it as a non-event.
  for (const result of [{ isError: true }, { content: [] }, {}]) {
    assertEquals(
      mcpErrorText(result),
      "the tool reported an error without a message",
    );
  }
});
